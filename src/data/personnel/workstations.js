/* ─────────────────────────────────────────────
   Workstation — catalogo de estaciones/puestos.

   REGLA CONCEPTUAL (corregida): el template de estaciones de linea
   (Montaje, Prueba electrica, Limpieza, Etiquetado, etc.) SOLO
   aplica a Linea 1..10 (catalog.js: type === 'PRODUCTION_LINE').
   Antes se generaba ese mismo template para CUALQUIER area del
   catalogo (Paletizado, Cajas, Accesorios, Team Leader, etc.), lo
   cual era incorrecto: esas areas no trabajan por "estaciones de
   linea", tienen su propia forma de operar (ver
   data/production/personnelByArea.getAreaStaffing para el
   ideal/real de cada una).

   Para el resto de las areas (WORK_AREA / SUPPORT_AREA) se genera
   UN solo puesto generico con el nombre de la propia area — esto
   NO se muestra como "Distribucion de estaciones" en la UI, existe
   solo para que el check-in diario (checkInEmployee/moveEmployee,
   que requieren areaId+stationId) siga funcionando para cualquier
   area sin inventar puestos de linea que no existen ahi.
   ───────────────────────────────────────────── */

import { WORK_CENTERS, STATIONS, AREA_TYPES } from '../production/catalog'

/* Etiqueta de rol legible para cada estacion de LINEA — solo texto
   de presentacion, la compatibilidad de habilidades sigue usando
   el nombre de estacion como vocabulario unico. */
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

/* Cantidad de estaciones por LINEA — NO todas iguales. Linea 1
   queda mas grande porque el snapshot real de BASE le tiene mas
   gente (7). El resto (2-10) queda en 5-7 segun lo confirmado;
   ajusta estos numeros libremente cuando tengan el dato exacto. */
const STATION_COUNT_BY_LINE = {
  LINEA1: 7,
  LINEA2: 5, LINEA3: 6, LINEA4: 6, LINEA5: 6,
  LINEA6: 5, LINEA7: 5, LINEA8: 5, LINEA9: 5, LINEA10: 5,
}

function buildWorkstations() {
  const map = {}
  WORK_CENTERS.forEach((wc) => {
    if (wc.type === AREA_TYPES.PRODUCTION_LINE) {
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
    } else {
      // Un solo puesto generico (no es "Montaje/Prueba/..."): permite
      // que el check-in diario funcione para cualquier area sin
      // inventar estaciones de linea que no le corresponden.
      map[wc.id] = [{
        id: `${wc.id}-GENERAL`,
        lineId: wc.id,
        name: wc.name,
        requiredRole: wc.name,
        capacity: wc.idealHeadcount ?? 50,
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

export function getWorkstation(lineId, stationName) {
  return getWorkstationsForLine(lineId).find(w => w.name === stationName) || null
}

export function getLineCapacity(lineId) {
  return getWorkstationsForLine(lineId).reduce((sum, w) => sum + w.capacity, 0)
}
