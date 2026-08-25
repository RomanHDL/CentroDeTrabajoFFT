import { REAL_PERSONNEL_SNAPSHOT, BASE_SNAPSHOT_DATE } from './realPersonnelSnapshot'
import { WORK_CENTERS, workCenterById, hasLineStations } from './catalog'
import { FFT_LINE_IDS, colorGroupForArea } from './layoutZones'
import { getMovementsForDate, getAssignmentsForDate, getEmployeeById, getAllEmployees, getAssignableEmployees, getBaselineSuppressed, todayISO } from '../personnel/repository'

export { BASE_SNAPSHOT_DATE }

/* Areas de soporte/administrativas "fijas" (2026-08-24, a peticion
   explicita del usuario): rotan mucho menos que una linea de
   produccion, asi que "Vaciar layout" (ClearLayoutPanel.jsx) nunca
   debe dejarlas en blanco. Accesorios y Paletizado se protegen igual
   pero NO entran en AUTO_ACTIVE_AREAS (el usuario pidio dejarlos tal
   cual estan hoy, sin forzar hora de entrada). Calidad se protege de
   igual forma pero tampoco entra en AUTO_ACTIVE_AREAS (el usuario
   pidio explicitamente que a Calidad no se le ponga hora de entrada
   fija) — ver uso de AUTO_ACTIVE_AREAS en PersonalDeHoyTab.jsx. */
export const FIXED_SUPPORT_AREAS = ['CALIDAD', 'CAPACITACION', 'TEAM_LEADER', 'SOPORTE', 'LIMPIEZA', 'GERENTE', 'SUPERVISOR']
export const AUTO_ACTIVE_AREAS = FIXED_SUPPORT_AREAS.filter((id) => id !== 'CALIDAD')

/* BUG REAL detectado en produccion 2026-08-24: esta lista antes se mantenia a mano (los 7 fijos +
   Accesorios + Paletizado) y se le olvido incluir CT Midea/High Value, CT Conveyor, CT Insumos y
   CT Suministro de material -- "Vaciar layout" tambien las habria vaciado si alguien quedaba ahi
   por snapshot. Ahora se DERIVA del catalogo: todo WORK_CENTER que no sea una linea numerada ni
   CT LINEA 0/Proyecto queda protegido automaticamente, sin mantenimiento manual, para que nunca
   se vuelva a quedar una area nueva sin proteger por accidente. */
export const PROTECTED_FROM_LAYOUT_CLEAR_AREAS = WORK_CENTERS.filter((w) => w.kind !== 'linea' && w.id !== 'PROYECTO').map((w) => w.id)

/* Convierte la ZONA normalizada del snapshot ("LINEA 3") al id del
   catalogo ("LINEA3"). El resto de las zonas ya coinciden 1:1 con
   los ids de catalog.js (PALETIZADO, CAJAS, ACCESORIOS, etc).
   Logica centralizada aqui para que AreasLayoutView y el layout
   interactivo del Dashboard usen exactamente la misma agrupacion.

   Caso especial: "LINEA 0" es el texto crudo que trae BASE, pero NO
   corresponde a una linea FFT real — operativamente es "Linea de
   proyecto" (area independiente, catalog.js id PROYECTO). El dato
   crudo (rawZona) se conserva intacto en el snapshot para no perder
   historial; solo la clasificacion operativa cambia aqui.

   Caso especial: "DMT" tambien es zona cruda real de BASE, pero en
   el plano fisico del piso (confirmado 2026-08-19) DMT y High Value
   son el mismo bloque operativo ("CT MIDEA/HV") — catalog.js ya no
   tiene un area DMT separada, asi que quien traiga esa zona cruda
   se cuenta dentro de HIGH_VALUE. */
function mapAreaZonaToId(areaZona) {
  if (!areaZona) return null
  if (areaZona === 'LINEA 0') return 'PROYECTO'
  if (areaZona.startsWith('LINEA ')) return 'LINEA' + areaZona.split(' ')[1]
  if (areaZona === 'DMT') return 'HIGH_VALUE'
  // INGENIERIA/CAJAS (2026-08-25, a peticion explicita del usuario): esa
  // gente real se cuenta como SUPERVISOR/BOX_PREP respectivamente, no como
  // area propia -- CAJAS SI tiene su propio WORK_CENTER real (BOX_PREP, ver
  // catalog.js), INGENIERIA no. PRODUCCION/CHOFER no necesitan caso especial
  // aqui: ya tienen WORK_CENTER con exactamente ese mismo id (ver catalog.js).
  if (areaZona === 'INGENIERIA') return 'SUPERVISOR'
  if (areaZona === 'CAJAS') return 'BOX_PREP'
  return areaZona
}

