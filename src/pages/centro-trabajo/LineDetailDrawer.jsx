import React, { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import Dialog from '@mui/material/Dialog'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import HistoryIcon from '@mui/icons-material/History'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { CURRENT_SHIFT, workCenterById } from '../../data/production/catalog'
import { lineSummary } from '../../data/production/selectors'
import { getPeopleByArea, BASE_SNAPSHOT_DATE } from '../../data/production/personnelByArea'
import {
  getLineWorkstationsWithOccupancy, getUnassignedPresentToday, getSuggestedCandidates, checkInEmployee,
} from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { useRoleMode } from '../../state/roleMode'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
import MoveConfirmDialog from './MoveConfirmDialog'
import EmployeeHistoryDialog from './EmployeeHistoryDialog'
import LineHistoryDialog from './LineHistoryDialog'
import WorkstationCard from './WorkstationCard'
import SuggestedEmployeeCard from './SuggestedEmployeeCard'
import EmployeeAvatar from './EmployeeAvatar'

export default function LineDetailDrawer({ workCenterId, open, onClose }) {
  const ps = usePageStyles()
  const version = usePersonnelVersion()
  const { isSupervisor } = useRoleMode()

  const [registerOpen, setRegisterOpen] = useState(false)
  const [selfAssignOpen, setSelfAssignOpen] = useState(false)
  const [lineHistoryOpen, setLineHistoryOpen] = useState(false)
  const [historyEmployee, setHistoryEmployee] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null) // { employee, currentAssignment, presetTo }
  const [selectedStationName, setSelectedStationName] = useState(null)
  const [includeAbsent, setIncludeAbsent] = useState(false)
  const [actionError, setActionError] = useState('')

  const summary = useMemo(() => (workCenterId ? lineSummary(workCenterId) : null), [workCenterId, version])
  const workstations = useMemo(() => (workCenterId ? getLineWorkstationsWithOccupancy(workCenterId) : []), [workCenterId, version])
  const snapshotPeople = useMemo(() => (workCenterId ? (getPeopleByArea()[workCenterId] || []) : []), [workCenterId])
  const unassigned = useMemo(() => getUnassignedPresentToday(), [version])

  const selectedStation = useMemo(() => {
    if (!workstations.length) return null
    return workstations.find(w => w.name === selectedStationName)
      || workstations.find(w => w.isAvailable)
      || workstations[0]
  }, [workstations, selectedStationName])

  const suggestions = useMemo(() => {
    if (!workCenterId || !selectedStation || selectedStation.occupants.length > 0) return []
    return getSuggestedCandidates(workCenterId, selectedStation.name, { includeAbsent })
  }, [workCenterId, selectedStation, includeAbsent, version])

  const roster = useMemo(
    () => workstations.flatMap(w => w.occupants).sort((a, b) => (a.checkInAt > b.checkInAt ? -1 : 1)),
    [workstations]
  )

  if (!summary) return null

  const handleAssignSuggested = (candidate) => {
    setActionError('')
    if (!candidate.assignment) {
      const res = checkInEmployee({
        employeeNumber: candidate.employee.employeeNumber,
        areaId: workCenterId,
        stationId: selectedStation.name,
        shift: CURRENT_SHIFT,
      })
      if (res.status !== 'OK') setActionError(res.message || 'No se pudo asignar.')
    } else {
      setMoveTarget({
        employee: candidate.employee,
        currentAssignment: candidate.assignment,
        presetTo: { areaId: workCenterId, stationId: selectedStation.name },
      })
    }
  }

  const handleAssignUnassigned = (person) => {
    if (!selectedStation || !selectedStation.isAvailable) return
    setActionError('')
    const res = checkInEmployee({
      employeeNumber: person.employeeNumber,
      areaId: workCenterId,
      stationId: selectedStation.name,
      shift: person.shift || CURRENT_SHIFT,
    })
    if (res.status !== 'OK') setActionError(res.message || 'No se pudo asignar.')
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen PaperProps={{ sx: { bgcolor: 'background.default' } }}>
      {/* Header */}
      <Box sx={{
        px: { xs: 1.5, md: 3 }, py: 1.75, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
      }}>
        <IconButton onClick={onClose}><ArrowBackIcon /></IconButton>
        <Typography sx={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.4 }}>{summary.name}</Typography>
        <Chip
          size="small"
          label={summary.personnel > 0 ? 'Con personal' : 'Sin personal hoy'}
          sx={{
            fontWeight: 700,
            bgcolor: summary.personnel > 0 ? '#10B98122' : '#94A3B822',
            color: summary.personnel > 0 ? '#10B981' : '#64748B',
            border: `1px solid ${summary.personnel > 0 ? '#10B98155' : '#94A3B855'}`,
          }}
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
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 3 }, overflowY: 'auto' }}>
        {/* KPI row — puramente operativo, sin metricas de produccion (esas viven en Dashboard) */}
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {[
            { label: 'Personal', value: `${summary.personnel} / ${summary.capacityTotal}`, accent: 'purple' },
            { label: 'Estaciones ocupadas', value: `${summary.stationsOccupied}`, accent: 'green' },
            { label: 'Estaciones disponibles', value: `${summary.stationsAvailable}`, accent: summary.stationsAvailable > 0 ? 'amber' : 'slate' },
            { label: 'Turno · Fecha', value: `${CURRENT_SHIFT}`, subtitle: dayjs().format('DD/MM/YYYY'), accent: 'cyan' },
          ].map((k) => (
            <Grid item xs={6} sm={4} md={2} key={k.label}>
              <Paper elevation={0} sx={ps.kpiCard(k.accent)}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                <Typography sx={{ fontSize: 19, fontWeight: 800, mt: 0.5 }}>{k.value}</Typography>
                {k.subtitle && <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{k.subtitle}</Typography>}
              </Paper>
            </Grid>
          ))}
        </Grid>

        {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>{actionError}</Alert>}

        <Grid container spacing={2}>
          {/* Columna principal */}
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
              <Box sx={ps.cardHeader}>
                <Box>
                  <Typography sx={ps.cardHeaderTitle}>Distribución actual de la línea</Typography>
                  <Typography sx={ps.cardHeaderSubtitle}>Toca una estación para ver detalles o asignar personal</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, overflowX: 'auto' }}>
                <Stack direction="row" alignItems="stretch" sx={{ width: 'max-content' }}>
                  {workstations.map((w, idx) => (
                    <WorkstationCard
                      key={w.id}
                      workstation={w}
                      selected={selectedStation?.name === w.name}
                      isLast={idx === workstations.length - 1}
                      onSelect={(ws) => setSelectedStationName(ws.name)}
                      onEmployeeClick={(emp) => setHistoryEmployee(emp)}
                    />
                  ))}
                </Stack>
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
              <Box sx={ps.cardHeader}>
                <Typography sx={ps.cardHeaderTitle}>Personal asignado a la línea hoy ({roster.length})</Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 340 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={ps.tableHeaderRow}>
                      <TableCell>No. empleado</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Estación</TableCell>
                      <TableCell>Rol</TableCell>
                      <TableCell>Entrada</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roster.map((r, idx) => {
                      const ws = workstations.find(w => w.name === r.stationId)
                      return (
                        <TableRow key={r.id} sx={ps.tableRow(idx)} hover>
                          <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 600 }}>{r.employeeNumber}</TableCell>
                          <TableCell sx={ps.cellText}>{r.employee?.name || '—'}</TableCell>
                          <TableCell sx={ps.cellTextSecondary}>{r.stationId}</TableCell>
                          <TableCell sx={ps.cellTextSecondary}>{ws?.requiredRole || '—'}</TableCell>
                          <TableCell sx={ps.cellTextSecondary}>{r.checkInAt}</TableCell>
                          <TableCell><Chip size="small" label="Presente" sx={ps.statusChip('COMPLETADA')} /></TableCell>
                          <TableCell align="right">
                            <Button size="small" onClick={() => setHistoryEmployee(r.employee)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                              Ver detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {roster.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <EmptyState compact title="Nadie asignado todavía" description="Usa 'Registrar personal' o asigna candidatos sugeridos a la derecha." />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ p: 1.5, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
                <Button size="small" startIcon={<HistoryIcon />} onClick={() => setLineHistoryOpen(true)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Ver historial de la línea
                </Button>
              </Box>
            </Paper>

            <Paper elevation={0} sx={ps.card}>
              <Box sx={ps.cardHeader}>
                <Typography sx={ps.cardHeaderTitle}>Personal ({snapshotPeople.length})</Typography>
                <Typography sx={ps.cardHeaderSubtitle}>
                  Snapshot real de LAYOUT FFT.xlsx ({BASE_SNAPSHOT_DATE}) — sin número de empleado porque el
                  Excel no lo trae todavía
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {snapshotPeople.length === 0 ? (
                  <EmptyState compact title="Sin personal en el Excel para esta área" />
                ) : (
                  <Grid container spacing={1.5}>
                    {snapshotPeople.map((p) => (
                      <Grid item xs={12} sm={6} md={4} key={p.id}>
                        <Stack
                          direction="row" spacing={1.5} alignItems="center"
                          sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                        >
                          <EmployeeAvatar employee={{ name: p.name }} size={40} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                              Núm. pendiente{p.asistencia ? ` · ${p.asistencia}` : ''}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Columna lateral */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
              <Box sx={ps.cardHeader}>
                <Typography sx={ps.cardHeaderTitle}>
                  {selectedStation ? `Estación ${selectedStation.isAvailable ? 'disponible' : 'ocupada'}` : 'Estación'}
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {selectedStation && (
                  <>
                    <Typography sx={{ fontWeight: 800, fontSize: 18, color: selectedStation.isAvailable ? '#B45309' : 'text.primary' }}>
                      {selectedStation.name}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1.5 }}>
                      Rol requerido: <b>{selectedStation.requiredRole}</b> · {selectedStation.occupants.length}/{selectedStation.capacity}
                    </Typography>

                    {selectedStation.occupants.length > 0 && (
                      <Stack spacing={1} sx={{ mb: 1.5 }}>
                        {selectedStation.occupants.map(o => (
                          <Stack key={o.id} direction="row" spacing={1.25} alignItems="center" onClick={() => setHistoryEmployee(o.employee)} sx={{ cursor: 'pointer' }}>
                            <EmployeeAvatar employee={o.employee} size={36} />
                            <Box>
                              <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{o.employeeNumber} — {o.employee?.name}</Typography>
                              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Entrada {o.checkInAt}</Typography>
                            </Box>
                          </Stack>
                        ))}
                      </Stack>
                    )}

                    {selectedStation.isAvailable && (
                      <>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography sx={{ ...ps.sectionTitle, fontSize: 13, mb: 1 }}>Personal sugerido</Typography>
                        {suggestions.length === 0 ? (
                          <EmptyState compact title="Sin candidatos" description="Nadie presente hoy tiene esta habilidad registrada todavía." />
                        ) : (
                          <Stack spacing={1}>
                            {suggestions.map(c => (
                              <SuggestedEmployeeCard key={c.employee.id} candidate={c} onAssign={handleAssignSuggested} disabled={!c.present} />
                            ))}
                          </Stack>
                        )}
                        <Button size="small" onClick={() => setIncludeAbsent(v => !v)} sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}>
                          {includeAbsent ? 'Ocultar no registrados hoy' : 'Ver más opciones'}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </Box>
            </Paper>

            <Paper elevation={0} sx={ps.card}>
              <Box sx={ps.cardHeader}>
                <Typography sx={ps.cardHeaderTitle}>Personal sin asignación hoy ({unassigned.length})</Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {unassigned.length === 0 ? (
                  <EmptyState compact title="Todos ubicados" description="No hay personal presente sin estación asignada." />
                ) : (
                  <Stack spacing={1}>
                    {unassigned.map((u) => (
                      <Stack key={u.id} direction="row" spacing={1.25} alignItems="center">
                        <EmployeeAvatar employee={u.employee} size={32} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{u.employeeNumber} {u.employee?.name}</Typography>
                        </Box>
                        {selectedStation?.isAvailable && (
                          <Button size="small" onClick={() => handleAssignUnassigned(u)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                            Asignar aquí
                          </Button>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <RegisterPersonnelDialog open={registerOpen} onClose={() => setRegisterOpen(false)} fixedAreaId={workCenterId} onDone={() => {}} />
      <SelfAssignDialog open={selfAssignOpen} onClose={() => setSelfAssignOpen(false)} fixedAreaId={workCenterId} onDone={() => {}} />
      <EmployeeHistoryDialog employee={historyEmployee} open={Boolean(historyEmployee)} onClose={() => setHistoryEmployee(null)} onChanged={() => {}} />
      <LineHistoryDialog lineId={workCenterId} open={lineHistoryOpen} onClose={() => setLineHistoryOpen(false)} />
      {moveTarget && (
        <MoveConfirmDialog
          open={Boolean(moveTarget)}
          onClose={() => setMoveTarget(null)}
          employee={moveTarget.employee}
          currentAssignment={moveTarget.currentAssignment}
          presetTo={moveTarget.presetTo}
          onDone={() => setMoveTarget(null)}
        />
      )}
    </Dialog>
  )
}
