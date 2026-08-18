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

/* Cantidad de estaciones por centro de trabajo — NO todas iguales.
   LINEA0 y LINEA1 quedan mas grandes porque el snapshot real de BASE
   les tiene mas gente (10 y 7). Paletizado y Accesorios tambien se
   ajustaron hacia arriba porque en la realidad tienen mucha gente
   (12 y 15 respectivamente) — no tendria sentido dejarlos en 4-5
   estaciones si ahi trabajan muchas mas personas que eso. El resto de
   las lineas (2-10) quedan en 5 o 6 segun lo que confirmaste; ajusta
   estos numeros libremente cuando tengan el dato exacto por linea. */
const STATION_COUNT_BY_LINE = {
  LINEA0: 10,
  LINEA1: 7,
  LINEA2: 5, LINEA3: 6, LINEA4: 6, LINEA5: 6,
  LINEA6: 5, LINEA7: 5, LINEA8: 5, LINEA9: 5, LINEA10: 5,
  CAJAS: 4, DMT: 6, PALETIZADO: 12, ACCESORIOS: 16, CONVEYOR: 5, CALIDAD: 7,
  // HIGH_VALUE, CAPACITACION, TEAM_LEADER, SOPORTE, LIMPIEZA, GERENTE,
  // SUPERVISOR: sin numero real de estaciones especificado todavia,
  // usan el default de abajo (5) hasta que se configure.
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