/* Snapshot PURO (nunca cambia en runtime) — solo para el/los lugar(es)
   que explicitamente quieren mostrar la referencia historica de BASE
   tal cual se importo, sin mezclar movimientos del dia. */
export function getSnapshotPeopleByArea() {
  const map = {}
  REAL_PERSONNEL_SNAPSHOT.forEach((p) => {
    const areaId = mapAreaZonaToId(p.areaZona)
    if (!areaId) return
    map[areaId] = map[areaId] || []
    map[areaId].push(p)
  })
  return map
}

/* Personal "efectivo" de HOY, por area — la fuente que alimenta
   TODO el REAL de Ideal/Real/Diferencia y el layout visual.

   Modelo: el snapshot de BASE es el punto de partida (para quien
   nadie ha tocado todavia desde la web hoy). En cuanto un empleado
   recibe un movimiento hoy (checkInEmployee/moveEmployee/
   releaseAssignment — repository.js, unica fuente que escribe
   asignaciones), su ubicacion pasa a depender EXCLUSIVAMENTE de esa
   asignacion diaria en vivo: nunca vuelve a su zona historica del
   Excel, y si fue liberado no cuenta en ninguna area (no se "cae"
   de regreso al snapshot). Esto es lo que permite que arrastrar a
   alguien cambie el REAL mostrado (15/20 -> 16/20) sin reescribir
   el snapshot ni crear una segunda fuente de verdad paralela — el
   snapshot nunca se modifica, y la asignacion diaria sigue viviendo
   unicamente en repository.js/store.js (ver nota de persistencia en
   ese archivo: hoy es localStorage, esta capa es agnostica a eso). */
export function getPeopleByArea() {
  const map = {}
  const touchedToday = new Set(getMovementsForDate().map((m) => m.employeeId))
  // Supresion permanente (sin fecha) de la ubicacion de BASE — distinta de
  // "tocado hoy": se agrego 2026-08-21 para que el layout se vea en blanco
  // hasta que alguien reciba una asignacion real, en vez de volver a
  // aparecer solo porque cambio el dia (ver store.js/repository.js).
  const baselineSuppressed = getBaselineSuppressed()

  REAL_PERSONNEL_SNAPSHOT.forEach((p) => {
    if (touchedToday.has(p.id) || baselineSuppressed.has(p.id)) return
    const areaId = mapAreaZonaToId(p.areaZona)
    if (!areaId) return
    map[areaId] = map[areaId] || []
    map[areaId].push(p)
  })

  getAssignmentsForDate().forEach((a) => {
    const employee = getEmployeeById(a.employeeId)
    if (!employee) return
    map[a.areaId] = map[a.areaId] || []
    if (!map[a.areaId].some((x) => x.id === employee.id)) {
      map[a.areaId].push({ id: employee.id, name: employee.name, areaZona: null, rawZona: null, asistencia: null })
    }
  })

  return map
}

/* IDs de personal ubicado HOY unicamente por el snapshot historico
   (BASE), sin incluir a quien ya tiene una asignacion/movimiento REAL
   de hoy (checkInEmployee/moveEmployee). Existe para "Vaciar layout"
   (ClearLayoutPanel.jsx): ese boton promete suprimir la ubicacion
   HISTORICA, no borrar una asignacion real que un lider/supervisor
   acaba de hacer de verdad — bug real encontrado 2026-08-21 (produccion:
   se uso el boton y se suprimieron tambien asignaciones reales de ese
   dia, no solo el snapshot). getPeopleByArea() ya excluye estos mismos
   ids del snapshot (touchedToday/baselineSuppressed) por las mismas
   razones; esta funcion aisla SOLO esa parte para poder suprimirla sin
   tocar lo que ya es una asignacion real de hoy. */
export function getBaselineOnlyPeopleIds() {
  const touchedToday = new Set(getMovementsForDate().map((m) => m.employeeId))
  const baselineSuppressed = getBaselineSuppressed()
  const protectedAreas = new Set(PROTECTED_FROM_LAYOUT_CLEAR_AREAS)
  const ids = []
  REAL_PERSONNEL_SNAPSHOT.forEach((p) => {
    if (touchedToday.has(p.id) || baselineSuppressed.has(p.id)) return
    const areaId = mapAreaZonaToId(p.areaZona)
    if (!areaId || protectedAreas.has(areaId)) return
    ids.push(p.id)
  })
  return ids
}

