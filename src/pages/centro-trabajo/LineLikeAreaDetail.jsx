import React, { useEffect, useMemo, useState } from 'react'
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
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import { alpha } from '@mui/material/styles'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { CURRENT_SHIFT, getCurrentShift, workCenterById, canonicalOperationalAreaId, operationalGroupMembers } from '../../data/production/catalog'
import {
  classifyAreaStatus, AREA_STATUS_META, getEffectiveTodayRoster, getGroupAreaStaffing, getGroupPeople,
} from '../../data/production/personnelByArea'
import {
  getLineWorkstationsWithOccupancy, getSuggestedCandidates, checkInEmployee, reconcileLineAssignments,
} from '../../data/personnel/repository'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getPersonnelRank } from '../../data/personnel/rankSystem'
import { useRoleMode } from '../../state/roleMode'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
import MoveConfirmDialog from './MoveConfirmDialog'
import EmployeeHistoryDialog from './EmployeeHistoryDialog'
import LineHistoryDialog from './LineHistoryDialog'
import LineStationCard from './LineStationCard'
import LeadershipRow from './LeadershipRow'
import AreaStaffSummary from './AreaStaffSummary'
import HierarchyLegend, { RankIcon } from './HierarchyLegend'
import SuggestedEmployeeCard from './SuggestedEmployeeCard'
import EmployeeAvatar from './EmployeeAvatar'
import StationAssignDialog from './StationAssignDialog'
import AvailablePersonnelTray from './AvailablePersonnelTray'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import EmployeeAssignSearchBar from './EmployeeAssignSearchBar'
import WorkCenterNavControls from './WorkCenterNavControls'
import { useDndAssign } from '../../state/dndAssign'

/* ─────────────────────────────────────────────
   Rediseño "tablero operativo" (2026-08-28, a peticion explicita del
   usuario) -- SOLO para areas AREA_DETAIL_VARIANTS.LINE_LIKE (Paletizado,
   Accesorios, Insumos, Midea/High Value, Conveyor General -- ver
   AreaDetail.jsx, unico punto de decision). Componente NUEVO, separado de
   LineDetailDrawer.jsx (ese sigue usandolo EXCLUSIVAMENTE WC LINEA 0-10,
   sin cambios, cero riesgo de afectarlo). SupportAreaDetail.jsx (las 6
   cards de soporte) tampoco se toca.

   Reutiliza sin modificar toda la logica de datos/acciones que ya usaba
   LineDetailDrawer (checkInEmployee/reconcileLineAssignments/etc, los
   mismos dialogos) y el mismo LineStationCard.jsx para cada tarjeta
   individual (ya soporta rango visual con lineLike=true) -- lo nuevo es
   la ESTRUCTURA alrededor: KPIs en mini-cards, leyenda de jerarquia con
   iconos, estaciones agrupadas por rango real, panel de detalle
   enriquecido. ───────────────────────────────────────────── */

function formatHour12(hhmm) {
  return dayjs(`2000-01-01 ${hhmm}`, 'YYYY-MM-DD HH:mm').format('hh:mm A')
}

/* Titulo de SECCION por categoria (2026-08-28, "REFINAMIENTO VISUAL
   Grupo C", a peticion explicita del usuario) -- SOLO cambia el
   encabezado del grupo, nunca `rank.label` (ese sigue siendo el que
   pinta el badge individual de cada tarjeta y la columna Rol/Rango de
   la tabla, sin cambios). Mapa fijo por `rank.key`, 100% generico -- no
   hay ningun nombre de area ni de persona aqui, se sigue derivando
   exclusivamente de getPersonnelRank(role) como antes. */
const RANK_SECTION_LABEL = {
  TEAM_LEADER: 'Liderazgo',
  OPERADOR_ESPECIALIZADO: 'Operación especializada',
  AYUDANTE_GENERAL: 'Apoyo operativo',
  PERSONAL_DE_APOYO: 'Apoyo / Calidad',
}

/* Rangos de tipo "liderazgo" -- se renderizan como fila ancha
   (LeadershipRow) en vez de tarjeta de grid (Seccion 7: "el líder no
   debe verse como una estación normal"). Hoy solo TEAM_LEADER tiene
   puestos reales en este grupo de areas; los demas se incluyen por si
   algun dia existe un puesto real con ese rango aqui. */
const LEADERSHIP_RANK_KEYS = new Set(['HEAD_CHIEF_AREA', 'GERENTE_FFT', 'SUPERVISOR', 'TEAM_LEADER'])

