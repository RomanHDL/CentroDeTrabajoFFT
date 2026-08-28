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
import BackHandIcon from '@mui/icons-material/BackHand'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import SettingsIcon from '@mui/icons-material/Settings'
import { alpha } from '@mui/material/styles'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { CURRENT_SHIFT, getCurrentShift, workCenterById, LINE_FAMILY_AREA_IDS, canonicalOperationalAreaId, operationalGroupMembers } from '../../data/production/catalog'
import {
  getPeopleByArea, getAreaStaffing, classifyAreaStatus, AREA_STATUS_META, getEffectiveTodayRoster,
  getGroupAreaStaffing, getGroupPeople, getActividadForEmployee, getPeopleWithoutStation,
} from '../../data/production/personnelByArea'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import {
  getLineWorkstationsWithOccupancy, getSuggestedCandidates, checkInEmployee, reconcileLineAssignments,
} from '../../data/personnel/repository'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getPersonnelVisualType, LINE_VISUAL_TYPES, LINE_VISUAL_TYPE_ORDER } from '../../data/personnel/lineVisualType'
import { fetchLineStationConfig, deactivateLineStation } from '../../data/personnel/lineStationConfig'
import { useEmployeeDropTarget } from '../../ui/dnd'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useRoleMode } from '../../state/roleMode'
import { useAuth } from '../../state/auth'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
import MoveConfirmDialog from './MoveConfirmDialog'
import EmployeeHistoryDialog from './EmployeeHistoryDialog'
import LineHistoryDialog from './LineHistoryDialog'
import LineWorkstationCard from './LineWorkstationCard'
import LineStationConfigDrawer from './LineStationConfigDrawer'
import LineVisualLegend, { LineTypeIcon } from './LineVisualLegend'
import SuggestedEmployeeCard from './SuggestedEmployeeCard'
import EmployeeAvatar from './EmployeeAvatar'
import StationAssignDialog from './StationAssignDialog'
import AvailablePersonnelTray from './AvailablePersonnelTray'
import AssignedPersonChip from './AssignedPersonChip'
import EmployeeAssignSearchBar from './EmployeeAssignSearchBar'
import WorkCenterNavControls from './WorkCenterNavControls'
import { useDndAssign } from '../../state/dndAssign'

/* ─────────────────────────────────────────────
   Tablero operativo de estaciones, EXCLUSIVO de WC LINEA 0-10
   (2026-08-28, "REDISEÑO DE WC LINEA 0 A WC LINEA 10", a peticion
   explicita del usuario). Este componente ya no es compartido: desde el
   rediseño anterior de LINE_LIKE (Paletizado/Accesorios/Insumos/Midea/
   Conveyor), AreaDetail.jsx solo lo invoca para la variante LINE -- por
   eso se edita directamente aqui, con identidad visual PROPIA (nunca la
   de Paletizado): TIPO DE PERSONAL (lineVisualType.js/LineVisualLegend.jsx)
   separado de ESTADO DE ESTACION, tarjeta de estacion propia
   (LineWorkstationCard.jsx, LineStationCard.jsx queda intacta para
   LINE_LIKE). Rama "vista simple" (DropZoneBanner) se conserva tal cual,
   solo por defensividad (ver getAreaDetailVariant, catalog.js). ───────────────────────────────────────────── */

/* Zona de "soltar aqui" generica -- solo se usa hoy en el caso
   defensivo (area futura sin estaciones que cayera aqui por
   clasificacion por defecto, ver catalog.js/getAreaDetailVariant). */
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

/* "07:00" -> "07:00 AM" -- solo para mostrar el horario real del
   turno oficial (OFFICIAL_SHIFTS, catalog.js); el resto del sistema
   sigue guardando/mostrando horas en 24h ("HH:mm") tal cual. */
function formatHour12(hhmm) {
  return dayjs(`2000-01-01 ${hhmm}`, 'YYYY-MM-DD HH:mm').format('hh:mm A')
}

