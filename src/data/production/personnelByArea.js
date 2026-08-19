import { REAL_PERSONNEL_SNAPSHOT, BASE_SNAPSHOT_DATE } from './realPersonnelSnapshot'
import { WORK_CENTERS, workCenterById } from './catalog'
import { FFT_LINE_IDS, colorGroupForArea } from './layoutZones'
import { getMovementsForDate, getAssignmentsForDate, getEmployeeById, getAssignableEmployees } from '../personnel/repository'

export { BASE_SNAPSHOT_DATE }

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

  REAL_PERSONNEL_SNAPSHOT.forEach((p) => {
    if (touchedToday.has(p.id)) return
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
  const withIdeal = WORK_CENTERS.filter((w) => w.idealHeadcount != null)
  const idealTotal = withIdeal.reduce((sum, w) => sum + w.idealHeadcount, 0)
  const realTotal = withIdeal.reduce((sum, w) => sum + getAreaHeadcount(w.id), 0)
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
