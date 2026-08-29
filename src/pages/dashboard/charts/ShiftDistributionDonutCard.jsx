import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import ChartCard from '../ChartCard'

const SHIFT_COLORS = { MATUTINO: '#F59E0B', TIEMPO_EXTRA: '#3B82F6', NOCHE: '#6366F1', SIN_TURNO: '#94A3B8' }

/* "Distribución por turno" (2026-08-26) -- usa exclusivamente
   OFFICIAL_SHIFTS (catalog.js), nunca el 07:00-14:00 ya corregido en
   otras vistas. El 4to bucket "Sin turno registrado" es real, no un
   error: la mayoria de "Personal actual" viene del snapshot BASE sin un
   campo de turno individual (ver dashboardMetrics.js/getShiftDistribution
   para el detalle completo) -- se muestra tal cual en vez de fingir que
   todos son Matutino. */
function ChartTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const pct = total > 0 ? ((row.count / total) * 100).toFixed(0) : 0
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1.5, py: 1, boxShadow: 3 }}>
      <Box sx={{ fontWeight: 700, fontSize: 12.5 }}>{row.label}</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{row.count} persona{row.count === 1 ? '' : 's'} ({pct}%)</Box>
    </Box>
  )
}

export default function ShiftDistributionDonutCard({ shifts, loading }) {
  const data = (shifts || []).map((s) => ({ ...s, color: SHIFT_COLORS[s.id] || '#64748B' }))
  const total = data.reduce((sum, s) => sum + s.count, 0)

  return (
    <ChartCard
      title="Distribución por turno"
      subtitle="Personal con turno real registrado hoy"
      loading={loading}
      empty={total === 0}
      emptyMessage="Todavía no hay personal con turno registrado hoy."
    >
      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Box sx={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.filter((d) => d.count > 0)} dataKey="count" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={1.5} stroke="none">
                {data.filter((d) => d.count > 0).map((row) => <Cell key={row.id} fill={row.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 600 }}>Total</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{total}</Typography>
          </Box>
        </Box>

        <Stack spacing={1} sx={{ flex: '0 0 48%', minWidth: 0, justifyContent: 'center' }}>
          {data.map((row) => (
            <Stack key={row.id} direction="row" alignItems="center" spacing={0.75}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.25 }} noWrap>{row.label}</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.25 }}>
                  {row.count} persona{row.count === 1 ? '' : 's'}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </ChartCard>
  )
}
