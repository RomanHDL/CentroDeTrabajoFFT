// Agregacion PURA (sin SQL, sin DB) del "Dashboard FFT" (2026-09-17, a peticion explicita del
// usuario -- pantalla comparativa semanal/mensual para TV de planta, NUEVA y separada de
// "Producción FFT"). Separado de api/production/fft-dashboard.js a proposito, mismo criterio que
// server-lib/binmanager-sql.js/api/production/fft-summary.js: la agregacion/logica de negocio vive
// aqui (facil de razonar y de verificar a mano), el endpoint solo hace el fetch SQL + wiring.
//
// "Pieza" usa EXACTAMENTE la misma definicion que Producción FFT (ver comentario grande en
// server-lib/binmanager-sql.js/buildFilteredBaseCte): este modulo nunca cuenta nada por su cuenta,
// solo recibe filas YA agregadas por dia via getDailyThroughput (la misma funcion que ya usa
// Producción FFT) y las reparte en semanas/meses ISO reales.
//
// "Hoy" es SIEMPRE el que manda el cliente (dayjs().format('YYYY-MM-DD'), hora real del navegador
// de la TV en planta) -- nunca el "hoy" UTC del servidor. Mismo criterio ya documentado
// explicitamente en src/data/dashboard/useDashboardMetrics.js:29-35 (agrupar con UTC del servidor
// desalinea turnos/dia respecto a Mexico). El endpoint (fft-dashboard.js) resuelve el fallback si
// el cliente no lo manda; este modulo solo recibe la fecha ya resuelta.
import { addDays, isoWeekday, isoWeekInfo, isoWeeksTouchingMonth, startOfIsoWeek, toDateOnlyString } from '../shared/isoWeek.js'

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

// Condiciones vendibles (2026-09-18, a peticion explicita del usuario) -- unica fuente real de
// verdad de estos 7 codigos, importada tanto por api/production/fft-dashboard.js (para filtrar las
// consultas SQL) como usada aqui abajo (para el orden fijo de "Producción por condición", necesario
// para que cada condicion siempre tenga el mismo color en la TV run tras run). Codigos verificados
// en vivo contra el catalogo real de OE.WorkPlanItemClassifications -- todos con guion al inicio.
export const SELLABLE_CLASSIFICATION_CODES = ['-GRA', '-GRB', '-GRC', '-ICB', '-ICC', '-ICD', '-ICX']

