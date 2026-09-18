import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cardClass, cardHeaderClass, cardHeaderTitleClass } from '@/lib/pageStyles'
import { formatInt } from './formatters'

/* "Producción por semana del mes" (2026-09-17, a peticion explicita del usuario -- "una barra por
   cada semana ISO real que toque el mes actual... puede ser 4, 5 o 6 segun el mes"). `weeks` ya
   viene calculado por isoWeeksTouchingMonth (shared/isoWeek.js) -- nunca se asume un numero fijo de
   barras aqui, el chart simplemente dibuja las que reciba. Cada barra suma SOLO los dias de esa
   semana que caen dentro del mes actual (ver comentario en server-lib/fftDashboardAggregation.js)
   para que la suma de todas las barras cierre exacto con "Avance mensual" de al lado. Una semana
   que todavia no empieza llega con qty:null -- se dibuja sin relleno (altura 0) con la etiqueta
   "Todavía no inicia" en vez de una barra de 0 piezas inventada. */
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
      <p className="mt-0.5 text-[12.5px] font-bold">{row.qty === null ? '—' : `${formatInt(row.qty)} pzs`}</p>
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
    <div className={cardClass}>
      <div className={cardHeaderClass}>
        <div>
          <p className={cardHeaderTitleClass}>{t('monthlyByWeekTitle')}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{t('monthlyByWeekSubtitle')}</p>
        </div>
      </div>
      <div className="h-[260px] px-4 pb-4 pt-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(100,116,139,.12)" />
            <XAxis dataKey="weekLabel" tickLine={false} axisLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={44} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(59,130,246,.06)' }} />
            <Bar dataKey="displayQty" radius={[4, 4, 0, 0]} maxBarSize={64}>
              {data.map((row) => (
                <Cell
                  key={row.key}
                  fill={row.notStarted ? 'transparent' : row.isCurrent ? COLOR_CURRENT_WEEK : COLOR_WEEK}
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
                      fontSize={row.notStarted ? 10.5 : 12}
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
      <div className="grid gap-0 px-4 pb-3 text-center" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
        {data.map((row) => (
          <span key={row.key} className="text-[10.5px] font-bold text-[#1D4ED8]">
            {row.isCurrent ? t('currentWeekInProgressBadge') : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
