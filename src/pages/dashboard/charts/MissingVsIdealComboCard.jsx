import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import ChartCard from '../ChartCard'

/* "Faltante vs ideal por área" -- combo chart (Parte 16 del prompt).
   Plantilla ideal se trata como META de planeación, nunca como techo:
   si actual > ideal, faltante queda en 0 (nunca negativo, Parte 17). */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        px: 1.5,
        py: 1,
        boxShadow: 3,
      }}
    >
      <Box sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.25 }}>{label}</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Actual: {row.actual}</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>Ideal: {row.ideal}</Box>
      <Box sx={{ fontSize: 12, color: '#EF4444', fontWeight: 700 }}>Faltante: {row.missing}</Box>
    </Box>
  )
}

export default function MissingVsIdealComboCard({ areas, loading }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const gridColor = d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'
  const axisColor = d ? 'rgba(148,163,184,.8)' : 'rgba(71,85,105,.8)'
  const idealColor = d ? '#475569' : '#CBD5E1'

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
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: -12, bottom: 4 }}
            barCategoryGap="20%"
          >
            <CartesianGrid vertical={false} stroke={gridColor} />
            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 10.5, fill: axisColor }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={48}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: axisColor }}
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
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: d ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)' }}
            />
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
      </Box>
    </ChartCard>
  )
}
