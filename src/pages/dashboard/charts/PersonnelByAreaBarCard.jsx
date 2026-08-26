import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts'
import ChartCard from '../ChartCard'
import { colorForIndex } from './chartPalette'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1.5, py: 1, boxShadow: 3 }}>
      <Box sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.25 }}>{row.name}</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
        {row.actual} persona{row.actual === 1 ? '' : 's'}{row.ideal != null ? ` · ideal ${row.ideal}` : ''}
      </Box>
    </Box>
  )
}

export default function PersonnelByAreaBarCard({ areas, loading, onSelectArea }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const gridColor = d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'
  const axisColor = d ? 'rgba(148,163,184,.8)' : 'rgba(71,85,105,.8)'

  const data = [...areas].sort((a, b) => b.actual - a.actual).map((a, i) => ({ ...a, shortName: a.name.replace(/^CT /, ''), color: colorForIndex(i) }))
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
      <Box sx={{ flex: 1, minHeight: height, overflow: 'auto' }}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }} barCategoryGap="28%">
            <CartesianGrid horizontal={false} stroke={gridColor} />
            <XAxis type="number" tick={{ fontSize: 11, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="shortName" width={110} tick={{ fontSize: 11.5, fill: axisColor }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: d ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)' }} />
            <Bar
              dataKey="actual" radius={[0, 4, 4, 0]} maxBarSize={18}
              onClick={onSelectArea ? (row) => onSelectArea(row.id) : undefined}
              cursor={onSelectArea ? 'pointer' : 'default'}
            >
              <LabelList dataKey="actual" position="right" style={{ fontSize: 11, fontWeight: 700, fill: axisColor }} />
              {data.map((row) => <Cell key={row.id} fill={row.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </ChartCard>
  )
}
