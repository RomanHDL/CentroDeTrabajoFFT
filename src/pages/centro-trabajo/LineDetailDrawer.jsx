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
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import HistoryIcon from '@mui/icons-material/History'
import BackHandIcon from '@mui/icons-material/BackHand'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { alpha } from '@mui/material/styles'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { CURRENT_SHIFT, SHIFT_HOURS, workCenterById, LINE_FAMILY_AREA_IDS } from '../../data/production/catalog'
import { getPeopleByArea, getAreaStaffing, classifyAreaStatus, AREA_STATUS_META, getEffectiveTodayRoster } from '../../data/production/personnelByArea'
import {
  getLineWorkstationsWithOccupancy, getSuggestedCandidates, checkInEmployee,
} from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { useEmployeeDropTarget } from '../../ui/dnd'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useRoleMode } from '../../state/roleMode'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
import MoveConfirmDialog from './MoveConfirmDialog'
import EmployeeHistoryDialog from './EmployeeHistoryDialog'
import LineHistoryDialog from './LineHistoryDialog'
import LineStationCard from './LineStationCard'
import SuggestedEmployeeCard from './SuggestedEmployeeCard'
import EmployeeAvatar from './EmployeeAvatar'
import StationAssignDialog from './StationAssignDialog'
import AvailablePersonnelTray from './AvailablePersonnelTray'
import AssignedPersonChip from './AssignedPersonChip'
import EmployeeAssignSearchBar from './EmployeeAssignSearchBar'
import { useDndAssign } from '../../state/dndAssign'

/* Zona de "soltar aqui" generica — usada tanto en areas sin
   estaciones (unico destino posible) como arriba de la grilla de
   estaciones de una linea (si se suelta ahi, se abre el picker de
   estacion; nunca elige una sola por si sola). */
function DropZoneBanner({ areaId, label }) {
  const { isOver, dropProps } = useEmployeeDropTarget(areaId)
  return (
    <Box
      {...dropProps}
      sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, minHeight: 64,
        borderRadius: 2, border: '1.5px dashed', borderColor: isOver ? '#3B82F6' : 'divider',
        bgcolor: (t) => (isOver ? alpha('#3B82F6', t.palette.mode === 'dark' ? 0.18 : 0.08) : 'transparent'),
        transition: 'all .15s ease',
      }}
    >
      <BackHandIcon sx={{ fontSize: 18, color: isOver ? '#3B82F6' : 'text.disabled' }} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: isOver ? '#3B82F6' : 'text.secondary' }}>
        {isOver ? `Soltar para asignar a ${label}` : `Arrastra empleados aquí para asignarlos a ${label}`}
      </Typography>
    </Box>
  )
}

