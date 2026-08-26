import Box from '@mui/material/Box'
import dayjs from 'dayjs'
import { useTheme } from '@mui/material/styles'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import ChartCard from '../ChartCard'

const WEEKDAY_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/* Sustituye a "Evolución semanal" (cobertura diaria) del mockup
   (2026-08-25, cambio reportado explícitamente -- Parte 20 del prompt).
   Motivo: reconstruir "cobertura de un día pasado" no es posible de
   forma fiable con la arquitectura actual -- la plantilla de cada día
   viene mayormente de REAL_PERSONNEL_SNAPSHOT (un snapshot fijo, SIN
   fecha), no de un registro histórico por día. Las tablas que SÍ tienen
   fecha real (DailyAssignment/EmployeeMovement) solo tienen filas para
   quien fue tocado de verdad ese día -- son un puñado de personas, no
   el total. Mostrar "cobertura" con esos datos daría un número
   falso/engañoso. En su lugar, esta gráfica muestra movimientos reales
   por día (últimos 7 días de calendario) -- 100% verídico. */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1.5, py: 1, boxShadow: 3 }}>
      <Box sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.25 }}>{label}</Box>
      <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{payload[0].value} movimiento{payload[0].value === 1 ? '' : 's'}</Box>
    </Box>
  )
}

export default function MovementsDailyCard({ dailyLast7, loading, error, onRetry }) {
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const gridColor = d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'
  const axisColor = d ? 'rgba(148,163,184,.8)' : 'rgba(71,85,105,.8)'
  const today = dayjs().format('YYYY-MM-DD')

  const data = dailyLast7.map((row) => {
    const day = dayjs(row.date)
    return { ...row, label: row.date === today ? 'Hoy' : WEEKDAY_ES[day.day()] }
  })

  return (
    <ChartCard
      title="Movimientos por día"
      subtitle="Últimos 7 días de calendario"
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={!error && data.every((row) => row.count === 0)}
      emptyMessage="No hay movimientos registrados en los últimos 7 días."
    >
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={gridColor} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: d ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)' }} />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </ChartCard>
  )
}
