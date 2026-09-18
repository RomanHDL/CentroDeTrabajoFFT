import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cardClass, cardHeaderClass, cardHeaderTitleClass } from '@/lib/pageStyles'
import { formatInt } from './formatters'

/* "Comparativa semanal de producción" (2026-09-17, seccion principal del Dashboard FFT, a
   peticion explicita del usuario) -- barras dobles (semana anterior vs actual) por dia, SIEMPRE
   mismo-dia-vs-mismo-dia (nunca contra otro dia ni contra un promedio, ver dailyComparison en
   server-lib/fftDashboardAggregation.js). Un dia futuro de la semana actual llega con
   currentQty:null -- Recharts simplemente no dibuja esa barra (altura 0), y la funcion de
   PctLabel de abajo muestra "—" en vez de inventar 0%. El dia de HOY se destaca con un borde
   discreto (stroke navy) en sus 2 barras, nunca un color llamativo nuevo. */

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
        {row.previousQty != null ? formatInt(row.previousQty) : '—'} · {row.currentQty != null ? formatInt(row.currentQty) : '—'}
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
        <text x={cx} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill={colorForFuture}>
          —
        </text>
      )
    }
    const value = row.pctChange
    if (typeof value !== 'number') return null
    const color = value >= 0 ? '#047857' : '#B91C1C'
    return (
      <text x={cx} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={800} fill={color}>
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

  return (
    <div className={cardClass}>
      <div className={`${cardHeaderClass} items-start justify-between`}>
        <div className="min-w-0 flex-1">
          <p className={cardHeaderTitleClass}>{t('weeklyChartTitle')}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{t('weeklyChartSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
          <span className="flex items-center gap-1.5 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_CURRENT }} />
            {t('currentWeekSeries')} ({formatInt(currentTotal)})
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_PREVIOUS }} />
            {t('previousWeekSeries')} ({formatInt(previousTotal)})
          </span>
        </div>
      </div>
      <div className="h-[280px] px-4 pb-4 pt-6 sm:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 12, left: 0, bottom: 0 }} barGap={4}>
            <CartesianGrid vertical={false} stroke="rgba(100,116,139,.12)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={44} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,.06)' }} />
            <Bar dataKey="previousQty" name={t('previousWeekSeries')} fill={COLOR_PREVIOUS} radius={[4, 4, 0, 0]} maxBarSize={38}>
              {/* La etiqueta "—" de un dia futuro se ancla en la barra de la semana anterior (la
                  unica que si tiene altura real ese dia) para que nunca aparezca pegada al eje. */}
              <LabelList dataKey="pctChange" content={(props) => (data[props.index]?.isFuture ? previousLabelRenderer(props) : null)} />
            </Bar>
            <Bar dataKey="currentBar" name={t('currentWeekSeries')} fill={COLOR_CURRENT} radius={[4, 4, 0, 0]} maxBarSize={38}>
              <LabelList dataKey="pctChange" content={(props) => (data[props.index]?.isFuture ? null : makePctLabelRenderer(data)(props))} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Borde discreto del dia de HOY -- overlay de texto bajo el eje X en vez de tocar la
          geometria de las barras (mas simple y confiable entre resoluciones que un shape custom
          de Recharts). */}
      <div className="grid grid-cols-7 gap-0 px-4 pb-3 text-center">
        {data.map((d) => (
          <span
            key={d.date}
            className={
              d.isToday
                ? 'mx-auto rounded-md border-2 border-[#0F2C59] px-2 py-0.5 text-[10.5px] font-bold text-[#0F2C59] dark:border-white dark:text-white'
                : 'text-[10.5px] text-transparent'
            }
          >
            {d.isToday ? t('todayBadgeLabel') : '.'}
          </span>
        ))}
      </div>
    </div>
  )
}
