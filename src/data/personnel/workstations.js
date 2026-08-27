/* ─────────────────────────────────────────────
   Workstation — catalogo de estaciones/puestos.

   REGLA CONCEPTUAL (corregida): el template de estaciones de linea
   (Montaje, Prueba electrica, Limpieza, Etiquetado, Suministro de
   Accesorios) SOLO aplica a Linea 1..10 y CT LINEA 0/Proyecto
   (catalog.js: LINE_FAMILY_AREA_IDS -- "familia CT LINEA" completa,
   2026-08-26, a peticion explicita del usuario: "CT LINEA 0" se
   redisena junto con las demas). Antes se generaba ese mismo template
   para CUALQUIER area del catalogo (Paletizado, Cajas, Accesorios,
   Team Leader, etc.), lo cual era incorrecto: esas areas no trabajan
   por "estaciones de linea", tienen su propia forma de operar (ver
   data/production/personnelByArea.getAreaStaffing para el ideal/real
   de cada una).

   Para el resto de las areas (WORK_AREA / SUPPORT_AREA que no son CT
   LINEA) se genera UN solo puesto generico con el nombre de la propia
   area -- esto NO se muestra como "Distribucion de estaciones" en la
   UI, existe solo para que el check-in diario (checkInEmployee/
   moveEmployee, que requieren areaId+stationId) siga funcionando para
   cualquier area sin inventar puestos de linea que no existen ahi.

   REDISEÑO 2026-08-26 (a peticion explicita del usuario, "REGLA MAS
   IMPORTANTE: REPETIR PUESTOS DE TRABAJO"): antes la cantidad de
   estaciones por linea vivia en STATION_COUNT_BY_LINE (5-7, mantenido
   a mano) y los nombres salian de recorrer las 9 entradas de STATIONS
   con modulo -- como STATION_COUNT_BY_LINE nunca pasaba de 7 y
   STATIONS.length=9, el modulo NUNCA repetia un rol de verdad, y
   ademas STATION_COUNT_BY_LINE estaba DESALINEADO del idealHeadcount
   real de varias lineas (ej. LINEA2 ideal=6 pero solo generaba 5
   estaciones -- un bug real: nunca se podia alcanzar la plantilla
   ideal completa desde "Distribucion de estaciones"). Ahora:

   - La cantidad de estaciones de una linea es SIEMPRE su idealHeadcount
     real (catalog.js), acotado 6..10 (limites reales de una CT LINEA,
     confirmados por el usuario) -- nunca un numero separado a mantener
     a mano.
   - Solo se usan los 5 roles base reales de una CT LINEA (LINE_BASE_ROLES)
     para el plan de repeticion -- Empaque/Supervision/Capacitacion de
     STATIONS (legado) siguen sin ser puestos de piso de una linea.
     Calidad es la EXCEPCION desde 2026-08-27 (a peticion explicita del
     usuario): se agrega como puesto REAL adicional en cada CT LINEA
     0..10, fuera de este plan de 5 roles -- ver el bloque que arma
     `stations` mas abajo (buildWorkstations), nunca dentro de
     buildLineRolePlan/LINE_BASE_ROLES.
   - Cuando idealHeadcount > 5, se repiten roles siguiendo
     DEFAULT_REPEAT_ORDER (o LINE_STATION_OVERRIDES[lineId] si esa
     linea tiene una distribucion recomendada propia -- estructura
     lista, hoy vacia, "si existe configuracion guardada por linea,
     usala; si no existe, crea una estructura clara para soportarla").

   IMPORTANTE (nombre = identidad tecnica real, no solo texto): `name`
   es el `stationId` que persiste en DailyAssignment/EmployeeMovement/
   EmployeeSkill.stationName, y el `value` de cada <Select> de estacion
   en MoveConfirmDialog/RegisterPersonnelForm/SelfAssignDialog/
   StationAssignDialog -- TODOS esos archivos ya asumian implicitamente
   que `name` es unico dentro de una linea (confirmado por investigacion
   antes de este cambio: getWorkstation/getStationOccupancy resuelven
   por `.find(w => w.name === x)`, sin eso dos estaciones con el mismo
   nombre comparten cupo/ocupantes y los <Select> quedan con `value`
   duplicado). Por eso cada repeticion de un rol recibe un `name` UNICO
   ("Montaje", "Montaje 2", ...) -- la primera ocurrencia de cada rol
   conserva el nombre plano de siempre (compatible con asignaciones ya
   guardadas), solo las repeticiones llevan sufijo. `role` (nuevo campo)
   guarda el rol base sin sufijo, para agrupar/mostrar sin tocar la
   identidad tecnica. Esto de paso corrige el bug latente que ya existia
   en los <Select> de esos 4 archivos (value duplicado) -- nunca podia
   pasar antes porque nunca habia roles repetidos de verdad. ───────────────────────────────────────────── */

