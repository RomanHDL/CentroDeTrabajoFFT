import { useEffect, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import GroupsIcon from '@mui/icons-material/Groups'
import SchoolIcon from '@mui/icons-material/School'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'
import { alpha } from '@mui/material/styles'
import { EmptyState } from '../../ui'
import { workCenterById, SUPPORT_AREA_DESCRIPTIONS, LINE_FAMILY_AREA_IDS } from '../../data/production/catalog'
import {
  getPeopleByArea, getAreaStaffing, AREA_STATUS_META, classifyAreaStatus,
} from '../../data/production/personnelByArea'
import { getCurrentAssignment } from '../../data/personnel/repository'
import { getAllRealTeamLeaders } from '../../data/personnel/teamLeaderRegistry'
import { fetchLineStationConfig } from '../../data/personnel/lineStationConfig'
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
   Vista compacta "área especial" (2026-08-28, "REDISEÑO DE 6 AREAS
   ESPECIALES", a peticion explicita del usuario) -- EXCLUSIVA de
   Capacitación/Team Leader/Entrenador/Limpieza/Gerente FFT/Supervisor
   (catalog.js/SPECIAL_AREA_IDS). CALIDAD y SOPORTE (el resto de
   SUPPORT_DETAIL_AREA_IDS) NO entran aqui -- siguen usando
   SupportAreaDetail.jsx sin cambios (ver AreaDetail.jsx, unico punto de
   decision).

   A diferencia de SupportAreaDetail.jsx: SIN "Disponibles para asignar",
   SIN "Actividad reciente", SIN dona de "Resumen del área" -- estas 6
   areas no son estaciones de produccion, el personal es lo unico
   protagonista. WC Team Leader ademas muestra una seccion de referencia
   con TODOS los Team Leader reales del sistema (getAllRealTeamLeaders,
   teamLeaderRegistry.js) -- nunca los mueve, nunca duplica su conteo
   (ver ese archivo para la garantia completa). ───────────────────────────────────────────── */

const AREA_TYPE_META = {
  CAPACITACION: { Icon: SchoolIcon, roleLabel: 'Capacitación', category: 'Apoyo y desarrollo', color: '#2563EB' },
  TEAM_LEADER: { Icon: GroupsIcon, roleLabel: 'Team Leader', category: 'Liderazgo', color: '#16A34A' },
  ENTRENADOR: { Icon: FitnessCenterIcon, roleLabel: 'Entrenador', category: 'Entrenamiento', color: '#D97706' },
  LIMPIEZA: { Icon: CleaningServicesIcon, roleLabel: 'Limpieza', category: 'Servicios generales', color: '#0891B2' },
  GERENTE: { Icon: AccountTreeIcon, roleLabel: 'Gerencia FFT', category: 'Gerencia', color: '#7C3AED' },
  SUPERVISOR: { Icon: VerifiedUserIcon, roleLabel: 'Supervisor', category: 'Supervisión', color: '#DC2626' },
}

function describeAreaState(real, ideal) {
  if (ideal == null) return { tone: 'ok', Icon: CheckCircleIcon, label: 'Sin plantilla oficial' }
  if (real === 0) return { tone: 'bad', Icon: WarningAmberIcon, label: 'Sin personal' }
  if (real >= ideal) return { tone: 'ok', Icon: CheckCircleIcon, label: 'Completa' }
  return { tone: 'warn', Icon: WarningAmberIcon, label: real / ideal >= 0.5 ? 'Parcial' : 'Falta personal' }
}

const TONE_COLOR = { ok: '#10B981', warn: '#F59E0B', bad: '#EF4444' }

function PersonRow({ person, areaId, meta, canManage }) {
  const dnd = useDndAssign()
  const [anchorEl, setAnchorEl] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const assignment = getCurrentAssignment(person.id)

  return (
    <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <DraggablePersonChip employeeId={person.id}>
          <EmployeeAvatar employee={person} size={44} />
        </DraggablePersonChip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14 }} noWrap>{person.name}</Typography>
          <Chip
            size="small" icon={<meta.Icon sx={{ fontSize: '13px !important' }} />}
            label={meta.roleLabel.toUpperCase()}
            sx={{
              height: 20, fontSize: 10, fontWeight: 800, mt: 0.35, letterSpacing: 0.3,
              bgcolor: alpha(meta.color, 0.12), color: meta.color,
            }}
          />
        </Box>
        <Chip
          size="small" label={(person.status || 'Activo').toUpperCase()}
          sx={{ fontWeight: 700, fontSize: 10, bgcolor: alpha('#10B981', 0.14), color: '#10B981', flexShrink: 0 }}
        />
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <MoreVertIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setHistoryOpen(true); setAnchorEl(null) }}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Ver detalle</ListItemText>
        </MenuItem>
        {canManage && (
          <Tooltip title={assignment ? '' : 'Solo disponible para asignaciones registradas hoy'} placement="right">
            <span>
              <MenuItem disabled={!assignment} onClick={() => { setMoveOpen(true); setAnchorEl(null) }}>
                <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Mover a otra área</ListItemText>
              </MenuItem>
            </span>
          </Tooltip>
        )}
        {canManage && (
          <MenuItem onClick={() => { dnd.requestRelease(person.id); setAnchorEl(null) }}>
            <ListItemIcon><PersonRemoveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Liberar del área</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <EmployeeHistoryDialog employee={historyOpen ? person : null} open={historyOpen} onClose={() => setHistoryOpen(false)} onChanged={() => {}} />
      {moveOpen && assignment && (
        <MoveConfirmDialog open={moveOpen} onClose={() => setMoveOpen(false)} employee={person} currentAssignment={assignment} onDone={() => setMoveOpen(false)} />
      )}
    </Paper>
  )
}

