import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import ChartCard from '../ChartCard'
import { colorForIndex } from './chartPalette'

/* "Cobertura por área" -- dona de DISTRIBUCION DEL PERSONAL ACTUAL entre
   areas (Parte 9 del prompt: interpretacion matematicamente correcta con
   los datos actuales -- cada segmento es "cuanto del personal de hoy esta
   en esta area", nunca un porcentaje de cobertura por segmento, que no
   tendria sentido sumado). El numero central SI es cobertura real
   (actual/ideal del total, mismo dato que ya usa el resto del sistema). */
function ChartTooltip({ active, payload }) {
  const { t } = useTranslation('dashboard')
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-[15px] border border-border bg-popover px-3 py-2 shadow-md text-popover-foreground">
      <div className="mb-0.5 text-[12.5px] font-bold">{row.name}</div>
      <div className="text-xs text-muted-foreground">
        {t('coverageDonutCard.tooltipText', { actual: row.actual, share: row.share.toFixed(1) })}
      </div>
    </div>
  )
}

export default function CoverageDonutCard({ areas, coveragePct, loading }) {
  const { t } = useTranslation('dashboard')
  const withPeople = areas.filter((a) => a.actual > 0).sort((a, b) => b.actual - a.actual)
  const totalActual = withPeople.reduce((sum, a) => sum + a.actual, 0)
  const data = withPeople.map((a, i) => ({
    ...a,
    share: totalActual > 0 ? (a.actual / totalActual) * 100 : 0,
    color: colorForIndex(i),
  }))

  return (
    <ChartCard
      title={t('coverageDonutCard.title')}
      subtitle={t('coverageDonutCard.subtitle')}
      loading={loading}
      empty={data.length === 0}
      emptyMessage={t('coverageDonutCard.emptyMessage')}
    >
      <div className="flex flex-1 min-h-0 flex-row gap-4">
        <div className="relative min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="actual"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={1.5}
                stroke="none"
              >
                {data.map((row) => (
                  <Cell key={row.id} fill={row.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-2xl font-extrabold leading-none">
              {coveragePct != null ? `${coveragePct}%` : '—'}
            </p>
            <p className="text-[10px] font-semibold text-muted-foreground">
              {t('coverageDonutCard.totalCoverageLabel')}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-none basis-[42%] flex-col gap-[4.8px] overflow-auto pr-1">
          {data.map((row) => (
            <div key={row.id} className="flex flex-row items-center gap-1.5">
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <span className="min-w-0 flex-1 truncate text-[11px]" title={row.name}>
                {row.name.replace(/^WC /, '')}
              </span>
              <span className="shrink-0 text-[11px] font-bold">{row.share.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}
