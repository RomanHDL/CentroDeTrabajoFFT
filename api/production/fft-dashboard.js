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
import { getDayBreakdown, getFilterOptions, getProductionByUserToday, isBinManagerSqlConfigured } from '../../server-lib/binmanager-sql.js'
import { requireModuleAccess } from '../../server-lib/auth.js'
import {
  buildFftDashboardData,
  computeQueryRange,
  SELLABLE_CLASSIFICATION_CODES,
} from '../../server-lib/fftDashboardAggregation.js'
import { addDays, dateOnly, toDateOnlyString } from '../../shared/isoWeek.js'

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

    // Un dia por cada fecha real del rango ancho (2026-09-18, a peticion explicita del usuario: "que
    // este los datos como el dashboard de la empresa" -- una consulta de rango amplio via BETWEEN
    // cuenta la cola nocturna del Turno 2 de la noche anterior como si fuera del dia siguiente,
    // cosa que el dashboard REAL de BinManager no hace, ver comentario grande en
    // binmanager-sql.js/getDayBreakdown). Se pide UN dia a la vez -- mismo patron exacto que ya usa
    // fft-summary.js para su "totalToday" real -- y se corren todos en paralelo (Promise.all).
    const dateList = []
    for (let d = from; d <= to; d = addDays(d, 1)) dateList.push(d)

    let peopleTodayRows
    let peoplePreviousWeekdayRows
    let dayBreakdownByDate
    let conditionCatalog
    try {
      ;[peopleTodayRows, peoplePreviousWeekdayRows, dayBreakdownByDate, conditionCatalog] = await Promise.all([
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
        Promise.all(
          dateList.map((d) =>
            getDayBreakdown({
              workCenterId,
              date: d,
              classificationCodes: SELLABLE_CLASSIFICATION_CODES,
            }).then((rows) => ({ date: toDateOnlyString(d), rows })),
          ),
        ),
        getFilterOptions(),
      ])
    } catch (err) {
      // Best-effort: mismo criterio que fft-summary.js -- si SmartControl no responde, el
      // dashboard debe seguir cargando (vacio) en vez de un 500 crudo en la pantalla de la TV.
      return res.status(200).json({ ...EMPTY_RESPONSE, configured: true, error: err.message })
    }

    // Aplana {date, rows:[{code,name,size,qty}]}[] a un solo array con la fecha ya pegada a cada
    // fila -- fftDashboardAggregation.js deriva de aqui tanto el total diario como los desgloses
    // por condicion/tamaño, todos desde el MISMO dato de origen (nunca 3 consultas independientes
    // que puedan desalinearse entre si).
    const dayRows = dayBreakdownByDate.flatMap(({ date, rows }) => rows.map((r) => ({ ...r, date })))

    const data = buildFftDashboardData({
      today,
      dayRows,
      peopleToday: peopleTodayRows.length,
      peoplePreviousWeekday: peoplePreviousWeekdayRows.length,
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
