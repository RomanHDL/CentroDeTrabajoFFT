import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ChartCard from '../ChartCard'

/* Sustituye a "Tendencia de asistencia por hora" del mockup (2026-08-25,
   cambio reportado explícitamente al usuario -- Parte 11 del prompt).
   Motivo: la plantilla de HOY (~90-138 personas) viene en su mayoría de
   REAL_PERSONNEL_SNAPSHOT, un snapshot SIN fecha ni hora -- no existe un
   timestamp real de "cuando llegó" para la mayoría del personal. Solo
   quien de verdad recibió un check-in/movimiento hoy tiene un timestamp
   real (EmployeeMovement.movedAt, servidor). Graficar "asistencia
   acumulada por hora" con ese subconjunto pequeño daría una curva que
   nunca se acerca al total real de personal -- engañoso. En vez de eso,
   esta grafica muestra los movimientos/checkins REALES de hoy por hora
   (100% verídico, aunque el volumen sea bajo mientras la app se usa poco
   para movimientos entre líneas). */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1.5, py: 1, boxShadow: 3 }}>
      <Box sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.25 }}>{label}</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{payload[0].value} movimiento{payload[0].value === 1 ? '' : 's'}</Box>
    </Box>
  )
}

export default function MovementsHourlyCard({ hourlyToday, loading, error, onRetry }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const gridColor = d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'
  const axisColor = d ? 'rgba(148,163,184,.8)' : 'rgba(71,85,105,.8)'
  const lineColor = '#3B82F6'

  return (
    <ChartCard
      title="Movimientos por hora (hoy)"
      subtitle="Check-ins y movimientos reales registrados durante el turno"
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={!error && hourlyToday.length === 0}
      emptyMessage="Todavía no se ha registrado ningún movimiento hoy."
    >
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyToday} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="movementsHourlyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={gridColor} />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey="count" stroke={lineColor} strokeWidth={2} fill="url(#movementsHourlyFill)" dot={{ r: 3, fill: lineColor, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </ChartCard>
  )
}
