import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import Chip from '@mui/material/Chip'
import { usePageStyles } from '../../ui/pageStyles'
import { dailyLineBreakdown, dailyHourlyTotal } from '../../data/production/production'
import { progressTone } from '../../data/production/selectors'
import { getPersonnelCountForDate } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import HourlyTrendChart from './HourlyTrendChart'

export default function ProduccionDiariaTab() {
  const ps = usePageStyles()
  const personnelVersion = usePersonnelVersion()
  const [dateISO, setDateISO] = useState(dayjs().format('YYYY-MM-DD'))

  const lines = useMemo(() => dailyLineBreakdown(dateISO), [dateISO])
  const hourly = useMemo(() => dailyHourlyTotal(dateISO), [dateISO])
  const personalUtilizado = useMemo(() => getPersonnelCountForDate(dateISO), [dateISO, personnelVersion])

  const totals = lines.reduce((acc, r) => ({
    production: acc.production + r.production,
    target: acc.target + r.target,
  }), { production: 0, target: 0 })
  const cumplimiento = totals.target > 0 ? Math.round((totals.production / totals.target) * 100) : 0
  const diferencia = totals.production - totals.target

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ mb: 3 }}>
        <Typography sx={ps.sectionTitle}>Producción diaria</Typography>
        <Box sx={{ flex: 1 }} />
        <TextField
          type="date"
          size="small"
          label="Seleccionar fecha"
          value={dateISO}
          onChange={(e) => setDateISO(e.target.value || dayjs().format('YYYY-MM-DD'))}
          sx={{ ...ps.inputSx, minWidth: 200 }}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Producción total</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>{totals.production.toLocaleString('es-MX')}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('cyan')}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Meta</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>{totals.target.toLocaleString('es-MX')}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard(diferencia >= 0 ? 'green' : 'red')}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Diferencia</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>{diferencia >= 0 ? '+' : ''}{diferencia.toLocaleString('es-MX')}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('purple')}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Personal utilizado</Typography>
            <Typography sx={{ fontSize: 24, fontWeight: 800, mt: 0.5 }}>{personalUtilizado}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={ps.card}>
            <Box sx={ps.cardHeader}>
              <Typography sx={ps.cardHeaderTitle}>Producción por línea</Typography>
              <Typography sx={ps.cardHeaderSubtitle}>{dayjs(dateISO).format('DD/MM/YYYY')}</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={ps.tableHeaderRow}>
                    <TableCell>Línea</TableCell>
                    <TableCell align="right">Producción</TableCell>
                    <TableCell align="right">Meta</TableCell>
                    <TableCell align="right">Avance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((r, idx) => {
                    const tone = progressTone(r.cumplimiento)
                    return (
                      <TableRow key={r.id} sx={ps.tableRow(idx)}>
                        <TableCell sx={{ ...ps.cellText, fontWeight: 600 }}>{r.name}</TableCell>
                        <TableCell align="right" sx={ps.cellText}>{r.production.toLocaleString('es-MX')}</TableCell>
                        <TableCell align="right" sx={ps.cellTextSecondary}>{r.target.toLocaleString('es-MX')}</TableCell>
                        <TableCell align="right">
                          <Chip size="small" label={`${r.cumplimiento}%`} sx={ps.metricChip(tone.tone)} />
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
              <Typography sx={ps.cardHeaderTitle}>Producción por hora</Typography>
              <Typography sx={ps.cardHeaderSubtitle}>Total de todas las líneas</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <HourlyTrendChart data={hourly} height={340} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
