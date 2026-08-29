import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import Dialog from '@mui/material/Dialog'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import GroupsIcon from '@mui/icons-material/Groups'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import EventIcon from '@mui/icons-material/Event'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from 'recharts'
import { alpha } from '@mui/material/styles'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { workCenterById, SUPPORT_AREA_DESCRIPTIONS } from '../../data/production/catalog'
import {
  getPeopleByArea,
  getAreaStaffing,
  getAvailablePersonnelToday,
  AREA_STATUS_META,
  classifyAreaStatus,
  getActividadForEmployee,
  getSnapshotHomeAreaId,
} from '../../data/production/personnelByArea'
import { getCurrentAssignment } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { useEmployeeDropTarget } from '../../ui/dnd'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useDndAssign } from '../../state/dndAssign'
import { useRoleMode } from '../../state/roleMode'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
import EmployeeHistoryDialog from './EmployeeHistoryDialog'
import MoveConfirmDialog from './MoveConfirmDialog'
import EmployeeAvatar from './EmployeeAvatar'
import WorkCenterNavControls from './WorkCenterNavControls'

/* ─────────────────────────────────────────────
   Vista de detalle para AREAS DE APOYO / INGENIERÍA / GESTIÓN
   (2026-08-26, contrato visual exacto del mockup "CT Capacitación"
   aprobado por el usuario). Administrativa y limpia -- personal,
   plantilla, cobertura, estado, historial -- NUNCA metricas
   productivas (nunca "producción/UPH/piezas/eficiencia" aqui).

   Reemplaza la vista simple SOLO para las 6 areas de
   catalog.js/SUPPORT_DETAIL_AREA_IDS (Capacitacion, Team Leader,
   Soporte, Limpieza, Gerente, Supervisor) -- CT LINEA y las areas
   productivas siguen con su propio detalle (ver AreaDetail.jsx, el
   unico punto que decide cual de los tres se monta).

   El personal de estas areas cambia poco: a diferencia de
   OperationalAreaDetail (drop zone grande, "Disponibles" primero),
   aqui "Personal asignado" es la seccion protagonista y "Disponibles
   para asignar" es deliberadamente secundaria/compacta (Parte 9 del
   pedido: "no debe sentirse como estacion de surtido"). ───────────────────────────────────────────── */

function describeAreaState(real, ideal) {
  if (ideal == null)
    return {
      tone: 'ok',
      Icon: CheckCircleIcon,
      label: 'Sin plantilla oficial',
      description: 'Esta área no tiene una plantilla ideal definida todavía.',
    }
  if (real === 0)
    return {
      tone: 'bad',
      Icon: WarningAmberIcon,
      label: 'Sin personal',
      description: 'Actualmente no hay personal asignado a esta área.',
    }
  if (real > ideal) {
    const extra = real - ideal
    return {
      tone: 'ok',
      Icon: CheckCircleIcon,
      label: 'Completa',
      description: `Cuenta con ${extra} persona${extra === 1 ? '' : 's'} adicional${extra === 1 ? '' : 'es'} a la plantilla ideal.`,
    }
  }
  if (real === ideal)
    return {
      tone: 'ok',
      Icon: CheckCircleIcon,
      label: 'Completa',
      description: 'Cuenta con el personal ideal asignado.',
    }
  const missing = ideal - real
  return {
    tone: 'warn',
    Icon: WarningAmberIcon,
    label: real / ideal >= 0.5 ? 'Parcial' : 'Falta personal',
    description: `Requiere ${missing} persona${missing === 1 ? '' : 's'} adicional${missing === 1 ? '' : 'es'} para alcanzar la plantilla ideal.`,
  }
}

const TONE_COLOR = { ok: '#10B981', warn: '#F59E0B', bad: '#EF4444' }

function relativeTimeEs(iso) {
  const diffMin = Math.max(0, dayjs().diff(dayjs(iso), 'minute'))
  if (diffMin < 1) return 'Justo ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `Hace ${diffD} d`
  return `Hace ${Math.floor(diffD / 7)} semana${Math.floor(diffD / 7) === 1 ? '' : 's'}`
}

