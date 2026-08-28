/* ─────────────────────────────────────────────
   Catalogo central de Areas de Trabajo para el modulo
   Control de Produccion.

   La mayoria de estas areas vienen directamente de la hoja LAYOUT del
   archivo real LAYOUT FFT.xlsx (tabla resumen AREA/IDEAL/REAL,
   columnas AV:AY) — no son inventadas. BOX_PREP (ver nota mas abajo) viene
   de otra fuente real distinta: el campo `areaZona` a nivel empleado en
   realPersonnelSnapshot.js. `isProduction` distingue las lineas/areas que
   producen piezas de las areas de soporte, liderazgo y capacitacion que
   tambien aparecen ahi (el Excel mezcla ambos tipos en la misma tabla, sin
   marcarlos, asi que la clasificacion aqui es nuestra lectura de esa tabla).

   `dailyTarget` se deja en null a proposito: este Excel es de
   PERSONAL, no trae metas de produccion reales, y no vamos a
   inventar una meta. El dia que exista una fuente real de
   produccion, se llena desde ahi.

   CAJAS se quito de aqui el 2026-08-21 y quedo asi hasta el 2026-08-25,
   cuando el usuario aclaro que esa zona es realmente "Box Prep" -- ver
   WORK_CENTER 'BOX_PREP' mas abajo y mapAreaZonaToId (personnelByArea.js)
   para el mapeo real (y que "Box Prep" es la MISMA caja que ya existia
   junto a "PNP/POC/PEN" en el plano 2D -- no una segunda). INGENIERIA se
   cuenta como SUPERVISOR (sin WORK_CENTER propio). CHOFER/PRODUCCION
   (2026-08-25, correccion explicita del usuario: NO merecen su propia area
   -- son gente real de linea sin linea especifica conocida) NO tienen
   WORK_CENTER propio; se muestran en "Personal sin area asignada"
   (getPeopleWithoutArea, personnelByArea.js) con su zona cruda como
   etiqueta para poder identificarlos, en vez de un bloque nuevo. Ninguna de
   estas migraciones borro a nadie del snapshot real, solo cambio si
   aparecen agrupados en un bloque visual.
   ───────────────────────────────────────────── */

export const SHIFT_OPTIONS = ['Matutino', 'Vespertino', 'Nocturno']

export const CURRENT_SHIFT = 'Matutino'

/* Ventana horaria del turno Matutino, usada para la
   grafica de produccion por hora (cuando exista fuente real). */
export const SHIFT_HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00']

/* Los 3 turnos oficiales reales del sistema (2026-08-26, a peticion
   explicita del usuario), con su ventana horaria real -- DISTINTO de
   SHIFT_HOURS de arriba (esa es solo el eje de una grafica, nunca
   represento el horario real de un turno). Se usa hoy para mostrar
   "Turno actual" con su horario real en CT LINEA; no reemplaza
   SHIFT_OPTIONS (los 3 nombres que ya usan los selects de
   Registrar/Autoasignar/Mover -- Matutino/Vespertino/Nocturno,
   fuera de alcance de este cambio, no se tocan para no invalidar
   turnos ya guardados). */
export const OFFICIAL_SHIFTS = [
  { id: 'MATUTINO', label: 'Matutino', start: '07:00', end: '17:10' },
  { id: 'TIEMPO_EXTRA', label: 'Tiempo extra', start: '17:11', end: '22:00' },
  { id: 'NOCHE', label: 'Noche', start: '22:01', end: '07:00' },
]

/* Logica central reutilizable de "que turno es ahora" (2026-08-26, a
   peticion explicita del usuario -- antes cada vista improvisaba su
   propio calculo, y OperationalAreaDetail.jsx llego a mostrar el
   horario mezclando por error SHIFT_HOURS, el eje de una grafica, como
   si fuera el horario real de un turno: "07:00 - 14:00" en vez de
   "07:00 AM - 05:10 PM"). Limites exactos sobre OFFICIAL_SHIFTS,
   verificados con casos explicitos (ver scripts/verify-line-logic.mjs):
     06:59->Noche  07:00->Matutino  17:10->Matutino  17:11->Tiempo extra
     22:00->Tiempo extra  22:01->Noche  23:59->Noche  00:00->Noche
   Noche cruza medianoche, por eso NUNCA se implementa como
   "hora >= 22:01 && hora <= 07:00" (eso nunca es true) -- aqui es
   simplemente "todo lo que no cae en Matutino ni Tiempo extra".
   Nunca toca Attendance/checkInAt reales: esto solo decide que turno
   MOSTRAR ahora mismo, igual que ya hacia CT LINEA a mano. */
function minutesOfDay(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function getShiftSchedule(shiftIdOrLabel) {
  return OFFICIAL_SHIFTS.find((s) => s.id === shiftIdOrLabel || s.label === shiftIdOrLabel) || null
}

export function getCurrentShift(date = new Date()) {
  const minutes = date.getHours() * 60 + date.getMinutes()
  const [matutino, tiempoExtra, noche] = OFFICIAL_SHIFTS
  if (minutes >= minutesOfDay(matutino.start) && minutes <= minutesOfDay(matutino.end)) return matutino
  if (minutes >= minutesOfDay(tiempoExtra.start) && minutes <= minutesOfDay(tiempoExtra.end)) return tiempoExtra
  return noche
}

export function formatShiftSchedule(shift) {
  if (!shift) return ''
  const to12 = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
  }
  return `${to12(shift.start)} – ${to12(shift.end)}`
}

/* Fecha operativa -- el turno Noche cruza medianoche, asi que entre
   00:00 y 06:59 la jornada que sigue activa empezo AYER (22:01 del dia
   anterior). NOTA (2026-08-26): no existe hoy ningun concepto de
   "fecha operativa" en la capa de datos -- todo el sistema usa el dia
   calendario simple (repository.js/todayISO -> dayjs().format('YYYY-MM-DD'))
   sin ajuste por turno. Esta funcion se agrega como utilidad adicional
   a peticion explicita del usuario, pero NO se conecta a todayISO() ni
   a ninguna logica existente de particionado por dia -- hacerlo seria
   rediseñar como se agrupan las asignaciones por fecha, fuera de
   alcance de esta correccion (solo pedida para mostrar turno/horario). */
