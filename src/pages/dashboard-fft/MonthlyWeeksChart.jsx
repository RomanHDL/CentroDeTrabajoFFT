import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

/* "Producción por semana del mes" (a peticion explicita del usuario -- "una barra por cada semana
   ISO real que toque el mes actual... puede ser 4, 5 o 6 segun el mes"). `weeks` ya viene calculado
   por isoWeeksTouchingMonth (shared/isoWeek.js) -- nunca se asume un numero fijo de barras aqui, el
   chart simplemente dibuja las que reciba. Cada barra suma SOLO los dias de esa semana que caen
   dentro del mes actual. Una semana que todavia no empieza llega con qty:null -- se dibuja sin
   relleno (altura 0) con la etiqueta "Todavía no inicia" en vez de una barra de 0 piezas inventada.

   Rediseño 2026-09-18 (TV): alto flex-1/min-h-0 en vez de pixel fijo, mismo criterio que
   WeeklyComparisonChart.jsx, para vivir dentro de la segunda fila del grid de la pagina. */
const COLOR_WEEK = '#3B82F6'
const COLOR_CURRENT_WEEK = '#1D4ED8'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="rounded-[10px] border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-[12.5px] font-bold">{row.weekLabel}</p>
      <p className="text-xs text-muted-foreground">
        {row.monday} - {row.sunday}
      </p>
      <p className="mt-0.5 text-[12.5px] font-bold">
        {row.qty === null ? '—' : `${formatInt(row.qty)} pzs`}
      </p>
    </div>
  )
}

export default function MonthlyWeeksChart({ t, weeks }) {
  const data = weeks.map((w) => ({
    key: `${w.isoYear}-${w.isoWeek}`,
    weekLabel: t('weekOfMonthLabel', { week: w.isoWeek }),
    monday: w.monday,
    sunday: w.sunday,
    qty: w.qty,
    displayQty: w.qty ?? 0,
    isCurrent: w.isCurrent,
    notStarted: w.qty === null,
  }))

  return (
    <div className={tvCardClass}>
      <div className={tvCardHeaderClass()}>
        <div className="min-w-0">
          <p className={tvSectionTitleClass}>{t('monthlyByWeekTitle')}</p>
          <p className={tvSectionSubtitleClass}>{t('monthlyByWeekSubtitle')}</p>
        </div>
      </div>
      <div className="min-h-0 flex-1 px-3 pb-1 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(100,116,139,.12)" />
            <XAxis
              dataKey="weekLabel"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12, fontWeight: 700 }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={40} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,.06)' }} />
            <Bar dataKey="displayQty" radius={[4, 4, 0, 0]} maxBarSize={56}>
              {data.map((row) => (
                <Cell
                  key={row.key}
                  fill={
                    row.notStarted ? 'transparent' : row.isCurrent ? COLOR_CURRENT_WEEK : COLOR_WEEK
                  }
                  stroke={row.isCurrent ? '#0F2C59' : 'none'}
                  strokeWidth={row.isCurrent ? 2 : 0}
                  strokeDasharray={row.isCurrent ? '5 3' : undefined}
                />
              ))}
              <LabelList
                dataKey="qty"
                content={(props) => {
                  const row = data[props.index]
                  if (!row) return null
                  const cx = props.x + props.width / 2
                  const label = row.notStarted ? t('weekNotStartedLabel') : formatInt(row.qty)
                  return (
                    <text
                      x={cx}
                      y={row.notStarted ? props.y + props.height / 2 : props.y - 8}
                      textAnchor="middle"
                      fontSize={row.notStarted ? 11 : 12.5}
                      fontWeight={row.notStarted ? 600 : 800}
                      fill={row.notStarted ? '#94A3B8' : '#0F2C59'}
                    >
                      {label}
                    </text>
                  )
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div
        className="grid shrink-0 gap-0 px-3 pb-2 text-center"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((row) => (
          <span key={row.key} className="text-[clamp(9px,0.5vw,10.5px)] font-bold text-[#1D4ED8]">
            {row.isCurrent ? t('currentWeekInProgressBadge') : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
