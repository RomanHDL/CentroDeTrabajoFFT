/* ─────────────────────────────────────────────
   Workstation — catalogo de estaciones por linea.

   Cada linea tiene su propia cantidad de estaciones
   (configurable, NO hardcodeado a 5 para todas). El nombre
   de estacion es el mismo vocabulario que ya existia en
   data/production/catalog.js (STATIONS), asi las
   asignaciones (que guardan stationId como el nombre de la
   estacion) siguen siendo compatibles sin cambiar su forma.
   ───────────────────────────────────────────── */

import { WORK_CENTERS, STATIONS } from '../production/catalog'

/* Etiqueta de rol legible para cada estacion — solo texto de
   presentacion, la compatibilidad de habilidades sigue
   usando el nombre de estacion como vocabulario unico. */
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

/* Cantidad de estaciones por centro de trabajo — a proposito
   NO todas iguales, para dejar claro que es configurable por
   linea (ejemplo pedido: Cajas 4, DMT 6). */
const STATION_COUNT_BY_LINE = {
  L1: 5, L2: 5, L3: 5, L4: 5, L5: 5, L6: 5, L7: 5, L8: 5, L9: 5, L10: 5,
  CAJAS: 4, DMT: 6, PAL: 5, ACC: 4, CONVEYOR: 5,
}

function buildWorkstations() {
  const map = {}
  WORK_CENTERS.forEach((wc) => {
    const count = STATION_COUNT_BY_LINE[wc.id] || 5
    const stations = []
    for (let i = 0; i < count; i += 1) {
      const name = STATIONS[i % STATIONS.length]
      stations.push({
        id: `${wc.id}-${i + 1}`,
        lineId: wc.id,
        name,
        requiredRole: ROLE_LABELS[name] || name,
        capacity: 1,
        order: i + 1,
        status: 'ACTIVA',
      })
    }
    map[wc.id] = stations
  })
  return map
}

export const WORKSTATIONS_BY_LINE = buildWorkstations()

export function getWorkstationsForLine(lineId) {
  return WORKSTATIONS_BY_LINE[lineId] || []
}

export function getWorkstation(lineId, stationName) {
  return getWorkstationsForLine(lineId).find(w => w.name === stationName) || null
}

export function getLineCapacity(lineId) {
  return getWorkstationsForLine(lineId).reduce((sum, w) => sum + w.capacity, 0)
}
