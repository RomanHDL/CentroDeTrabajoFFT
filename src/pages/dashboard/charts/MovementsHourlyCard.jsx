import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartCard from '../ChartCard'

const GRID_COLOR = 'hsl(var(--foreground) / 0.06)'
const AXIS_COLOR = 'hsl(var(--muted-foreground))'

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
  const { t } = useTranslation('dashboard')
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[15px] border border-border bg-popover px-3 py-2 shadow-md text-popover-foreground">
      <div className="mb-0.5 text-[12.5px] font-bold">{label}</div>
      <div className="text-xs text-muted-foreground">
        {t('movementsHourlyCard.movementCount', { count: payload[0].value })}
      </div>
    </div>
  )
}

export default function MovementsHourlyCard({ hourlyToday, loading, error, onRetry }) {
  const { t } = useTranslation('dashboard')
  const lineColor = '#3B82F6'

  return (
    <ChartCard
      title={t('movementsHourlyCard.title')}
      subtitle={t('movementsHourlyCard.subtitle')}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={!error && hourlyToday.length === 0}
      emptyMessage={t('movementsHourlyCard.emptyMessage')}
    >
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyToday} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="movementsHourlyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              width={30}
              allowDecimals={false}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={lineColor}
              strokeWidth={2}
              fill="url(#movementsHourlyFill)"
              dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
