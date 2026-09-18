// Endpoint del "Dashboard FFT" (2026-09-17, a peticion explicita del usuario -- pantalla
// comparativa semanal/mensual para TV de planta, NUEVA y separada de "Producción FFT". NO
// reemplaza /api/production/fft-summary, NO cambia su comportamiento, NO duplica la integracion
// con SmartControl/BinManager: reutiliza EXACTAMENTE las mismas funciones reales de
// server-lib/binmanager-sql.js (getDailyThroughput/getProductionByUserToday) que ya usa
// Producción FFT -- misma definicion de "pieza" (ver buildFilteredBaseCte), mismo pendiente
// documentado de ~15-20% de discrepancia contra la pagina real de BinManager (no se promete
// exactitud absoluta en ningun texto de UI de este dashboard tampoco).
//
// Vista SIMPLE a proposito (sin clasificacion/pulgadas/tags/proveedor/turno): fijo a
// WorkCenterID=49 (FFT, mismo default que fft-summary.js), sin selector de filtros -- a peticion
// explicita del usuario ("no necesita todos los filtros... si el dashboard es exclusivamente de
// FFT, puede usar directamente el WorkCenterID de FFT ya configurado, sin selector").
//
// "today" SIEMPRE lo manda el cliente (hora real del navegador de la TV en planta, dayjs().format
// ('YYYY-MM-DD')) -- ver comentario grande en server-lib/fftDashboardAggregation.js sobre por que
// nunca se usa el "hoy" UTC del servidor para este modulo. Fallback a la fecha UTC del servidor
// SOLO si el cliente no lo manda (primera carga antes de que JS corra, o un caller sin JS) --
// documentado como fallback, no como fuente principal.
import {
  getDailyThroughput,
  getFilterOptions,
  getProductionByClassificationToday,
  getProductionByUserToday,
  getSizeByClassificationToday,
  isBinManagerSqlConfigured,
} from '../../server-lib/binmanager-sql.js'
import { requireModuleAccess } from '../../server-lib/auth.js'
import {
  buildFftDashboardData,
  computeQueryRange,
  SELLABLE_CLASSIFICATION_CODES,
} from '../../server-lib/fftDashboardAggregation.js'
import { addDays, dateOnly, isoWeekday, startOfIsoWeek, toDateOnlyString } from '../../shared/isoWeek.js'

const FFT_WORK_CENTER_ID = 49

const EMPTY_RESPONSE = {
  configured: false,
  updatedAt: null,
  today: null,
  currentWeek: null,
  previousWeek: null,
  todayKpi: null,
  weekTotalKpi: null,
  activePeopleKpi: null,
  weeklyGoalKpi: null,
  dailyComparison: [],
  weeklySummaryTable: { rows: [], total: null },
  conditionLegend: [],
  conditionBreakdown: [],
  sizeBreakdown: [],
  monthly: null,
  insight: null,
}

