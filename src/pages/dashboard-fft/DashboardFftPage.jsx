import dayjs from 'dayjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useEffectiveModules } from '@/state/auth'
import ConditionRankingCard from './ConditionRankingCard'
import DashboardFftHeader from './DashboardFftHeader'
import DashboardFftKpiCard from './DashboardFftKpiCard'
import { formatInt, formatPct } from './formatters'
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
   un layout de una sola pantalla con flexbox donde cada seccion recibe una FRACCION del alto
   disponible via flex-1/min-h-0 -- asi la misma pagina se ve completa tanto en 1920x1080 como en
   3840x2160 sin tocar el CSS por resolucion, solo estirando proporcionalmente.

   ARREGLO 2026-09-18 (responsive laptop, a peticion explicita del usuario: "en LAPTOP todos los
   bloques se estan comprimiendo verticalmente porque... se implemento la regla de hacer caber
   absolutamente todo dentro de 100vh"): el h-screen/overflow-hidden/flex-1-a-0% de arriba SOLO debe
   aplicar en el kiosco de TV real -- estaba gateado por el breakpoint de ANCHO `lg:` (>=1024px), pero
   una laptop puede ser igual de ancha que la TV con mucho menos alto util (~800-900px tras la barra
   del navegador), y con poco alto libre el flex-grow de esas secciones colapsaba hacia 0. Ahora el
   gate es `isTvMode` (ver useIsTvMode abajo, basado en el modulo efectivo del usuario / `?tv=`,
   NUNCA en window.innerWidth/screen.width) -- modo TV mantiene el h-screen/flex-1 de siempre sin
   cambios; modo laptop usa alto natural + scroll normal + min-height explicito por seccion (ver cada
   className mas abajo) en vez de flex-basis 0%.

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

/* Modo TV (compacto, h-screen, sin scroll) vs. modo laptop/admin (alto natural, scroll normal) --
   arreglo 2026-09-18 a peticion explicita del usuario: el layout "todo cabe en 100vh" es correcto
   SOLO para la TV fisica de 65" (o cualquiera navegando con el usuario dedicado `tv.fft`, cuyo
   `effectiveModules` es exactamente `['/dashboard-fft']` -- mismo dato que ya usa BackLink en
   DashboardFftHeader.jsx para decidir si mostrar "← Volver"). Un admin/supervisor entrando a ver la
   TV SIEMPRE tiene mas de un modulo, asi que cae en modo laptop automaticamente sin necesitar ningun
   parametro. NUNCA se decide por window.innerWidth/screen.width -- una laptop tambien puede ser
   1920px de ancho, ese ancho no distingue nada.
   `?tv=1`/`?tv=0` es solo un override manual para poder probar cualquiera de los 2 modos desde un
   navegador normal (sin loguearse como `tv.fft`), nunca se usa en produccion real. */
function useIsTvMode() {
  const { modules } = useEffectiveModules()
  const [searchParams] = useSearchParams()
  const override = searchParams.get('tv')
  if (override === '1') return true
  if (override === '0') return false
  return Array.isArray(modules) && modules.length === 1 && modules[0] === '/dashboard-fft'
}

export default function DashboardFftPage() {
  const { t } = useTranslation('dashboardFft')
  const { data, error } = useDashboardFftData()
  const isTvMode = useIsTvMode()

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
    // Modo TV: h-screen + overflow-hidden + gap comprimido por vh -- todo cabe exacto en el
    // viewport, nunca hace scroll (pantalla fija de planta). Modo laptop/admin: SOLO min-h-screen
    // (alto natural de documento) + overflow visible + gap fijo comodo -- el contenido puede superar
    // el viewport y hace scroll normal, a proposito (arreglo 2026-09-18: antes esto se activaba con
    // `lg:` -- solo por ANCHO >=1024px -- y una laptop Full HD tan ancha como la TV pero con ~800-900px
    // utiles de alto terminaba aplastando las graficas contra 0px; ver useIsTvMode arriba).
    <div
      className={cn(
        'flex min-h-screen flex-col gap-4 bg-[#F7F9FC] p-[clamp(14px,1.5vw,28px)]',
        isTvMode && 'h-screen gap-3 overflow-hidden lg:gap-[clamp(10px,1vh,14px)]',
      )}
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
          darles mas alto solo robaria espacio a las graficas de abajo, que son lo mas importante.
          min-h-[135px] SIEMPRE (TV y laptop) -- piso de legibilidad explicito, sin depender de que el
          contenido interno de cada card nunca cambie de alto. */}
      <div className="grid min-h-[135px] shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardFftKpiCard
          title={t('todayProductionTitle')}
          value={data.todayKpi.qty}
          unit={t('unitPieces')}
          pctChange={data.todayKpi.pctChange}
          referenceValue={data.todayKpi.previousSameWeekday}
          comparisonLabel={t('noComparisonLabel')}
        />
        {/* "Total semana actual / Total semana pasada" (2026-09-18, a peticion explicita del
            usuario: "para que veamos como vamos", despues pidio ademas una etiqueta chica arriba
            de CADA numero -- "para identificarlo mejor" -- porque el numero solo, sin contexto
            propio, no dejaba claro cual de los 2 era cual). Mismos 2 numeros ya calculados
            (weekTotalKpi.currentComparable/.previousComparable), 0 datos nuevos -- ya NO se pasa
            `referenceValue` para no repetir el numero pasado 2 veces en la misma card. */}
        <DashboardFftKpiCard
          title={t('weekTotalTitle')}
          displayValue={
            <div className="flex items-end gap-2">
              <div className="min-w-0">
                <p className="truncate text-[clamp(9px,0.5vw,10.5px)] font-bold uppercase tracking-[0.08em] text-slate-400">
                  {t('weekTotalTitle')}
                </p>
                <p>{formatInt(data.weekTotalKpi.currentComparable)}</p>
              </div>
              <span className="pb-[2px] font-black text-slate-300">/</span>
              <div className="min-w-0">
                <p className="truncate text-[clamp(9px,0.5vw,10.5px)] font-bold uppercase tracking-[0.08em] text-slate-400">
                  {t('weekTotalPreviousLabel')}
                </p>
                <p className="text-slate-400">{formatInt(data.weekTotalKpi.previousComparable)}</p>
              </div>
            </div>
          }
          unit={t('unitPieces')}
          pctChange={data.weekTotalKpi.pctChange}
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
      <div
        className={cn(
          'grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[2fr_1fr]',
          isTvMode ? 'min-h-0 flex-[3]' : 'min-h-[380px] lg:min-h-[420px]',
        )}
      >
        <WeeklyComparisonChart
          t={t}
          dailyComparison={data.dailyComparison}
          weekTotalKpi={data.weekTotalKpi}
        />
        <TodayResultCard t={t} todayKpi={data.todayKpi} />
      </div>

      {/* Segunda fila: semanas del mes / condicion (ranking compacto) / pulgadas (lista compacta). */}
      <div
        className={cn(
          'grid grid-cols-1 items-stretch gap-3 lg:grid-cols-3',
          isTvMode ? 'min-h-0 flex-[2]' : 'min-h-[280px] lg:min-h-[320px]',
        )}
      >
        <MonthlyWeeksChart t={t} weeks={data.monthly.weeks} />
        <ConditionRankingCard t={t} rows={data.conditionBreakdown} />
        <SizeCompactList t={t} rows={data.sizeBreakdown} />
      </div>

      <WeeklySummaryTable t={t} weeklySummaryTable={data.weeklySummaryTable} isTvMode={isTvMode} />
    </div>
  )
}