// Mismo criterio exacto que pctChange() de api/production/fft-summary.js (no se extrae a un
// modulo compartido a proposito -- ese archivo ya funciona en producción y esta tarea no debe
// tocarlo para no arriesgar "Producción FFT"; se repite aqui la misma logica minima en vez de
// crear un acoplamiento nuevo entre 2 modulos independientes).
function pctChange(current, previous) {
  if (previous === null || previous === undefined) return null
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

// Rango real que hay que pedirle a SQL (una sola consulta ancha, ver getDailyThroughput) para
// poder construir TODO el dashboard: semana actual+anterior, todas las semanas ISO que tocan el
// mes actual, y el rango comparable del mes anterior. Nunca se pide mas alla de "hoy" (no existen
// inspecciones futuras).
export function computeQueryRange(today) {
  const currentWeekMonday = startOfIsoWeek(today)
  const previousWeekMonday = addDays(currentWeekMonday, -7)
  const monthWeeks = isoWeeksTouchingMonth(today.getUTCFullYear(), today.getUTCMonth())
  const monthWeeksStart = monthWeeks[0].monday

  const prevMonthIndex0 = today.getUTCMonth() - 1
  const prevMonthYear = prevMonthIndex0 < 0 ? today.getUTCFullYear() - 1 : today.getUTCFullYear()
  const prevMonthMonth0 = (prevMonthIndex0 + 12) % 12
  const prevMonthFrom = new Date(Date.UTC(prevMonthYear, prevMonthMonth0, 1))

  const candidates = [currentWeekMonday, previousWeekMonday, monthWeeksStart, prevMonthFrom]
  const from = candidates.reduce((min, d) => (d < min ? d : min), candidates[0])
  return { from, to: today }
}

// Filtra filas reales {date, <keyField>, name?, qty} (salida de getClassificationByDayInRange/
// getSizeByDayInRange, YA acotadas a condiciones vendibles por el caller) a solo las fechas de
// `dateSet` (un set de 'YYYY-MM-DD', los dias COMPARABLES de una semana -- Lunes..hoy) y las suma
// por `keyField`. Filtrar por fecha ANTES de sumar (en vez de pedirle el rango a SQL vía BETWEEN)
// es lo que hace que esto cierre EXACTO contra dailyComparison/byDate: un LPN se atribuye al mismo
// dia calendario real (CAST(InspectionDate AS DATE)) en los 2 lados, nunca a un rango con la cola
// nocturna del Turno 2 contada de mas (ver comentario grande en binmanager-sql.js/
// getClassificationByDayInRange sobre el bug real encontrado en vivo, 358 piezas de diferencia).
function filterAndSumByKey(rows, dateSet, keyField) {
  const map = new Map()
  for (const r of rows) {
    if (!dateSet.has(r.date)) continue
    const existing = map.get(r[keyField])
    if (existing) {
      existing.qty += r.qty
      if (!existing.name && r.name) existing.name = r.name
    } else {
      map.set(r[keyField], { [keyField]: r[keyField], name: r.name ?? null, qty: r.qty })
    }
  }
  return [...map.values()]
}

// Arma una comparativa semana-actual-vs-anterior por categoria fija (condicion) o dinamica
// (tamaño de pantalla) -- mismo criterio de "mismo periodo comparable" ya usado en el resto de este
// archivo (currentRows/previousRows ya vienen acotados por el caller a Lunes->hoy de cada semana).
// `fixedKeys` (si se da) fuerza el orden Y garantiza que las 7 condiciones vendibles aparezcan
// siempre, aunque una tenga 0 piezas esta semana (nunca desaparece del grafico); si no se da
// (tamaños de pantalla, catalogo variable), se usa la union real de claves encontradas, ordenada.
function buildCategoryComparison(currentRows, previousRows, keyField, fixedKeys) {
  const currentMap = new Map(currentRows.map((r) => [r[keyField], r]))
  const previousMap = new Map(previousRows.map((r) => [r[keyField], r]))
  const keys =
    fixedKeys ??
    [...new Set([...currentMap.keys(), ...previousMap.keys()])].sort((a, b) => {
      if (a === null) return 1
      if (b === null) return -1
      return a - b
    })
  return keys.map((key) => {
    const cur = currentMap.get(key)
    const prev = previousMap.get(key)
    const currentQty = cur?.qty ?? 0
    const previousQty = prev?.qty ?? 0
    return {
      [keyField]: key,
      name: cur?.name ?? prev?.name ?? null,
      currentQty,
      previousQty,
      pctChange: pctChange(currentQty, previousQty),
    }
  })
}

function sumRange(byDate, fromDate, toDate, todayCap) {
  if (fromDate > todayCap) return null // el rango completo todavia no ha pasado -- nunca 0 inventado
  const cappedTo = toDate > todayCap ? todayCap : toDate
  let sum = 0
  for (let d = fromDate; d <= cappedTo; d = addDays(d, 1)) {
    sum += byDate.get(toDateOnlyString(d)) ?? 0
  }
  return sum
}

/**
 * dailyRows: [{ date: 'YYYY-MM-DD', qty }] -- salida real de getDailyThroughput (server-lib/
 * binmanager-sql.js), ya trae SOLO los dias con al menos 1 pieza real (dias sin produccion
 * simplemente no aparecen -- se tratan como 0 mas abajo, NUNCA como "sin dato").
 * today: Date (fecha calendario UTC medianoche, ver shared/isoWeek.js/dateOnly) -- resuelta por el
 * caller a partir del parametro real del cliente.
 * peopleToday/peoplePreviousWeekday: conteos reales YA resueltos por el caller (distinct
 * usernames en BinManager ese dia exacto, misma fuente que "Personal activo hoy" de Producción
 * FFT) -- este modulo no toca SQL, solo reparte los numeros que le pasan.
 * conditionRows: [{date, code, name, qty}] -- salida real de getClassificationByDayInRange, mismo
 * rango ANCHO que dailyRows (YA filtrada a solo condiciones vendibles por el caller) -- este modulo
 * la filtra/suma el mismo dia calendario que dailyComparison (nunca via un BETWEEN de rango en SQL,
 * ver comentario grande en binmanager-sql.js sobre por que eso no cierra exacto).
 * sizeRows: [{date, size, qty}] -- salida real de getSizeByDayInRange, mismo criterio que arriba.
 * conditionCatalog: [{code, name}] -- catalogo REAL completo (getFilterOptions, sin rango de
 * fecha), ya filtrado por el caller a las 7 condiciones vendibles. Fuente de los nombres de la
 * leyenda -- separada de conditionRows a proposito: una condicion vendible sin ninguna pieza en
 * las ultimas 2 semanas NO debe perder su nombre real en la leyenda.
 */
export function buildFftDashboardData({
  today,
  dailyRows,
  peopleToday,
  peoplePreviousWeekday,
  conditionRows,
  sizeRows,
  conditionCatalog,
}) {
  const byDate = new Map(dailyRows.map((r) => [r.date, r.qty]))
  const todayStr = toDateOnlyString(today)

  const currentWeekMonday = startOfIsoWeek(today)
  const currentWeekInfo = isoWeekInfo(currentWeekMonday)
  const previousWeekMonday = addDays(currentWeekMonday, -7)
  const previousWeekInfo = isoWeekInfo(previousWeekMonday)
  const todayWeekdayIdx = isoWeekday(today) // 0=Lun..6=Dom

  // ── Comparativa semanal por dia (Lunes..Domingo, siempre mismo-dia-vs-mismo-dia) ──
  const dailyComparison = []
  for (let i = 0; i <= 6; i += 1) {
    const currentDate = addDays(currentWeekMonday, i)
    const previousDate = addDays(previousWeekMonday, i)
    const isFuture = currentDate > today
    const currentQty = isFuture ? null : (byDate.get(toDateOnlyString(currentDate)) ?? 0)
    const previousQty = byDate.get(toDateOnlyString(previousDate)) ?? 0
    dailyComparison.push({
      label: WEEKDAY_LABELS[i],
      date: toDateOnlyString(currentDate),
      previousDate: toDateOnlyString(previousDate),
      isToday: toDateOnlyString(currentDate) === todayStr,
      isFuture,
      currentQty,
      previousQty,
      pctChange: currentQty === null ? null : pctChange(currentQty, previousQty),
    })
  }

  // ── KPI "Producción hoy" (hoy vs mismo dia semana pasada) ──
  const todayQty = byDate.get(todayStr) ?? 0
  const previousSameWeekdayQty = dailyComparison[todayWeekdayIdx].previousQty
  const todayKpi = {
    qty: todayQty,
    previousSameWeekday: previousSameWeekdayQty,
    pctChange: pctChange(todayQty, previousSameWeekdayQty),
  }

  // ── KPI "Total semana actual" -- SOLO periodo comparable (Lunes..hoy), nunca semana completa
  // anterior contra una semana actual incompleta. ──
  const comparableDays = dailyComparison.slice(0, todayWeekdayIdx + 1)
  const currentComparableTotal = comparableDays.reduce((s, d) => s + (d.currentQty ?? 0), 0)
  const previousComparableTotal = comparableDays.reduce((s, d) => s + d.previousQty, 0)
  const weekTotalKpi = {
    comparableDayCount: comparableDays.length,
    currentComparable: currentComparableTotal,
    previousComparable: previousComparableTotal,
    pctChange: pctChange(currentComparableTotal, previousComparableTotal),
  }

  // ── KPI "Personal activo hoy" -- comparacion solo si hay dato real (nunca inventada). ──
  const activePeopleKpi = {
    value: peopleToday,
    previousComparable: peoplePreviousWeekday,
    pctChange: pctChange(peopleToday, peoplePreviousWeekday),
  }

  // ── Tabla "Resumen diario de la semana" -- mismas filas de dailyComparison + Total (solo dias
  // comparables, mismo criterio que weekTotalKpi). ──
  const weeklySummaryTable = {
    rows: dailyComparison,
    total: {
      currentQty: currentComparableTotal,
      previousQty: previousComparableTotal,
      pctChange: weekTotalKpi.pctChange,
    },
  }

  // ── "Producción por semana del mes" -- una barra por cada semana ISO real que toca el mes
  // actual (4/5/6 segun el mes), cada barra = SOLO los dias de esa semana que caen dentro del mes
  // (para que la suma de las barras cierre exacto con "Avance mensual" de abajo, nunca un total
  // que se ve distinto al de la seccion vecina por incluir dias de otro mes). Una semana que
  // todavia no ha EMPEZADO (rangeStart > hoy) sale con qty:null (nunca 0 inventado); la semana en
  // curso suma solo hasta hoy. ──
  const monthYear = today.getUTCFullYear()
  const monthIndex0 = today.getUTCMonth()
  const firstDayOfMonth = new Date(Date.UTC(monthYear, monthIndex0, 1))
  const lastDayOfMonth = new Date(Date.UTC(monthYear, monthIndex0 + 1, 0))
  const weeksTouching = isoWeeksTouchingMonth(monthYear, monthIndex0)
  const monthWeeks = weeksTouching.map((w) => {
    const rangeStart = w.monday < firstDayOfMonth ? firstDayOfMonth : w.monday
    const rangeEnd = w.sunday > lastDayOfMonth ? lastDayOfMonth : w.sunday
    return {
      isoYear: w.isoYear,
      isoWeek: w.isoWeek,
      monday: toDateOnlyString(w.monday),
      sunday: toDateOnlyString(w.sunday),
      isCurrent: w.isoYear === currentWeekInfo.isoYear && w.isoWeek === currentWeekInfo.isoWeek,
      qty: sumRange(byDate, rangeStart, rangeEnd, today),
    }
  })

  // "Avance mensual" (acumulado del mes vs mismo rango del mes anterior) se quito de este
  // dashboard el 2026-09-18 a peticion explicita del usuario, reemplazado por las 2 comparativas
  // de abajo (condicion/tamaño) -- "Producción por semana del mes" (monthWeeks) SI se conserva, no
  // se pidio quitarla.
  const monthly = {
    year: monthYear,
    month: monthIndex0 + 1, // 1-12, mas natural para mostrar en UI que 0-11
    weeks: monthWeeks,
  }

  // ── "Producción por condición" y "Producción por pulgadas" (2026-09-18, a peticion explicita
  // del usuario: "para que veamos cual condicion sale mas", mismo estilo comparativo semana-actual-
  // vs-anterior que el resto del dashboard). Condiciones usa el orden FIJO de
  // SELLABLE_CLASSIFICATION_CODES (las 7 siempre aparecen, aunque alguna tenga 0 esta semana, para
  // que el color de cada una nunca cambie de posicion run tras run); tamaños usa el catalogo real
  // encontrado (variable, ordenado ascendente, null al final como "sin dato"). ──
  const currentComparableDates = new Set(comparableDays.map((d) => d.date))
  const previousComparableDates = new Set(comparableDays.map((d) => d.previousDate))
  const conditionBreakdown = buildCategoryComparison(
    filterAndSumByKey(conditionRows, currentComparableDates, 'code'),
    filterAndSumByKey(conditionRows, previousComparableDates, 'code'),
    'code',
    SELLABLE_CLASSIFICATION_CODES,
  )
  const catalogByCode = new Map((conditionCatalog ?? []).map((c) => [c.code, c.name]))
  const conditionLegend = SELLABLE_CLASSIFICATION_CODES.map((code) => ({
    code,
    name: catalogByCode.get(code) ?? null,
  }))
  const sizeBreakdown = buildCategoryComparison(
    filterAndSumByKey(sizeRows, currentComparableDates, 'size'),
    filterAndSumByKey(sizeRows, previousComparableDates, 'size'),
    'size',
  )

  return {
    today: todayStr,
    currentWeek: {
      isoYear: currentWeekInfo.isoYear,
      isoWeek: currentWeekInfo.isoWeek,
      monday: toDateOnlyString(currentWeekMonday),
      sunday: toDateOnlyString(addDays(currentWeekMonday, 6)),
    },
    previousWeek: {
      isoYear: previousWeekInfo.isoYear,
      isoWeek: previousWeekInfo.isoWeek,
      monday: toDateOnlyString(previousWeekMonday),
      sunday: toDateOnlyString(addDays(previousWeekMonday, 6)),
    },
    todayKpi,
    weekTotalKpi,
    activePeopleKpi,
    weeklyGoalKpi: null, // nunca inventar una meta semanal real -- ver PRUEBAS OBLIGATORIAS
    dailyComparison,
    weeklySummaryTable,
    conditionLegend,
    conditionBreakdown,
    sizeBreakdown,
    monthly,
    insight: todayKpi,
  }
}
