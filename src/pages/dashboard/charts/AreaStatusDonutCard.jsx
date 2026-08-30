import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { AREA_STATUS_META } from '../../../data/dashboard/dashboardMetrics'
import ChartCard from '../ChartCard'

/* "Estado de las áreas" (2026-08-25) -- a proposito NO se titula "Estado
   del personal": los 4 estados (Completa/Parcial/Falta personal/Sin
   personal) son una propiedad de cada AREA frente a su propio ideal, no
   de cada persona -- mezclar ambos conceptos seria matematicamente
   incorrecto (Parte 12 del prompt exige semantica correcta). El centro
   muestra el total de areas clasificadas, no personas. */
function ChartTooltip({ active, payload }) {
  const { t } = useTranslation('dashboard')
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-[15px] border border-border bg-popover px-3 py-2 shadow-md text-popover-foreground">
      <div className="text-[12.5px] font-bold">{row.label}</div>
      <div className="text-xs text-muted-foreground">
        {t('areaStatusDonutCard.areaCountPct', { count: row.value, pct: row.pct.toFixed(0) })}
      </div>
    </div>
  )
}

export default function AreaStatusDonutCard({ statusCounts, loading }) {
  const { t } = useTranslation('dashboard')
  const total = Object.values(statusCounts).reduce((s, v) => s + v, 0)
  const data = Object.values(AREA_STATUS_META).map((meta) => ({
    ...meta,
    value: statusCounts[meta.key] || 0,
    pct: total > 0 ? ((statusCounts[meta.key] || 0) / total) * 100 : 0,
  }))

  return (
    <ChartCard
      title={t('areaStatusDonutCard.title')}
      subtitle={t('areaStatusDonutCard.subtitle')}
      loading={loading}
      empty={total === 0}
      emptyMessage={t('areaStatusDonutCard.emptyMessage')}
    >
      <div className="flex flex-1 min-h-0 flex-row gap-4">
        <div className="relative min-w-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.filter((d) => d.value > 0)}
                dataKey="value"
                nameKey="label"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={1.5}
                stroke="none"
              >
                {data
                  .filter((d) => d.value > 0)
                  .map((row) => (
                    <Cell key={row.key} fill={row.color} />
                  ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="text-[10px] font-semibold text-muted-foreground">
              {t('areaStatusDonutCard.totalLabel')}
            </p>
            <p className="text-2xl font-extrabold leading-none">{total}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-none basis-[46%] flex-col justify-center gap-2">
          {data.map((row) => (
            <div key={row.key} className="flex flex-row items-center gap-1.5">
              <div
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <div className="min-w-0">
                <p className="text-[11.5px] font-bold leading-tight">{row.label}</p>
                <p className="text-[10.5px] leading-tight text-muted-foreground">
                  {t('areaStatusDonutCard.areaCountPct', {
                    count: row.value,
                    pct: row.pct.toFixed(0),
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}
