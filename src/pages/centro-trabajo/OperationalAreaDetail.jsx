import { useEffect, useMemo, useRef, useState } from 'react'
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
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import GroupsIcon from '@mui/icons-material/Groups'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import BackHandIcon from '@mui/icons-material/BackHand'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import StarIcon from '@mui/icons-material/Star'
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates'
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from 'recharts'
import { alpha } from '@mui/material/styles'
import { usePageStyles } from '../../ui/pageStyles'
import { EmptyState } from '../../ui'
import { CURRENT_SHIFT, SHIFT_HOURS, workCenterById, canonicalOperationalAreaId, operationalGroupMembers } from '../../data/production/catalog'
import {
  getAvailablePersonnelToday, getGroupAreaStaffing, getGroupPeople,
  AREA_STATUS_META, classifyAreaStatus, getActividadForEmployee,
} from '../../data/production/personnelByArea'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { useEmployeeDropTarget } from '../../ui/dnd'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useDndAssign } from '../../state/dndAssign'
import { useRoleMode } from '../../state/roleMode'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
import EmployeeAvatar from './EmployeeAvatar'
import AssignedPersonChip from './AssignedPersonChip'

/* ─────────────────────────────────────────────
   Vista operativa de detalle para AREAS PRODUCTIVAS (2026-08-25,
   contrato visual exacto del mockup "CT Accesorios" aprobado por el
   usuario). Reemplaza la vista simple (personal asignado + soltar +
   disponibles) SOLO para las areas de catalog.js/usesOperationalDetail
   -- CT LINEA y las areas de apoyo/ingenieria (Capacitacion, Team
   Leader, Soporte, Limpieza, Gerente, Supervisor) siguen usando
   LineDetailDrawer.jsx tal cual, sin cambios (ver AreaDetail.jsx, el
   wrapper que decide cual de los dos se monta).

   Un solo componente reutilizable para TODAS las areas operativas
   (Accesorios, Paletizado, Midea/High Value, Box Prep, Insumos,
   Suministro de material, Conveyor Principal/Secundario, Calidad) --
   recibe unicamente `workCenterId` y calcula todo lo demas desde las
   mismas fuentes reales que ya usa el resto del sistema. Nunca una
   copia de real/ideal/faltante/cobertura: todo sale de
   getAreaStaffing/getPeopleByArea (personnelByArea.js), igual que el
   plano 2D y "Resumen por área". ───────────────────────────────────────────── */

const PIE_PALETTE = ['#3B82F6', '#10B981', '#A855F7', '#F59E0B', '#06B6D4', '#EC4899', '#64748B']

function relativeTimeEs(iso) {
  const diffMin = Math.max(0, dayjs().diff(dayjs(iso), 'minute'))
  if (diffMin < 1) return 'Justo ahora'
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return `Hace ${diffD} d`
}

function MetricBlock({ label, children, borderLeft }) {
  return (
    <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 1, flex: 1, minWidth: 130, ...(borderLeft ? { borderLeft: '1px solid', borderColor: 'divider' } : {}) }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
        {label}
      </Typography>
      {children}
    </Box>
  )
}

function DropZone({ areaId, label }) {
  const { isOver, dropProps } = useEmployeeDropTarget(areaId)
  return (
    <Paper
      elevation={0}
      {...dropProps}
      sx={{
        height: '100%', minHeight: 180, borderRadius: '16px', border: '2px dashed',
        borderColor: isOver ? '#3B82F6' : alpha('#3B82F6', 0.4),
        bgcolor: (t) => alpha('#3B82F6', isOver ? (t.palette.mode === 'dark' ? 0.16 : 0.08) : (t.palette.mode === 'dark' ? 0.04 : 0.02)),
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, p: 2,
        transition: 'all .15s ease',
      }}
    >
      <BackHandIcon sx={{ fontSize: 30, color: '#3B82F6' }} />
      <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#3B82F6', textAlign: 'center' }}>
        {isOver ? 'Soltar aquí' : 'Arrastra empleados aquí'}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', textAlign: 'center' }}>
        para asignarlos a {label}
      </Typography>
    </Paper>
  )
}

