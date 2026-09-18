import dayjs from 'dayjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ConditionRankingCard from './ConditionRankingCard'
import DashboardFftHeader from './DashboardFftHeader'
import DashboardFftKpiCard from './DashboardFftKpiCard'
import { formatPct } from './formatters'
import MonthlyWeeksChart from './MonthlyWeeksChart'
import SizeCompactList from './SizeCompactList'
import TodayResultCard from './TodayResultCard'
import WeeklyComparisonChart from './WeeklyComparisonChart'
import WeeklySummaryTable from './WeeklySummaryTable'

/* "Dashboard FFT" -- vista NUEVA y SEPARADA de "Producción FFT" (esa pagina no se toca en
   absoluto), pensada para una TV fija de planta: comparativa semanal/mensual, sin filtros, sin
   sidebar (ver App.jsx -- esta ruta vive FUERA de AppLayout, mismo patron que /cambiar-contrasena),
   con auto-refresco cada ~60s.

   Reutiliza EXACTAMENTE la misma integracion real de SmartControl/BinManager que ya usa
   "Producción FFT" (/api/production/fft-dashboard llama a las mismas funciones de
   server-lib/binmanager-sql.js) -- cero conexion nueva, cero duplicacion.

   "today" se resuelve AQUI, en el cliente (hora real del navegador de la TV, ya en Monterrey) y se
   manda como parametro al backend -- mismo patron ya documentado en
   src/data/dashboard/useDashboardMetrics.js (nunca mezclar "hoy" UTC del servidor con agrupacion
   por dia local). Se recalcula en CADA fetch (nunca se cachea) para que un dia que cruza medianoche
   durante una sesion larga de TV avance solo, sin recargar la pagina.

   REDISEÑO 2026-09-18 (a peticion explicita del usuario, "quiero un verdadero TV PRODUCTION
   DASHBOARD... quiero ver toda la informacion importante en una sola pantalla, sin scroll"):
   ------------------------------------------------------------------------------------------------
   Este archivo (y los componentes que orquesta) es un rediseño VISUAL/DE DISTRIBUCION unicamente.
   NINGUN dato/calculo real cambia: sigue llamando al MISMO endpoint
   (/api/production/fft-dashboard), consumiendo EXACTAMENTE los mismos campos que ya calculaba
   server-lib/fftDashboardAggregation.js antes de este rediseño (todayKpi, weekTotalKpi,
   activePeopleKpi, dailyComparison, monthly.weeks, conditionBreakdown, sizeBreakdown,
   weeklySummaryTable) -- cero endpoints nuevos, cero SQL nueva, cero cambio de semantica.

   Lo que SI cambia es la distribucion: en vez de una columna larga que obligaba a hacer scroll
   (InsightBanner + WeeklyComparisonChart + MonthlyWeeksChart + 2 CategoryComparisonChart +
   ConditionTable + ConditionSizeCrosstabTable + WeeklySummaryTable, uno debajo del otro), ahora es
   un layout de una sola pantalla con flexbox (h-screen + flex-col + overflow-hidden en pantallas
   >=1024px de ancho, ver comentario en el className de abajo) donde cada seccion recibe una
   FRACCION del alto disponible via flex-1/min-h-0 (nunca un pixel fijo que sume mas que 1080px) --
   asi la misma pagina se ve completa tanto en 1920x1080 como en 3840x2160 sin tocar el CSS por
   resolucion, solo estirando proporcionalmente.

   ConditionTable.jsx y ConditionSizeCrosstabTable.jsx (la tabla grande de 7 filas y la tabla cruzada
   condicion×tamaño) YA NO SE RENDERIZAN en esta pantalla TV -- ocupaban demasiado alto para una
   sola vista y su informacion ya vive, resumida, en ConditionRankingCard (nuevo, ranking compacto)
   y SizeCompactList (nuevo, 2 columnas). Los 2 archivos y los datos que consumen (conditionBreakdown,
   conditionSizeCrosstab) NO se borraron -- siguen en el codigo/API por si otra vista los necesita
   despues, solo se dejaron de importar aqui.
   InsightBanner.jsx tampoco se borro -- su logica (interpretar todayKpi como texto) se reutiliza
   tal cual dentro de TodayResultCard.jsx (nuevo), solo con un layout visual mas grande. */

const AUTO_REFRESH_MS = 60000