/* Inverso exacto de getBaselineOnlyPeopleIds — quien HOY esta suprimido
   (por "Vaciar layout") pero su zona historica de BASE es una CT LINEA (o
   "PRODUCCION" generico, mismo alcance que suppressBaselinePlacement/
   suppress-baseline.js). Para "Restaurar layout de las CT LINEA"
   (RestoreLayoutPanel.jsx): estos son exactamente a quienes hay que
   quitarles la supresion para que vuelvan a aparecer por snapshot. */
export function getSuppressedLinePeopleIds() {
  const baselineSuppressed = getBaselineSuppressed()
  const protectedAreas = new Set(PROTECTED_FROM_LAYOUT_CLEAR_AREAS)
  const ids = []
  REAL_PERSONNEL_SNAPSHOT.forEach((p) => {
    if (!baselineSuppressed.has(p.id)) return
    const areaId = mapAreaZonaToId(p.areaZona)
    if (!areaId || protectedAreas.has(areaId)) return
    ids.push(p.id)
  })
  return ids
}

/* Pase de lista "efectivo" de HOY — para la pestaña Personal del
   Centro de Trabajo. A peticion del usuario (2026-08-20), esta
   tabla ya NO exige que alguien registre manualmente a cada
   persona: parte de getPeopleByArea() (mismo calculo que ya usa el
   layout) y solo LLENA el hueco de quien todavia no tiene una fila
   de asignacion real hoy, sin pisarla si ya existe (checkInEmployee/
   moveEmployee siguen siendo la fuente de verdad en cuanto alguien
   se registra o se mueve de verdad).

   Para no inventar datos que no tenemos: una fila "por snapshot"
   nunca lleva hora de entrada ni turno (esos campos quedan null; la
   UI los muestra como "—", nunca una hora inventada), y en Linea 1..10
   (hasLineStations) tampoco lleva una estacion especifica (Montaje/
   Prueba electrica/etc. — BASE no dice quien hace que puesto) — solo
   en areas WORK_AREA/SUPPORT_AREA se usa el puesto generico real que
   workstations.js ya define para ese area (nunca uno de linea).

   Esta funcion NO se usa para exportar a Excel (excelExport.js sigue
   usando getTodayRoster() de repository.js, que refleja SOLO
   check-ins/movimientos reales — el pase de lista exportable debe
   seguir siendo evidencia real, no una fila sintetica). */
export function getEffectiveTodayRoster() {
  const employeesById = new Map(getAllEmployees().map((e) => [e.id, e]))

  const real = getAssignmentsForDate().map((a) => ({
    ...a,
    employee: employeesById.get(a.employeeId) || null,
    source: 'REGISTRO',
  }))
  const realIds = new Set(real.map((r) => r.employeeId))

  const byArea = getPeopleByArea()
  const synthetic = []
  Object.keys(byArea).forEach((areaId) => {
    byArea[areaId].forEach((p) => {
      if (realIds.has(p.id)) return
      const employee = employeesById.get(p.id) || null
      synthetic.push({
        id: `snapshot-${p.id}`,
        employeeId: p.id,
        employeeNumber: employee?.employeeNumber || 'PENDIENTE',
        employee,
        areaId,
        stationId: hasLineStations(areaId) ? null : (workCenterById(areaId)?.name || areaId),
        checkInAt: null,
        shift: null,
        date: todayISO(),
        source: 'SNAPSHOT',
      })
    })
  })

  return [...real, ...synthetic].sort((a, b) => ((a.checkInAt || '') > (b.checkInAt || '') ? -1 : 1))
}

export function getPeopleWithoutArea() {
  return REAL_PERSONNEL_SNAPSHOT.filter((p) => !p.areaZona)
}

/* Donde aparece HOY una persona (efectivo: snapshot o vivo, lo
   mismo que ve el layout) — para mostrarlo en el buscador aunque
   nunca haya sido "tocada" via check-in/drag (p. ej. alguien del
   snapshot de Calidad que todavia nadie movio hoy). null si no
   aparece en ninguna area. */
export function getEffectiveAreaForEmployee(employeeId) {
  const byArea = getPeopleByArea()
  for (const areaId of Object.keys(byArea)) {
    if (byArea[areaId].some((p) => p.id === employeeId)) return areaId
  }
  return null
}

/* Personal disponible para asignar (fuente del drag & drop): toda
   persona ELEGIBLE (getAssignableEmployees — activa, no baja) que
   HOY no tiene ubicacion efectiva en ninguna area (nunca tuvo zona,
   o fue liberada hoy). Calculado, nunca listado a mano. Si el
   resultado es 0 es correcto: significa que todo el personal
   elegible ya esta ubicado en alguna area hoy. */
