import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatInt } from './formatters'
import {
  tvCardClass,
  tvCardHeaderClass,
  tvSectionSubtitleClass,
  tvSectionTitleClass,
} from './tvStyles'

/* "Comparativa semanal de producción" (seccion MAS IMPORTANTE del Dashboard FFT, a peticion
   explicita del usuario) -- barras dobles (semana anterior vs actual) por dia, SIEMPRE
   mismo-dia-vs-mismo-dia (nunca contra otro dia ni contra un promedio, ver dailyComparison en
   server-lib/fftDashboardAggregation.js). Un dia futuro de la semana actual llega con
   currentQty:null -- Recharts simplemente no dibuja esa barra (altura 0), y la funcion de
   PctLabel de abajo muestra "—" en vez de inventar 0%. El dia de HOY se destaca con una franja
   celeste de fondo + un badge "Hoy" (rediseño 2026-09-18, version TV: antes solo tenia un borde
   bajo el eje X).

   Rediseño 2026-09-18 (TV, a peticion explicita del usuario -- "todo debe caber en 1920x1080 sin
   scroll"): el alto de la grafica ya NO es un pixel fijo (h-[280px]) -- usa flex-1/min-h-0 para
   llenar exactamente el espacio que le da el grid de la pagina (DashboardFftPage.jsx), tanto en
   Full HD como en 4K, sin necesitar breakpoints nuevos por resolucion. */

const COLOR_PREVIOUS = '#CBD5E1'
const COLOR_CURRENT = '#3B82F6'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-[10px] border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-[12.5px] font-bold">{label}</p>
      <p className="text-xs text-muted-foreground">
        {row.previousQty != null ? formatInt(row.previousQty) : '—'} ·{' '}
        {row.currentQty != null ? formatInt(row.currentQty) : '—'}
      </p>
    </div>
  )
}

function makePctLabelRenderer(data, colorForFuture) {
  return function PctLabelContent(props) {
    const { x, y, width, index } = props
    const row = data[index]
    if (!row) return null
    const cx = x + width / 2
    if (row.isFuture) {
      return (
        <text
          x={cx}
          y={y - 8}
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          fill={colorForFuture}
        >
          —
        </text>
      )
    }
    const value = row.pctChange
    if (typeof value !== 'number') return null
    const color = value >= 0 ? '#047857' : '#B91C1C'
    return (
      <text x={cx} y={y - 8} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>
        {value >= 0 ? '+' : ''}
        {value.toFixed(1)}%
      </text>
    )
  }
}

export default function WeeklyComparisonChart({ t, dailyComparison, weekTotalKpi }) {
  const data = dailyComparison.map((d) => ({
    ...d,
    label: t(`weekday${d.label}`),
    // Recharts no dibuja una barra con value:null (correcto, dia futuro sin dato) -- el valor
    // "0" solo se usa para dias YA PASADOS sin produccion real ese dia.
    currentBar: d.isFuture ? null : d.currentQty,
  }))
  const currentTotal = weekTotalKpi.currentComparable
  const previousTotal = weekTotalKpi.previousComparable
  const previousLabelRenderer = makePctLabelRenderer(data, '#94A3B8')
  const todayIndex = data.findIndex((d) => d.isToday)

  return (
    <div className={tvCardClass}>
      <div className={tvCardHeaderClass('items-start')}>
        <div className="min-w-0 flex-1">
          <p className={tvSectionTitleClass}>{t('weeklyChartTitle')}</p>
          <p className={tvSectionSubtitleClass}>{t('weeklyChartSubtitle')}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-[clamp(11px,0.65vw,13.5px)]">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_CURRENT }} />
            {t('currentWeekSeries')} ({formatInt(currentTotal)})
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLOR_PREVIOUS }}
            />
            {t('previousWeekSeries')} ({formatInt(previousTotal)})
          </span>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-2 pt-4">
        {/* Franja celeste discreta detras de la columna de HOY -- aproximada por fraccion de ancho
            (1/7), suficiente para "destacar sin exagerar" sin depender de medir el DOM interno de
            Recharts pixel a pixel. */}
        {todayIndex >= 0 && (
          <div
            className="pointer-events-none absolute inset-y-2 rounded-lg bg-[#EFF6FF]"
            style={{ left: `${(todayIndex / 7) * 100}%`, width: `${(1 / 7) * 100}%` }}
          />
        )}
        <div className="relative min-h-[200px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid vertical={false} stroke="rgba(100,116,139,.12)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 13, fontWeight: 700 }}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={44} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,.06)' }} />
              <Bar
                dataKey="previousQty"
                name={t('previousWeekSeries')}
                fill={COLOR_PREVIOUS}
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              >
                {/* La etiqueta "—" de un dia futuro se ancla en la barra de la semana anterior (la
                    unica que si tiene altura real ese dia) para que nunca aparezca pegada al eje. */}
                <LabelList
                  dataKey="pctChange"
                  content={(props) =>
                    data[props.index]?.isFuture ? previousLabelRenderer(props) : null
                  }
                />
              </Bar>
              <Bar
                dataKey="currentBar"
                name={t('currentWeekSeries')}
                fill={COLOR_CURRENT}
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              >
                <LabelList
                  dataKey="pctChange"
                  content={(props) =>
                    data[props.index]?.isFuture ? null : makePctLabelRenderer(data)(props)
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="relative mt-1 grid grid-cols-7 gap-0 text-center">
          {data.map((d) => (
            <span
              key={d.date}
              className={
                d.isToday
                  ? 'mx-auto rounded-full border border-[#0F2C59] bg-white px-2.5 py-0.5 text-[clamp(10px,0.55vw,11.5px)] font-bold text-[#0F2C59]'
                  : 'text-[10.5px] text-transparent'
              }
            >
              {d.isToday ? t('todayBadgeLabel') : '.'}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