export default function LineDetailDrawer({ workCenterId, open, onClose }) {
  const ps = usePageStyles()
  const version = usePersonnelVersion()
  const { isSupervisor } = useRoleMode()
  const dnd = useDndAssign()

  const [registerOpen, setRegisterOpen] = useState(false)
  const [selfAssignOpen, setSelfAssignOpen] = useState(false)
  const [lineHistoryOpen, setLineHistoryOpen] = useState(false)
  const [historyEmployee, setHistoryEmployee] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null) // { employee, currentAssignment, presetTo }
  const [selectedStationName, setSelectedStationName] = useState(null)
  const [assignStation, setAssignStation] = useState(null)
  const [includeAbsent, setIncludeAbsent] = useState(false)
  const [actionError, setActionError] = useState('')

  const isLine = workCenterId ? LINE_FAMILY_AREA_IDS.has(workCenterId) : false
  const area = workCenterId ? workCenterById(workCenterId) : null
  const staffing = useMemo(() => (workCenterId ? getAreaStaffing(workCenterId) : null), [workCenterId, version])
  const areaStatusKey = staffing?.ideal != null ? classifyAreaStatus(staffing.real, staffing.ideal) : null
  const areaStatusMeta = areaStatusKey ? AREA_STATUS_META[areaStatusKey] : null
  const coveragePct = staffing?.ideal ? Math.round((staffing.real / staffing.ideal) * 100) : null
  const workstations = useMemo(() => (workCenterId ? getLineWorkstationsWithOccupancy(workCenterId) : []), [workCenterId, version])
  const people = useMemo(() => (workCenterId ? (getPeopleByArea()[workCenterId] || []) : []), [workCenterId, version])

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

  /* getEffectiveTodayRoster (no solo workstations.occupants): en lineas con
     personal historico de BASE que todavia nadie movio hoy (ej. CT LINEA 0),
     ese personal cuenta en staffing.real pero NO tiene una estacion real
     asignada -- si la tabla solo mostrara occupants de estaciones, esas
     personas reales quedarian invisibles aunque el encabezado ya las cuenta. */
  const roster = useMemo(
    () => (workCenterId ? getEffectiveTodayRoster().filter(r => r.areaId === workCenterId) : []),
    [workCenterId, version]
  )

  if (!area || !staffing) return null

  const handleAssignSuggested = (candidate) => {
    setActionError('')
    if (!candidate.assignment) {
      const res = checkInEmployee({
        employeeId: candidate.employee.id,
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

  const personnelCountLabel = `${people.length} persona${people.length === 1 ? '' : 's'}`

  return (
    <Dialog open={open} onClose={onClose} fullScreen PaperProps={{ sx: { bgcolor: 'background.default' } }}>
      {/* Header */}
      <Box sx={{
        px: { xs: 1.5, md: 3 }, py: 1.75, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
      }}>
        <IconButton onClick={onClose}><ArrowBackIcon /></IconButton>
        <Typography sx={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.4 }}>{area.name}</Typography>
        <Chip
          size="small"
          label={areaStatusMeta ? areaStatusMeta.label : (people.length > 0 ? 'Con personal' : 'Sin personal hoy')}
          sx={{
            fontWeight: 700,
            bgcolor: `${(areaStatusMeta?.color || (people.length > 0 ? '#10B981' : '#94A3B8'))}22`,
            color: areaStatusMeta?.color || (people.length > 0 ? '#10B981' : '#64748B'),
            border: `1px solid ${(areaStatusMeta?.color || (people.length > 0 ? '#10B981' : '#94A3B8'))}55`,
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
        {/* Encabezado compacto — NUNCA cards KPI grandes, ni en Linea
           1-10 ni en el resto de las areas. Real/Ideal/Faltante (y
           turno/fecha para lineas) va integrado aqui en 1-2 lineas. */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
            {staffing.ideal != null ? `${staffing.real} / ${staffing.ideal} personas` : personnelCountLabel}
            {staffing.ideal != null && (
              <Typography component="span" sx={{ fontSize: 15, fontWeight: 700, color: staffing.status === 'COMPLETA' ? '#10B981' : '#EF4444', ml: 1 }}>
                · {staffing.status === 'COMPLETA' ? 'Completa' : `Falta${Math.abs(staffing.diff) === 1 ? '' : 'n'} ${Math.abs(staffing.diff)}`}
              </Typography>
            )}
          </Typography>
          {staffing.ideal == null && (
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>Sin plantilla definida</Typography>
          )}
          {isLine && (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
              Turno {CURRENT_SHIFT} · {dayjs().format('DD/MM/YYYY')}
            </Typography>
          )}
        </Box>

        {isLine && staffing.ideal != null && (
          <Paper elevation={0} sx={{ ...ps.card, mb: 2, p: { xs: 1.5, md: 2 } }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: { xs: 2, md: 3 } }}>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>Asignación actual</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{staffing.real}/{staffing.ideal} personas</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>Dotación ideal</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{staffing.ideal} personas</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>Turno actual</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{CURRENT_SHIFT} {SHIFT_HOURS[0]}-{SHIFT_HOURS[SHIFT_HOURS.length - 1]}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {staffing.diff > 0 ? 'Personal adicional' : staffing.diff === 0 ? 'Cobertura' : 'Faltan'}
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: staffing.diff < 0 ? '#EF4444' : staffing.diff > 0 ? '#10B981' : '#10B981' }}>
                  {staffing.diff === 0 ? 'Completa' : `${Math.abs(staffing.diff)} persona${Math.abs(staffing.diff) === 1 ? '' : 's'}`}
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 160, alignSelf: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>Cobertura de la línea</Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{coveragePct}%</Typography>
                </Box>
                <Box sx={ps.progressBar}>
                  <Box sx={ps.progressFill(coveragePct, coveragePct >= 100 ? '#10B981' : '#3B82F6')} />
                </Box>
              </Box>
            </Box>
          </Paper>
        )}

        <Box sx={{ mb: 3, maxWidth: 480 }}>
          <EmployeeAssignSearchBar areaId={workCenterId} />
        </Box>

        {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>{actionError}</Alert>}

        {isLine ? (
          <Grid container spacing={2}>
            {/* Columna principal */}
            <Grid item xs={12} md={8.5}>
              <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
                <Box sx={ps.cardHeader}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={ps.cardHeaderTitle}>Distribución de estaciones</Typography>
                    <Typography sx={ps.cardHeaderSubtitle}>Toca (o arrastra a alguien) sobre una estación disponible</Typography>
                  </Box>
                  {isLine && (
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                        {workstations.length} posiciones
                      </Typography>
                      <Tooltip title="Los roles se repiten según la cantidad de posiciones requeridas en la línea.">
                        <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                      </Tooltip>
                    </Stack>
                  )}
                </Box>
                <Box sx={{
                  p: 2, display: 'grid', gap: 1.25,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                }}>
                  {workstations.map((w) => (
                    <LineStationCard
                      key={w.id}
                      workAreaId={workCenterId}
                      workstation={w}
                      selected={selectedStation?.name === w.name}
                      onSelect={(ws) => {
                        setSelectedStationName(ws.name)
                        if (ws.isAvailable) setAssignStation(ws)
                      }}
                      onEmployeeClick={(emp) => setHistoryEmployee(emp)}
                    />
                  ))}
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
                        const isReal = r.source === 'REGISTRO'
                        return (
                          <TableRow key={r.id} sx={ps.tableRow(idx)} hover>
                            <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 600 }}>{r.employeeNumber}</TableCell>
                            <TableCell sx={ps.cellText}>
                              <DraggablePersonChip employeeId={r.employeeId}>{r.employee?.name || '—'}</DraggablePersonChip>
                            </TableCell>
                            <TableCell sx={ps.cellTextSecondary}>{r.stationId || '—'}</TableCell>
                            <TableCell sx={ps.cellTextSecondary}>{ws?.requiredRole || '—'}</TableCell>
                            <TableCell sx={ps.cellTextSecondary}>{r.checkInAt || '—'}</TableCell>
                            <TableCell>
                              {isReal
                                ? <Chip size="small" label="Presente" sx={ps.statusChip('COMPLETADA')} />
                                : <Chip size="small" label="Sin check-in hoy" sx={ps.statusChip('PENDIENTE')} />}
                            </TableCell>
                            <TableCell align="right">
                              <Button size="small" onClick={() => setHistoryEmployee(r.employee)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                Ver detalle
                              </Button>
                              {isReal && (
                                <Button size="small" color="error" onClick={() => dnd.requestRelease(r.employeeId)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                  Quitar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {roster.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <EmptyState compact title="Nadie asignado todavía" description="Usa 'Registrar personal', arrastra a alguien sobre una estación, o asigna un candidato sugerido a la derecha." />
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

              <Paper elevation={0} sx={{ ...ps.card, p: 2 }}>
                <AvailablePersonnelTray scopedAreaId={workCenterId} title="Personal disponible" />
              </Paper>
            </Grid>

            {/* Columna lateral */}
            <Grid item xs={12} md={3.5}>
              <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
                <Box sx={ps.cardHeader}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={ps.cardHeaderTitle}>
                      {selectedStation ? `Estación ${selectedStation.isAvailable ? 'disponible' : 'asignada'}` : 'Estación'}
                    </Typography>
                    {isLine && selectedStation && (
                      <Typography sx={ps.cardHeaderSubtitle}>Posición {selectedStation.order} de {workstations.length}</Typography>
                    )}
                  </Box>
                </Box>
                <Box sx={{ p: 2 }}>
                  {!selectedStation && (
                    <EmptyState compact title="Selecciona una estación" description="Toca cualquier estación para ver su detalle." />
                  )}
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
            </Grid>
          </Grid>
        ) : (
          /* Vista simplificada para areas sin estaciones — punto 12 del
             encargo: personal asignado, zona de soltar, personal
             disponible. Nunca "Distribucion de estaciones" aqui. */
          <Grid container spacing={2}>
            <Grid item xs={12} md={8.5}>
              <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
                <Box sx={ps.cardHeader}>
                  <Typography sx={ps.cardHeaderTitle}>Personal asignado ({people.length})</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  {people.length === 0 ? (
                    <EmptyState compact title="Nadie asignado todavía" description="Registra personal o arrastra a alguien desde 'Personal disponible'." />
                  ) : (
                    <Grid container spacing={1.5}>
                      {people.map((p) => (
                        <Grid item xs={12} sm={6} md={4} key={p.id}>
                          <AssignedPersonChip employeeId={p.id} name={p.name} />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              </Paper>

              <Box sx={{ mb: 2 }}>
                <DropZoneBanner areaId={workCenterId} label={area.name} />
              </Box>

              <Paper elevation={0} sx={{ ...ps.card, p: 2 }}>
                <AvailablePersonnelTray scopedAreaId={workCenterId} />
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>

      <StationAssignDialog
        open={Boolean(assignStation)}
        onClose={() => setAssignStation(null)}
        areaId={workCenterId}
        station={assignStation}
        onDone={() => {}}
      />
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