import { WORK_CENTERS, LINE_FAMILY_AREA_IDS, LINE_LIKE_AREA_IDS, CUSTOM_STATION_PLANS, operationalGroupMembers } from '../production/catalog'

/* Etiqueta de rol legible para cada estacion de LINEA -- solo texto
   de presentacion, la compatibilidad de habilidades sigue usando
   el nombre de estacion (role base, sin sufijo) como vocabulario. */
const ROLE_LABELS = {
  'Montaje': 'Operador de Montaje',
  'Prueba eléctrica': 'Técnico eléctrico',
  'Limpieza': 'Auxiliar de Limpieza',
  'Etiquetado': 'Etiquetador',
  'Suministro de Accesorios': 'Auxiliar de Accesorios',
  'Empaque': 'Empacador',
  'Calidad': 'Inspector de Calidad',
  'Supervisión': 'Supervisor de Línea',
  'Capacitación': 'Instructor',
}

/* Los 5 roles base reales de una CT LINEA (Parte "REGLA MAS IMPORTANTE"
   del pedido, 2026-08-26) -- orden = orden de aparicion en la
   distribucion cuando NO hay repeticiones. */
export const LINE_BASE_ROLES = ['Montaje', 'Prueba eléctrica', 'Limpieza', 'Etiquetado', 'Suministro de Accesorios']

/* Orden en que se repiten roles cuando idealHeadcount > 5 (min 6, max 10
   personas por linea) -- POR DEFECTO para cualquier linea sin
   configuracion propia. Con el maximo real (10, extra=5) cada rol se
   repite exactamente una vez -- nunca hace falta una 3a vez del mismo
   rol, asi que nunca hay que desambiguar mas alla de "Rol"/"Rol 2". */
export const DEFAULT_REPEAT_ORDER = ['Montaje', 'Etiquetado', 'Prueba eléctrica', 'Suministro de Accesorios', 'Limpieza']

/* Configuracion explicita por linea (Parte "CONFIGURACION DE PUESTOS
   REPETIDOS" del pedido: "Si existe una configuracion guardada por
   linea, usala. Si no existe, crea una estructura clara para
   soportarla"). Vacio hoy -- ninguna linea tiene todavia una
   distribucion recomendada distinta a la regla generica de arriba;
   agregar `{ LINEA6: { repeatOrder: [...] } }` aqui basta para que esa
   linea use su propio orden sin tocar el resto de este archivo. */
export const LINE_STATION_OVERRIDES = {}

/* Plan de roles (uno por posicion, 1..idealHeadcount acotado 6..10) para
   una linea real -- separado de la generacion de `Workstation` de abajo
   para poder probarlo/reutilizarlo aparte (ej. mostrar "N posiciones"
   sin construir objetos de estacion completos). */
export function buildLineRolePlan(lineId, idealHeadcount) {
  const target = Math.max(6, Math.min(10, idealHeadcount || 6))
  const repeatOrder = LINE_STATION_OVERRIDES[lineId]?.repeatOrder || DEFAULT_REPEAT_ORDER

  const counts = {}
  LINE_BASE_ROLES.forEach((role) => { counts[role] = 1 })
  let extra = target - LINE_BASE_ROLES.length
  let i = 0
  while (extra > 0) {
    const role = repeatOrder[i % repeatOrder.length]
    counts[role] = (counts[role] || 0) + 1
    extra -= 1
    i += 1
  }

  const plan = []
  LINE_BASE_ROLES.forEach((role) => {
    for (let n = 0; n < counts[role]; n += 1) plan.push({ role, repeatIndex: n })
  })
  return plan
}