/* Forzar modo claro SIEMPRE (a peticion explicita del usuario: "ese apartado debe estar siempre en
   modo claro" -- es una pantalla fija de TV, no debe apagarse/oscurecerse solo porque el admin que
   la configuro tenia el modo oscuro activo en su propia sesion). Quitar los `dark:` de las clases
   con color literal (ej. `dark:bg-slate-950`) no bastaba: varios componentes usan clases semanticas
   de shadcn (`text-muted-foreground`, `border-border`, `bg-popover`, ...) que se resuelven via
   variables CSS (`hsl(var(--muted-foreground))`, etc.) y SI cambian con la clase `.dark` de un
   ancestro (ver src/index.css). Redeclarar aqui, en la raiz de esta pagina, los mismos valores de
   `:root` (nunca los de `.dark`) hace que TODO lo de adentro -- incluidas clases semanticas nuevas
   que se agreguen despues, y el tooltip de Recharts -- se vea claro sin importar el tema global, sin
   tener que auditar clase por clase cada vez. NO SE TOCA este mecanismo en el rediseño 2026-09-18. */
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
  // casi invisible en celdas sin clase de color propia). Fijar `color` aqui mismo, usando la MISMA
  // variable que ya se redeclaro arriba en este objeto, fuerza a que se vuelva a resolver con el
  // valor claro correcto antes de heredarse hacia abajo.
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
      const res = await fetch(`/api/production/fft-dashboard?today=${today}`, {
        credentials: 'include',
      })
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
    // nueva para este modulo. SIN CAMBIOS en el rediseño 2026-09-18.
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
      <div
        className="flex min-h-screen items-center justify-center bg-[#F7F9FC]"
        style={LIGHT_THEME_VARS}
      >
        <p className="text-sm text-muted-foreground">{t('loadingMessage')}</p>
      </div>
    )
  }

  if (error && data === null) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-6"
        style={LIGHT_THEME_VARS}
      >
        <p className="text-center text-sm text-muted-foreground">{t('loadErrorGeneric')}</p>
      </div>
    )
  }

  if (data?.configured === false) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-6"
        style={LIGHT_THEME_VARS}
      >
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
      <div
        className="flex min-h-screen items-center justify-center bg-[#F7F9FC] px-6"
        style={LIGHT_THEME_VARS}
      >
        <p className="text-center text-sm text-muted-foreground">{t('fetchErrorBanner')}</p>
      </div>
    )
  }

  const vsWeekTone =
    typeof data.weekTotalKpi.pctChange === 'number'
      ? data.weekTotalKpi.pctChange >= 0
        ? 'up'
        : 'down'
      : null

  return (
    // `lg:h-screen lg:overflow-hidden` -- SOLO a partir de 1024px de ancho (breakpoint `lg` de
    // Tailwind) el layout se fija al alto exacto del viewport y deja de poder hacer scroll: esa es
    // la resolucion objetivo real (TV 1920x1080/4K), a peticion explicita del usuario ("en TV Full
    // HD NO quiero scroll... en tablet puede aparecer scroll si es estrictamente necesario"). Por
    // debajo de 1024px (tablet/laptop chico) el flujo es el normal de un documento (alto automatico,
    // scroll si hace falta) para no romper la pantalla en un dispositivo mas chico que una TV.
    <div
      className="flex min-h-screen flex-col gap-3 bg-[#F7F9FC] p-[clamp(14px,1.5vw,28px)] lg:h-screen lg:gap-[clamp(10px,1vh,14px)] lg:overflow-hidden"
      style={LIGHT_THEME_VARS}
    >
      <DashboardFftHeader
        t={t}
        currentWeek={data.currentWeek}
        previousWeek={data.previousWeek}
        updatedAt={data.updatedAt}
      />

      {error && (
        <div className="shrink-0 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-4 py-2 text-[13px] font-medium text-[#B45309]">
          {t('fetchErrorBanner')}
        </div>
      )}

      {/* Fila de 4 KPIs -- altura de contenido natural (shrink-0), nunca flex-1: son cards cortas,
          darles mas alto solo robaria espacio a las graficas de abajo, que son lo mas importante. */}
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
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
        {/* "VS SEMANA ANTERIOR" (nuevo, reemplaza al slot de "Meta semanal" -- esa card NUNCA se
            renderizaba, weeklyGoalKpi siempre es null porque no existe una meta real configurada en
            el sistema; ver buildFftDashboardData). Mismo dato ya calculado que el badge de la 2a
            KPI (weekTotalKpi.pctChange, periodo comparable Lunes->hoy) -- 0 numeros nuevos, solo se
            destaca en su propia card grande porque el usuario lo pidio como KPI independiente. */}
        <DashboardFftKpiCard
          title={t('vsWeekTitle')}
          displayValue={formatPct(data.weekTotalKpi.pctChange) ?? '—'}
          unit={t('comparablePeriodLabel')}
          valueTone={vsWeekTone}
          hideComparisonRow
        />
      </div>

      {/* Bloque principal: comparativa semanal (~68% del ancho) + "Resultado de hoy" (~32%).
          `2fr_1fr` en vez de un pixel fijo (ej. `320px`) -- a peticion explicita del usuario de que
          el 4K no use "cards gigantes" sino "escalado proporcional": con un ancho fijo la tarjeta de
          la derecha se veria angosta en 1920 y desproporcionadamente chica en 3840, con fracciones
          mantiene la MISMA proporcion 65-70%/30-35% en cualquier resolucion. */}
      <div className="grid min-h-0 flex-[3] grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr]">
        <WeeklyComparisonChart
          t={t}
          dailyComparison={data.dailyComparison}
          weekTotalKpi={data.weekTotalKpi}
        />
        <TodayResultCard t={t} todayKpi={data.todayKpi} />
      </div>

      {/* Segunda fila: semanas del mes / condicion (ranking compacto) / pulgadas (lista compacta). */}
      <div className="grid min-h-0 flex-[2] grid-cols-1 gap-3 lg:grid-cols-3">
        <MonthlyWeeksChart t={t} weeks={data.monthly.weeks} />
        <ConditionRankingCard t={t} rows={data.conditionBreakdown} />
        <SizeCompactList t={t} rows={data.sizeBreakdown} />
      </div>

      <WeeklySummaryTable t={t} weeklySummaryTable={data.weeklySummaryTable} />
    </div>
  )
}
