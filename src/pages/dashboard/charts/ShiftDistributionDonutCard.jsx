import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import ChartCard from '../ChartCard'

const SHIFT_COLORS = {
  MATUTINO: '#F59E0B',
  TIEMPO_EXTRA: '#3B82F6',
  NOCHE: '#6366F1',
  SIN_TURNO: '#94A3B8',
}

/* "Distribución por turno" (2026-08-26) -- usa exclusivamente
   OFFICIAL_SHIFTS (catalog.js), nunca el 07:00-14:00 ya corregido en
   otras vistas. El 4to bucket "Sin turno registrado" es real, no un
   error: la mayoria de "Personal actual" viene del snapshot BASE sin un
   campo de turno individual (ver dashboardMetrics.js/getShiftDistribution
   para el detalle completo) -- se muestra tal cual en vez de fingir que
   todos son Matutino. */
function ChartTooltip({ active, payload, total }) {
  const { t } = useTranslation('dashboard')
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const pct = total > 0 ? ((row.count / total) * 100).toFixed(0) : 0
  return (
    <div className="rounded-[15px] border border-border bg-popover px-3 py-2 shadow-md text-popover-foreground">
      <div className="text-[12.5px] font-bold">{row.label}</div>
      <div className="text-xs text-muted-foreground">
        {t('shiftDistributionDonutCard.personCountPct', { count: row.count, pct })}
      </div>
    </div>
  )
}

export default function ShiftDistributionDonutCard({ shifts, loading }) {
  const { t } = useTranslation('dashboard')
  const data = (shifts || []).map((s) => ({ ...s, color: SHIFT_COLORS[s.id] || '#64748B' }))
  const total = data.reduce((sum, s) => sum + s.count, 0)

  return (
    <ChartCard
      title={t('shiftDistributionDonutCard.title')}
      subtitle={t('shiftDistributionDonutCard.subtitle')}
      loading={loading}
      empty={total === 0}
      emptyMessage={t('shiftDistributionDonutCard.emptyMessage')}
    >
      <div className="flex flex-1 min-h-0 flex-row gap-4">
        <div className="relative min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter((d) => d.count > 0)}
                dataKey="count"
                nameKey="label"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={1.5}
                stroke="none"
              >
                {data
                  .filter((d) => d.count > 0)
                  .map((row) => (
                    <Cell key={row.id} fill={row.color} />
                  ))}
              </Pie>
              <Tooltip content={<ChartTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground">
              {t('shiftDistributionDonutCard.totalLabel')}
            </p>
            <p className="text-2xl font-extrabold leading-none">{total}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-none basis-[48%] flex-col justify-center gap-2">
          {data.map((row) => (
            <div key={row.id} className="flex flex-row items-center gap-1.5">
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-bold leading-tight">{row.label}</p>
                <p className="text-[10.5px] leading-tight text-muted-foreground">
                  {t('shiftDistributionDonutCard.personCount', { count: row.count })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}
