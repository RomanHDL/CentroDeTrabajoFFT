import { REAL_PERSONNEL_SNAPSHOT, BASE_SNAPSHOT_DATE } from './realPersonnelSnapshot'
import { WORK_CENTERS, workCenterById } from './catalog'
import { FFT_LINE_IDS, colorGroupForArea } from './layoutZones'

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
   historial; solo la clasificacion operativa cambia aqui. */
function mapAreaZonaToId(areaZona) {
  if (!areaZona) return null
  if (areaZona === 'LINEA 0') return 'PROYECTO'
  if (areaZona.startsWith('LINEA ')) return 'LINEA' + areaZona.split(' ')[1]
  return areaZona
}

export function getPeopleByArea() {
  const map = {}
  REAL_PERSONNEL_SNAPSHOT.forEach((p) => {
    const areaId = mapAreaZonaToId(p.areaZona)
    if (!areaId) return
    map[areaId] = map[areaId] || []
    map[areaId].push(p)
  })
  return map
}

export function getPeopleWithoutArea() {
  return REAL_PERSONNEL_SNAPSHOT.filter((p) => !p.areaZona)
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
  const entries = [
    { id: 'FFT', name: 'FFT', count: fftCount, group: colorGroupForArea('LINEA1') },
    ...WORK_CENTERS.filter((w) => w.kind === 'area').map((w) => ({
      id: w.id, name: w.name, count: byArea[w.id]?.length || 0, group: colorGroupForArea(w.id),
    })),
  ]
  return entries.sort((a, b) => b.count - a.count)
}