function AvailableCandidateRow({ person, areaId }) {
  const dnd = useDndAssign()
  return (
    <DraggablePersonChip employeeId={person.id} sx={{ display: 'block' }}>
      <Stack
        direction="row" spacing={1} alignItems="center"
        onClick={() => dnd.requestAssign(person.id, areaId)}
        sx={{
          p: 0.9, borderRadius: 2, border: '1px solid', borderColor: 'divider', cursor: 'pointer',
          '&:hover': { borderColor: '#3B82F6', bgcolor: (t) => alpha('#3B82F6', t.palette.mode === 'dark' ? 0.1 : 0.05) },
        }}
      >
        <EmployeeAvatar employee={person} size={32} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 700, fontSize: 12.5 }}>{person.name}</Typography>
          <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>#{person.employeeNumber}</Typography>
        </Box>
        <DragIndicatorIcon sx={{ fontSize: 17, color: 'text.disabled', flexShrink: 0 }} />
      </Stack>
    </DraggablePersonChip>
  )
}

/* Distribucion por tipo de puesto -- unica fuente REAL disponible hoy es
   `actividad` (columna cruda del Excel de origen, ver personnelByArea.js/
   getActividadForEmployee): SEED_SKILLS esta vacio (skills.js, "las
   habilidades reales... vendran de la importacion en Etapa 2", todavia
   no paso), asi que no existe ningun otro dato real de rol/puesto por
   empleado. Los codigos se muestran TAL CUAL (sin traducir a "Operador/
   Técnico/..." -- esa traduccion no esta documentada en ningun lado, un
   nombre inventado seria tan falso como los del mockup). Si menos de 2
   personas tienen actividad registrada, no hay nada que distribuir --
   se oculta la dona en vez de forzar un grafico vacio o absurdo (Parte
   "Variantes" del prompt: Conveyor con 1 persona no debe verse forzado). */
