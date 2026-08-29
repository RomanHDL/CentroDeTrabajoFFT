import { WORK_CENTERS, SHIFT_HOURS } from './catalog'

/* ─────────────────────────────────────────────
   Este archivo YA NO genera numeros de produccion falsos.

   El Excel de personal (LAYOUT FFT.xlsx) no trae piezas
   producidas ni metas — eso vendria de un sistema de
   produccion real que todavia no esta conectado. Mientras
   no exista esa fuente, todo aqui regresa 0/vacio de forma
   honesta en vez de inventar numeros.

   ProductionRecord (concepto, para cuando exista fuente real):
   { id, date, shift, workCenterId, lineId, stationId,
     employeeId?, quantity, hour, target, createdAt }
   ───────────────────────────────────────────── */

export const HAS_PRODUCTION_SOURCE = false

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

function emptyHourlySeries() {
  return SHIFT_HOURS.map((hour) => ({ hour, quantity: 0 }))
}

export function hourlySeriesFor() {
  return emptyHourlySeries()
}

export function lastHourDelta() {
  return 0
}

/* Produccion por estacion dentro de una linea — sin fuente
   real de produccion ni de personal por estacion todavia. */
export function stationBreakdown() {
  return []
}

export function weeklyProductionFor() {
  return WEEKDAY_LABELS.map((day) => ({ day, production: 0, target: 0, cumplimiento: 0 }))
}

export function weeklyTotals() {
  return WEEKDAY_LABELS.map((day) => ({ day, production: 0, target: 0, cumplimiento: 0 }))
}

/* Tendencia por hora agregada de TODAS las lineas/areas —
   usada en el dashboard general. */
export function hourlyTrendTotal() {
  return emptyHourlySeries()
}

/* Produccion de un dia arbitrario (vista "Produccion diaria"). */
export function dailyProductionFor() {
  return {
    production: 0,
    target: 0,
    hourly: emptyHourlySeries(),
    cumplimiento: 0,
  }
}

/* Vista "Produccion diaria": desglose por linea/area. */
export function dailyLineBreakdown() {
  return WORK_CENTERS.map((wc) => ({ id: wc.id, name: wc.name, ...dailyProductionFor() }))
}

/* Vista "Produccion diaria": tendencia por hora agregada. */
export function dailyHourlyTotal() {
  return emptyHourlySeries()
}
