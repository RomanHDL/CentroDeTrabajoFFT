import { REAL_PERSONNEL_SNAPSHOT, BASE_SNAPSHOT_DATE } from './realPersonnelSnapshot'

export { BASE_SNAPSHOT_DATE }

/* Convierte la ZONA normalizada del snapshot ("LINEA 3") al id del
   catalogo ("LINEA3"). El resto de las zonas ya coinciden 1:1 con
   los ids de catalog.js (PALETIZADO, CAJAS, ACCESORIOS, etc).
   Logica centralizada aqui para que AreasLayoutView y el layout
   interactivo del Dashboard usen exactamente la misma agrupacion. */
function mapAreaZonaToId(areaZona) {
  if (!areaZona) return null
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