function RoleDistributionCard({ people }) {
  const counts = new Map()
  let withData = 0
  people.forEach((p) => {
    const codigo = getActividadForEmployee(p.id)
    if (!codigo) return
    withData += 1
    counts.set(codigo, (counts.get(codigo) || 0) + 1)
  })

  if (withData < 2 || counts.size < 2) {
    return (
      <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 2, height: '100%' }}>
        <Typography sx={{ fontWeight: 800, fontSize: 14.5, mb: 1.5 }}>Distribución por tipo de puesto</Typography>
        <EmptyState
          compact
          title="Sin información suficiente"
          description="Todavía no hay suficientes registros de actividad/puesto por empleado para esta área."
        />
      </Paper>
    )
  }

  const data = [...counts.entries()].map(([codigo, value], i) => ({ codigo, value, color: PIE_PALETTE[i % PIE_PALETTE.length] }))

  return (
    <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 2, height: '100%' }}>
      <Typography sx={{ fontWeight: 800, fontSize: 14.5, mb: 0.25 }}>Distribución por tipo de puesto</Typography>
      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mb: 1 }}>Código de actividad real, sin interpretar (BASE)</Typography>
      <Stack direction="row" spacing={2} sx={{ minHeight: 160 }}>
        <Box sx={{ position: 'relative', flex: '0 0 140px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="codigo" innerRadius="60%" outerRadius="92%" paddingAngle={1.5} stroke="none">
                {data.map((row) => <Cell key={row.codigo} fill={row.color} />)}
              </Pie>
              <RTooltip formatter={(v, n) => [`${v} persona${v === 1 ? '' : 's'}`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{withData}</Typography>
            <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>personas</Typography>
          </Box>
        </Box>
        <Stack spacing={0.75} justifyContent="center" sx={{ flex: 1, minWidth: 0 }}>
          {data.map((row) => (
            <Stack key={row.codigo} direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{row.codigo}</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{row.value} ({((row.value / withData) * 100).toFixed(0)}%)</Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </Paper>
  )
}

/* Clasificacion + recomendacion -- reglas matematicas simples sobre
   real/ideal, nunca texto de IA. */
function classifyForTip(real, ideal) {
  if (ideal == null) return { icon: '⭐', label: 'Sin plantilla oficial', tip: 'Esta área no tiene una plantilla ideal definida todavía.' }
  if (real === 0) return { icon: '⚠️', label: 'Sin personal', tip: 'Asigna personal para comenzar a operar esta área.' }
  if (real > ideal) return { icon: '⭐', label: 'Sobre plantilla', tip: `Esta área tiene ${real - ideal} persona(s) por encima de su ideal.` }
  if (real === ideal) return { icon: '⭐', label: 'Plantilla completa', tip: 'Esta área alcanzó su plantilla ideal.' }
  const pct = (real / ideal) * 100
  if (pct < 50) return { icon: '🔴', label: 'Área crítica', tip: `Faltan ${ideal - real} personas — cobertura por debajo del 50%.` }
  if (pct < 90) return { icon: '⭐', label: 'Área en desarrollo', tip: `Cerca de alcanzar la plantilla ideal. Tip: asigna ${ideal - real} persona(s) más para lograr cobertura completa.` }
  return { icon: '⭐', label: 'Cerca de completarse', tip: `Solo faltan ${ideal - real} persona(s) para cobertura completa.` }
}

export default function OperationalAreaDetail({ workCenterId, open, onClose }) {
  const ps = usePageStyles()
  const version = usePersonnelVersion()
  const { isSupervisor } = useRoleMode()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [selfAssignOpen, setSelfAssignOpen] = useState(false)
  const availableRef = useRef(null)
  const [highlightAvailable, setHighlightAvailable] = useState(false)

  const [history, setHistory] = useState({ loading: true, error: null, items: [] })

  // Id canonico (2026-08-25, ver catalog.js/AREA_DETAIL_GROUPS): CT Sellado
  // no tiene detalle propio, "va junto con Conveyor Principal" a peticion
  // explicita del usuario -- si workCenterId es SELLADO, esto resuelve a
  // CONVEYOR_PRINCIPAL para titulo/asignaciones nuevas, y memberIds suma el
  // personal/plantilla de AMBAS areas reales en el mismo detalle. Para
  // cualquier area que no pertenezca a ningun grupo, canonicalId === workCenterId
  // y memberIds === [workCenterId] (sin cambio de comportamiento).
  const canonicalId = workCenterId ? canonicalOperationalAreaId(workCenterId) : null
  const memberIds = workCenterId ? operationalGroupMembers(workCenterId) : []

  const area = canonicalId ? workCenterById(canonicalId) : null
  const staffing = useMemo(() => (memberIds.length ? getGroupAreaStaffing(memberIds) : null), [workCenterId, version])
  const people = useMemo(() => (memberIds.length ? getGroupPeople(memberIds) : []), [workCenterId, version])
  const available = useMemo(() => getAvailablePersonnelToday(), [version])

  useEffect(() => {
    if (!open || !memberIds.length) return
    let cancelled = false
    setHistory((s) => ({ ...s, loading: true, error: null }))
    Promise.all(memberIds.map((id) =>
      fetch(`/api/personnel/area-history?areaId=${encodeURIComponent(id)}&limit=8`, { credentials: 'include' })
        .then((r) => { if (!r.ok) throw new Error(`area-history -> ${r.status}`); return r.json() })
        .then((data) => data.history)
    ))
      .then((lists) => {
        if (cancelled) return
        const merged = lists.flat().sort((a, b) => (a.movedAt < b.movedAt ? 1 : -1)).slice(0, 8)
        setHistory({ loading: false, error: null, items: merged })
      })
      .catch((e) => { if (!cancelled) setHistory({ loading: false, error: e.message, items: [] }) })
    return () => { cancelled = true }
  }, [workCenterId, open, version])

  if (!area || !staffing) return null

  const status = classifyAreaStatus(staffing.real, staffing.ideal)
  const statusMeta = status ? AREA_STATUS_META[status] : null
  const headerLabel = statusMeta ? statusMeta.label : (people.length > 0 ? 'Con personal' : 'Sin personal hoy')
  const coveragePct = staffing.ideal != null && staffing.ideal > 0 ? Math.round((staffing.real / staffing.ideal) * 1000) / 10 : null
  const coverageBarPct = coveragePct != null ? Math.min(100, coveragePct) : 0
  const missing = staffing.ideal != null ? Math.max(0, staffing.ideal - staffing.real) : 0
  const tip = classifyForTip(staffing.real, staffing.ideal)
  const shiftRange = SHIFT_HOURS.length ? `${SHIFT_HOURS[0]} - ${SHIFT_HOURS[SHIFT_HOURS.length - 1]}` : ''

  function scrollToAvailable() {
    availableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightAvailable(true)
    setTimeout(() => setHighlightAvailable(false), 1600)
  }

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
                fontWeight: 700,
                bgcolor: alpha(statusMeta?.color || '#10B981', 0.14),
                color: statusMeta?.color || '#10B981',
                border: `1px solid ${alpha(statusMeta?.color || '#10B981', 0.35)}`,
              }}
            />
          </Stack>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Centro de Trabajo • Área de producción</Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained" startIcon={<PersonAddAlt1Icon />}
          onClick={() => (isSupervisor ? setRegisterOpen(true) : setSelfAssignOpen(true))}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          {isSupervisor ? 'Registrar personal' : 'Registrarme / Autoasignarme'}
        </Button>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 3 }, overflowY: 'auto' }}>
        {/* Fila superior de metricas */}
        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', mb: 2.5, overflow: 'hidden' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} divider={false}>
            <Box sx={{ px: { xs: 1.5, md: 2.25 }, py: 1.25, flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box sx={{ width: 46, height: 46, borderRadius: '50%', bgcolor: alpha('#3B82F6', 0.12), display: 'grid', placeItems: 'center', color: '#3B82F6' }}>
                <GroupsIcon />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                  {staffing.ideal != null ? `${staffing.real} / ${staffing.ideal}` : staffing.real}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>personas asignadas</Typography>
                {missing > 0 && <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>Faltan {missing}</Typography>}
              </Box>
            </Box>

            <MetricBlock label="Cobertura actual" borderLeft>
              <Typography sx={{ fontSize: 21, fontWeight: 800, color: coveragePct != null && coveragePct >= 100 ? '#10B981' : '#3B82F6', lineHeight: 1.1 }}>
                {coveragePct != null ? `${coveragePct}%` : '—'}
              </Typography>
              {coveragePct != null && (
                <>
                  <Box sx={{ height: 5, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden', my: 0.5 }}>
                    <Box sx={{ width: `${coverageBarPct}%`, height: '100%', bgcolor: coveragePct >= 100 ? '#10B981' : '#3B82F6', borderRadius: 999 }} />
                  </Box>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{staffing.real} de {staffing.ideal}</Typography>
                </>
              )}
            </MetricBlock>

            <MetricBlock label="Plantilla ideal" borderLeft>
              <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>{staffing.ideal ?? '—'}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>personas</Typography>
            </MetricBlock>

            <MetricBlock label="Faltante" borderLeft>
              <Typography sx={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1, color: missing > 0 ? '#EF4444' : 'text.primary' }}>{staffing.ideal != null ? missing : '—'}</Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>personas</Typography>
            </MetricBlock>

            <MetricBlock label="Estado del área" borderLeft>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusMeta?.color || '#94A3B8' }} />
                <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{headerLabel}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                {status === 'COMPLETA' || status === null ? 'Al día' : 'Requiere atención'}
              </Typography>
            </MetricBlock>

            <MetricBlock label="Turno actual" borderLeft>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <WbSunnyIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
                <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{CURRENT_SHIFT}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{shiftRange}</Typography>
            </MetricBlock>
          </Stack>
        </Paper>

        {/* Personal asignado + Distribucion por tipo de puesto */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} lg={8}>
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 2, height: '100%' }}>
              <Typography sx={{ fontWeight: 800, fontSize: 14.5, mb: 1.5 }}>Personal asignado ({people.length})</Typography>
              {people.length === 0 ? (
                <EmptyState compact title="Nadie asignado todavía" description="Registra personal o arrastra a alguien desde 'Disponibles para asignar'." />
              ) : (
                <Grid container spacing={1.25}>
                  {people.map((p) => (
                    <Grid item xs={12} sm={6} md={4} key={p.id}>
                      <AssignedPersonChip employeeId={p.id} name={p.name} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} lg={4}>
            <RoleDistributionCard people={people} />
          </Grid>
        </Grid>

        {/* Disponibles / Drop zone / Resumen rapido / Historial */}
        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          <Grid item xs={12} md={6} lg={3}>
            <Paper
              ref={availableRef}
              elevation={0}
              sx={{
                borderRadius: '16px', border: '1px solid', borderColor: highlightAvailable ? '#3B82F6' : 'divider',
                p: 2, height: '100%', transition: 'border-color .3s ease',
                boxShadow: highlightAvailable ? (t) => `0 0 0 3px ${alpha('#3B82F6', t.palette.mode === 'dark' ? 0.25 : 0.15)}` : 'none',
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 14.5, mb: 1.5 }}>Disponibles para asignar ({available.length})</Typography>
              {available.length === 0 ? (
                <EmptyState compact title="Sin personal disponible" description="Todo el personal activo ya tiene ubicación asignada hoy." />
              ) : (
                <Stack spacing={1}>
                  {available.map((p) => <AvailableCandidateRow key={p.id} person={p} areaId={canonicalId} />)}
                </Stack>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <DropZone areaId={canonicalId} label={area.name} />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 2, height: '100%' }}>
              <Typography sx={{ fontWeight: 800, fontSize: 14.5, mb: 1.5 }}>Resumen rápido</Typography>
              <Stack spacing={1}>
                {[
                  ['Total en el área', staffing.real],
                  ['Plantilla ideal', staffing.ideal ?? '—'],
                  ['Faltante', staffing.ideal != null ? missing : '—'],
                  ['Cobertura', coveragePct != null ? `${coveragePct}%` : '—'],
                  ['Disponibles para asignar', available.length],
                ].map(([label, value]) => (
                  <Stack key={label} direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{label}</Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{value}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 2, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14.5 }}>Historial reciente</Typography>
              </Stack>
              {history.loading ? (
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Cargando…</Typography>
              ) : history.error ? (
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>No se pudo cargar el historial.</Typography>
              ) : history.items.length === 0 ? (
                <EmptyState compact title="Sin movimientos recientes" description="Todavía no hay asignaciones o movimientos registrados para esta área." />
              ) : (
                <Stack spacing={1.25}>
                  {history.items.map((h) => (
                    <Stack key={h.id} direction="row" spacing={1} alignItems="flex-start">
                      <Box sx={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0, mt: 0.1,
                        bgcolor: alpha('#10B981', 0.14), display: 'grid', placeItems: 'center', color: '#10B981',
                      }}>
                        <PersonAddAlt1Icon sx={{ fontSize: 13 }} />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }} noWrap>
                          {h.employeeName} — {h.action === 'MOVED' ? 'Reasignación' : 'Asignación'}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                          {h.byName ? `Por ${h.byName} · ` : ''}{relativeTimeEs(h.movedAt)}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Divider sx={{ mb: 2.5 }} />

        {/* Analisis del area */}
        <Typography sx={{ fontWeight: 800, fontSize: 15, mb: 1.5 }}>Análisis del área</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 2, height: '100%', textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 800, fontSize: 13.5, mb: 1.5, textAlign: 'left' }}>Cobertura vs ideal</Typography>
              {coveragePct != null ? (
                <>
                  <Box sx={{ ...ps.gauge(coverageBarPct, coveragePct >= 100 ? '#10B981' : coveragePct >= 90 ? '#3B82F6' : coveragePct >= 50 ? '#F59E0B' : '#EF4444'), mx: 'auto' }}>
                    <Typography sx={{ position: 'relative', zIndex: 1, fontSize: 17, fontWeight: 800 }}>{coveragePct}%</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1 }}>Cobertura actual</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{staffing.real} de {staffing.ideal} personas</Typography>
                </>
              ) : (
                <EmptyState compact title="Sin plantilla ideal" description="No hay meta definida para calcular cobertura." />
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 2, height: '100%' }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                <ShowChartIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>Tendencia de cobertura (7 días)</Typography>
              </Stack>
              {/* Investigado (2026-08-25): el headcount real de cada dia pasado
                  viene mayormente de un snapshot SIN fecha (REAL_PERSONNEL_SNAPSHOT),
                  no de un registro historico por dia -- DailyAssignment solo tiene
                  filas para quien fue tocado de verdad ese dia (un puñado de
                  personas, no el total real). Reconstruir "cobertura de hace 3
                  dias" con esos datos daria un numero falso. Mismo hallazgo ya
                  documentado en el rediseño del Dashboard (useDashboardMetrics.js). */}
              <EmptyState
                compact
                title="Aún no hay suficiente historial"
                description="Todavía no hay suficiente historial para calcular la tendencia de cobertura de esta área."
              />
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 2, height: '100%' }}>
              <Typography sx={{ fontWeight: 800, fontSize: 13.5, mb: 1.5 }}>Clasificación del área</Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <StarIcon sx={{ fontSize: 18, color: '#F59E0B', mt: 0.2 }} />
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{tip.label}</Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5 }}>{tip.tip}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1 }}>
                <AssignmentIndIcon sx={{ fontSize: 17, color: '#3B82F6' }} />
                <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>Recomendación automática</Typography>
              </Stack>
              {missing > 0 ? (
                <Chip
                  size="small" label={missing >= 5 ? 'Prioridad alta' : missing >= 2 ? 'Prioridad media' : 'Prioridad baja'}
                  sx={{ alignSelf: 'flex-start', mb: 1, fontWeight: 700, bgcolor: alpha('#F59E0B', 0.15), color: '#B45309' }}
                />
              ) : null}
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5, flex: 1 }}>
                {missing > 0
                  ? `Se requieren ${missing} persona${missing === 1 ? '' : 's'} adicionales para alcanzar la plantilla ideal.`
                  : staffing.ideal != null
                    ? 'Esta área ya alcanzó su plantilla ideal. No se requieren acciones.'
                    : 'Esta área no tiene una plantilla ideal definida todavía.'}
              </Typography>
              {missing > 0 && (
                <Button size="small" onClick={scrollToAvailable} startIcon={<TipsAndUpdatesIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}>
                  Ver candidatos disponibles
                </Button>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <RegisterPersonnelDialog open={registerOpen} onClose={() => setRegisterOpen(false)} fixedAreaId={canonicalId} onDone={() => {}} />
      <SelfAssignDialog open={selfAssignOpen} onClose={() => setSelfAssignOpen(false)} fixedAreaId={canonicalId} onDone={() => {}} />
    </Dialog>
  )
}
