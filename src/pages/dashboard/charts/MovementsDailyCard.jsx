import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartCard from '../ChartCard'

function weekdayLabels(t) {
  return [
    t('movementsDailyCard.weekdaySun'),
    t('movementsDailyCard.weekdayMon'),
    t('movementsDailyCard.weekdayTue'),
    t('movementsDailyCard.weekdayWed'),
    t('movementsDailyCard.weekdayThu'),
    t('movementsDailyCard.weekdayFri'),
    t('movementsDailyCard.weekdaySat'),
  ]
}

const GRID_COLOR = 'hsl(var(--foreground) / 0.06)'
const AXIS_COLOR = 'hsl(var(--muted-foreground))'
const CURSOR_FILL = 'hsl(var(--foreground) / 0.04)'

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
  const { t } = useTranslation('dashboard')
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[15px] border border-border bg-popover px-3 py-2 shadow-md text-popover-foreground">
      <div className="mb-0.5 text-[12.5px] font-bold">{label}</div>
      <div className="text-xs text-muted-foreground">
        {t('movementsDailyCard.movementCount', { count: payload[0].value })}
      </div>
    </div>
  )
}

export default function MovementsDailyCard({ dailyLast7, loading, error, onRetry }) {
  const { t } = useTranslation('dashboard')
  const today = dayjs().format('YYYY-MM-DD')
  const weekdayEs = useMemo(() => weekdayLabels(t), [t])

  const data = dailyLast7.map((row) => {
    const day = dayjs(row.date)
    return {
      ...row,
      label: row.date === today ? t('movementsDailyCard.todayLabel') : weekdayEs[day.day()],
    }
  })

  return (
    <ChartCard
      title={t('movementsDailyCard.title')}
      subtitle={t('movementsDailyCard.subtitle')}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={!error && data.every((row) => row.count === 0)}
      emptyMessage={t('movementsDailyCard.emptyMessage')}
    >
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, left: -16, bottom: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              axisLine={{ stroke: GRID_COLOR }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              axisLine={false}
              tickLine={false}
              width={28}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: CURSOR_FILL }} />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}