/* Plan de puestos por rol para areas NO-linea con plantilla oficial real
   por puesto (2026-08-26, "Reestructuracion operativa FFT", a peticion
   explicita del usuario -- CUSTOM_STATION_PLANS en catalog.js). A
   diferencia de buildLineRolePlan (primera ocurrencia SIN sufijo, para
   no romper compatibilidad con asignaciones de linea ya guardadas), aqui
   TODAS las repeticiones llevan numero desde el 1 cuando count>1
   ("Surtidor de Accesorios 1".."7", Parte 37 del pedido, ejemplo
   explicito del usuario) -- un puesto con count=1 nunca lleva numero
   ("Team Leader", no "Team Leader 1"). El `role` (tipo de puesto) es
   SIEMPRE el mismo string para sus N posiciones -- nunca se crean N
   roles distintos por N slots (Parte 38 del pedido: "separar tipo de
   puesto de posicion individual"). */
export function buildCustomRolePlan(rolePlan) {
  const counts = {}
  return rolePlan.flatMap(({ role, count }) => (
    Array.from({ length: count }, () => {
      counts[role] = (counts[role] || 0) + 1
      return { role, name: count > 1 ? `${role} ${counts[role]}` : role }
    })
  ))
}

function buildWorkstations() {
  const map = {}
  WORK_CENTERS.forEach((wc) => {
    if (LINE_FAMILY_AREA_IDS.has(wc.id)) {
      // Calidad (2026-08-27, a peticion explicita del usuario): puesto REAL
      // adicional en cada CT LINEA 0..10, fuera de los 5 roles base de
      // siempre -- por eso aqui se resta 1 al idealHeadcount (que ya trae el
      // +1 de Calidad, ver la nota junto a WORK_CENTERS en catalog.js) antes
      // de calcular el plan base: garantiza que Montaje/Prueba eléctrica/
      // Limpieza/Etiquetado/Suministro de Accesorios y sus repeticiones
      // generen EXACTAMENTE las mismas posiciones de siempre (mismos
      // nombres, mismo orden RELATIVO entre ellas, ninguna asignacion real
      // ya guardada queda huerfana) -- Calidad nunca reemplaza ni reordena
      // esas 5.
      //
      // Orden 2026-08-28 (a peticion explicita del usuario, "los de calidad
      // deben ir primero"): Calidad ahora es la POSICION 1 de cada CT LINEA
      // (antes iba al final) -- el resto de posiciones se recorre una a la
      // derecha, sin cambiar su orden relativo entre si.
      const plan = buildLineRolePlan(wc.id, wc.idealHeadcount - 1)
      const calidadStation = {
        id: `${wc.id}-1`,
        lineId: wc.id,
        name: 'Calidad',
        role: 'Calidad',
        requiredRole: ROLE_LABELS.Calidad || 'Calidad',
        capacity: 1,
        order: 1,
        status: 'ACTIVA',
      }
      const stations = plan.map((entry, i) => {
        const name = entry.repeatIndex === 0 ? entry.role : `${entry.role} ${entry.repeatIndex + 1}`
        return {
          id: `${wc.id}-${i + 2}`,
          lineId: wc.id,
          name,
          role: entry.role,
          requiredRole: ROLE_LABELS[entry.role] || entry.role,
          capacity: 1,
          order: i + 2,
          status: 'ACTIVA',
        }
      })
      map[wc.id] = [calidadStation, ...stations]
    } else if (CUSTOM_STATION_PLANS[wc.id]) {
      // Accesorios/Paletizado/Insumos (2026-08-26): plantilla real por
      // puesto, ver CUSTOM_STATION_PLANS (catalog.js) -- capacidad 1 por
      // slot individual, nunca un solo puesto generico de capacidad alta.
      const plan = buildCustomRolePlan(CUSTOM_STATION_PLANS[wc.id])
      map[wc.id] = plan.map((entry, i) => ({
        id: `${wc.id}-${i + 1}`,
        lineId: wc.id,
        name: entry.name,
        role: entry.role,
        requiredRole: entry.role,
        capacity: 1,
        order: i + 1,
        status: 'ACTIVA',
      }))
    } else if (LINE_LIKE_AREA_IDS.has(wc.id)) {
      // WC Midea / High Value (2026-08-26, Parte 13-16 del pedido):
      // "funciona como una linea, 1 persona por puesto" pero SIN nombres
      // de puesto reales conocidos hoy (investigado: no existen en
      // ningun lado del catalogo/DB/snapshot) -- Parte 70A: "NO
      // inventar nombres de puesto... crear la estructura para
      // soportarlos, pero reportar que falta definir los nombres
      // oficiales". Slots numerados NEUTRALES ("Puesto 1".."N", nunca
      // "Montaje"/"Prueba eléctrica" copiados de WC LINEA), capacidad 1
      // cada uno, N = idealHeadcount real del area (16 hoy). Reemplazar
      // el `role`/`requiredRole` de abajo por los puestos oficiales en
      // cuanto el usuario los confirme -- unico lugar a cambiar.
      //
      // N se suma sobre TODOS los miembros del grupo fusionado (ver
      // AREA_DETAIL_GROUPS/operationalGroupMembers en catalog.js), no solo
      // wc.idealHeadcount propio -- necesario desde que Conveyor Principal
      // (1) + Conveyor Secundario (1) se fusionaron en un solo detalle
      // "WC Conveyor General" con 2 puestos genericos (2026-08-26): sin
      // esto solo se generaria 1 puesto aunque el ideal combinado real sea
      // 2. Para areas sin grupo (Midea, Accesorios..) el grupo es solo
      // [wc.id], asi que el comportamiento no cambia.
      const total = operationalGroupMembers(wc.id).reduce((sum, id) => sum + (WORK_CENTERS.find((w) => w.id === id)?.idealHeadcount || 0), 0)
      map[wc.id] = Array.from({ length: total }, (_, i) => ({
        id: `${wc.id}-${i + 1}`,
        lineId: wc.id,
        name: `Puesto ${i + 1}`,
        role: 'Puesto (nombre oficial pendiente de definir)',
        requiredRole: 'Puesto (nombre oficial pendiente de definir)',
        capacity: 1,
        order: i + 1,
        status: 'ACTIVA',
      }))
    } else {
      // Un solo puesto generico (no es "Montaje/Prueba/..."): permite
      // que el check-in diario funcione para cualquier area sin
      // inventar estaciones de linea que no le corresponden.
      //
      // La capacidad NO se ata a idealHeadcount: IDEAL es plantilla
      // esperada (para mostrar "Faltan N"/advertir), no un limite
      // tecnico que deba bloquear una asignacion. Un numero alto fijo
      // evita que checkInEmployee/moveEmployee rechacen a la persona
      // 21 en un area con ideal=20.
      map[wc.id] = [{
        id: `${wc.id}-GENERAL`,
        lineId: wc.id,
        name: wc.name,
        role: wc.name,
        requiredRole: wc.name,
        capacity: 999,
        order: 1,
        status: 'ACTIVA',
      }]
    }
  })
  return map
}

export const WORKSTATIONS_BY_LINE = buildWorkstations()

export function getWorkstationsForLine(lineId) {
  return WORKSTATIONS_BY_LINE[lineId] || []
}

/* Reemplaza el guard antiguo `hasLineStations()` (catalog.js, atado a
   type===PRODUCTION_LINE) para decidir si el flujo de asignacion debe
   abrir el picker "Elige una estación" (dndAssign.jsx) -- 2026-08-26,
   necesario porque ahora Accesorios/Paletizado/Insumos/Midea tienen
   multiples estaciones reales sin ser WC LINEA. Basado en CANTIDAD real
   de estaciones, no en el tipo de area: cualquier area con mas de 1
   estacion (linea real, custom-plan, o LINE_LIKE) activa el picker;
   cualquier area con exactamente 1 estacion generica sigue asignando
   directo, sin preguntar, exactamente como hoy. */
export function hasMultipleStations(areaId) {
  return getWorkstationsForLine(areaId).length > 1
}

export function getWorkstation(lineId, stationName) {
  return getWorkstationsForLine(lineId).find(w => w.name === stationName) || null
}

export function getLineCapacity(lineId) {
  return getWorkstationsForLine(lineId).reduce((sum, w) => sum + w.capacity, 0)
}