function TeamLeaderReferenceRow({ leader }) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const meta = AREA_TYPE_META.TEAM_LEADER
  return (
    <>
      <Paper
        elevation={0} onClick={() => setHistoryOpen(true)}
        sx={{
          p: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', cursor: 'pointer',
          transition: 'border-color .15s ease', '&:hover': { borderColor: meta.color },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <EmployeeAvatar employee={leader.employee} size={44} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14 }} noWrap>
              {leader.employee?.name}{leader.employeeNumber ? ` · #${leader.employeeNumber}` : ''}
            </Typography>
            <Chip
              size="small" icon={<GroupsIcon sx={{ fontSize: '13px !important' }} />}
              label="TEAM LEADER"
              sx={{ height: 20, fontSize: 10, fontWeight: 800, mt: 0.35, letterSpacing: 0.3, bgcolor: alpha(meta.color, 0.12), color: meta.color }}
            />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.35 }} noWrap>
              Área actual: <b>{leader.areaName}</b>
            </Typography>
          </Box>
          <Chip size="small" label="ACTIVO" sx={{ fontWeight: 700, fontSize: 10, bgcolor: alpha('#10B981', 0.14), color: '#10B981', flexShrink: 0 }} />
        </Stack>
      </Paper>
      <EmployeeHistoryDialog employee={historyOpen ? leader.employee : null} open={historyOpen} onClose={() => setHistoryOpen(false)} onChanged={() => {}} />
    </>
  )
}

