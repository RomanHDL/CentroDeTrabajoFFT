import dayjs from 'dayjs'
import { WORK_CENTERS, SHIFT_HOURS, workCenterById } from './catalog'
import { employeesByWorkCenter } from './employees'
import { mulberry32 } from './mockSeed'

/* ─────────────────────────────────────────────
   ProductionRecord (concepto):
   { id, date, shift, workCenterId, lineId, stationId,
     employeeId?, quantity, hour, target, createdAt }

   Por ahora los "registros" viven pre-agregados en estas
   estructuras mock (hora/dia/semana). El shape de arriba
   es el que debe respetar una futura fuente real/API.
   ───────────────────────────────────────────── */

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h >>> 0
}

/* Produccion de HOY por centro de trabajo — snapshot fijo
   para que el dashboard sea legible y reproducible mientras
   no hay fuente real conectada. */
export const CURRENT_PRODUCTION_TODAY = {
  L1: 342, L2: 410, L3: 485, L4: 390, L5: 215, L6: 330, L7: 402, L8: 298, L9: 376, L10: 421,
  CAJAS: 276, DMT: 150, PAL: 190, ACC: 72, CONVEYOR: 308,
}

export const OPERATIONAL_STATUS_BY_WC = {
  L1: 'OPERANDO', L2: 'OPERANDO', L3: 'OPERANDO', L4: 'OPERANDO', L5: 'ATENCION',
  L6: 'OPERANDO', L7: 'OPERANDO', L8: 'OPERANDO', L9: 'OPERANDO', L10: 'OPERANDO',
  CAJAS: 'OPERANDO', DMT: 'ATENCION', PAL: 'OPERANDO', ACC: 'ATENCION', CONVEYOR: 'OPERANDO',
}

/* Curva tipica de un turno matutino: arranque, pico
   media manana, caida en la hora de comida, recuperacion. */
const HOUR_WEIGHTS = [0.11, 0.135, 0.145, 0.155, 0.135, 0.09, 0.12, 0.11]

function hourlySeriesFromTotal(total) {
  let allocated = 0
  const series = HOUR_WEIGHTS.map((w, idx) => {
    if (idx === HOUR_WEIGHTS.length - 1) {
      return { hour: SHIFT_HOURS[idx], quantity: Math.max(0, total - allocated) }
    }
    const qty = Math.round(total * w)
    allocated += qty
    return { hour: SHIFT_HOURS[idx], quantity: qty }
  })
  return series
}

export function hourlySeriesFor(workCenterId, total = CURRENT_PRODUCTION_TODAY[workCenterId] || 0) {
  return hourlySeriesFromTotal(total)
}

export function lastHourDelta(workCenterId) {
  const series = hourlySeriesFor(workCenterId)
  return series[series.length - 1]?.quantity || 0
}

/* Produccion por estacion dentro de una linea, proporcional
   al personal asignado a cada estacion (unica base disponible
   sin inventar datos por estacion que no existen). */
export function stationBreakdown(workCenterId) {
  const emps = employeesByWorkCenter(workCenterId)
  const total = CURRENT_PRODUCTION_TODAY[workCenterId] || 0
  if (!emps.length) return []

  const counts = {}
  emps.forEach((e) => { counts[e.station] = (counts[e.station] || 0) + 1 })
  const stations = Object.keys(counts)
  const headcount = emps.length

  let allocated = 0
  return stations.map((station, idx) => {
    const isLast = idx === stations.length - 1
    const qty = isLast
      ? Math.max(0, total - allocated)
      : Math.round(total * (counts[station] / headcount))
    if (!isLast) allocated += qty
    return { station, personnel: counts[station], production: qty }
  })
}

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

function todayWeekdayIndex() {
  const isoDay = dayjs().day() // 0=Dom ... 6=Sab
  if (isoDay >= 1 && isoDay <= 5) return isoDay - 1
  return 4 // fin de semana: referencia al ultimo dia habil (viernes)
}

/* Produccion semanal (Lunes-Viernes) por centro de trabajo.
   El dia de "hoy" toma el snapshot real de CURRENT_PRODUCTION_TODAY;
   el resto de los dias se genera de forma determinista (mismo
   resultado siempre) a partir de la meta configurada. */
export function weeklyProductionFor(workCenterId) {
  const wc = workCenterById(workCenterId)
  const target = wc?.dailyTarget || 0
  const rng = mulberry32(hashString(`${workCenterId}-week`))
  const todayIdx = todayWeekdayIndex()

  return WEEKDAY_LABELS.map((day, idx) => {
    const production = idx === todayIdx
      ? (CURRENT_PRODUCTION_TODAY[workCenterId] || 0)
      : Math.round(target * (0.85 + rng() * 0.28))
    return {
      day,
      production,
      target,
      cumplimiento: target > 0 ? Math.round((production / target) * 100) : 0,
    }
  })
}

export function weeklyTotals() {
  return WEEKDAY_LABELS.map((day, idx) => {
    let production = 0
    let target = 0
    WORK_CENTERS.forEach((wc) => {
      const row = weeklyProductionFor(wc.id)[idx]
      production += row.production
      target += row.target
    })
    return { day, production, target, cumplimiento: target > 0 ? Math.round((production / target) * 100) : 0 }
  })
}

/* Tendencia por hora agregada de TODAS las lineas/areas —
   usada en el dashboard general. */
export function hourlyTrendTotal() {
  return SHIFT_HOURS.map((hour, idx) => {
    const quantity = WORK_CENTERS.reduce((sum, wc) => {
      const series = hourlySeriesFor(wc.id)
      return sum + (series[idx]?.quantity || 0)
    }, 0)
    return { hour, quantity }
  })
}

/* Produccion de un dia arbitrario (para la vista "Produccion
   diaria" con selector de fecha). Si la fecha es hoy usa el
   snapshot real; para cualquier otra fecha genera un valor
   determinista basado en la fecha, para que la misma fecha
   siempre regrese el mismo numero. */
export function dailyProductionFor(workCenterId, dateISO) {
  const wc = workCenterById(workCenterId)
  const target = wc?.dailyTarget || 0
  const isToday = dateISO === dayjs().format('YYYY-MM-DD')
  let production
  if (isToday) {
    production = CURRENT_PRODUCTION_TODAY[workCenterId] || 0
  } else {
    const rng = mulberry32(hashString(`${workCenterId}-${dateISO}`))
    production = Math.round(target * (0.75 + rng() * 0.4))
  }
  return {
    production,
    target,
    hourly: hourlySeriesFromTotal(production),
    cumplimiento: target > 0 ? Math.round((production / target) * 100) : 0,
  }
}

/* Vista "Produccion diaria": desglose por linea/area para
   una fecha arbitraria. */
export function dailyLineBreakdown(dateISO) {
  return WORK_CENTERS.map((wc) => {
    const day = dailyProductionFor(wc.id, dateISO)
    return { id: wc.id, name: wc.name, ...day }
  })
}

/* Vista "Produccion diaria": tendencia por hora agregada
   para una fecha arbitraria. */
export function dailyHourlyTotal(dateISO) {
  const perLine = WORK_CENTERS.map(wc => dailyProductionFor(wc.id, dateISO).hourly)
  return SHIFT_HOURS.map((hour, idx) => ({
    hour,
    quantity: perLine.reduce((sum, series) => sum + (series[idx]?.quantity || 0), 0),
  }))
}
