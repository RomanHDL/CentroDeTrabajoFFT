import dayjs from 'dayjs'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  cardClass,
  cardHeaderClass,
  cardHeaderTitleClass,
  cellTextClass,
  cellTextSecondaryClass,
  kpiCardClass,
  metricChipClass,
  pageSubtitleClass,
  sectionTitleClass,
  tableHeaderRowClass,
  tableRowClass,
} from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { weeklyTotals } from '../../data/production/production'
import { progressTone } from '../../data/production/selectors'

const ACCENT_HEX = {
  blue: '#3B82F6',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  slate: '#64748B',
}

// Recharts (grid/eje/cursor) sigue el mismo patron ya establecido en las
// cards del Dashboard (src/pages/dashboard/charts/*.jsx) -- tokens CSS
// hsl(var(--...)) en vez de useTheme de MUI, para que la grafica reaccione
// sola al modo claro/oscuro sin depender de @mui/material/styles.
const GRID_COLOR = 'hsl(var(--foreground) / 0.06)'
const AXIS_COLOR = 'hsl(var(--muted-foreground))'
const CURSOR_FILL = 'hsl(var(--foreground) / 0.04)'

function mondayOfThisWeek() {
  const d = dayjs()
  const isoDay = d.day()
  const back = isoDay === 0 ? 6 : isoDay - 1
  return d.subtract(back, 'day')
}

export default function ProduccionSemanalTab() {
  const weekStart = useMemo(() => mondayOfThisWeek(), [])
  const totals = useMemo(() => weeklyTotals(), [])

  const chartData = totals.map((t) => ({ ...t, accent: progressTone(t.cumplimiento).accent }))
  const weekTotal = totals.reduce((s, r) => s + r.production, 0)
  const weekTarget = totals.reduce((s, r) => s + r.target, 0)
  const weekCumplimiento = weekTarget > 0 ? Math.round((weekTotal / weekTarget) * 100) : 0

  return (
    <div>
      <p className={cn(sectionTitleClass, 'mb-1')}>Producción semanal</p>
      <p className={cn(pageSubtitleClass, 'mb-6')}>
        Semana: {weekStart.format('DD MMMM')} — {weekStart.add(4, 'day').format('DD MMMM YYYY')}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className={kpiCardClass('blue')}>
          <p className="text-[11px] font-bold uppercase text-muted-foreground">
            Producción semanal
          </p>
          <p className="mt-1 text-2xl font-extrabold">{weekTotal.toLocaleString('es-MX')}</p>
        </div>
        <div className={kpiCardClass('slate')}>
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Meta semanal</p>
          <p className="mt-1 text-2xl font-extrabold">{weekTarget.toLocaleString('es-MX')}</p>
        </div>
        <div
          className={cn(
            kpiCardClass(progressTone(weekTarget > 0 ? weekCumplimiento : null).accent),
            'col-span-2 sm:col-span-1',
          )}
        >
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Cumplimiento</p>
          <p className="mt-1 text-2xl font-extrabold">
            {weekTarget > 0 ? `${weekCumplimiento}%` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={cardClass}>
          <div className={cardHeaderClass}>
            <p className={cardHeaderTitleClass}>Producción por día</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className={tableHeaderRowClass}>
                <TableHead>Día</TableHead>
                <TableHead className="text-right">Producción</TableHead>
                <TableHead className="text-right">Meta</TableHead>
                <TableHead className="text-right">Cumplimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totals.map((row, idx) => {
                const tone = progressTone(row.cumplimiento)
                return (
                  <TableRow key={row.day} className={tableRowClass(idx)}>
                    <TableCell className={cn(cellTextClass, 'font-semibold')}>{row.day}</TableCell>
                    <TableCell className={cn(cellTextClass, 'text-right')}>
                      {row.production.toLocaleString('es-MX')}
                    </TableCell>
                    <TableCell className={cn(cellTextSecondaryClass, 'text-right')}>
                      {row.target.toLocaleString('es-MX')}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={metricChipClass(tone.tone)}>{row.cumplimiento}%</span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className={cardClass}>
          <div className={cardHeaderClass}>
            <p className={cardHeaderTitleClass}>Gráfica de producción semanal</p>
          </div>
          <div className="h-[280px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: AXIS_COLOR }}
                  axisLine={{ stroke: GRID_COLOR }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: AXIS_COLOR }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value, _name, props) => [
                    `${value.toLocaleString('es-MX')} (${props.payload.cumplimiento}%)`,
                    'Producción',
                  ]}
                  cursor={{ fill: CURSOR_FILL }}
                />
                <Bar dataKey="production" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {chartData.map((row) => (
                    <Cell key={row.day} fill={ACCENT_HEX[row.accent] || ACCENT_HEX.slate} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