export default function SpecialAreaDetail({ workCenterId, open, onClose, previous, next, onNavigate }) {
  const version = usePersonnelVersion()
  const { isSupervisor } = useRoleMode()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [selfAssignOpen, setSelfAssignOpen] = useState(false)

  useEffect(() => {
    setRegisterOpen(false)
    setSelfAssignOpen(false)
  }, [workCenterId])

  const area = workCenterId ? workCenterById(workCenterId) : null
  const meta = workCenterId ? AREA_TYPE_META[workCenterId] : null
  const staffing = useMemo(() => (workCenterId ? getAreaStaffing(workCenterId) : null), [workCenterId, version])
  const people = useMemo(() => (workCenterId ? (getPeopleByArea()[workCenterId] || []) : []), [workCenterId, version])
  const { isOver, dropProps } = useEmployeeDropTarget(workCenterId)

  const isTeamLeaderHub = workCenterId === 'TEAM_LEADER'
  /* 2026-08-27 ("estaciones configurables por ADMINISTRADOR" + puesto Team
     Leader por linea): getAllRealTeamLeaders() ahora tambien busca en las
     11 WC LINEA -- pero esa busqueda depende de que la configuracion real
     de cada linea ya se haya cargado del backend al menos una vez en esta
     sesion (ver workstations.js/lineStationConfig.js: sin eso, cada linea
     sigue devolviendo el generador JS de siempre, que nunca incluye "Team
     Leader"). Se precarga aqui, solo al abrir el hub de WC Team Leader,
     para no disparar 11 fetches en cada pantalla que no los necesita. */
  const [lineConfigsReady, setLineConfigsReady] = useState(false)
  useEffect(() => {
    if (!isTeamLeaderHub) { setLineConfigsReady(false); return }
    let cancelled = false
    Promise.all([...LINE_FAMILY_AREA_IDS].map((id) => fetchLineStationConfig(id))).then(() => {
      if (!cancelled) setLineConfigsReady(true)
    })
    return () => { cancelled = true }
  }, [isTeamLeaderHub])
  const allLeaders = useMemo(() => (isTeamLeaderHub ? getAllRealTeamLeaders() : []), [isTeamLeaderHub, version, lineConfigsReady])

  if (!area || !staffing || !meta) return null

  const status = classifyAreaStatus(staffing.real, staffing.ideal)
  const statusMeta = status ? AREA_STATUS_META[status] : null
  const headerLabel = statusMeta ? statusMeta.label : (people.length > 0 ? 'Con personal' : 'Sin personal hoy')
  const coveragePct = staffing.ideal != null && staffing.ideal > 0 ? Math.round((staffing.real / staffing.ideal) * 100) : null
  const state = describeAreaState(staffing.real, staffing.ideal)
  const description = SUPPORT_AREA_DESCRIPTIONS[area.id] || null

  return (
    <Dialog open={open} onClose={onClose} fullScreen PaperProps={{ sx: { bgcolor: 'background.default' } }}>
      {/* Header */}
      <Box sx={{
        px: { xs: 1.5, md: 3 }, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
      }}>
        <IconButton onClick={onClose}><ArrowBackIcon /></IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontWeight: 800, fontSize: 19, letterSpacing: -0.4 }}>{area.name}</Typography>
            <Chip
              size="small" label={headerLabel}
              sx={{
                fontWeight: 700, bgcolor: alpha(statusMeta?.color || '#10B981', 0.14),
                color: statusMeta?.color || '#10B981', border: `1px solid ${alpha(statusMeta?.color || '#10B981', 0.35)}`,
              }}
            />
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            {isTeamLeaderHub ? 'Vista global de líderes activos' : `Centro de Trabajo · Área de ${meta.category.toLowerCase()}`}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        {onNavigate && <WorkCenterNavControls previous={previous} next={next} onNavigate={onNavigate} />}
        <Button
          variant="contained" startIcon={<PersonAddAlt1Icon />}
          onClick={() => (isSupervisor ? setRegisterOpen(true) : setSelfAssignOpen(true))}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          {isSupervisor ? 'Registrar personal' : 'Registrarme / Autoasignarme'}
        </Button>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <Box key={workCenterId} sx={{ p: { xs: 1.5, md: 3 }, overflowY: 'auto' }}>
        {/* Franja ÁREA ESPECIAL · categoría */}
        <Paper elevation={0} sx={{
          borderRadius: '14px', border: '1px solid', borderColor: alpha(meta.color, 0.3), mb: 2,
          px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha(meta.color, 0.06),
        }}>
          <meta.Icon sx={{ fontSize: 18, color: meta.color }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: meta.color, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Área especial · {meta.category}
          </Typography>
        </Paper>

        {/* Tira de metricas compacta */}
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', mb: 2.5, overflow: 'hidden' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} divider={<Box sx={{ borderLeft: { md: '1px solid' }, borderColor: 'divider' }} />}>
            <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 1.25, flex: '1 1 170px' }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>
                {isTeamLeaderHub ? 'Líderes activos' : 'Personal mostrado'}
              </Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{isTeamLeaderHub ? allLeaders.length : people.length}</Typography>
            </Box>
            {isTeamLeaderHub && (
              <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 1.25, flex: '1 1 170px' }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>Áreas de trabajo</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{new Set(allLeaders.map((l) => l.areaId)).size}</Typography>
              </Box>
            )}
            <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 1.25, flex: '1 1 170px' }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>Estado del área</Typography>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <state.Icon sx={{ fontSize: 16, color: TONE_COLOR[state.tone] }} />
                <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{state.label}</Typography>
              </Stack>
            </Box>
            <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 1.25, flex: '1 1 150px' }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>
                {isTeamLeaderHub ? 'Plantilla' : 'Cobertura'}
              </Typography>
              <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1, color: !isTeamLeaderHub && coveragePct != null && coveragePct >= 100 ? '#10B981' : 'text.primary' }}>
                {isTeamLeaderHub ? 'No afecta' : (coveragePct != null ? `${coveragePct}%` : '—')}
              </Typography>
            </Box>
            {!isTeamLeaderHub && (
              <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 1.25, flex: '1 1 110px' }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.25 }}>Plantilla ideal</Typography>
                <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>{staffing.ideal ?? '—'}</Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Personal del área */}
        <Paper
          {...dropProps}
          elevation={0}
          sx={{
            borderRadius: '16px', border: '1px solid', borderColor: isOver ? '#3B82F6' : 'divider',
            bgcolor: isOver ? (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.12 : 0.05) : 'background.paper',
            p: 2, mb: 2.5, transition: 'all .15s ease',
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 14.5, mb: 1.5 }}>Personal del área ({people.length})</Typography>
          {people.length === 0 ? (
            <EmptyState compact title="Sin personal asignado" description={`Actualmente no hay ${meta.roleLabel.toLowerCase()} asignados a esta área.`} />
          ) : (
            <Grid container spacing={1.25}>
              {people.map((p) => (
                <Grid item xs={12} md={6} key={p.id}>
                  <PersonRow person={p} areaId={workCenterId} meta={meta} canManage={isSupervisor} />
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>

        {/* Líderes activos -- SOLO WC Team Leader */}
        {isTeamLeaderHub && (
          <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 2, mb: 2.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14.5, mb: 0.25 }}>Líderes activos ({allLeaders.length})</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
              Esta vista muestra a todos los líderes reales y el área donde actualmente están asignados.
            </Typography>
            {allLeaders.length === 0 ? (
              <EmptyState compact title="Sin líderes registrados" description="Actualmente no hay personal con rol de Team Leader en el sistema." />
            ) : (
              <Grid container spacing={1.25}>
                {allLeaders.map((leader) => (
                  <Grid item xs={12} md={6} key={leader.employee.id}>
                    <TeamLeaderReferenceRow leader={leader} />
                  </Grid>
                ))}
              </Grid>
            )}
            <Stack direction="row" spacing={1} alignItems="flex-start" sx={{
              mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: alpha('#3B82F6', 0.06), border: '1px solid', borderColor: alpha('#3B82F6', 0.2),
            }}>
              <InfoOutlinedIcon sx={{ fontSize: 16, color: '#3B82F6', mt: 0.1, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                Los líderes siguen asignados a sus áreas de trabajo. Esta es una vista de referencia y no modifica las asignaciones actuales ni el conteo de personal de esas áreas.
              </Typography>
            </Stack>
          </Paper>
        )}

        {description && (
          <Paper elevation={0} sx={{
            borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 1.5,
            display: 'flex', alignItems: 'center', gap: 1, bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.06 : 0.03),
          }}>
            <InfoOutlinedIcon sx={{ fontSize: 17, color: '#3B82F6', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{description}</Typography>
          </Paper>
        )}
      </Box>

      <RegisterPersonnelDialog open={registerOpen} onClose={() => setRegisterOpen(false)} fixedAreaId={workCenterId} onDone={() => {}} />
      <SelfAssignDialog open={selfAssignOpen} onClose={() => setSelfAssignOpen(false)} fixedAreaId={workCenterId} onDone={() => {}} />
    </Dialog>
  )
}