/* Agrupa las estaciones por su rango REAL (getPersonnelRank(role), nunca
   por substring del nombre de puesto -- Seccion 15 del pedido: "no
   condiciones tipo if (nombre==='X')"). Cada rango aparece UNA sola vez,
   en el orden de su primera aparicion real en la distribucion (por eso
   "Calidad" -- Personal de apoyo -- sale primero en Paletizado/lineas,
   sin tener que ordenar por jerarquia abstracta). Estaciones sin rango
   derivable (puesto "pendiente de definir") van a un grupo neutral final,
   nunca se les inventa un rango. */
function groupStationsByRank(workstations) {
  const order = []
  const map = new Map()
  workstations.forEach((w) => {
    const rank = getPersonnelRank(w.role)
    const key = rank ? rank.key : '__SIN_CLASIFICAR__'
    if (!map.has(key)) {
      map.set(key, { rank, stations: [] })
      order.push(key)
    }
    map.get(key).stations.push(w)
  })
  return order.map((key) => map.get(key))
}

export default function LineLikeAreaDetail({ workCenterId, open, onClose, previous, next, onNavigate }) {
  const ps = usePageStyles()
  const version = usePersonnelVersion()
  const { isSupervisor } = useRoleMode()
  const dnd = useDndAssign()

  const [registerOpen, setRegisterOpen] = useState(false)
  const [selfAssignOpen, setSelfAssignOpen] = useState(false)
  const [lineHistoryOpen, setLineHistoryOpen] = useState(false)
  const [historyEmployee, setHistoryEmployee] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null)
  const [selectedStationName, setSelectedStationName] = useState(null)
  const [assignStation, setAssignStation] = useState(null)
  const [includeAbsent, setIncludeAbsent] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    setRegisterOpen(false)
    setSelfAssignOpen(false)
    setLineHistoryOpen(false)
    setHistoryEmployee(null)
    setMoveTarget(null)
    setSelectedStationName(null)
    setAssignStation(null)
    setIncludeAbsent(false)
    setActionError('')
  }, [workCenterId])

  const canonicalId = workCenterId ? canonicalOperationalAreaId(workCenterId) : null
  const memberIds = workCenterId ? operationalGroupMembers(workCenterId) : []
  const area = canonicalId ? workCenterById(canonicalId) : null
  const staffing = useMemo(() => (memberIds.length ? getGroupAreaStaffing(memberIds) : null), [workCenterId, version])
  const areaStatusKey = staffing?.ideal != null ? classifyAreaStatus(staffing.real, staffing.ideal) : null
  const areaStatusMeta = areaStatusKey ? AREA_STATUS_META[areaStatusKey] : null
  const coveragePct = staffing?.ideal ? Math.round((staffing.real / staffing.ideal) * 100) : null
  const currentOfficialShift = getCurrentShift()
  const workstations = useMemo(() => (canonicalId ? getLineWorkstationsWithOccupancy(canonicalId) : []), [canonicalId, version])
  const people = useMemo(() => (memberIds.length ? getGroupPeople(memberIds) : []), [workCenterId, version])
  const stationGroups = useMemo(() => groupStationsByRank(workstations), [workstations])
  const summaryGroups = useMemo(() => stationGroups.map((g) => ({
    key: g.rank ? g.rank.key : '__SIN_CLASIFICAR__',
    label: g.rank ? (RANK_SECTION_LABEL[g.rank.key] || g.rank.label) : 'Puestos generales',
    color: g.rank ? g.rank.color : '#94A3B8',
    occupied: g.stations.filter((w) => w.occupants.length > 0).length,
    total: g.stations.length,
  })), [stationGroups])

  useEffect(() => {
    if (!open || !canonicalId) return
    const ids = memberIds
      .flatMap((id) => getGroupPeople([id]))
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(p => p.id)
    reconcileLineAssignments(canonicalId, ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalId, open])

  const selectedStation = useMemo(() => {
    if (!workstations.length) return null
    return workstations.find(w => w.name === selectedStationName)
      || workstations.find(w => w.isAvailable)
      || workstations[0]
  }, [workstations, selectedStationName])

  const selectedStationRank = selectedStation ? getPersonnelRank(selectedStation.role) : null

  const suggestions = useMemo(() => {
    if (!canonicalId || !selectedStation || selectedStation.occupants.length > 0) return []
    return getSuggestedCandidates(canonicalId, selectedStation.name, { includeAbsent })
  }, [canonicalId, selectedStation, includeAbsent, version])

  const roster = useMemo(
    () => (memberIds.length ? getEffectiveTodayRoster().filter(r => memberIds.includes(r.areaId)) : []),
    [workCenterId, version]
  )

  if (!area || !staffing) return null

  const handleAssignSuggested = (candidate) => {
    setActionError('')
    if (!candidate.assignment) {
      const res = checkInEmployee({
        employeeId: candidate.employee.id,
        employeeNumber: candidate.employee.employeeNumber,
        areaId: canonicalId,
        stationId: selectedStation.name,
        shift: CURRENT_SHIFT,
      })
      if (res.status !== 'OK') setActionError(res.message || 'No se pudo asignar.')
    } else {
      setMoveTarget({
        employee: candidate.employee,
        currentAssignment: candidate.assignment,
        presetTo: { areaId: canonicalId, stationId: selectedStation.name },
      })
    }
  }

  const ShiftIcon = currentOfficialShift.id === 'NOCHE' ? DarkModeOutlinedIcon : WbSunnyOutlinedIcon

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
        {onNavigate && <WorkCenterNavControls previous={previous} next={next} onNavigate={onNavigate} />}
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

      <Box key={workCenterId} sx={{ p: { xs: 1.5, md: 3 }, overflowY: 'auto' }}>
        {/* KPIs -- mini-cards con acento de color (ps.kpiCard, ya existe en
           pageStyles.js, mismo estilo que otras paginas del sistema). */}
        {staffing.ideal != null && (
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3} md={2}>
              <Box sx={ps.kpiCard('blue')}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>Asignación actual</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, mt: 0.25 }}>{staffing.real} / {staffing.ideal}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>personas</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Box sx={ps.kpiCard('slate')}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>Dotación ideal</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, mt: 0.25 }}>{staffing.ideal}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>personas</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <Box sx={ps.kpiCard(staffing.diff < 0 ? 'red' : 'green')}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {staffing.diff > 0 ? 'Personal adicional' : staffing.diff === 0 ? 'Cobertura' : 'Faltan'}
                </Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, mt: 0.25, color: staffing.diff < 0 ? '#EF4444' : '#10B981' }}>
                  {staffing.diff === 0 ? '✓' : Math.abs(staffing.diff)}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {staffing.diff === 0 ? 'Completa' : `persona${Math.abs(staffing.diff) === 1 ? '' : 's'}`}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3} md={2.5}>
              <Box sx={ps.kpiCard('purple')}>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>Turno actual</Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                  <ShiftIcon sx={{ fontSize: 18, color: '#A855F7' }} />
                  <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{currentOfficialShift.label}</Typography>
                </Stack>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {formatHour12(currentOfficialShift.start)} – {formatHour12(currentOfficialShift.end)} · {dayjs().format('DD/MM/YYYY')}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={12} md={3.5}>
              <Box sx={{ ...ps.kpiCard(coveragePct >= 100 ? 'green' : 'cyan'), display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>Cobertura del área</Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{coveragePct}%</Typography>
                </Box>
                <Box sx={ps.progressBar}>
                  <Box sx={ps.progressFill(coveragePct, coveragePct >= 100 ? '#10B981' : '#06B6D4')} />
                </Box>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* Leyenda doble: Jerarquia/Rango + Estado de estacion. */}
        <Paper elevation={0} sx={{ ...ps.card, mb: 2, p: { xs: 1.5, md: 2 } }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 4 }, alignItems: 'center' }}>
            <HierarchyLegend />
            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Estado de estación
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>Ocupada</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F59E0B' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>Disponible</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#94A3B8' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary' }}>Sin asignación</Typography>
              </Stack>
            </Stack>
          </Box>
        </Paper>

        <Box sx={{ mb: 3, maxWidth: 480 }}>
          <EmployeeAssignSearchBar areaId={canonicalId} />
        </Box>

        {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>{actionError}</Alert>}

        <Grid container spacing={2}>
          {/* Columna principal */}
          <Grid item xs={12} md={8.5}>
            <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
              <Box sx={ps.cardHeader}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={ps.cardHeaderTitle}>Distribución de estaciones</Typography>
                  <Typography sx={ps.cardHeaderSubtitle}>Toca (o arrastra a alguien) sobre una estación disponible</Typography>
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                    {workstations.length} posiciones
                  </Typography>
                  <Tooltip title="Cada puesto es una posición individual, 1 persona por puesto.">
                    <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                  </Tooltip>
                </Stack>
              </Box>

              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {stationGroups.map((group) => {
                  const isLeadership = group.rank && LEADERSHIP_RANK_KEYS.has(group.rank.key)
                  const sectionLabel = group.rank ? (RANK_SECTION_LABEL[group.rank.key] || group.rank.label) : 'Puestos generales'
                  const occupiedCount = group.stations.filter((w) => w.occupants.length > 0).length
                  return (
                    <Box
                      key={group.rank ? group.rank.key : 'sin-clasificar'}
                      sx={{
                        border: '1px solid', borderColor: group.rank ? alpha(group.rank.color, 0.25) : 'divider',
                        borderRadius: 2.5, overflow: 'hidden',
                      }}
                    >
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75,
                        bgcolor: group.rank ? alpha(group.rank.color, 0.08) : 'action.hover',
                      }}>
                        {group.rank
                          ? <RankIcon rank={group.rank} size={14} />
                          : <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
                        <Typography sx={{
                          fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase',
                          color: group.rank ? group.rank.color : 'text.secondary',
                        }}>
                          {sectionLabel}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700 }}>
                          {occupiedCount} / {group.stations.length} puesto{group.stations.length === 1 ? '' : 's'}
                        </Typography>
                      </Box>
                      {isLeadership ? (
                        <Stack spacing={1} sx={{ p: 1.25 }}>
                          {group.stations.map((w) => (
                            <LeadershipRow
                              key={w.id}
                              workAreaId={canonicalId}
                              workstation={w}
                              rank={group.rank}
                              selected={selectedStation?.name === w.name}
                              onSelect={(ws) => {
                                setSelectedStationName(ws.name)
                                if (ws.isAvailable) setAssignStation(ws)
                              }}
                              onEmployeeClick={(emp) => setHistoryEmployee(emp)}
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Box sx={{
                          p: 1.25, display: 'grid', gap: 1.25,
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        }}>
                          {group.stations.map((w) => (
                            <LineStationCard
                              key={w.id}
                              workAreaId={canonicalId}
                              workstation={w}
                              selected={selectedStation?.name === w.name}
                              lineLike
                              onSelect={(ws) => {
                                setSelectedStationName(ws.name)
                                if (ws.isAvailable) setAssignStation(ws)
                              }}
                              onEmployeeClick={(emp) => setHistoryEmployee(emp)}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  )
                })}
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
              <Box sx={ps.cardHeader}>
                <Typography sx={ps.cardHeaderTitle}>Personal asignado hoy ({roster.length})</Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 340 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={ps.tableHeaderRow}>
                      <TableCell>No. empleado</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Estación</TableCell>
                      <TableCell>Rol / Rango</TableCell>
                      <TableCell>Entrada</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roster.map((r, idx) => {
                      const ws = workstations.find(w => w.name === r.stationId)
                      const isReal = r.source === 'REGISTRO'
                      const rowRank = ws ? getPersonnelRank(ws.role) : null
                      return (
                        <TableRow key={r.id} sx={ps.tableRow(idx)} hover>
                          <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 600 }}>{formatEmployeeNumber(r.employeeNumber)}</TableCell>
                          <TableCell sx={ps.cellText}>
                            <DraggablePersonChip employeeId={r.employeeId}>{r.employee?.name || '—'}</DraggablePersonChip>
                          </TableCell>
                          <TableCell sx={ps.cellTextSecondary}>{r.stationId || '—'}</TableCell>
                          <TableCell>
                            {rowRank ? (
                              <Chip
                                size="small"
                                icon={<RankIcon rank={rowRank} size={12} sx={{ ml: '4px !important' }} />}
                                label={rowRank.label.toUpperCase()}
                                sx={{
                                  fontWeight: 700, fontSize: 10.5, bgcolor: alpha(rowRank.color, 0.12), color: rowRank.color,
                                  border: `1px solid ${alpha(rowRank.color, 0.3)}`,
                                }}
                              />
                            ) : (
                              <Typography sx={ps.cellTextSecondary}>{ws?.requiredRole || '—'}</Typography>
                            )}
                          </TableCell>
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
                  Ver historial del área
                </Button>
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ ...ps.card, p: 2 }}>
              <AvailablePersonnelTray scopedAreaId={canonicalId} title="Personal disponible" />
            </Paper>
          </Grid>

          {/* Columna lateral */}
          <Grid item xs={12} md={3.5}>
            <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
              <Box sx={ps.cardHeader}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={ps.cardHeaderTitle}>
                    {selectedStation ? `Detalle de estación` : 'Estación'}
                  </Typography>
                  {selectedStation && (
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
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      {selectedStationRank && (
                        <Box sx={{
                          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          display: 'grid', placeItems: 'center', bgcolor: alpha(selectedStationRank.color, 0.14),
                        }}>
                          <RankIcon rank={selectedStationRank} size={14} />
                        </Box>
                      )}
                      <Typography sx={{ fontWeight: 800, fontSize: 17, color: selectedStation.isAvailable ? '#B45309' : 'text.primary' }}>
                        {selectedStation.name}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 1 }}>
                      Rol requerido: <b>{selectedStation.requiredRole}</b> · {selectedStation.occupants.length}/{selectedStation.capacity}
                    </Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: selectedStation.isAvailable ? '#F59E0B' : '#10B981' }} />
                      <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.3, color: selectedStation.isAvailable ? '#B45309' : '#059669' }}>
                        {selectedStation.isAvailable ? 'DISPONIBLE' : 'OCUPADA'}
                      </Typography>
                    </Stack>

                    <Typography sx={{ ...ps.sectionTitle, fontSize: 12.5, mb: 0.75 }}>Información del puesto</Typography>
                    <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Área</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{area.name}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Tipo</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Operativo</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Jerarquía</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{selectedStationRank?.label || 'Sin información disponible'}</Typography>
                      </Box>
                    </Stack>

                    {selectedStation.occupants.length > 0 && (
                      <>
                        <Typography sx={{ ...ps.sectionTitle, fontSize: 12.5, mb: 0.75 }}>Empleado asignado</Typography>
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

                        {/* Informacion adicional -- SOLO para Personal de apoyo (rango
                           PERSONAL_DE_APOYO), unico caso con algo genuinamente distinto
                           que decir. Nunca se inventa: area de origen = el `role` real
                           de la estacion (workstation.role), apoya-en = el area actual,
                           tipo de apoyo = descriptor fijo de la categoria (no un dato
                           inventado por persona), turno = mismo turno oficial calculado
                           arriba. */}
                        {selectedStationRank?.key === 'PERSONAL_DE_APOYO' && (
                          <>
                            <Divider sx={{ my: 1.5 }} />
                            <Typography sx={{ ...ps.sectionTitle, fontSize: 12.5, mb: 1 }}>Información adicional</Typography>
                            <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                              <Box>
                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Área de origen</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{selectedStation.role}</Typography>
                              </Box>
                              <Box>
                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Apoya en</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{area.name}</Typography>
                              </Box>
                              <Box>
                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Tipo de apoyo</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Transversal</Typography>
                              </Box>
                              <Box>
                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Turno</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{currentOfficialShift.label} ({formatHour12(currentOfficialShift.start)} – {formatHour12(currentOfficialShift.end)})</Typography>
                              </Box>
                            </Stack>
                          </>
                        )}

                        <Divider sx={{ my: 1.5 }} />
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small" variant="outlined" startIcon={<HistoryIcon />}
                            onClick={() => setHistoryEmployee(selectedStation.occupants[0].employee)}
                            sx={{ textTransform: 'none', fontWeight: 700, flex: 1 }}
                          >
                            Ver historial
                          </Button>
                          <Button
                            size="small" variant="contained" startIcon={<SwapHorizIcon />}
                            onClick={() => setHistoryEmployee(selectedStation.occupants[0].employee)}
                            sx={{ textTransform: 'none', fontWeight: 700, flex: 1 }}
                          >
                            Cambiar asignación
                          </Button>
                        </Stack>
                      </>
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

            <AreaStaffSummary
              groups={summaryGroups}
              total={staffing.real}
              ideal={staffing.ideal}
              diff={staffing.diff}
            />

            <Box sx={{ mt: 2 }}>
              <Paper elevation={0} sx={{ ...ps.card, p: 2 }}>
                <HierarchyLegend expanded />
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <StationAssignDialog
        open={Boolean(assignStation)}
        onClose={() => setAssignStation(null)}
        areaId={canonicalId}
        station={assignStation}
        onDone={() => {}}
      />
      <RegisterPersonnelDialog open={registerOpen} onClose={() => setRegisterOpen(false)} fixedAreaId={canonicalId} onDone={() => {}} />
      <SelfAssignDialog open={selfAssignOpen} onClose={() => setSelfAssignOpen(false)} fixedAreaId={canonicalId} onDone={() => {}} />
      <EmployeeHistoryDialog employee={historyEmployee} open={Boolean(historyEmployee)} onClose={() => setHistoryEmployee(null)} onChanged={() => {}} />
      <LineHistoryDialog lineId={canonicalId} open={lineHistoryOpen} onClose={() => setLineHistoryOpen(false)} />
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
