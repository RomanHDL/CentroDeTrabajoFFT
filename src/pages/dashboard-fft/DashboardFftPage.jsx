import dayjs from 'dayjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CategoryComparisonChart, { CATEGORY_COLORS } from './CategoryComparisonChart'
import ConditionTable from './ConditionTable'
import DashboardFftHeader from './DashboardFftHeader'
import DashboardFftKpiCard from './DashboardFftKpiCard'
import InsightBanner from './InsightBanner'
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

/* Forzar modo claro SIEMPRE (2026-09-17, a peticion explicita del usuario: "ese apartado debe
   estar siempre en modo claro" -- es una pantalla fija de TV, no debe apagarse/oscurecerse solo
   porque el admin que la configuro tenia el modo oscuro activo en su propia sesion). Quitar los
   `dark:` de las clases con color literal (ej. `dark:bg-slate-950`) no bastaba: varios componentes
   usan clases semanticas de shadcn (`text-muted-foreground`, `border-border`, `bg-popover`, ...)
   que se resuelven via variables CSS (`hsl(var(--muted-foreground))`, etc.) y SI cambian con la
   clase `.dark` de un ancestro (ver src/index.css). Redeclarar aqui, en la raiz de esta pagina, los
   mismos valores de `:root` (nunca los de `.dark`) hace que TODO lo de adentro -- incluidas clases
   semanticas nuevas que se agreguen despues, y el tooltip de Recharts -- se vea claro sin importar
   el tema global, sin tener que auditar clase por clase cada vez. */
const LIGHT_THEME_VARS = {
  '--background': '220 27% 96%',
  '--foreground': '222 47% 11%',
  '--card': '0 0% 100%',
  '--card-foreground': '222 47% 11%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '222 47% 11%',
  '--primary': '217 91% 45%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '220 14% 93%',
  '--secondary-foreground': '222 47% 11%',
  '--muted': '220 14% 93%',
  '--muted-foreground': '220 9% 46%',
  '--accent': '220 14% 93%',
  '--accent-foreground': '222 47% 11%',
  '--destructive': '0 84% 60%',
  '--destructive-foreground': '0 0% 100%',
  '--border': '220 13% 88%',
  '--input': '220 13% 88%',
  '--ring': '217 91% 45%',
  colorScheme: 'light',
  // `color` NO se hereda "en vivo" desde una variable CSS redeclarada mas abajo -- `body` (fuera de
  // esta pagina) ya resolvio su propio `color: hsl(var(--foreground))` con el valor de `.dark` si el
  // admin tenia el tema oscuro activo, y ese valor YA RESUELTO es lo que baja por herencia (texto
  // casi invisible en celdas sin clase de color propia, ej. los dias en WeeklySummaryTable). Fijar
  // `color` aqui mismo, usando la MISMA variable que ya se redeclaro arriba en este objeto, fuerza a
  // que se vuelva a resolver con el valor claro correcto antes de heredarse hacia abajo.
  color: 'hsl(222 47% 11%)',
}

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
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]" style={LIGHT_THEME_VARS}>
        <p className="text-sm text-muted-foreground">{t('loadingMessage')}</p>
      </div>
    )
  }

  if (error && data === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6" style={LIGHT_THEME_VARS}>
        <p className="text-center text-sm text-muted-foreground">{t('loadErrorGeneric')}</p>
      </div>
    )
  }

  if (data?.configured === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6" style={LIGHT_THEME_VARS}>
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
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6" style={LIGHT_THEME_VARS}>
        <p className="text-center text-sm text-muted-foreground">{t('fetchErrorBanner')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-8" style={LIGHT_THEME_VARS}>
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

        <div className="mb-4">
          <MonthlyWeeksChart t={t} weeks={data.monthly.weeks} />
        </div>

        {/* "Producción por condición" y "Producción por pulgadas" (2026-09-18, a peticion explicita
            del usuario, reemplazan a "Avance mensual") -- mismo componente compartido
            (CategoryComparisonChart), solo cambia la fuente de datos y la etiqueta del eje X. */}
        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <CategoryComparisonChart
            title={t('conditionChartTitle')}
            subtitle={t('conditionChartSubtitle')}
            rows={data.conditionBreakdown}
            getLabel={(row) => row.code}
            legendItems={data.conditionLegend.map((c, i) => ({
              color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              label: c.name ? `${c.code} · ${c.name}` : c.code,
            }))}
          />
          <CategoryComparisonChart
            title={t('sizeChartTitle')}
            subtitle={t('sizeChartSubtitle')}
            rows={data.sizeBreakdown}
            getLabel={(row) => (row.size === null ? t('sizeUnknownLabel') : `${row.size}"`)}
          />
        </div>

        {/* Tabla de las 7 condiciones con su numero exacto (2026-09-18, a peticion explicita del
            usuario, complementa al grafico de barras de arriba). */}
        <div className="mb-4">
          <ConditionTable t={t} conditionBreakdown={data.conditionBreakdown} />
        </div>

        <WeeklySummaryTable t={t} weeklySummaryTable={data.weeklySummaryTable} />
      </div>
    </div>
  )
}
