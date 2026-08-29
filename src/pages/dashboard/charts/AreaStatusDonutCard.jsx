import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import ChartCard from '../ChartCard'
import { AREA_STATUS_META } from '../../../data/dashboard/dashboardMetrics'

/* "Estado de las áreas" (2026-08-25) -- a proposito NO se titula "Estado
   del personal": los 4 estados (Completa/Parcial/Falta personal/Sin
   personal) son una propiedad de cada AREA frente a su propio ideal, no
   de cada persona -- mezclar ambos conceptos seria matematicamente
   incorrecto (Parte 12 del prompt exige semantica correcta). El centro
   muestra el total de areas clasificadas, no personas. */
function ChartTooltip({ active, payload }) {
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
      <Box sx={{ fontWeight: 700, fontSize: 12.5 }}>{row.label}</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>
        {row.value} área{row.value === 1 ? '' : 's'} ({row.pct.toFixed(0)}%)
      </Box>
    </Box>
  )
}

export default function AreaStatusDonutCard({ statusCounts, loading }) {
  const total = Object.values(statusCounts).reduce((s, v) => s + v, 0)
  const data = Object.values(AREA_STATUS_META).map((meta) => ({
    ...meta,
    value: statusCounts[meta.key] || 0,
    pct: total > 0 ? ((statusCounts[meta.key] || 0) / total) * 100 : 0,
  }))

  return (
    <ChartCard
      title="Estado de las áreas"
      subtitle="Áreas con plantilla ideal definida, por estado de cobertura"
      loading={loading}
      empty={total === 0}
      emptyMessage="Ninguna área tiene todavía una plantilla ideal definida."
    >
      <Stack direction="row" spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        <Box sx={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
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
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 600 }}>
              Total
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{total}</Typography>
          </Box>
        </Box>

        <Stack spacing={1} sx={{ flex: '0 0 46%', minWidth: 0, justifyContent: 'center' }}>
          {data.map((row) => (
            <Stack key={row.key} direction="row" alignItems="center" spacing={0.75}>
              <Box
                sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color, flexShrink: 0 }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.25 }}>
                  {row.label}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.25 }}>
                  {row.value} área{row.value === 1 ? '' : 's'} ({row.pct.toFixed(0)}%)
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </ChartCard>
  )
}
