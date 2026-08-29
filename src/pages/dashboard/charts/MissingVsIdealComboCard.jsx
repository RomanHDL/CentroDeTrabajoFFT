import { useEffect, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartCard from '../ChartCard'

const GRID_COLOR = 'hsl(var(--foreground) / 0.06)'
const AXIS_COLOR = 'hsl(var(--muted-foreground))'
const CURSOR_FILL = 'hsl(var(--foreground) / 0.04)'

/* "Faltante vs ideal por área" -- combo chart (Parte 16 del prompt).
   Plantilla ideal se trata como META de planeación, nunca como techo:
   si actual > ideal, faltante queda en 0 (nunca negativo, Parte 17). */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-[15px] border border-border bg-popover px-3 py-2 shadow-md text-popover-foreground">
      <div className="mb-0.5 text-[12.5px] font-bold">{label}</div>
      <div className="text-xs text-muted-foreground">Actual: {row.actual}</div>
      <div className="text-xs text-muted-foreground">Ideal: {row.ideal}</div>
      <div className="text-xs font-bold text-[#EF4444]">Faltante: {row.missing}</div>
    </div>
  )
}

// Sigue la clase `dark` de Tailwind (sincronizada con el modo de MUI en
// App.jsx mientras dura la migracion pagina por pagina) para elegir el
// tono de la barra "ideal" -- equivalente a theme.palette.mode del MUI
// original, sin depender de useTheme.
function useIsDarkMode() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.classList.contains('dark'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

export default function MissingVsIdealComboCard({ areas, loading }) {
  const isDark = useIsDarkMode()
  const idealColor = isDark ? '#475569' : '#CBD5E1'

  const data = areas
    .filter((a) => a.ideal != null)
    .sort((a, b) => b.ideal - a.ideal)
    .map((a) => ({ ...a, shortName: a.name.replace(/^WC /, '') }))

  return (
    <ChartCard
      title="Faltante vs ideal por área"
      subtitle="Personal actual, plantilla ideal y faltante calculado, por área"
      loading={loading}
      empty={data.length === 0}
      emptyMessage="Ninguna área tiene todavía una plantilla ideal definida."
    >
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
            barCategoryGap="20%"
          >
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 10.5, fill: AXIS_COLOR }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={48}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              width={32}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: '#EF4444' }}
              axisLine={false}
              tickLine={false}
              width={28}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: CURSOR_FILL }} />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(v) =>
                ({ actual: 'Personal actual', ideal: 'Plantilla ideal', missing: 'Faltante' })[v] ||
                v
              }
            />
            <Bar
              yAxisId="left"
              dataKey="actual"
              name="actual"
              fill="#3B82F6"
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
            <Bar
              yAxisId="left"
              dataKey="ideal"
              name="ideal"
              fill={idealColor}
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="missing"
              name="missing"
              stroke="#EF4444"
              strokeWidth={2}
              dot={{ r: 3, fill: '#EF4444', strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