export default function LineDetailDrawer({ workCenterId, open, onClose, previous, next, onNavigate }) {
  const ps = usePageStyles()
  const version = usePersonnelVersion()
  const { isSupervisor } = useRoleMode()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMINISTRADOR'
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
  /* "estaciones configurables por ADMINISTRADOR" (2026-08-27): configLoaded
     solo se pone en true si la configuracion real (DB) de esta linea ya se
     cargo -- mientras tanto, aunque isAdmin sea true, no se muestran
     controles de editar/eliminar (workstation.id todavia seria el id
     sintetico del generador JS, no un cuid real de Workstation -- ver
     lineStationConfig.js/workstations.js). configVersion fuerza a
     `workstations` a releerse tras cualquier alta/edicion/baja/reorden. */
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [editStationId, setEditStationId] = useState(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [configVersion, setConfigVersion] = useState(0)

  /* Reinicio de estado transitorio al cambiar de Work Center (Anterior/
     Siguiente) -- el Dialog no se desmonta entre lineas (workCenterId
     cambia con el mismo `open`), asi que sin esto quedaria la estacion/
     dialogo/error de la linea anterior. */
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
    setConfigDrawerOpen(false)
    setEditStationId(null)
    setConfigLoaded(false)
  }, [workCenterId])

  const isLine = workCenterId ? LINE_FAMILY_AREA_IDS.has(workCenterId) : false
  // isStationBased: true para toda WC LINEA real. false solo en el caso
  // defensivo (area futura sin clasificar que cayera aqui por defecto,
  // ver getAreaDetailVariant en catalog.js) -- ahi se usa la rama
  // "vista simple" de abajo, nunca "Distribución de estaciones".
  const isStationBased = isLine
  const canonicalId = workCenterId ? canonicalOperationalAreaId(workCenterId) : null
  const memberIds = workCenterId ? operationalGroupMembers(workCenterId) : []
  const area = canonicalId ? workCenterById(canonicalId) : null
  const staffing = useMemo(() => (memberIds.length ? getGroupAreaStaffing(memberIds) : null), [workCenterId, version])
  const areaStatusKey = staffing?.ideal != null ? classifyAreaStatus(staffing.real, staffing.ideal) : null
  const areaStatusMeta = areaStatusKey ? AREA_STATUS_META[areaStatusKey] : null
  const coveragePct = staffing?.ideal ? Math.round((staffing.real / staffing.ideal) * 100) : null
  const currentOfficialShift = getCurrentShift()
  const ShiftIcon = currentOfficialShift.id === 'NOCHE' ? DarkModeOutlinedIcon : WbSunnyOutlinedIcon
  const workstations = useMemo(() => (canonicalId ? getLineWorkstationsWithOccupancy(canonicalId) : []), [canonicalId, version, configVersion])
  const people = useMemo(() => (memberIds.length ? getGroupPeople(memberIds) : []), [workCenterId, version])

  /* Carga la configuracion real de puestos de esta linea (DB, ver
     lineStationConfig.js) al abrir -- mientras no llegue, `workstations`
     sigue viniendo del generador JS de siempre (comportamiento identico).
     configLoaded solo se activa si la respuesta trajo filas reales, para
     no exponer edicion/eliminacion contra ids sinteticos (ver comentario
     junto al estado arriba). */
  useEffect(() => {
    if (!open || !isStationBased || !canonicalId) { setConfigLoaded(false); return }
    let cancelled = false
    setConfigLoaded(false)
    fetchLineStationConfig(canonicalId).then((rows) => {
      if (cancelled) return
      setConfigLoaded(Boolean(rows && rows.length))
      setConfigVersion((v) => v + 1)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalId, isStationBased, open])

  function handleStationConfigChanged() {
    setConfigVersion((v) => v + 1)
  }

  async function handleDeactivateStation(w) {
    setActionError('')
    if (w.occupants?.length > 0) {
      setActionError('No se puede eliminar este puesto porque actualmente tiene personal asignado. Reasígnalo primero.')
      return
    }
    try {
      await deactivateLineStation(canonicalId, w.id)
      handleStationConfigChanged()
    } catch (e) {
      setActionError(e.message || 'No se pudo eliminar el puesto.')
    }
  }

  function handleEditStation(w) {
    setEditStationId(w.id)
    setConfigDrawerOpen(true)
  }

  /* Agrupacion por categoria -- usada SOLO por "Resumen de la linea" (sidebar,
     ver lineSummary abajo). La cuadricula principal ("Distribución de
     estaciones") NO se separa en secciones (a peticion explicita del
     usuario, 2026-08-27: "quiero que las estaciones esten juntas, todas
     del mismo tamaño") -- se renderiza como una sola grilla plana con
     `workstations` tal cual, cada card ya muestra su categoria
     explicitamente (icono+etiqueta, LineWorkstationCard.jsx). La
     categoria es una propiedad de la ESTACION (workstation.category, o el
     respaldo por rol/actividad de getPersonnelVisualType), nunca del
     ocupante -- por eso se calcula incluso para estaciones vacias. */
  const stationCategories = useMemo(() => {
    const leadership = []
    const byCategory = new Map()
    workstations.forEach((w) => {
      const occupant = w.occupants[0]
      const actividad = occupant?.employee?.id ? getActividadForEmployee(occupant.employee.id) : null
      const vt = getPersonnelVisualType({ stationRole: w.role, actividad, category: w.category })
      if (vt?.key === 'LIDERAZGO') { leadership.push(w); return }
      const key = vt?.key || '__SIN_CLASIFICAR__'
      const label = vt?.label || 'Otros puestos'
      const color = vt?.color || '#94A3B8'
      if (!byCategory.has(key)) byCategory.set(key, { key, label, color, stations: [] })
      byCategory.get(key).stations.push(w)
    })
    const groups = LINE_VISUAL_TYPE_ORDER.filter((t) => t.key !== 'LIDERAZGO').map((t) => byCategory.get(t.key)).filter(Boolean)
    if (byCategory.has('__SIN_CLASIFICAR__')) groups.push(byCategory.get('__SIN_CLASIFICAR__'))
    return { leadership, groups }
  }, [workstations])

  /* Resumen de la linea (Seccion 13/14 del pedido) -- conteos por
     categoria, calculados dinamicamente de las estaciones reales, nunca
     guardados aparte. Total/faltan siguen viniendo de `staffing`
     (getGroupAreaStaffing, SIN recalcular -- Decision D3 del plan: la
     dotacion ideal no cambia de fuente). */
  const lineSummary = useMemo(() => {
    const leadershipGroup = stationCategories.leadership.length
      ? {
          key: 'LIDERAZGO',
          label: LINE_VISUAL_TYPES.LIDERAZGO.label,
          color: LINE_VISUAL_TYPES.LIDERAZGO.color,
          occupied: stationCategories.leadership.filter((w) => w.occupants.length > 0).length,
          total: stationCategories.leadership.length,
        }
      : null
    const rest = stationCategories.groups.map((g) => ({
      key: g.key,
      label: g.label,
      color: g.color,
      occupied: g.stations.filter((w) => w.occupants.length > 0).length,
      total: g.stations.length,
    }))
    return { groups: [leadershipGroup, ...rest].filter(Boolean) }
  }, [stationCategories])

  /* Reconcilia estaciones reales al abrir una WC LINEA -- corrige tanto a
     quien ya esta en el area pero sin ninguna asignacion real hoy
     (snapshot de BASE) COMO a quien ya tiene una asignacion real pero con
     un stationId invalido/heredado -- ver reconcileLineAssignments en
     repository.js para la regla completa. Orden estable por nombre
     (nunca aleatorio); idempotente. */
  useEffect(() => {
    if (!open || !isStationBased || !canonicalId) return
    const ids = memberIds
      .flatMap((id) => getGroupPeople([id]))
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(p => p.id)
    reconcileLineAssignments(canonicalId, ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalId, isStationBased, open])

  const selectedStation = useMemo(() => {
    if (!workstations.length) return null
    return workstations.find(w => w.name === selectedStationName)
      || workstations.find(w => w.isAvailable)
      || workstations[0]
  }, [workstations, selectedStationName])

  const selectedStationOccupantActividad = selectedStation?.occupants[0]?.employee?.id
    ? getActividadForEmployee(selectedStation.occupants[0].employee.id)
    : null
  const selectedStationVisualType = selectedStation
    ? getPersonnelVisualType({ stationRole: selectedStation.role, actividad: selectedStationOccupantActividad, category: selectedStation.category })
    : null

  const suggestions = useMemo(() => {
    if (!canonicalId || !selectedStation || selectedStation.occupants.length > 0) return []
    return getSuggestedCandidates(canonicalId, selectedStation.name, { includeAbsent })
  }, [canonicalId, selectedStation, includeAbsent, version])

  /* getEffectiveTodayRoster (no solo workstations.occupants): en lineas con
     personal historico de BASE que todavia nadie movio hoy (ej. CT LINEA 0),
     ese personal cuenta en staffing.real pero NO tiene una estacion real
     asignada -- si la tabla solo mostrara occupants de estaciones, esas
     personas reales quedarian invisibles aunque el encabezado ya las cuenta
     (Seccion 31/32 del pedido: nunca se pierde personal real). */
  const roster = useMemo(
    () => (memberIds.length ? getEffectiveTodayRoster().filter(r => memberIds.includes(r.areaId)) : []),
    [workCenterId, version]
  )
  // "PERSONAL SIN ESTACIÓN" (2026-08-28, "CORRECCIÓN DE PUESTOS Y ESTACIONES OPERATIVAS", a
  // peticion explicita del usuario) -- 100% derivado, ver getPeopleWithoutStation
  // (personnelByArea.js): nunca escribe nada, solo compara contra `workstations` (la lista real
  // actual). Si una estacion se elimina/renombra (ej. Team Leader/Montaje 2 en esta correccion),
  // quien la ocupaba aparece aqui, sin perderse.
  const peopleWithoutStation = useMemo(
    () => (memberIds.length ? getPeopleWithoutStation(memberIds, workstations) : []),
    [memberIds, workstations]
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
        {isStationBased && staffing.ideal != null ? (
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
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>Cobertura de la línea</Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{coveragePct}%</Typography>
                </Box>
                <Box sx={ps.progressBar}>
                  <Box sx={ps.progressFill(coveragePct, coveragePct >= 100 ? '#10B981' : '#06B6D4')} />
                </Box>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
              {staffing.ideal != null ? `${staffing.real} / ${staffing.ideal} personas` : personnelCountLabel}
            </Typography>
            {staffing.ideal == null && (
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>Sin plantilla definida</Typography>
            )}
          </Box>
        )}

        {isStationBased && (
          <Paper elevation={0} sx={{ ...ps.card, mb: 2, p: { xs: 1.5, md: 2 }, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <LineVisualLegend />
            </Box>
            {isAdmin && configLoaded && (
              <Button
                size="small" variant="outlined" startIcon={<SettingsIcon />}
                onClick={() => { setEditStationId(null); setConfigDrawerOpen(true) }}
                sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
              >
                Configurar puestos
              </Button>
            )}
          </Paper>
        )}

        <Box sx={{ mb: 3, maxWidth: 480 }}>
          <EmployeeAssignSearchBar areaId={canonicalId} />
        </Box>

        {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError('')}>{actionError}</Alert>}

        {isStationBased ? (
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
                    <Tooltip title="Los roles se repiten según la cantidad de posiciones requeridas en la línea.">
                      <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                    </Tooltip>
                  </Stack>
                </Box>
                <Box sx={{ p: 2, display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                  {workstations.map((w) => (
                    <LineWorkstationCard
                      key={w.id}
                      workAreaId={canonicalId}
                      workstation={w}
                      selected={selectedStation?.name === w.name}
                      onSelect={(ws) => {
                        setSelectedStationName(ws.name)
                        if (ws.isAvailable) setAssignStation(ws)
                      }}
                      onEmployeeClick={(emp) => setHistoryEmployee(emp)}
                      isAdmin={isAdmin && configLoaded}
                      onEdit={handleEditStation}
                      onDeactivate={handleDeactivateStation}
                    />
                  ))}
                </Box>
              </Paper>

              {peopleWithoutStation.length > 0 && (
                <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
                  <Box sx={ps.cardHeader}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={ps.cardHeaderTitle}>Personal sin estación ({peopleWithoutStation.length})</Typography>
                      <Typography sx={ps.cardHeaderSubtitle}>Siguen asignados a esta línea, pero su puesto ya no existe en la configuración actual</Typography>
                    </Box>
                  </Box>
                  <Stack spacing={1} sx={{ p: 2 }}>
                    {peopleWithoutStation.map((r) => (
                      <Stack key={r.id} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <EmployeeAvatar employee={r.employee} size={36} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 13 }} noWrap>{r.employee?.name || '—'}</Typography>
                          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>
                            {r.stationId ? `Antes: ${r.stationId}` : 'Sin puesto registrado hoy'}
                          </Typography>
                        </Box>
                        <Button
                          size="small" variant="outlined" startIcon={<PersonSearchIcon sx={{ fontSize: 16 }} />}
                          onClick={() => setMoveTarget({ employee: r.employee, currentAssignment: r })}
                          sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                        >
                          Asignar a estación
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              )}

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
                        <TableCell>Tipo</TableCell>
                        <TableCell>Entrada</TableCell>
                        <TableCell>Estado</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {roster.map((r, idx) => {
                        const ws = workstations.find(w => w.name === r.stationId)
                        const isReal = r.source === 'REGISTRO'
                        const rowActividad = getActividadForEmployee(r.employeeId)
                        const rowType = getPersonnelVisualType({ stationRole: ws?.role, actividad: rowActividad, category: ws?.category })
                        return (
                          <TableRow key={r.id} sx={ps.tableRow(idx)} hover>
                            <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 600 }}>{formatEmployeeNumber(r.employeeNumber)}</TableCell>
                            <TableCell sx={ps.cellText}>
                              <DraggablePersonChip employeeId={r.employeeId}>{r.employee?.name || '—'}</DraggablePersonChip>
                            </TableCell>
                            <TableCell sx={ps.cellTextSecondary}>{r.stationId || '—'}</TableCell>
                            <TableCell sx={ps.cellTextSecondary}>{ws?.requiredRole || '—'}</TableCell>
                            <TableCell>
                              {rowType ? (
                                <Chip
                                  size="small"
                                  icon={<LineTypeIcon type={rowType} size={12} sx={{ ml: '4px !important' }} />}
                                  label={rowType.label.toUpperCase()}
                                  sx={{
                                    fontWeight: 700, fontSize: 10, bgcolor: alpha(rowType.color, 0.12), color: rowType.color,
                                    border: `1px solid ${alpha(rowType.color, 0.3)}`,
                                  }}
                                />
                              ) : (
                                <Typography sx={ps.cellTextSecondary}>—</Typography>
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
                          <TableCell colSpan={8}>
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
                <AvailablePersonnelTray scopedAreaId={canonicalId} title="Personal disponible" />
              </Paper>
            </Grid>

            {/* Columna lateral */}
            <Grid item xs={12} md={3.5}>
              <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
                <Box sx={ps.cardHeader}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={ps.cardHeaderTitle}>Detalle de estación</Typography>
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
                        {selectedStationVisualType && (
                          <Box sx={{
                            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                            display: 'grid', placeItems: 'center', bgcolor: alpha(selectedStationVisualType.color, 0.14),
                          }}>
                            <LineTypeIcon type={selectedStationVisualType} size={14} />
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

                      <Typography sx={{ ...ps.sectionTitle, fontSize: 12.5, mb: 0.75 }}>Información de la estación</Typography>
                      <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Área</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{area.isProduction ? 'Producción' : '—'}</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Tipo</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Operativo</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Turno</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{currentOfficialShift.label} ({formatHour12(currentOfficialShift.start)} – {formatHour12(currentOfficialShift.end)})</Typography>
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Categoría</Typography>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: selectedStationVisualType?.color }}>
                            {selectedStationVisualType?.label || 'Sin clasificar'}
                          </Typography>
                        </Box>
                      </Stack>

                      {selectedStation.occupants.length > 0 && (
                        <>
                          <Divider sx={{ my: 1.5 }} />
                          <Typography sx={{ ...ps.sectionTitle, fontSize: 12.5, mb: 0.75 }}>Empleado asignado</Typography>
                          <Stack spacing={1} sx={{ mb: 1.5 }}>
                            {selectedStation.occupants.map(o => (
                              <Stack key={o.id} direction="row" spacing={1.25} alignItems="center" onClick={() => setHistoryEmployee(o.employee)} sx={{ cursor: 'pointer' }}>
                                <EmployeeAvatar employee={o.employee} size={36} />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography sx={{ fontWeight: 700, fontSize: 13 }}>{o.employeeNumber} — {o.employee?.name}</Typography>
                                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Entrada {o.checkInAt}</Typography>
                                  {selectedStationVisualType && (
                                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: selectedStationVisualType.color, letterSpacing: 0.3 }}>
                                      {selectedStationVisualType.label.toUpperCase()}
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>
                            ))}
                          </Stack>

                          {/* Area de origen / Tipo de apoyo -- SOLO para Apoyo/Calidad
                             (unico caso con algo genuinamente distinto que decir).
                             Nunca inventado: area de origen = el `role` real de la
                             estacion (workstation.role), tipo de apoyo = descriptor
                             fijo de la categoria (no un dato inventado por persona). */}
                          {selectedStationVisualType?.key === 'CALIDAD' && (
                            <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                              <Box>
                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Área de origen</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{selectedStation.role}</Typography>
                              </Box>
                              <Box>
                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>Tipo de apoyo</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Transversal</Typography>
                              </Box>
                            </Stack>
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

              <Paper elevation={0} sx={{ ...ps.card, p: 2 }}>
                <Typography sx={{ ...ps.sectionTitle, fontSize: 13, mb: 1.25 }}>Resumen de la línea</Typography>
                <Stack spacing={0.85}>
                  {lineSummary.groups.map((g) => (
                    <Stack key={g.key} direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: g.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 12.5, flex: 1 }} noWrap>{g.label}</Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{g.occupied} / {g.total}</Typography>
                    </Stack>
                  ))}
                </Stack>
                {staffing.ideal != null && (
                  <>
                    <Divider sx={{ my: 1.25 }} />
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 800, flex: 1 }}>Total asignado</Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{staffing.real} / {staffing.ideal}</Typography>
                    </Stack>
                    {staffing.diff < 0 && (
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: '#EF4444', flex: 1 }}>Faltan por cubrir</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>{Math.abs(staffing.diff)}</Typography>
                      </Stack>
                    )}
                  </>
                )}
              </Paper>
            </Grid>
          </Grid>
        ) : (
          /* Vista simplificada, solo por defensividad -- ver comentario junto
             a isStationBased arriba. Nunca "Distribucion de estaciones" aqui. */
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
                <DropZoneBanner areaId={canonicalId} label={area.name} />
              </Box>

              <Paper elevation={0} sx={{ ...ps.card, p: 2 }}>
                <AvailablePersonnelTray scopedAreaId={canonicalId} />
              </Paper>
            </Grid>
          </Grid>
        )}
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
      {isAdmin && configLoaded && (
        <LineStationConfigDrawer
          open={configDrawerOpen}
          onClose={() => { setConfigDrawerOpen(false); setEditStationId(null) }}
          lineId={canonicalId}
          areaName={area.name}
          workstations={workstations}
          editStationId={editStationId}
          onChanged={handleStationConfigChanged}
        />
      )}
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