export function getOperationalDate(date = new Date()) {
  const shift = getCurrentShift(date)
  const d = new Date(date)
  if (shift.id === 'NOCHE' && d.getHours() < 12) {
    d.setDate(d.getDate() - 1)
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* Entrada por defecto cuando se coloca automaticamente en una
   estacion a alguien que ya esta en una CT LINEA por snapshot/estado
   actual pero sin hora real de entrada (ver repository.js/
   autoFillLineStations) -- nunca una hora inventada distinta. */
export const DEFAULT_LINE_ENTRY_TIME = '07:00'

/* AREA_TYPES — distincion conceptual explicita, para que la UI
   nunca vuelva a asumir "si es un area, entonces tiene estaciones
   de linea":

   PRODUCTION_LINE  -> Linea 1..10. Unicas que usan el template de
                       estaciones/puestos (Montaje, Prueba electrica,
                       Etiquetado, etc. — data/personnel/workstations.js).
   WORK_AREA        -> areas productivas/operativas con su propia
                       forma de trabajar (Paletizado, Accesorios,
                       Cajas, Midea/High Value, Conveyor, Sellado,
                       Insumos, Suministro de material, Linea de
                       proyecto, Calidad). NUNCA reciben el template
                       de estaciones de linea.
   SUPPORT_AREA     -> grupos/funciones de personal, no producen en
                       estaciones (Capacitacion, Team Leader,
                       Soporte, Limpieza, Gerente, Supervisor).

   `idealHeadcount` = plantilla oficial (tabla IDEAL/REAL/DIFERENCIA
   proporcionada). null cuando el area no tiene plantilla oficial
   definida todavia (p. ej. CALIDAD no aparece en esa tabla) — NUNCA
   se inventa un ideal. El "REAL" NUNCA se guarda aqui: siempre se
   calcula desde el personal real (personnelByArea.getAreaHeadcount),
   para no duplicar una fuente de verdad. */
export const AREA_TYPES = {
  PRODUCTION_LINE: 'PRODUCTION_LINE',
  WORK_AREA: 'WORK_AREA',
  SUPPORT_AREA: 'SUPPORT_AREA',
}

/* Plantillas de puesto por rol (2026-08-26, "Reestructuracion operativa
   FFT + puestos + plantillas", a peticion explicita del usuario) --
   UNICA fuente de verdad para cuantos puestos de cada rol tiene un area,
   consumida por workstations.js (genera los slots individuales reales,
   "Surtidor de Accesorios 1".."7", nunca un solo slot "x7") Y por el
   idealHeadcount de WORK_CENTERS mas abajo (nunca dos numeros que se
   puedan desincronizar -- Parte 39 del pedido). Contenido tal como lo
   especifico el usuario, no inventado: NUNCA agregar un rol que no
   este aqui, NUNCA inventar cantidades. */
export const CUSTOM_STATION_PLANS = {
  ACCESORIOS: [
    { role: 'Team Leader', count: 1 },
    { role: 'Operador de Compatibilidad', count: 1 },
    { role: 'Surtidor de Accesorios', count: 7 },
    { role: 'Controles', count: 2 },
    { role: 'Armar Bases', count: 2 },
    { role: 'Ayudante General Almacenista', count: 2 },
    { role: 'Ayudante General Recolectar Accesorios', count: 1 },
    { role: 'Tornillería', count: 1 },
    { role: 'Cables', count: 1 },
  ],
  PALETIZADO: [
    // Orden 2026-08-28 (a peticion explicita del usuario, "los de calidad deben
    // ir primero"): Calidad ENCABEZA la distribucion de Paletizado (igual que en
    // cada CT LINEA, ver workstations.js), seguido del Team Leader (lider) --
    // nunca al reves en las areas donde existe Calidad. Las 2 Ayudante General
    // Escaneador van justo despues del lider ("alado del lider", peticion
    // explicita) porque asi las pidio el usuario agrupadas visualmente. El resto
    // de roles conserva su orden relativo de siempre.
    //
    // Calidad ahora son 3 puestos (antes 2, "Calidad 1"/"Calidad 2" para
    // Beckham/Patricia): el usuario confirmo que hay una 3a persona de Calidad
    // en Paletizado todavia sin registrar en el sistema -- el puesto "Calidad 3"
    // se agrega ya (disponible, sin ocupante) para que el usuario la registre
    // el la misma app cuando la tenga a la mano.
    { role: 'Calidad', count: 3 },
    { role: 'Team Leader', count: 1 },
    { role: 'Ayudante General Escaneador', count: 2 },
    { role: 'Operador de Flejadora', count: 1 },
    { role: 'Conveyor', count: 2 },
    { role: 'Ayudante General Conveyor', count: 2 },
    // 7 (antes 4) -- 2026-08-27, a peticion explicita del usuario: Paletizado ya estaba a
    // plantilla completa (14/14) y necesitaba puesto real para Beckham y Patricia (reubicados
    // desde WC Calidad, +2). Al investigar se encontro ADEMAS a "Roman" (zona real PALETIZADO
    // desde el snapshot BASE, activo, jamas reconciliado a un puesto real porque el area ya
    // estaba llena) -- +1 mas para que tambien tenga puesto real, sin desplazar a nadie. Se
    // amplia el rol ya existente con mas representacion en el area en vez de inventar un rol
    // nuevo.
    { role: 'Ayudante General Paletizador', count: 7 },
    { role: 'Ayudante General Flejado', count: 2 },
  ],
  /* Insumos fusiona PNP/POC/PEN (decorativa, sin WORK_CENTER propio) +
     Box Prep + Suministro de material en un solo WC (ver
     AREA_DETAIL_GROUPS.INSUMOS mas abajo).

     2026-08-28 ("CORRECCIÓN DE PUESTOS Y ESTACIONES OPERATIVAS", a peticion
     explicita del usuario) -- dos correcciones sobre el plan anterior:
     - "Materia Prima / PNP" baja de 2 a 1 posicion (nunca hubo "PNP 1"/"PNP 2"
       como puestos separados de verdad, era un solo rol con count:2).
     - "Fusión / Burbuja / Bolsas" (antes un solo rol generico x2) se separa
       en 3 puestos reales individuales -- Dry Ice/Burbuja/Bolsas -- porque
       son 3 funciones distintas, no una sola repetida. "Dry Ice" es el
       nombre oficial pedido para lo que antes se mostraba como "Fusión"
       (hielo seco).
     Si alguien ya ocupaba la posicion 2 de Materia Prima/PNP o cualquier
     posicion de Fusión/Burbuja/Bolsas, su asignacion real NUNCA se toca --
     al ya no existir esa estacion en este plan, esa persona aparece sola en
     "Personal sin estación" (ver getPeopleWithoutStation,
     personnelByArea.js), nunca se borra ni se mueve.

     Investigado y confirmado con el usuario (2026-08-28): "Materialista"
     (3) y "Operador de Troqueladora" (1) NO se tocan -- no hay forma de
     determinar con certeza que sean las otras 2 funciones de un "Grupo A"
     de Ayudante General sin inventarlo, asi que se dejan exactamente como
     estaban hasta que el usuario confirme esa reclasificacion aparte. */
  INSUMOS: [
    { role: 'Team Leader', count: 1 },
    { role: 'Materialista', count: 3 },
    { role: 'Ayudante General — Materia Prima / PNP', count: 1 },
    { role: 'Operador de Troqueladora', count: 1 },
    { role: 'Ayudante General — Dry Ice', count: 1 },
    { role: 'Ayudante General — Burbuja', count: 1 },
    { role: 'Ayudante General — Bolsas', count: 1 },
  ],
}

function sumStationPlan(plan) {
  return plan.reduce((sum, r) => sum + r.count, 0)
}

/* Todos los nombres empiezan con "CT " (Centro de Trabajo), tal como
   en el plano fisico real del piso (pizarron, confirmado por el
   usuario 2026-08-19). Actualizacion 2026-08-24 (a peticion explicita
   del usuario): las lineas de produccion (y el CT 0/Proyecto, que se
   dibuja igual que una linea mas) ahora llevan la palabra "LINEA" —
   "CT LINEA 5", ya no "CT 5" — para distinguirlas del resto de areas
   (Calidad, Accesorios, Paletizado, etc.) que conservan su nombre tal
   cual. El `id` interno NO cambia (LINEA1, PROYECTO, etc.): eso
   evitaria tocar mapAreaZonaToId, hasLineStations, workstations.js y
   el snapshot de BASE sin necesidad — solo cambia el texto que se
   muestra. */
/* idealHeadcount de las 11 CT LINEA (LINEA1..10 + PROYECTO/LINEA0) incluye +1
   desde 2026-08-27 (a peticion explicita del usuario, "CAMBIO DEFINITIVO —
   PERSONAL + IDENTIDAD VISUAL"): cada linea gana un puesto real adicional de
   "Calidad" (ver ROLE_LABELS/buildWorkstations en workstations.js), fuera de
   los 5 roles base de siempre -- las posiciones Montaje/Prueba eléctrica/
   Limpieza/Etiquetado/Suministro de Accesorios y sus repeticiones NO
   cambian ni se reordenan (buildWorkstations resta 1 antes de calcular esas
   posiciones, ver la nota junto a LINE_FAMILY_AREA_IDS ahi). El numero base
   original de cada linea (antes de este cambio) queda documentado aqui: */
export const WORK_CENTERS = [
  { id: 'LINEA1', name: 'WC LINEA 1', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 8 }, // 7 + Calidad
  { id: 'LINEA2', name: 'WC LINEA 2', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 }, // 6 + Calidad
  { id: 'LINEA3', name: 'WC LINEA 3', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 }, // 6 + Calidad
  { id: 'LINEA4', name: 'WC LINEA 4', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 }, // 6 + Calidad
  { id: 'LINEA5', name: 'WC LINEA 5', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 7 }, // 6 + Calidad
  { id: 'LINEA6', name: 'WC LINEA 6', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 8 }, // 7 + Calidad
  { id: 'LINEA7', name: 'WC LINEA 7', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 8 }, // 7 + Calidad
  { id: 'LINEA8', name: 'WC LINEA 8', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 8 }, // 7 + Calidad
  { id: 'LINEA9', name: 'WC LINEA 9', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 8 }, // 7 + Calidad
  { id: 'LINEA10', name: 'WC LINEA 10', kind: 'linea', type: AREA_TYPES.PRODUCTION_LINE, isProduction: true, dailyTarget: null, idealHeadcount: 8 }, // 7 + Calidad
  { id: 'PROYECTO', name: 'WC LINEA 0', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 11 }, // 10 + Calidad
  /* Paletizado/Accesorios (2026-08-26, a peticion explicita del usuario):
     idealHeadcount ya NO es un numero mantenido a mano -- se deriva de
     CUSTOM_STATION_PLANS de arriba (suma de puestos reales configurados),
     para que nunca existan dos numeros (Dashboard vs Detail) que se
     puedan desincronizar (Parte 39 del pedido, "una sola fuente"). */
  { id: 'PALETIZADO', name: 'WC Paletizado', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: sumStationPlan(CUSTOM_STATION_PLANS.PALETIZADO) },
  { id: 'ACCESORIOS', name: 'WC Accesorios', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: sumStationPlan(CUSTOM_STATION_PLANS.ACCESORIOS) },
  /* CONVEYOR se dividio en dos areas reales independientes (2026-08-25,
     a peticion explicita del usuario): el plano fisico (OperatingFloorPlan.jsx)
     dibuja "CONVEYOR PRINCIPAL"/"CONVEYOR SECUNDARIO" como dos barras
     separadas desde antes, pero solo existia UN area real 'CONVEYOR'
     en el catalogo -- no se podia asignar personal a cada una por
     separado. Ahora cada una es su propio WORK_CENTER (idealHeadcount
     1 cada una, igual que el 'CONVEYOR' original combinado en 1, pero
     ahora reflejando que son dos bandas fisicas reales). El id viejo
     'CONVEYOR' se quito del catalogo -- nadie tenia personal real ahi
     al momento del cambio (real=0), asi que no hubo que migrar ninguna
     asignacion existente. La zona fantasma "CT Conveyor" (singular) que
     seguia viviendo en layoutZones.js/WorkAreaMap.jsx apuntando al id viejo
     'CONVEYOR' se eliminó el 2026-08-25 (bug real reportado por el usuario:
     esa caja nunca podia recibir personal porque el area ya no existia) --
     ver layoutZones.js, PHYSICAL_ZONES ya no la incluye. */
  /* 2026-08-26: a peticion explicita del usuario, Principal y Secundario
     se FUSIONAN en un solo detalle "WC Conveyor General" (mismo patron ya
     probado con Sellado/Insumos, ver AREA_DETAIL_GROUPS mas abajo) -- el
     conveyor es fisicamente una sola estructura metalica continua para
     deslizar cajas, sin puestos fijos reales, asi que ya no tiene sentido
     tratarlos como dos plantillas independientes de 1 persona cada una.
     El plano fisico (OperatingFloorPlan.jsx) SIGUE dibujando dos barras
     separadas -- el usuario pidio explicitamente dejar eso igual ("lo
     puedes dejar así") -- pero ambas abren el mismo detalle fusionado.
     CONVEYOR_PRINCIPAL es el id canonico (se renombra el WC, el id real
     no cambia -- mismo patron que WC Gerente FFT/WC Insumos). Ahora es
     LINE_LIKE (ver LINE_LIKE_AREA_IDS mas abajo): puestos genericos
     "Puesto 1"/"Puesto 2" (nunca nombres de rol inventados), cualquiera
     de los dos puede recibir a cualquier persona -- "que se pueda poner
     el personal en cualquier ubicación del combeyor". idealHeadcount se
     mantiene en 1 aqui (el total real, 2, se deriva sumando los dos
     miembros del grupo via operationalGroupMembers -- nunca se duplica
     el numero a mano). CONVEYOR_SECUNDARIO queda `active:false` (nunca
     se borra, tiene WorkArea real con historial en la DB) y su
     idealHeadcount tambien se conserva sin tocar por la misma razon. */
  { id: 'CONVEYOR_PRINCIPAL', name: 'WC Conveyor General', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 1 },
  { id: 'CONVEYOR_SECUNDARIO', name: 'WC Conveyor Secundario', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 1, active: false },
  /* Midea/HV: en el plano fisico real (pizarron del piso, confirmado
     por el usuario 2026-08-19) son UN solo bloque "CT MIDEA/HV", no
     dos areas separadas. Se fusiona DMT dentro de HIGH_VALUE (ideal
     14+2=16, el total general de plantilla no cambia). Quien tenga
     zona "DMT" en el snapshot de BASE se sigue contando aqui (ver
     personnelByArea.mapAreaZonaToId). */
  { id: 'HIGH_VALUE', name: 'WC Midea / High Value', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: 16 },
  { id: 'CALIDAD', name: 'WC Calidad', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: null },
  { id: 'SELLADO', name: 'WC Sellado', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: null },
  /* WC Insumos y Suministro de Material (2026-08-26, "Reestructuracion
     operativa FFT", a peticion explicita del usuario) -- fusion de PNP/POC/PEN
     (nunca tuvo WORK_CENTER propio, decoracion pura) + Box Prep + Insumos +
     Suministro de material en UN SOLO Work Center activo. idealHeadcount ya
     no es null: se deriva de CUSTOM_STATION_PLANS.INSUMOS (Team Leader,
     Materialista x3, Ayudante General Materia Prima x2, Operador de
     Troqueladora, Ayudante General Fusion/Burbuja/Bolsas x2 = 9), la primera
     plantilla oficial real de esta area. Este id (INSUMOS) es el CANONICO --
     ver AREA_DETAIL_GROUPS mas abajo: BOX_PREP y SUMINISTRO_MATERIAL siguen
     existiendo como entradas (nunca se borran, tienen WorkArea real en la
     DB con historial -- Parte 51 del pedido: "preferir isActive=false a
     DELETE") pero quedan `active:false` y su personal/plantilla se suma
     aqui via operationalGroupMembers, exactamente el mismo patron ya
     probado con SELLADO->CONVEYOR_PRINCIPAL. */
  { id: 'INSUMOS', name: 'WC Insumos y Suministro de Material', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: sumStationPlan(CUSTOM_STATION_PLANS.INSUMOS) },
  { id: 'SUMINISTRO_MATERIAL', name: 'WC Suministro de material', kind: 'area', type: AREA_TYPES.WORK_AREA, isProduction: true, dailyTarget: null, idealHeadcount: null, active: false },
  /* BOX_PREP (2026-08-25): ver nota historica completa mas abajo en el
     comentario original -- 2026-08-26 se fusiono dentro de WC Insumos y
     Suministro de Material (ver AREA_DETAIL_GROUPS), `active:false` pero
     SIN borrar (tiene WorkArea real con historial en la DB). */
  { id: 'BOX_PREP', name: 'WC Box Prep', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: null, active: false },
  { id: 'CAPACITACION', name: 'WC Capacitación', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 2 },
  { id: 'TEAM_LEADER', name: 'WC Team Leader', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 2 },
  /* ENTRENADOR (2026-08-26, WC nuevo a peticion explicita del usuario) --
     personal de entrenamiento/capacitacion correspondiente. idealHeadcount
     null: el usuario no dio un numero de plantilla oficial para esta area
     (solo nombres de personas a resolver), nunca se inventa uno -- se
     muestra "Sin definir" en la UI (misma regla que Calidad/Sellado). */
  { id: 'ENTRENADOR', name: 'WC Entrenador', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: null },
  /* SOPORTE (2026-08-26, a peticion explicita del usuario: "ELIMINAR WC
     SOPORTE" del esquema activo) -- `active:false`, NUNCA DELETE (tiene
     WorkArea real con historial/asignaciones en la DB -- Parte 21/51 del
     pedido: preservar DailyAssignment/EmployeeMovement/Attendance
     historicos, preferir archivar). Desaparece de layout/navegacion/
     Dashboard/conteos activos, pero el id sigue resolviendo (workCenterById)
     para cualquier referencia historica que lo necesite. */
  { id: 'SOPORTE', name: 'WC Soporte', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 3, active: false },
  { id: 'LIMPIEZA', name: 'WC Limpieza', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 2 },
  /* GERENTE (2026-08-26, a peticion explicita del usuario): solo cambia el
     `name` mostrado a "WC Gerente FFT" -- el id interno NO se toca (mismo
     criterio de siempre: renombrar visual nunca reescribe el id real). */
  { id: 'GERENTE', name: 'WC Gerente FFT', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 1 },
  { id: 'SUPERVISOR', name: 'WC Supervisor', kind: 'area', type: AREA_TYPES.SUPPORT_AREA, isProduction: false, dailyTarget: null, idealHeadcount: 1 },
]

/* `active` (2026-08-26, a peticion explicita del usuario -- "eliminar WC
   Soporte del esquema activo, preservando historial") -- un WORK_CENTER
   sin el campo `active` (la inmensa mayoria) se considera activo por
   omision; solo se marca `active:false` explicitamente en las entradas
   archivadas (hoy: SOPORTE, BOX_PREP, SUMINISTRO_MATERIAL). El id NUNCA
   se borra de WORK_CENTERS (workCenterById sigue resolviendolo para
   historial/auditoria) -- `active` solo controla si aparece en
   layout/navegacion/conteos/Dashboard. */
export function isWorkCenterActive(id) {
  return workCenterById(id)?.active !== false
}

export const LINES_ONLY = WORK_CENTERS.filter(w => w.kind === 'linea')
export const PRODUCTION_CENTERS = WORK_CENTERS.filter(w => w.isProduction && w.active !== false)
export const SUPPORT_CENTERS = WORK_CENTERS.filter(w => !w.isProduction && w.active !== false)

/* Unica fuente de verdad de "esta area usa el template de
   estaciones de linea" — antes esto se asumia implicitamente para
   TODO WORK_CENTER (el bug conceptual reportado). */
export function hasLineStations(workCenterId) {
  return workCenterById(workCenterId)?.type === AREA_TYPES.PRODUCTION_LINE
}

/* Allowlist central de areas que usan el detalle operativo nuevo
   (OperationalAreaDetail.jsx, 2026-08-25, a peticion explicita del
   usuario) -- NUNCA se decide por nombre (`if (name === 'CT Accesorios')`),
   siempre por esta lista, calculada a partir de la clasificacion REAL
   que ya existe en WORK_CENTERS (type/kind), con tres excepciones
   explicitas documentadas por el propio usuario:

   - Se EXCLUYE 'PROYECTO' (CT LINEA 0) aunque su type sea WORK_AREA:
     el usuario listo explicitamente "CT LINEA 0" junto con LINEA1..10
     como fuera de alcance ("ya tienen un diseño especial diferente").
   - Se EXCLUYE 'BOX_PREP' pese a que antes tenia una excepcion explicita
     hacia OPERATIONAL: desde 2026-08-26 esta fusionada dentro de
     'INSUMOS' (ver AREA_DETAIL_GROUPS mas abajo) -- su membresia ya no
     hace falta aqui porque canonicalOperationalAreaId('BOX_PREP')
     resuelve a 'INSUMOS', que SI esta en esta lista. Ademas ahora es
     `active:false`.
   - Se EXCLUYE 'CALIDAD' aunque su type sea WORK_AREA (2026-08-26,
     REVERSION explicita del usuario sobre la decision anterior de este
     mismo archivo: "aunque el mockup use WC Calidad como referencia
     visual, la clasificacion real es SUPPORT -- forma parte de las 7
     cards inferiores que deben quedarse con su otra experiencia"). El
     `type`/`isProduction` de CALIDAD en WORK_CENTERS NO se toco (sigue
     reflejando su clasificacion real de produccion del Excel LAYOUT
     FFT.xlsx) -- esto es puramente una excepcion en QUE VISTA DE
     DETALLE usa. Ver SUPPORT_DETAIL_AREA_IDS mas abajo, donde CALIDAD
     se agrega de vuelta explicitamente.
   - Se EXCLUYE 'HIGH_VALUE' (2026-08-26, a peticion explicita del
     usuario: "WC Midea / High Value debe funcionar COMO UNA WC LINEA")
     -- deja de usar OperationalAreaDetail.jsx, pasa a la nueva variante
     LINE_LIKE (ver AREA_DETAIL_VARIANTS mas abajo), que reutiliza la
     experiencia de LineDetailDrawer.jsx sin ser clasificada como LINE
     real (no entra en LINE_FAMILY_AREA_IDS).

   El resto de type===WORK_AREA activo (Paletizado, Accesorios, Conveyor
   Principal/Secundario, Insumos y Suministro de Material) coincide 1:1
   con la lista que el usuario dio por nombre -- confirmado area por
   area, no asumido. Las SUPPORT_AREA restantes (Capacitacion, Team
   Leader, Entrenador, Soporte, Limpieza, Gerente FFT, Supervisor,
   Calidad) y todas las PRODUCTION_LINE quedan fuera, sin excepcion.
   Areas `active:false` (SOPORTE, BOX_PREP, SUMINISTRO_MATERIAL) tambien
   se filtran aqui -- SUMINISTRO_MATERIAL/BOX_PREP igual siguen
   accesibles vía su grupo canonico (INSUMOS).

   CT SELLADO (2026-08-25, correccion explicita del usuario): no tiene
   entrada propia -- "va en Conveyor Principal, ponlos ahi juntos". No
   aparece en ningun lado del plano/mapa (floorPlanZones.js/
   OperatingFloorPlan.jsx la excluyen explicitamente desde antes, a
   peticion tambien explicita del usuario), asi que su unica forma de
   detalle es fusionada dentro del detalle de CONVEYOR_PRINCIPAL -- ver
   AREA_DETAIL_GROUPS/canonicalOperationalAreaId mas abajo. */
// 2026-08-26 (segunda ronda, a peticion explicita del usuario: "copia el
// diseño de WC LINEA... quiero que pongas los puestos de trabajo" para
// las areas que ya tienen CUSTOM_STATION_PLANS) -- ACCESORIOS/PALETIZADO/
// INSUMOS se excluyen de OPERATIONAL igual que HIGH_VALUE: pasan a
// LINE_LIKE_AREA_IDS mas abajo, reutilizan LineDetailDrawer.jsx completo.
export const OPERATIONAL_DETAIL_AREA_IDS = new Set(
  WORK_CENTERS
    .filter((w) => w.type === AREA_TYPES.WORK_AREA && w.active !== false && !['PROYECTO', 'CALIDAD', 'HIGH_VALUE', 'BOX_PREP', 'ACCESORIOS', 'PALETIZADO', 'INSUMOS', 'CONVEYOR_PRINCIPAL'].includes(w.id))
    .map((w) => w.id),
)

/* Grupos de detalle fusionado: la clave es el id "canonico" (el que se
   muestra/al que se asignan movimientos nuevos), el arreglo son TODOS
   los WORK_CENTER reales cuyo personal/plantilla se suma en ese mismo
   detalle. INSUMOS (2026-08-26, "Reestructuracion operativa FFT",
   fusion PNP/POC/PEN + Box Prep + Insumos + Suministro de material en
   un solo WC -- ver Parte 4-6 del pedido) sigue exactamente el mismo
   patron ya probado con Sellado/Conveyor Principal: los ids fusionados
   (BOX_PREP, SUMINISTRO_MATERIAL) NUNCA se borran (tienen WorkArea real
   con historial), solo quedan `active:false` y su personal/plantilla se
   suma en el detalle de INSUMOS via operationalGroupMembers. */
export const AREA_DETAIL_GROUPS = {
  CONVEYOR_PRINCIPAL: ['CONVEYOR_PRINCIPAL', 'CONVEYOR_SECUNDARIO', 'SELLADO'],
  INSUMOS: ['INSUMOS', 'SUMINISTRO_MATERIAL', 'BOX_PREP'],
}

/* Id canonico de detalle para cualquier miembro de un grupo -- SELLADO
   siempre resuelve a CONVEYOR_PRINCIPAL, cualquier otro id se devuelve
   tal cual (no pertenece a ningun grupo). */
export function canonicalOperationalAreaId(workCenterId) {
  const entry = Object.entries(AREA_DETAIL_GROUPS).find(([, members]) => members.includes(workCenterId))
  return entry ? entry[0] : workCenterId
}

/* Todos los ids reales cuyo personal/plantilla debe sumarse para el
   detalle de `workCenterId` -- [workCenterId] solo si no pertenece a
   ningun grupo. */
export function operationalGroupMembers(workCenterId) {
  const canonical = canonicalOperationalAreaId(workCenterId)
  return AREA_DETAIL_GROUPS[canonical] || [canonical]
}

export function usesOperationalDetail(workCenterId) {
  return OPERATIONAL_DETAIL_AREA_IDS.has(canonicalOperationalAreaId(workCenterId))
}

/* Orden central de navegacion Anterior/Siguiente entre TODOS los Work
   Centers reales -- 2026-08-27, a peticion explicita del usuario. Unica
   fuente de verdad: las 3 familias de detalle (LineDetailDrawer/
   OperationalAreaDetail/SupportAreaDetail) consumen exclusivamente
   getWorkCenterNavContext() de abajo, nunca un if/else por componente.

   NO reordena WORK_CENTERS (ese array lo consumen otras vistas -- ej.
   "Resumen por area", EstacionesTab.jsx -- que dependen de su orden
   incidental actual; reordenarlo habria reorganizado esas vistas sin
   que el usuario lo pidiera, ver "NO reorganizar el mapa/layout
   general" en el pedido). Este es un array SEPARADO, de solo ids
   reales, exclusivo para navegacion -- una sola fuente de verdad para
   ESTE proposito, sin desincronizarse porque nunca se copian nombres/
   ids a mano en otro lado, solo se referencia WORK_CENTERS.

   SELLADO se excluye a proposito: no tiene detalle propio, cualquier
   click sobre ella resuelve a CONVEYOR_PRINCIPAL (AREA_DETAIL_GROUPS
   arriba) -- incluirla aqui crearia una parada duplicada/inalcanzable.
   CONVEYOR_SECUNDARIO (2026-08-26) se excluye por la misma razon desde
   que se fusiono con CONVEYOR_PRINCIPAL en "WC Conveyor General" --
   ademas queda `active:false`, asi que el .filter final de abajo ya lo
   habria quitado igual (doble red de seguridad).
   "PNP / POC / PEN" tampoco tiene WORK_CENTER real (decoracion en
   floorPlanZones.js/REFERENCE_ONLY_ZONES) -- nunca se inventa un id
   para poder navegar a algo que no existe. "WC LINEA 11" no existe hoy
   en WORK_CENTERS (confirmado) -- si se agrega en el futuro con
   kind:'linea', LINES_ONLY la recoge sola (mismo patron que las demas
   lineas) y aparece aqui automaticamente, sin volver a tocar este
   archivo.

   2026-08-26 (Reestructuracion operativa FFT): BOX_PREP y
   SUMINISTRO_MATERIAL se quitan de aqui -- igual que SELLADO, ya no
   tienen detalle propio, resuelven a INSUMOS (AREA_DETAIL_GROUPS),
   incluirlos crearia paradas duplicadas. SOPORTE se quita -- archivada
   (`active:false`), ya no es una parada activa. ENTRENADOR se agrega --
   WC nuevo activo. El .filter final ahora es doble red de seguridad:
   nunca deberia quitar nada hoy salvo por accidente, pero TAMBIEN excluye
   defensivamente cualquier id que quede `active:false` en el futuro sin
   que alguien recuerde actualizar este array a mano. */
export const WORK_CENTER_NAVIGATION_ORDER = [
  'PROYECTO',
  ...LINES_ONLY.map((w) => w.id),
  'CONVEYOR_PRINCIPAL',
  'HIGH_VALUE', 'PALETIZADO', 'INSUMOS', 'ACCESORIOS', 'CALIDAD',
  'CAPACITACION', 'TEAM_LEADER', 'ENTRENADOR', 'LIMPIEZA', 'GERENTE', 'SUPERVISOR',
].filter((id) => isWorkCenterActive(id) && WORK_CENTERS.some((w) => w.id === id))

/* previous/current/next dentro de WORK_CENTER_NAVIGATION_ORDER --
   navegacion LINEAL (nunca circular): en el primer elemento `previous`
   es null, en el ultimo `next` es null. `currentAreaId` se resuelve a
   su id canonico primero (ej. SELLADO -> CONVEYOR_PRINCIPAL) para que
   anterior/siguiente funcionen igual sin importar por cual id grupal
   se haya abierto el detalle. */
export function getWorkCenterNavContext(currentAreaId) {
  const canonicalId = currentAreaId ? canonicalOperationalAreaId(currentAreaId) : null
  const idx = canonicalId ? WORK_CENTER_NAVIGATION_ORDER.indexOf(canonicalId) : -1
  if (idx === -1) return { previous: null, current: null, next: null }
  return {
    previous: idx > 0 ? workCenterById(WORK_CENTER_NAVIGATION_ORDER[idx - 1]) : null,
    current: workCenterById(WORK_CENTER_NAVIGATION_ORDER[idx]),
    next: idx < WORK_CENTER_NAVIGATION_ORDER.length - 1 ? workCenterById(WORK_CENTER_NAVIGATION_ORDER[idx + 1]) : null,
  }
}

export function getPreviousWorkCenter(currentAreaId) {
  return getWorkCenterNavContext(currentAreaId).previous
}

export function getNextWorkCenter(currentAreaId) {
  return getWorkCenterNavContext(currentAreaId).next
}

/* ─────────────────────────────────────────────
   CUATRO familias de detalle de area (LINE_LIKE agregada 2026-08-26,
   "Reestructuracion operativa FFT", a peticion explicita del usuario)
   -- configuracion CENTRAL unica, para que ningun componente tenga que
   decidir "if (name === 'CT Capacitación')" por su cuenta:

   LINE         -> LINEA1..10 + PROYECTO (CT LINEA 0) -> LineDetailDrawer.jsx,
                   SIN CAMBIOS.
   LINE_LIKE    -> HIGH_VALUE (WC Midea / High Value) unicamente -- usa la
                   MISMA experiencia visual/funcional de LineDetailDrawer.jsx
                   (estaciones, vacantes, buscador, drag&drop, navegacion)
                   pero NUNCA se le llama "Línea" en la UI ni entra en
                   LINE_FAMILY_AREA_IDS/WORK_CENTERS.kind='linea' -- es una
                   categoria distinta a proposito (Parte 13-14/32 del
                   pedido: "ya no quiero esa logica generica [Operational],
                   pero su nombre sigue siendo WC Midea / High Value").
   OPERATIONAL  -> OPERATIONAL_DETAIL_AREA_IDS (resto de areas WORK_AREA
                   activas sin logica propia) -> OperationalAreaDetail.jsx.
   SUPPORT      -> el resto: Capacitacion, Team Leader, Entrenador, Soporte
                   (archivada pero sigue resolviendo aqui por si alguien
                   navega a su id historico), Limpieza, Gerente FFT,
                   Supervisor, Calidad -> SupportAreaDetail.jsx.

   Las cuatro listas se derivan de WORK_CENTERS sin overlap: cada
   WORK_CENTER real cae en exactamente una. NO se decide por nombre en
   ningun momento -- ver getAreaDetailVariant, unico punto de resolucion
   (AreaDetail.jsx lo consume, no reimplementa la logica). */
export const AREA_DETAIL_VARIANTS = { LINE: 'LINE', LINE_LIKE: 'LINE_LIKE', OPERATIONAL: 'OPERATIONAL', SUPPORT: 'SUPPORT' }

export const LINE_FAMILY_AREA_IDS = new Set([...LINES_ONLY.map((w) => w.id), 'PROYECTO'])

/* WC Midea/High Value + Accesorios/Paletizado/Insumos (2026-08-26,
   segunda ronda -- a peticion explicita del usuario: "copia el diseño
   que tiene los WC LINEA 0 a la 10... quiero que pongas los puestos de
   trabajo... y la cantidad de personal que debe ocupar cada puesto").
   Estas 3 ya tenian CUSTOM_STATION_PLANS (plantilla real por puesto,
   ronda anterior) pero se mostraban con la lista plana de
   OperationalAreaDetail.jsx -- ahora reutilizan LineDetailDrawer.jsx
   completo (grid de estaciones, vacantes, candidatos sugeridos) igual
   que Midea, sin llamarse "línea" en la UI. Set separado (no un boolean
   suelto en WORK_CENTERS) para que agregar otra area LINE_LIKE en el
   futuro sea un solo id agregado aqui.

   CONVEYOR_PRINCIPAL (2026-08-26, tercera ronda -- fusion Conveyor
   Principal/Secundario en "WC Conveyor General") NO tiene
   CUSTOM_STATION_PLANS -- sin plan propio, buildWorkstations() (ver
   workstations.js) genera puestos GENERICOS numerados ("Puesto 1"/
   "Puesto 2", mismo fallback que Midea), exactamente lo que pidio el
   usuario: posiciones intercambiables sobre una estructura fisica sin
   roles fijos, nunca un nombre de rol inventado. */
export const LINE_LIKE_AREA_IDS = new Set(['HIGH_VALUE', 'ACCESORIOS', 'PALETIZADO', 'INSUMOS', 'CONVEYOR_PRINCIPAL'])

export const SUPPORT_DETAIL_AREA_IDS = new Set([
  ...WORK_CENTERS.filter((w) => w.type === AREA_TYPES.SUPPORT_AREA && !['BOX_PREP', 'SUMINISTRO_MATERIAL'].includes(w.id)).map((w) => w.id),
  'CALIDAD',
])

/* Subconjunto de SUPPORT_DETAIL_AREA_IDS (2026-08-28, "REDISEÑO DE 6
   AREAS ESPECIALES", a peticion explicita del usuario) -- estas 6 usan
   SpecialAreaDetail.jsx (vista compacta sin Disponibles para asignar/
   Actividad reciente/dona, ver ese archivo). CALIDAD y SOPORTE (el
   resto de SUPPORT_DETAIL_AREA_IDS) NO estan aqui a proposito -- el
   usuario NO las incluyo en su pedido, siguen usando SupportAreaDetail.jsx
   exactamente igual que antes. Set separado (no se reutiliza
   SUPPORT_DETAIL_AREA_IDS) para que AreaDetail.jsx pueda distinguir sin
   tocar la lista existente. */
export const SPECIAL_AREA_IDS = new Set(['CAPACITACION', 'TEAM_LEADER', 'ENTRENADOR', 'LIMPIEZA', 'GERENTE', 'SUPERVISOR'])

export function getAreaDetailVariant(workCenterId) {
  if (LINE_FAMILY_AREA_IDS.has(workCenterId)) return AREA_DETAIL_VARIANTS.LINE
  // Resuelto por id canonico (no el crudo) -- necesario desde que INSUMOS
  // (LINE_LIKE) fusiona miembros no-canonicos (BOX_PREP/SUMINISTRO_MATERIAL,
  // ver AREA_DETAIL_GROUPS): sin esto, abrir el detalle de un miembro
  // fusionado caia por error en el defensivo de abajo (LINE) en vez de
  // LINE_LIKE. Mismo patron ya usado por el chequeo de SUPPORT mas abajo.
  if (LINE_LIKE_AREA_IDS.has(canonicalOperationalAreaId(workCenterId))) return AREA_DETAIL_VARIANTS.LINE_LIKE
  if (usesOperationalDetail(workCenterId)) return AREA_DETAIL_VARIANTS.OPERATIONAL
  if (SUPPORT_DETAIL_AREA_IDS.has(canonicalOperationalAreaId(workCenterId))) return AREA_DETAIL_VARIANTS.SUPPORT
  // Defensivo: cualquier id futuro que no encaje en ninguna lista (no
  // deberia pasar hoy, las cuatro cubren el 100% de WORK_CENTERS) cae en
  // LINE -- LineDetailDrawer.jsx ya maneja correctamente cualquier area
  // sin estaciones de linea con su propia rama "vista simple", el mismo
  // comportamiento que existia antes de esta clasificacion.
  return AREA_DETAIL_VARIANTS.LINE
}

/* Descripcion editorial corta por area de apoyo (Parte 5 del pedido:
   revisado primero -- NO existe ningun campo de descripcion/categoria
   real en WorkArea/Employee/User, ver prisma/schema.prisma -- por eso
   esta configuracion central nueva, en un solo lugar, fácil de editar).
   Contenido tal como lo especifico el usuario, no inventado por Claude. */
export const SUPPORT_AREA_DESCRIPTIONS = {
  CAPACITACION: 'Área de capacitación y desarrollo',
  TEAM_LEADER: 'Liderazgo y coordinación operativa',
  SOPORTE: 'Soporte operativo / ingeniería',
  LIMPIEZA: 'Soporte de limpieza del área',
  GERENTE: 'Gestión y dirección del área',
  SUPERVISOR: 'Supervisión y coordinación',
}

export const STATIONS = [
  'Montaje',
  'Prueba eléctrica',
  'Limpieza',
  'Etiquetado',
  'Suministro de Accesorios',
  'Empaque',
  'Calidad',
  'Supervisión',
  'Capacitación',
]

/* Estado operativo de un centro de trabajo — independiente
   del % de avance de produccion. SIN_DATOS es el estado por
   defecto mientras no exista una fuente real de produccion;
   nunca se asume "Operando" sin evidencia. */
export const OPERATIONAL_STATUS = {
  OPERANDO: { label: 'Operando', dot: '#10B981', tone: 'ok' },
  ATENCION: { label: 'En atención', dot: '#F59E0B', tone: 'warn' },
  MANTENIMIENTO: { label: 'Mantenimiento', dot: '#3B82F6', tone: 'info' },
  DETENIDO: { label: 'Detenido', dot: '#EF4444', tone: 'bad' },
  SIN_DATOS: { label: 'Sin datos', dot: '#94A3B8', tone: 'default' },
}

export function workCenterById(id) {
  return WORK_CENTERS.find(w => w.id === id)
}

/* Indicadores del area FFT (2026-08-26, "Reestructuracion operativa FFT",
   a peticion explicita del usuario) -- orden oficial 1..4, NUNCA
   reordenar: Eficiencia, Demoras, Produccion, Cumplimiento de programas.
   `hasSource:false` en los 4 -- hoy NO existe ninguna fuente real de
   datos para ninguno (variables operativas de eficiencia, registro de
   demoras, produccion real, o plan/programa vs resultado): no se
   inventa ni un solo porcentaje. La UI (Dashboard) debe mostrar "Sin
   fuente de datos configurada" para cada uno mientras `hasSource` sea
   false -- este objeto es el unico lugar a cambiar (`hasSource:true` +
   agregar el selector real correspondiente) el dia que exista una
   fuente real, sin tocar el componente visual. */
export const FFT_INDICATORS = [
  { id: 'EFICIENCIA', order: 1, label: 'Eficiencia del área FFT', hasSource: false },
  { id: 'DEMORAS', order: 2, label: 'Demoras en área FFT', hasSource: false },
  { id: 'PRODUCCION', order: 3, label: 'Indicador de producción', hasSource: false },
  { id: 'CUMPLIMIENTO_PROGRAMAS', order: 4, label: 'Cumplimiento de programas área FFT', hasSource: false },
]