function PersonCard({ person, areaId, canManage }) {
  const dnd = useDndAssign()
  const [anchorEl, setAnchorEl] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)

  const assignment = getCurrentAssignment(person.id)
  const actividad = getActividadForEmployee(person.id)
  const assignedDate = assignment?.createdAt
    ? dayjs(assignment.createdAt).format('DD MMM YYYY')
    : null
  /* Zona real de origen (2026-08-26, a peticion explicita del usuario:
     "que me pongas en que lugar están" al mover lideres reales a WC Team
     Leader) -- solo se muestra si la persona SI viene del snapshot real
     Y su zona de origen es distinta al area actual (nunca redundante,
     ej. no le decimos "antes en Team Leader" a alguien cuya zona de
     origen YA es Team Leader). Generico: aplica a cualquier persona
     movida a cualquier area de apoyo, no solo a los 4 lideres. */
  const homeAreaId = getSnapshotHomeAreaId(person.id)
  const homeArea = homeAreaId && homeAreaId !== areaId ? workCenterById(homeAreaId) : null

  return (
    <Paper
      elevation={0}
      sx={{ p: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <DraggablePersonChip employeeId={person.id}>
          <EmployeeAvatar employee={person} size={44} />
        </DraggablePersonChip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14 }} noWrap>
            {person.name}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
            {actividad && (
              <Chip
                size="small"
                label={actividad}
                sx={{
                  height: 18,
                  fontSize: 10,
                  fontWeight: 700,
                  mt: 0.25,
                  bgcolor: alpha('#3B82F6', 0.12),
                  color: '#3B82F6',
                }}
              />
            )}
            {homeArea && (
              <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>
                Zona real: {homeArea.name}
              </Typography>
            )}
          </Stack>
        </Box>
        {assignedDate && (
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ flexShrink: 0, display: { xs: 'none', sm: 'flex' } }}
          >
            <EventIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Box>
              <Typography sx={{ fontSize: 9.5, color: 'text.secondary', lineHeight: 1.1 }}>
                Fecha asignación
              </Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.1 }}>
                {assignedDate}
              </Typography>
            </Box>
          </Stack>
        )}
        <Chip
          size="small"
          label={(person.status || 'Activo').toUpperCase()}
          sx={{
            fontWeight: 700,
            fontSize: 10,
            bgcolor: alpha('#10B981', 0.14),
            color: '#10B981',
            flexShrink: 0,
          }}
        />
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreVertIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            setHistoryOpen(true)
            setAnchorEl(null)
          }}
        >
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ver detalle</ListItemText>
        </MenuItem>
        {canManage && (
          <Tooltip
            title={assignment ? '' : 'Solo disponible para asignaciones registradas hoy'}
            placement="right"
          >
            <span>
              <MenuItem
                disabled={!assignment}
                onClick={() => {
                  setMoveOpen(true)
                  setAnchorEl(null)
                }}
              >
                <ListItemIcon>
                  <SwapHorizIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Mover a otra área</ListItemText>
              </MenuItem>
            </span>
          </Tooltip>
        )}
        {canManage && (
          <MenuItem
            onClick={() => {
              dnd.requestRelease(person.id)
              setAnchorEl(null)
            }}
          >
            <ListItemIcon>
              <PersonRemoveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Liberar del área</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <EmployeeHistoryDialog
        employee={historyOpen ? person : null}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onChanged={() => {}}
      />
      {moveOpen && assignment && (
        <MoveConfirmDialog
          open={moveOpen}
          onClose={() => setMoveOpen(false)}
          employee={person}
          currentAssignment={assignment}
          onDone={() => setMoveOpen(false)}
        />
      )}
    </Paper>
  )
}

function AvailableCandidateRow({ person, areaId }) {
  const dnd = useDndAssign()
  return (
    <DraggablePersonChip employeeId={person.id} sx={{ display: 'block' }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        onClick={() => dnd.requestAssign(person.id, areaId)}
        sx={{
          p: 0.85,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          cursor: 'pointer',
          '&:hover': {
            borderColor: '#3B82F6',
            bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.1 : 0.05),
          },
        }}
      >
        <EmployeeAvatar employee={person} size={30} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700, fontSize: 12 }}>
            {person.name}
          </Typography>
          <Typography noWrap sx={{ fontSize: 10, color: 'text.secondary' }}>
            #{person.employeeNumber}
          </Typography>
        </Box>
        <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
      </Stack>
    </DraggablePersonChip>
  )
}

