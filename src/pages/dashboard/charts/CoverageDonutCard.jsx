import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import ChartCard from '../ChartCard'
import { colorForIndex } from './chartPalette'

/* "Cobertura por área" -- dona de DISTRIBUCION DEL PERSONAL ACTUAL entre
   areas (Parte 9 del prompt: interpretacion matematicamente correcta con
   los datos actuales -- cada segmento es "cuanto del personal de hoy esta
   en esta area", nunca un porcentaje de cobertura por segmento, que no
   tendria sentido sumado). El numero central SI es cobertura real
   (actual/ideal del total, mismo dato que ya usa el resto del sistema). */
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1.5, py: 1, boxShadow: 3 }}>
      <Box sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.25 }}>{row.name}</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{row.actual} personas · {row.share.toFixed(1)}% del personal actual</Box>
    </Box>
  )
}

export default function CoverageDonutCard({ areas, coveragePct, loading }) {
  const withPeople = areas.filter((a) => a.actual > 0).sort((a, b) => b.actual - a.actual)
  const totalActual = withPeople.reduce((sum, a) => sum + a.actual, 0)
  const data = withPeople.map((a, i) => ({ ...a, share: totalActual > 0 ? (a.actual / totalActual) * 100 : 0, color: colorForIndex(i) }))

  return (
    <ChartCard
      title="Cobertura por área"
      subtitle="Distribución del personal actual entre áreas"
      loading={loading}
      empty={data.length === 0}
      emptyMessage="Todavía no hay personal asignado en ninguna área."
    >
      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Box sx={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="actual" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={1.5} stroke="none">
                {data.map((row) => <Cell key={row.id} fill={row.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <Typography sx={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
              {coveragePct != null ? `${coveragePct}%` : '—'}
            </Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 600 }}>Cobertura total</Typography>
          </Box>
        </Box>

        <Stack spacing={0.6} sx={{ flex: '0 0 42%', minWidth: 0, overflow: 'auto', pr: 0.5 }}>
          {data.map((row) => (
            <Stack key={row.id} direction="row" alignItems="center" spacing={0.75}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11, flex: 1, minWidth: 0 }} noWrap title={row.name}>{row.name.replace(/^CT /, '')}</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{row.share.toFixed(0)}%</Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </ChartCard>
  )
}