export function getAvailablePersonnelToday() {
  const placedIds = new Set(Object.values(getPeopleByArea()).flat().map((p) => p.id))
  return getAssignableEmployees().filter((e) => !placedIds.has(e.id))
}

/* Indicador honesto de "Area operando" del layout — true si hay al
   menos una persona real ubicada en alguna zona hoy (derivado del
   snapshot, no un booleano inventado). */
export function hasAnyPersonnelToday() {
  return Object.keys(getPeopleByArea()).length > 0
}

/* Conteo centralizado por area — una sola fuente para layout del
   Dashboard, Centro de Trabajo y "Resumen por area", asi si cambia
   la fuente (BASE -> asignacion real) solo cambia aqui. */
export function getAreaHeadcount(areaId) {
  return getPeopleByArea()[areaId]?.length || 0
}

/* Ideal (plantilla oficial, catalog.js) vs Real (SIEMPRE calculado
   aqui desde el personal real, nunca guardado a mano) — nunca se
   duplica manualmente el valor "real": si cambia la fuente de datos,
   este numero cambia solo. Si el area no tiene plantilla oficial
   definida (ideal null), no se inventa una — status queda
   'SIN_PLANTILLA' y la UI debe mostrar "Sin plantilla definida". */
export function getAreaStaffing(areaId) {
  const wc = workCenterById(areaId)
  const real = getAreaHeadcount(areaId)
  const ideal = wc?.idealHeadcount ?? null
  if (ideal == null) return { ideal: null, real, diff: null, status: 'SIN_PLANTILLA' }
  return { ideal, real, diff: real - ideal, status: real >= ideal ? 'COMPLETA' : 'FALTAN' }
}

/* Total general de plantilla — suma SOLO sobre areas con ideal
   oficial definido (asi el total coincide exactamente con la tabla
   IDEAL/REAL/DIFERENCIA proporcionada, sin mezclar areas sin
   plantilla como Calidad). */
export function getStaffingTotals() {
  // BUG REAL detectado en produccion 2026-08-24: realTotal solo sumaba areas CON idealHeadcount
  // definido, asi que Calidad/Insumos/Suministro de material (idealHeadcount null -- nunca tuvieron
  // meta numerica en el Excel origen) quedaban fuera del "personal presente hoy" del Dashboard aunque
  // tuvieran gente real. idealTotal SI debe restringirse a areas con meta (no tiene sentido sumar
  // null), pero realTotal debe contar a TODOS, tengan meta o no.
  const withIdeal = WORK_CENTERS.filter((w) => w.idealHeadcount != null)
  const idealTotal = withIdeal.reduce((sum, w) => sum + w.idealHeadcount, 0)
  const realTotal = WORK_CENTERS.reduce((sum, w) => sum + getAreaHeadcount(w.id), 0)
  return {
    idealTotal,
    realTotal,
    diff: realTotal - idealTotal,
    coveragePct: idealTotal > 0 ? Math.round((realTotal / idealTotal) * 1000) / 10 : null,
  }
}

/* Todas las personas de las 10 lineas de FFT juntas, con la linea
   de cada quien anotada (para el panel agregado de FFT). */
export function getFftPeopleWithLine() {
  const byArea = getPeopleByArea()
  return FFT_LINE_IDS.flatMap((lineId) => {
    const line = workCenterById(lineId)
    return (byArea[lineId] || []).map((p) => ({ ...p, lineId, lineName: line?.name || lineId }))
  })
}

/* Resumen por area para las cards de "Resumen por area" — FFT se
   trata como un solo bloque (suma de sus 10 lineas), el resto de
   las areas del catalogo van una por una. Ordenado por personal
   descendente; las areas en 0 se conservan (no se ocultan del
   todo) para que "ver todas" pueda mostrarlas. */
export function getAllAreaSummaries() {
  const byArea = getPeopleByArea()
  const fftCount = FFT_LINE_IDS.reduce((sum, id) => sum + (byArea[id]?.length || 0), 0)
  const fftIdeal = FFT_LINE_IDS.reduce((sum, id) => sum + (workCenterById(id)?.idealHeadcount || 0), 0)
  const entries = [
    { id: 'FFT', name: 'FFT', count: fftCount, ideal: fftIdeal, group: colorGroupForArea('LINEA1') },
    ...WORK_CENTERS.filter((w) => w.kind === 'area').map((w) => ({
      id: w.id, name: w.name, count: byArea[w.id]?.length || 0, ideal: w.idealHeadcount ?? null, group: colorGroupForArea(w.id),
    })),
  ]
  return entries.sort((a, b) => b.count - a.count)
}