export default function SupportAreaDetail({
  workCenterId,
  open,
  onClose,
  previous,
  next,
  onNavigate,
}) {
  const ps = usePageStyles()
  const version = usePersonnelVersion()
  const { isSupervisor } = useRoleMode()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [selfAssignOpen, setSelfAssignOpen] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [history, setHistory] = useState({ loading: true, error: null, items: [] })

  /* Reinicio de estado transitorio al cambiar de Work Center (Anterior/
     Siguiente, 2026-08-27) -- el Dialog ya no se desmonta entre areas.
     `history` no hace falta reiniciarlo aqui: su propio useEffect de
     abajo ya depende de [workCenterId, ...] y lo vuelve a cargar solo. */
  useEffect(() => {
    setRegisterOpen(false)
    setSelfAssignOpen(false)
    setShowAllHistory(false)
  }, [workCenterId])

  const area = workCenterId ? workCenterById(workCenterId) : null
  const staffing = useMemo(
    () => (workCenterId ? getAreaStaffing(workCenterId) : null),
    [workCenterId, version],
  )
  const people = useMemo(
    () => (workCenterId ? getPeopleByArea()[workCenterId] || [] : []),
    [workCenterId, version],
  )
  const available = useMemo(() => getAvailablePersonnelToday(), [version])
  const { isOver, dropProps } = useEmployeeDropTarget(workCenterId)

  useEffect(() => {
    if (!open || !workCenterId) return
    let cancelled = false
    setHistory((s) => ({ ...s, loading: true, error: null }))
    fetch(`/api/personnel/area-history?areaId=${encodeURIComponent(workCenterId)}&limit=10`, {
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok) throw new Error(`area-history -> ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (!cancelled) setHistory({ loading: false, error: null, items: data.history })
      })
      .catch((e) => {
        if (!cancelled) setHistory({ loading: false, error: e.message, items: [] })
      })
    return () => {
      cancelled = true
    }
  }, [workCenterId, open, version])

  if (!area || !staffing) return null

  const status = classifyAreaStatus(staffing.real, staffing.ideal)
  const statusMeta = status ? AREA_STATUS_META[status] : null
  const headerLabel = statusMeta
    ? statusMeta.label
    : people.length > 0
      ? 'Con personal'
      : 'Sin personal hoy'
  const coveragePct =
    staffing.ideal != null && staffing.ideal > 0
      ? Math.round((staffing.real / staffing.ideal) * 1000) / 10
      : null
  const coverageBarPct = coveragePct != null ? Math.min(100, coveragePct) : 0
  const missing = staffing.ideal != null ? Math.max(0, staffing.ideal - staffing.real) : 0
  const state = describeAreaState(staffing.real, staffing.ideal)
  const description = SUPPORT_AREA_DESCRIPTIONS[area.id] || null
  const historyItems = showAllHistory ? history.items : history.items.slice(0, 3)

  const donutData =
    staffing.ideal != null
      ? [
          { key: 'activo', label: 'Personal activo', value: staffing.real, color: '#3B82F6' },
          { key: 'vacante', label: 'Vacantes', value: missing, color: '#CBD5E1' },
        ].filter((d) => d.value > 0 || staffing.real === 0)
      : [{ key: 'activo', label: 'Personal activo', value: staffing.real, color: '#3B82F6' }]
  const donutTotal = donutData.reduce((sum, d) => sum + d.value, 0) || 1

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { bgcolor: 'background.default' } }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 1.5, md: 3 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <IconButton onClick={onClose}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontWeight: 800, fontSize: 19, letterSpacing: -0.4 }}>
              {area.name}
            </Typography>
            <Chip
              size="small"
              label={headerLabel}
              sx={{
                fontWeight: 700,
                bgcolor: alpha(statusMeta?.color || '#10B981', 0.14),
                color: statusMeta?.color || '#10B981',
                border: `1px solid ${alpha(statusMeta?.color || '#10B981', 0.35)}`,
              }}
            />
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            Centro de Trabajo · Área de soporte
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        {onNavigate && (
          <WorkCenterNavControls previous={previous} next={next} onNavigate={onNavigate} />
        )}
        <Button
          variant="contained"
          startIcon={<PersonAddAlt1Icon />}
          onClick={() => (isSupervisor ? setRegisterOpen(true) : setSelfAssignOpen(true))}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          {isSupervisor ? 'Registrar personal' : 'Registrarme / Autoasignarme'}
        </Button>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box key={workCenterId} sx={{ p: { xs: 1.5, md: 3 }, overflowY: 'auto' }}>
        {/* Fila superior de resumen */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            mb: 2.5,
            overflow: 'hidden',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }}>
            <Box
              sx={{
                px: { xs: 1.5, md: 2.25 },
                py: 1.25,
                flex: '1 1 170px',
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
              }}
            >
              <Box
                sx={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  bgcolor: alpha('#3B82F6', 0.12),
                  display: 'grid',
                  placeItems: 'center',
                  color: '#3B82F6',
                }}
              >
                <GroupsIcon />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                  {staffing.ideal != null ? `${staffing.real} / ${staffing.ideal}` : staffing.real}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  personas asignadas
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: statusMeta?.color || '#94A3B8',
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: statusMeta?.color || 'text.secondary',
                    }}
                  >
                    {headerLabel}
                  </Typography>
                </Stack>
              </Box>
            </Box>

            <Box
              sx={{
                px: { xs: 1.5, md: 2.25 },
                py: 1.25,
                flex: '1 1 190px',
                borderLeft: { md: '1px solid' },
                borderColor: 'divider',
              }}
            >
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  mb: 0.5,
                }}
              >
                Estado del área
              </Typography>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <state.Icon sx={{ fontSize: 17, color: TONE_COLOR[state.tone] }} />
                <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{state.label}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>
                {state.description}
              </Typography>
            </Box>

            <Box
              sx={{
                px: { xs: 1.5, md: 2.25 },
                py: 1.25,
                flex: '1 1 150px',
                borderLeft: { md: '1px solid' },
                borderColor: 'divider',
              }}
            >
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  mb: 0.5,
                }}
              >
                Cobertura
              </Typography>
              <Typography
                sx={{
                  fontSize: 21,
                  fontWeight: 800,
                  color: coveragePct != null && coveragePct >= 100 ? '#10B981' : '#3B82F6',
                  lineHeight: 1.1,
                }}
              >
                {coveragePct != null ? `${coveragePct}%` : '—'}
              </Typography>
              {coveragePct != null && (
                <>
                  <Box
                    sx={{
                      height: 5,
                      borderRadius: 999,
                      bgcolor: 'action.hover',
                      overflow: 'hidden',
                      my: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: `${coverageBarPct}%`,
                        height: '100%',
                        bgcolor: coveragePct >= 100 ? '#10B981' : '#3B82F6',
                        borderRadius: 999,
                      }}
                    />
                  </Box>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                    {staffing.real} de {staffing.ideal} personas
                  </Typography>
                </>
              )}
            </Box>

            <Box
              sx={{
                px: { xs: 1.5, md: 2.25 },
                py: 1.25,
                flex: '1 1 110px',
                borderLeft: { md: '1px solid' },
                borderColor: 'divider',
              }}
            >
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  mb: 0.5,
                }}
              >
                Plantilla ideal
              </Typography>
              <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>
                {staffing.ideal ?? '—'}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>personas</Typography>
            </Box>

            {description && (
              <Box
                sx={{
                  px: { xs: 1.5, md: 2.25 },
                  py: 1.25,
                  flex: '1.3 1 220px',
                  borderLeft: { md: '1px solid' },
                  borderColor: 'divider',
                  bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.08 : 0.04),
                }}
              >
                <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.25 }}>
                  <InfoOutlinedIcon sx={{ fontSize: 15, color: '#3B82F6' }} />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#3B82F6' }}>
                    Información del área
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{description}</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                  {missing === 0
                    ? 'No requiere cobertura adicional'
                    : `Requiere ${missing} persona${missing === 1 ? '' : 's'} para cobertura completa`}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Personal asignado + Resumen del area */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} lg={8}>
            <Paper
              {...dropProps}
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: '1px solid',
                borderColor: isOver ? '#3B82F6' : 'divider',
                bgcolor: isOver
                  ? (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.12 : 0.05)
                  : 'background.paper',
                p: 2,
                height: '100%',
                transition: 'all .15s ease',
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 14.5, mb: 1.5 }}>
                Personal asignado ({people.length})
              </Typography>
              {people.length === 0 ? (
                <EmptyState
                  compact
                  title="No hay personal asignado actualmente."
                  description="Registra personal o arrastra a alguien desde 'Disponibles para asignar'."
                />
              ) : (
                <Stack spacing={1.25}>
                  {people.map((p) => (
                    <PersonCard
                      key={p.id}
                      person={p}
                      areaId={workCenterId}
                      canManage={isSupervisor}
                    />
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
                height: '100%',
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 14.5, mb: 1.5 }}>
                Resumen del área
              </Typography>
              <Box sx={{ position: 'relative', height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="62%"
                      outerRadius="92%"
                      paddingAngle={1.5}
                      stroke="none"
                    >
                      {donutData.map((row) => (
                        <Cell key={row.key} fill={row.color} />
                      ))}
                    </Pie>
                    <RTooltip formatter={(v, n) => [`${v} persona${v === 1 ? '' : 's'}`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%,-50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                    {staffing.real}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>personas</Typography>
                </Box>
              </Box>
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                {donutData.map((row) => (
                  <Stack key={row.key} direction="row" alignItems="center" spacing={0.75}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: row.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography sx={{ fontSize: 12, flex: 1 }}>{row.label}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                      {row.value} ({Math.round((row.value / donutTotal) * 100)}%)
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider sx={{ my: 1.5 }} />
              <Stack
                direction="row"
                spacing={1}
                alignItems="flex-start"
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: alpha(TONE_COLOR[state.tone], 0.1),
                  border: `1px solid ${alpha(TONE_COLOR[state.tone], 0.25)}`,
                }}
              >
                <state.Icon sx={{ fontSize: 17, color: TONE_COLOR[state.tone], mt: 0.1 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{state.description}</Typography>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Disponibles + Actividad reciente */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
                height: '100%',
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 13.5, mb: 1.5 }}>
                Disponibles para asignar ({available.length})
              </Typography>
              {available.length === 0 ? (
                <EmptyState
                  compact
                  title="No hay candidatos disponibles"
                  description="Actualmente no hay personal disponible para asignar a esta área."
                />
              ) : (
                <Stack spacing={0.85}>
                  {available.slice(0, 6).map((p) => (
                    <AvailableCandidateRow key={p.id} person={p} areaId={workCenterId} />
                  ))}
                </Stack>
              )}
              {available.length > 0 && isSupervisor && (
                <Button
                  size="small"
                  onClick={() => setRegisterOpen(true)}
                  sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}
                >
                  Ver todos los empleados
                </Button>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '16px',
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
                height: '100%',
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1.5 }}
              >
                <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>Actividad reciente</Typography>
                {history.items.length > 3 && (
                  <Button
                    size="small"
                    onClick={() => setShowAllHistory((v) => !v)}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {showAllHistory ? 'Ver menos' : 'Ver todo'}
                  </Button>
                )}
              </Stack>
              {history.loading ? (
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Cargando…</Typography>
              ) : history.error ? (
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  No se pudo cargar la actividad reciente.
                </Typography>
              ) : historyItems.length === 0 ? (
                <EmptyState
                  compact
                  title="Sin actividad reciente"
                  description="Todavía no hay asignaciones o movimientos registrados para esta área."
                />
              ) : (
                <Stack spacing={1.25}>
                  {historyItems.map((h) => (
                    <Stack key={h.id} direction="row" spacing={1} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          flexShrink: 0,
                          mt: 0.1,
                          bgcolor: alpha('#10B981', 0.14),
                          display: 'grid',
                          placeItems: 'center',
                          color: '#10B981',
                        }}
                      >
                        <PersonAddAlt1Icon sx={{ fontSize: 13 }} />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }} noWrap>
                          {h.employeeName} — {h.action === 'MOVED' ? 'Reasignación' : 'Asignación'}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                          {h.byName ? `Por ${h.byName} · ` : ''}
                          {relativeTimeEs(h.movedAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Franja inferior de informacion */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.06 : 0.03),
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 17, color: '#3B82F6', flexShrink: 0 }} />
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {area.name} es un área de soporte. La asignación de personal se gestiona directamente
            por los responsables autorizados.
          </Typography>
        </Paper>
      </Box>

      <RegisterPersonnelDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        fixedAreaId={workCenterId}
        onDone={() => {}}
      />
      <SelfAssignDialog
        open={selfAssignOpen}
        onClose={() => setSelfAssignOpen(false)}
        fixedAreaId={workCenterId}
        onDone={() => {}}
      />
    </Dialog>
  )
}
