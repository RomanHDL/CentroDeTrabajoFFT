import dayjs from 'dayjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DashboardFftHeader from './DashboardFftHeader'
import DashboardFftKpiCard from './DashboardFftKpiCard'
import InsightBanner from './InsightBanner'
import MonthlyProgressCard from './MonthlyProgressCard'
import MonthlyWeeksChart from './MonthlyWeeksChart'
import WeeklyComparisonChart from './WeeklyComparisonChart'
import WeeklySummaryTable from './WeeklySummaryTable'

/* "Dashboard FFT" (2026-09-17, a peticion explicita del usuario) -- vista NUEVA y SEPARADA de
   "Producción FFT" (esa pagina no se toca en absoluto), pensada para una TV fija de planta:
   comparativa semanal/mensual, sin filtros, sin sidebar (ver App.jsx -- esta ruta vive FUERA de
   AppLayout, mismo patron que /cambiar-contrasena), con auto-refresco cada ~60s.

   Reutiliza EXACTAMENTE la misma integracion real de SmartControl/BinManager que ya usa
   "Producción FFT" (/api/production/fft-dashboard llama a las mismas funciones de
   server-lib/binmanager-sql.js) -- cero conexion nueva, cero duplicacion.

   "today" se resuelve AQUI, en el cliente (hora real del navegador de la TV, ya en Monterrey) y se
   manda como parametro al backend -- mismo patron ya documentado en
   src/data/dashboard/useDashboardMetrics.js (nunca mezclar "hoy" UTC del servidor con agrupacion
   por dia local). Se recalcula en CADA fetch (nunca se cachea) para que un dia que cruza medianoche
   durante una sesion larga de TV avance solo, sin recargar la pagina. */

const AUTO_REFRESH_MS = 60000

function useDashboardFftData() {
  const [data, setData] = useState(null) // null = cargando (primera carga)
  const [error, setError] = useState('')
  const fetchingRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return // guard de reentrancia -- mismo criterio que apiSync.js/tick()
    fetchingRef.current = true
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const res = await fetch(`/api/production/fft-dashboard?today=${today}`, { credentials: 'include' })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error || 'load_error')
      setData(json)
      setError(json?.error ? 'fetch_error' : '')
    } catch {
      setError('load_error')
    } finally {
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Auto-refresco cada 60s, pausado mientras la pestaña esta oculta -- mismo enfoque ya probado
    // en src/data/personnel/apiSync.js (startPersonnelSync), sin crear una arquitectura de polling
    // nueva para este modulo.
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      fetchData()
    }
    const interval = setInterval(tick, AUTO_REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    window.addEventListener('online', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
      window.removeEventListener('online', tick)
    }
  }, [fetchData])

  return { data, error }
}

export default function DashboardFftPage() {
  const { t } = useTranslation('dashboardFft')
  const { data, error } = useDashboardFftData()

  if (data === null && !error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-slate-950">
        <p className="text-sm text-muted-foreground">{t('loadingMessage')}</p>
      </div>
    )
  }

  if (error && data === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 dark:bg-slate-950">
        <p className="text-center text-sm text-muted-foreground">{t('loadErrorGeneric')}</p>
      </div>
    )
  }

  if (data?.configured === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 dark:bg-slate-950">
        <p className="text-center text-sm text-muted-foreground">{t('notConfiguredMessage')}</p>
      </div>
    )
  }

  // SmartControl SI esta configurado pero la conexion fallo en este momento (ver EMPTY_RESPONSE
  // + `error` en api/production/fft-dashboard.js, mismo criterio best-effort que fft-summary.js)
  // -- currentWeek/todayKpi/etc. llegan null, nunca 0 inventado. El auto-refresco de 60s sigue
  // corriendo solo (useDashboardFftData), asi que esta pantalla se recupera sola en cuanto
  // SmartControl vuelva a responder, sin que nadie tenga que recargar la TV a mano.
  if (!data.currentWeek) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 dark:bg-slate-950">
        <p className="text-center text-sm text-muted-foreground">{t('fetchErrorBanner')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-8 dark:bg-slate-950">
      <DashboardFftHeader
        t={t}
        currentWeek={data.currentWeek}
        previousWeek={data.previousWeek}
        updatedAt={data.updatedAt}
      />

      <div className="mx-auto max-w-[1800px] px-6 pt-5 sm:px-10">
        {error && (
          <div className="mb-4 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-2.5 text-[13px] font-medium text-[#B45309]">
            {t('fetchErrorBanner')}
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardFftKpiCard
            title={t('todayProductionTitle')}
            value={data.todayKpi.qty}
            unit={t('unitPieces')}
            pctChange={data.todayKpi.pctChange}
            referenceValue={data.todayKpi.previousSameWeekday}
            comparisonLabel={t('noComparisonLabel')}
          />
          <DashboardFftKpiCard
            title={t('weekTotalTitle')}
            value={data.weekTotalKpi.currentComparable}
            unit={t('unitPieces')}
            pctChange={data.weekTotalKpi.pctChange}
            referenceValue={data.weekTotalKpi.previousComparable}
            comparisonLabel={t('noComparisonLabel')}
          />
          <DashboardFftKpiCard
            title={t('activePeopleTitle')}
            value={data.activePeopleKpi.value}
            unit={t('unitPeople')}
            pctChange={data.activePeopleKpi.pctChange}
            referenceValue={data.activePeopleKpi.previousComparable}
            comparisonLabel={t('noComparisonLabel')}
          />
          {/* "Meta semanal" -- NUNCA se renderiza (weeklyGoalKpi siempre null, no existe una meta
              real configurada en el sistema hoy). Se deja el componente preparado (hidden) en vez
              de borrarlo, para que activarlo el dia que exista una meta real sea 1 sola linea. */}
          <DashboardFftKpiCard hidden={data.weeklyGoalKpi === null} title={t('weeklyGoalTitle')} value={data.weeklyGoalKpi} unit={t('unitPieces')} />
        </div>

        <div className="mb-4">
          <InsightBanner t={t} insight={data.insight} />
        </div>

        <div className="mb-4">
          <WeeklyComparisonChart t={t} dailyComparison={data.dailyComparison} weekTotalKpi={data.weekTotalKpi} />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[62fr_38fr]">
          <MonthlyWeeksChart t={t} weeks={data.monthly.weeks} />
          <MonthlyProgressCard t={t} monthly={data.monthly} />
        </div>

        <WeeklySummaryTable t={t} weeklySummaryTable={data.weeklySummaryTable} />
      </div>
    </div>
  )
}
