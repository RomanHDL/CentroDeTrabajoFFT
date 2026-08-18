import React, { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import SearchIcon from '@mui/icons-material/Search'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import HistoryIcon from '@mui/icons-material/History'
import { usePageStyles } from '../../ui/pageStyles'
import { KpiCard, EmptyState } from '../../ui'
import { WORK_CENTERS, SHIFT_OPTIONS, workCenterById } from '../../data/production/catalog'
import {
  getTodayRoster, getPersonnelPresentToday, getLinesWithPersonnelToday, getMovesCountForDate,
  searchEmployees, getCurrentAssignment, getMovementsForEmployee, getUnassignedPresentToday, todayISO,
} from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { useRoleMode } from '../../state/roleMode'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
import EmployeeHistoryDialog from './EmployeeHistoryDialog'
import EmployeeAvatar from './EmployeeAvatar'

function areaLabel(id) {
  return workCenterById(id)?.name || id || '—'
}

export default function PersonalDeHoyTab() {
  const ps = usePageStyles()
  const version = usePersonnelVersion()
  const { isSupervisor } = useRoleMode()

  const [query, setQuery] = useState('')
  const [lineFilter, setLineFilter] = useState('TODAS')
  const [shiftFilter, setShiftFilter] = useState('TODOS')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [selfAssignOpen, setSelfAssignOpen] = useState(false)
  const [historyEmployee, setHistoryEmployee] = useState(null)

  const roster = useMemo(() => getTodayRoster(), [version])
  const presentToday = useMemo(() => getPersonnelPresentToday(), [version])
  const linesWithPersonnel = useMemo(() => getLinesWithPersonnelToday(), [version])
  const movesToday = useMemo(() => getMovesCountForDate(todayISO()), [version])
  const unassigned = useMemo(() => getUnassignedPresentToday(), [version])

  const searchResults = useMemo(() => searchEmployees(query), [query, version])
  const bestMatch = useMemo(() => {
    if (!query.trim()) return null
    const exact = searchResults.find(e => e.employeeNumber === query.trim())
    return exact || searchResults[0] || null
  }, [query, searchResults])

  const bestMatchDetail = useMemo(() => {
    if (!bestMatch) return null
    const assignment = getCurrentAssignment(bestMatch.id)
    const movements = getMovementsForEmployee(bestMatch.id, todayISO())
    const lastMove = movements.filter(m => m.type === 'MOVE').slice(-1)[0]
    return { employee: bestMatch, assignment, lastMove }
  }, [bestMatch, version])

  const filteredRoster = useMemo(() => {
    return roster.filter((r) => {
      if (lineFilter !== 'TODAS' && r.areaId !== lineFilter) return false
      if (shiftFilter !== 'TODOS' && r.shift !== shiftFilter) return false
      return true
    })
  }, [roster, lineFilter, shiftFilter])

  return (
    <Box>
      {/* KPIs de pase de lista */}
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <KpiCard title="Personal presente hoy" value={presentToday} icon={<PeopleAltIcon />} accent="blue" />
        </Grid>
        <Grid item xs={6} sm={4}>
          <KpiCard title="Líneas con personal" value={linesWithPersonnel} icon={<PrecisionManufacturingIcon />} accent="cyan" />
        </Grid>
        <Grid item xs={6} sm={4}>
          <KpiCard title="Movimientos hoy" value={movesToday} icon={<SwapHorizIcon />} accent="amber" />
        </Grid>
      </Grid>

      {/* Buscador + accion global */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ xs: 'stretch', md: 'center' }}>
        <TextField
          size="small"
          placeholder="Buscar empleado o número... 3647"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, opacity: 0.5, fontSize: 20 }} /> }}
          sx={{ ...ps.inputSx, minWidth: 280, flex: 1 }}
        />
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<PersonAddAlt1Icon />}
          onClick={() => (isSupervisor ? setRegisterOpen(true) : setSelfAssignOpen(true))}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          {isSupervisor ? 'Registrar personal' : 'Registrarme / Autoasignarme'}
        </Button>
      </Stack>

      {query.trim() && (
        <Paper elevation={0} sx={{ ...ps.card, mb: 2, p: 2.5 }}>
          {bestMatchDetail ? (
            <Stack spacing={1.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                <Typography sx={{ fontWeight: 800, fontSize: 18 }}>
                  {bestMatchDetail.employee.employeeNumber} — {bestMatchDetail.employee.name}
                </Typography>
                <Button size="small" startIcon={<HistoryIcon />} onClick={() => setHistoryEmployee(bestMatchDetail.employee)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Ver historial de hoy
                </Button>
              </Stack>
              {bestMatchDetail.assignment ? (
                <Stack direction="row" spacing={3} flexWrap="wrap" rowGap={1.5}>
                  <InfoField label="Estado" value="Presente" />
                  <InfoField label="Ubicación actual" value={areaLabel(bestMatchDetail.assignment.areaId)} />
                  <InfoField label="Rol actual" value={bestMatchDetail.assignment.stationId} />
                  <InfoField label="Entrada" value={bestMatchDetail.assignment.checkInAt} />
                  {bestMatchDetail.lastMove && (
                    <InfoField
                      label="Último movimiento"
                      value={`${areaLabel(bestMatchDetail.lastMove.fromAreaId)} → ${areaLabel(bestMatchDetail.lastMove.toAreaId)} · ${bestMatchDetail.lastMove.movedAt}`}
                    />
                  )}
                </Stack>
              ) : (
                <Typography sx={ps.emptyText}>No registrado hoy.</Typography>
              )}
            </Stack>
          ) : (
            <Typography sx={ps.emptyText}>No se encontró ningún empleado para "{query}".</Typography>
          )}
        </Paper>
      )}

      {/* Personal sin asignacion hoy */}
      {unassigned.length > 0 && (
        <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
          <Box sx={ps.cardHeader}>
            <Typography sx={ps.cardHeaderTitle}>Personal sin asignación hoy ({unassigned.length})</Typography>
            <Typography sx={ps.cardHeaderSubtitle}>Presentes hoy, todavía sin estación</Typography>
          </Box>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={1.5} sx={{ p: 2 }}>
            {unassigned.map((u) => (
              <Stack
                key={u.id} direction="row" spacing={1} alignItems="center"
                onClick={() => setHistoryEmployee(u.employee)}
                sx={{ cursor: 'pointer', p: 1, pr: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
              >
                <EmployeeAvatar employee={u.employee} size={28} />
                <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{u.employeeNumber} {u.employee?.name}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Pase de lista */}
      <Paper elevation={0} sx={ps.card}>
        <Box sx={{ ...ps.filterBar }}>
          <TextField select size="small" label="Línea" value={lineFilter} onChange={(e) => setLineFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 150 }}>
            <MenuItem value="TODAS">Todas</MenuItem>
            {WORK_CENTERS.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Turno" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 140 }}>
            <MenuItem value="TODOS">Todos</MenuItem>
            {SHIFT_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Typography sx={ps.cardHeaderSubtitle}>{filteredRoster.length} de {roster.length} registrados hoy</Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={ps.tableHeaderRow}>
                <TableCell>Empleado</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Área actual</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Entrada</TableCell>
                <TableCell>Turno</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRoster.map((r, idx) => (
                <TableRow key={r.id} sx={ps.tableRow(idx)} hover onClick={() => setHistoryEmployee(r.employee)} style={{ cursor: 'pointer' }}>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 600 }}>{r.employeeNumber}</TableCell>
                  <TableCell sx={ps.cellText}>{r.employee?.name || '—'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{areaLabel(r.areaId)}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.stationId}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.checkInAt}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.shift}</TableCell>
                  <TableCell>
                    <Chip size="small" label="Presente" sx={ps.statusChip('COMPLETADA')} />
                  </TableCell>
                </TableRow>
              ))}
              {filteredRoster.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState compact title="Nadie registrado todavía" description="Usa 'Registrar personal' para el pase de lista de hoy." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <RegisterPersonnelDialog open={registerOpen} onClose={() => setRegisterOpen(false)} onDone={() => {}} />
      <SelfAssignDialog open={selfAssignOpen} onClose={() => setSelfAssignOpen(false)} onDone={() => {}} />
      <EmployeeHistoryDialog employee={historyEmployee} open={Boolean(historyEmployee)} onClose={() => setHistoryEmployee(null)} onChanged={() => {}} />
    </Box>
  )
}

function InfoField({ label, value }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, mt: 0.25 }}>{value}</Typography>
    </Box>
  )
}
