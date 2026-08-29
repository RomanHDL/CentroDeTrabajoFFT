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
import ChartCard from '../ChartCard'
import { colorForIndex } from './chartPalette'

const GRID_COLOR = 'hsl(var(--foreground) / 0.06)'
const AXIS_COLOR = 'hsl(var(--muted-foreground))'
const CURSOR_FILL = 'hsl(var(--foreground) / 0.04)'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-[15px] border border-border bg-popover px-3 py-2 shadow-md text-popover-foreground">
      <div className="mb-0.5 text-[12.5px] font-bold">{row.name}</div>
      <div className="text-xs text-muted-foreground">
        {row.actual} persona{row.actual === 1 ? '' : 's'}
        {row.ideal != null ? ` · ideal ${row.ideal}` : ''}
      </div>
    </div>
  )
}

export default function PersonnelByAreaBarCard({ areas, loading, onSelectArea }) {
  const data = [...areas]
    .sort((a, b) => b.actual - a.actual)
    .map((a, i) => ({ ...a, shortName: a.name.replace(/^WC /, ''), color: colorForIndex(i) }))
  const height = Math.max(240, data.length * 34)

  return (
    <ChartCard
      title="Personal por área"
      subtitle="Personal actual en cada área, de mayor a menor"
      loading={loading}
      empty={data.length === 0}
      emptyMessage="No hay áreas con personal registrado todavía."
      height={height}
    >
      <div className="flex-1 overflow-auto" style={{ minHeight: height }}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="shortName"
              width={110}
              tick={{ fontSize: 11.5, fill: AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: CURSOR_FILL }} />
            <Bar
              dataKey="actual"
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
              onClick={onSelectArea ? (row) => onSelectArea(row.id) : undefined}
              cursor={onSelectArea ? 'pointer' : 'default'}
            >
              <LabelList
                dataKey="actual"
                position="right"
                style={{ fontSize: 11, fontWeight: 700, fill: AXIS_COLOR }}
              />
              {data.map((row) => (
                <Cell key={row.id} fill={row.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
