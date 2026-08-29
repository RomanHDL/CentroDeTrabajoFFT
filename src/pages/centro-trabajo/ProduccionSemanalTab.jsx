import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import Chip from '@mui/material/Chip'
import { usePageStyles } from '../../ui/pageStyles'
import { weeklyTotals } from '../../data/production/production'
import { progressTone } from '../../data/production/selectors'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { useTheme } from '@mui/material/styles'

const ACCENT_HEX = {
  blue: '#3B82F6',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  slate: '#64748B',
}

function mondayOfThisWeek() {
  const d = dayjs()
  const isoDay = d.day()
  const back = isoDay === 0 ? 6 : isoDay - 1
  return d.subtract(back, 'day')
}

export default function ProduccionSemanalTab() {
  const ps = usePageStyles()
  const theme = useTheme()
  const d = theme.palette.mode === 'dark'
  const gridColor = d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)'
  const axisColor = d ? 'rgba(148,163,184,.8)' : 'rgba(71,85,105,.8)'

  const weekStart = useMemo(() => mondayOfThisWeek(), [])
  const totals = useMemo(() => weeklyTotals(), [])

  const chartData = totals.map((t) => ({ ...t, accent: progressTone(t.cumplimiento).accent }))
  const weekTotal = totals.reduce((s, r) => s + r.production, 0)
  const weekTarget = totals.reduce((s, r) => s + r.target, 0)
  const weekCumplimiento = weekTarget > 0 ? Math.round((weekTotal / weekTarget) * 100) : 0

  return (
    <Box>
      <Typography sx={{ ...ps.sectionTitle, mb: 0.5 }}>Producción semanal</Typography>
      <Typography sx={{ ...ps.pageSubtitle, mb: 3 }}>
        Semana: {weekStart.format('DD MMMM')} — {weekStart.add(4, 'day').format('DD MMMM YYYY')}
      </Typography>

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
              }}
            >
              Producción semanal
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>
              {weekTotal.toLocaleString('es-MX')}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Paper elevation={0} sx={ps.kpiCard('slate')}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
              }}
            >
              Meta semanal
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>
              {weekTarget.toLocaleString('es-MX')}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper
            elevation={0}
            sx={ps.kpiCard(progressTone(weekTarget > 0 ? weekCumplimiento : null).accent)}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
              }}
            >
              Cumplimiento
            </Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>
              {weekTarget > 0 ? `${weekCumplimiento}%` : '—'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={ps.card}>
            <Box sx={ps.cardHeader}>
              <Typography sx={ps.cardHeaderTitle}>Producción por día</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={ps.tableHeaderRow}>
                    <TableCell>Día</TableCell>
                    <TableCell align="right">Producción</TableCell>
                    <TableCell align="right">Meta</TableCell>
                    <TableCell align="right">Cumplimiento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {totals.map((row, idx) => {
                    const tone = progressTone(row.cumplimiento)
                    return (
                      <TableRow key={row.day} sx={ps.tableRow(idx)}>
                        <TableCell sx={{ ...ps.cellText, fontWeight: 600 }}>{row.day}</TableCell>
                        <TableCell align="right" sx={ps.cellText}>
                          {row.production.toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell align="right" sx={ps.cellTextSecondary}>
                          {row.target.toLocaleString('es-MX')}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            label={`${row.cumplimiento}%`}
                            sx={ps.metricChip(tone.tone)}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={ps.card}>
            <Box sx={ps.cardHeader}>
              <Typography sx={ps.cardHeaderTitle}>Gráfica de producción semanal</Typography>
            </Box>
            <Box sx={{ p: 2, height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={gridColor} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: axisColor }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: axisColor }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value.toLocaleString('es-MX')} (${props.payload.cumplimiento}%)`,
                      'Producción',
                    ]}
                    cursor={{ fill: d ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)' }}
                  />
                  <Bar dataKey="production" radius={[4, 4, 0, 0]} maxBarSize={44}>
                    {chartData.map((row) => (
                      <Cell key={row.day} fill={ACCENT_HEX[row.accent] || ACCENT_HEX.slate} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