function resolveToday(rawToday) {
  if (rawToday && /^\d{4}-\d{2}-\d{2}$/.test(rawToday)) {
    const parsed = dateOnly(rawToday)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  // Fallback -- ver comentario de cabecera. No debe pasar en uso normal (el frontend siempre manda
  // su hora local real), pero nunca debe tronar el endpoint si algun caller lo omite.
  return dateOnly(new Date().toISOString().slice(0, 10))
}

export default requireModuleAccess(
  '/dashboard-fft',
  async (req, res) => {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

    if (!isBinManagerSqlConfigured()) {
      return res.status(200).json(EMPTY_RESPONSE)
    }

    const workCenterId = Number(req.query.workCenterId) || FFT_WORK_CENTER_ID
    const today = resolveToday(req.query.today)
    const { from, to } = computeQueryRange(today)
    const previousWeekdayStr = toDateOnlyString(
      // mismo dia de la semana pasada -- 7 dias exactos antes de "hoy", nunca otro dia.
      new Date(today.getTime() - 7 * 86400000),
    )
    // Rango Lunes->hoy de cada semana (2026-09-18, para "Producción por condición"/"...pulgadas") --
    // mismo criterio de "periodo comparable" que weekTotalKpi en fftDashboardAggregation.js, pero
    // resuelto aqui porque estas 2 consultas nuevas viajan a SQL con un rango explicito (a
    // diferencia de dailyRows, que trae TODO el rango ancho de computeQueryRange y se reparte en el
    // modulo puro).
    const currentWeekMonday = startOfIsoWeek(today)
    const previousWeekMonday = addDays(currentWeekMonday, -7)
    const previousWeekComparableEnd = addDays(previousWeekMonday, isoWeekday(today))

    let dailyRows
    let peopleTodayRows
    let peoplePreviousWeekdayRows
    let conditionRowsCurrent
    let conditionRowsPrevious
    let sizeRowsCurrent
    let sizeRowsPrevious
    let conditionCatalog
    try {
      ;[
        dailyRows,
        peopleTodayRows,
        peoplePreviousWeekdayRows,
        conditionRowsCurrent,
        conditionRowsPrevious,
        sizeRowsCurrent,
        sizeRowsPrevious,
        conditionCatalog,
      ] = await Promise.all([
        getDailyThroughput({
          workCenterId,
          dateFrom: from,
          dateTo: to,
          classificationCodes: SELLABLE_CLASSIFICATION_CODES,
        }),
        getProductionByUserToday({
          workCenterId,
          dateFrom: today,
          dateTo: today,
          classificationCodes: SELLABLE_CLASSIFICATION_CODES,
        }),
        getProductionByUserToday({
          workCenterId,
          dateFrom: dateOnly(previousWeekdayStr),
          dateTo: dateOnly(previousWeekdayStr),
          classificationCodes: SELLABLE_CLASSIFICATION_CODES,
        }),
        getProductionByClassificationToday({
          workCenterId,
          dateFrom: currentWeekMonday,
          dateTo: today,
          classificationCodes: SELLABLE_CLASSIFICATION_CODES,
        }),
        getProductionByClassificationToday({
          workCenterId,
          dateFrom: previousWeekMonday,
          dateTo: previousWeekComparableEnd,
          classificationCodes: SELLABLE_CLASSIFICATION_CODES,
        }),
        getSizeByClassificationToday({
          workCenterId,
          dateFrom: currentWeekMonday,
          dateTo: today,
          classificationCodes: SELLABLE_CLASSIFICATION_CODES,
        }),
        getSizeByClassificationToday({
          workCenterId,
          dateFrom: previousWeekMonday,
          dateTo: previousWeekComparableEnd,
          classificationCodes: SELLABLE_CLASSIFICATION_CODES,
        }),
        getFilterOptions(),
      ])
    } catch (err) {
      // Best-effort: mismo criterio que fft-summary.js -- si SmartControl no responde, el
      // dashboard debe seguir cargando (vacio) en vez de un 500 crudo en la pantalla de la TV.
      return res.status(200).json({ ...EMPTY_RESPONSE, configured: true, error: err.message })
    }

    const data = buildFftDashboardData({
      today,
      dailyRows,
      peopleToday: peopleTodayRows.length,
      peoplePreviousWeekday: peoplePreviousWeekdayRows.length,
      conditionRowsCurrent,
      conditionRowsPrevious,
      sizeRowsCurrent,
      sizeRowsPrevious,
      // getFilterOptions() trae el catalogo COMPLETO (todas las clasificaciones reales, no solo
      // vendibles) -- se filtra aqui a las 7 vendibles antes de armar la leyenda.
      conditionCatalog: conditionCatalog.classifications.filter((c) =>
        SELLABLE_CLASSIFICATION_CODES.includes(c.code),
      ),
    })

    return res.status(200).json({
      configured: true,
      updatedAt: new Date().toISOString(),
      workCenterId,
      ...data,
    })
  },
)
