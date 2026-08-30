import dayjs from 'dayjs'
import {
  ArrowLeft,
  ArrowLeftRight,
  Calendar,
  CheckCircle2,
  Eye,
  GripVertical,
  Info,
  MoreVertical,
  TriangleAlert,
  UserMinus,
  UserPlus,
  Users2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getCurrentAssignment } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { SUPPORT_AREA_DESCRIPTIONS, workCenterById } from '../../data/production/catalog'
import {
  AREA_STATUS_META,
  classifyAreaStatus,
  getActividadForEmployee,
  getAreaStaffing,
  getAvailablePersonnelToday,
  getPeopleByArea,
  getSnapshotHomeAreaId,
} from '../../data/production/personnelByArea'
import { cn, hexToRgba } from '../../lib/utils'
import { useDndAssign } from '../../state/dndAssign'
import { useRoleMode } from '../../state/roleMode'
import { EmptyState } from '../../ui'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useEmployeeDropTarget } from '../../ui/dnd'
import EmployeeAvatar from './EmployeeAvatar'
import EmployeeHistoryDialog from './EmployeeHistoryDialog'
import MoveConfirmDialog from './MoveConfirmDialog'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
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
   pedido: "no debe sentirse como estacion de surtido").

   Fase 6c (Centro de Trabajo): portado de MUI a Tailwind. La dona de
   "Resumen del área" sigue usando recharts (PieChart/Pie/Cell), sin
   cambios -- no es un componente MUI, no le toca conversion. */

function describeAreaState(real, ideal) {
  if (ideal == null)
    return {
      tone: 'ok',
      Icon: CheckCircle2,
      label: 'Sin plantilla oficial',
      description: 'Esta área no tiene una plantilla ideal definida todavía.',
    }
  if (real === 0)
    return {
      tone: 'bad',
      Icon: TriangleAlert,
      label: 'Sin personal',
      description: 'Actualmente no hay personal asignado a esta área.',
    }
  if (real > ideal) {
    const extra = real - ideal
    return {
      tone: 'ok',
      Icon: CheckCircle2,
      label: 'Completa',
      description: `Cuenta con ${extra} persona${extra === 1 ? '' : 's'} adicional${extra === 1 ? '' : 'es'} a la plantilla ideal.`,
    }
  }
  if (real === ideal)
    return {
      tone: 'ok',
      Icon: CheckCircle2,
      label: 'Completa',
      description: 'Cuenta con el personal ideal asignado.',
    }
  const missing = ideal - real
  return {
    tone: 'warn',
    Icon: TriangleAlert,
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
    <div className="rounded-2xl border border-border p-3">
      <div className="flex items-center gap-3">
        <DraggablePersonChip employeeId={person.id}>
          <EmployeeAvatar employee={person} size={44} />
        </DraggablePersonChip>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{person.name}</p>
          <div className="flex flex-wrap items-center gap-1">
            {actividad && (
              <span
                className="mt-0.5 inline-flex h-[18px] items-center rounded-full px-1.5 text-[10px] font-bold"
                style={{ backgroundColor: hexToRgba('#3B82F6', 0.12), color: '#3B82F6' }}
              >
                {actividad}
              </span>
            )}
            {homeArea && (
              <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                Zona real: {homeArea.name}
              </p>
            )}
          </div>
        </div>
        {assignedDate && (
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-[9.5px] leading-[1.1] text-muted-foreground">Fecha asignación</p>
              <p className="text-[11.5px] font-bold leading-[1.1]">{assignedDate}</p>
            </div>
          </div>
        )}
        <span
          className="inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-bold"
          style={{ backgroundColor: hexToRgba('#10B981', 0.14), color: '#10B981' }}
        >
          {(person.status || 'Activo').toUpperCase()}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreVertical className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalle
            </DropdownMenuItem>
            {canManage &&
              (assignment ? (
                <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Mover a otra área
                </DropdownMenuItem>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem disabled>
                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                        Mover a otra área
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Solo disponible para asignaciones registradas hoy
                  </TooltipContent>
                </Tooltip>
              ))}
            {canManage && (
              <DropdownMenuItem onClick={() => dnd.requestRelease(person.id)}>
                <UserMinus className="mr-2 h-4 w-4" />
                Liberar del área
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
    </div>
  )
}

function AvailableCandidateRow({ person, areaId }) {
  const dnd = useDndAssign()
  return (
    <DraggablePersonChip employeeId={person.id} className="block">
      <button
        type="button"
        onClick={() => dnd.requestAssign(person.id, areaId)}
        className="flex w-full items-center gap-2 rounded-lg border border-border p-[6.8px] text-left hover:border-[#3B82F6] hover:bg-[#3B82F6]/5 dark:hover:bg-[#3B82F6]/10"
      >
        <EmployeeAvatar employee={person} size={30} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold">{person.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">#{person.employeeNumber}</p>
        </div>
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
      </button>
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  useEffect(() => {
    setRegisterOpen(false)
    setSelfAssignOpen(false)
    setShowAllHistory(false)
  }, [workCenterId])

  const area = workCenterId ? workCenterById(workCenterId) : null
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const staffing = useMemo(
    () => (workCenterId ? getAreaStaffing(workCenterId) : null),
    [workCenterId, version],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const people = useMemo(
    () => (workCenterId ? getPeopleByArea()[workCenterId] || [] : []),
    [workCenterId, version],
  )
  // `version` fuerza recalcular la lista de disponibles cuando cambia el
  // estado de personal, aunque no se lea dentro del callback -- mismo
  // patron ya usado en otros archivos de este folder.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const available = useMemo(() => getAvailablePersonnelToday(), [version])
  const { isOver, dropProps } = useEmployeeDropTarget(workCenterId)

  // `version` fuerza refrescar el historial tras una asignacion/movimiento,
  // aunque no se lea dentro del callback -- mismo patron ya usado en otros
  // archivos de este folder.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
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
  const headerColor = statusMeta?.color || '#10B981'

  const donutData =
    staffing.ideal != null
      ? [
          { key: 'activo', label: 'Personal activo', value: staffing.real, color: '#3B82F6' },
          { key: 'vacante', label: 'Vacantes', value: missing, color: '#CBD5E1' },
        ].filter((d) => d.value > 0 || staffing.real === 0)
      : [{ key: 'activo', label: 'Personal activo', value: staffing.real, color: '#3B82F6' }]
  const donutTotal = donutData.reduce((sum, d) => sum + d.value, 0) || 1

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="inset-0 left-0 top-0 flex h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none bg-background">
        <DialogTitle className="sr-only">Detalle de {area?.name || 'área'}</DialogTitle>
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-3 py-3 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[19px] font-extrabold tracking-[-0.4px]">{area.name}</p>
              <span
                className="inline-flex h-6 items-center rounded-full px-2 text-xs font-bold"
                style={{ backgroundColor: hexToRgba(headerColor, 0.14), color: headerColor }}
              >
                {headerLabel}
              </span>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              Centro de Trabajo · Área de soporte
            </p>
          </div>
          <div className="flex-1" />
          {onNavigate && (
            <WorkCenterNavControls previous={previous} next={next} onNavigate={onNavigate} />
          )}
          <Button
            onClick={() => (isSupervisor ? setRegisterOpen(true) : setSelfAssignOpen(true))}
            className="rounded-[20px] font-bold"
          >
            <UserPlus className="h-4 w-4" />
            {isSupervisor ? 'Registrar personal' : 'Registrarme / Autoasignarme'}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div key={workCenterId} className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
          {/* Fila superior de resumen */}
          <div className="mb-5 overflow-hidden rounded-2xl border border-border">
            <div className="flex flex-col md:flex-row md:divide-x md:divide-border">
              <div className="flex flex-[1_1_170px] items-center gap-2.5 px-3 py-2.5 md:px-[18px]">
                <div
                  className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full"
                  style={{ backgroundColor: hexToRgba('#3B82F6', 0.12), color: '#3B82F6' }}
                >
                  <Users2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[22px] font-extrabold leading-none">
                    {staffing.ideal != null
                      ? `${staffing.real} / ${staffing.ideal}`
                      : staffing.real}
                  </p>
                  <p className="text-[11px] text-muted-foreground">personas asignadas</p>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span
                      className="h-[7px] w-[7px] rounded-full"
                      style={{ backgroundColor: statusMeta?.color || '#94A3B8' }}
                    />
                    <p
                      className="text-[11px] font-bold"
                      style={{ color: statusMeta?.color || undefined }}
                    >
                      {headerLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-[1_1_190px] px-3 py-2.5 md:px-[18px]">
                <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-muted-foreground">
                  Estado del área
                </p>
                <div className="flex items-center gap-1.5">
                  <state.Icon
                    className="h-[17px] w-[17px]"
                    style={{ color: TONE_COLOR[state.tone] }}
                  />
                  <p className="text-[15px] font-extrabold">{state.label}</p>
                </div>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">{state.description}</p>
              </div>

              <div className="flex-[1_1_150px] px-3 py-2.5 md:px-[18px]">
                <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-muted-foreground">
                  Cobertura
                </p>
                <p
                  className={cn(
                    'text-[21px] font-extrabold leading-[1.1]',
                    coveragePct != null && coveragePct >= 100 ? 'text-[#10B981]' : 'text-[#3B82F6]',
                  )}
                >
                  {coveragePct != null ? `${coveragePct}%` : '—'}
                </p>
                {coveragePct != null && (
                  <>
                    <div className="my-1 h-[5px] overflow-hidden rounded-full bg-black/[.04] dark:bg-white/[.08]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${coverageBarPct}%`,
                          backgroundColor: coveragePct >= 100 ? '#10B981' : '#3B82F6',
                        }}
                      />
                    </div>
                    <p className="text-[10.5px] text-muted-foreground">
                      {staffing.real} de {staffing.ideal} personas
                    </p>
                  </>
                )}
              </div>

              <div className="flex-[1_1_110px] px-3 py-2.5 md:px-[18px]">
                <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-muted-foreground">
                  Plantilla ideal
                </p>
                <p className="text-[21px] font-extrabold leading-[1.1]">{staffing.ideal ?? '—'}</p>
                <p className="text-[10.5px] text-muted-foreground">personas</p>
              </div>

              {description && (
                <div
                  className="flex-[1.3_1_220px] px-3 py-2.5 md:px-[18px]"
                  style={{ backgroundColor: hexToRgba('#3B82F6', 0.04) }}
                >
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <Info className="h-[15px] w-[15px] text-[#3B82F6]" />
                    <p className="text-[11.5px] font-extrabold text-[#3B82F6]">
                      Información del área
                    </p>
                  </div>
                  <p className="text-xs font-semibold">{description}</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {missing === 0
                      ? 'No requiere cobertura adicional'
                      : `Requiere ${missing} persona${missing === 1 ? '' : 's'} para cobertura completa`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Personal asignado + Resumen del area */}
          <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div
              {...dropProps}
              className={cn(
                'rounded-2xl border p-4 transition-all duration-150 lg:col-span-2',
                isOver
                  ? 'border-[#3B82F6] bg-[#3B82F6]/[0.05] dark:bg-[#3B82F6]/[0.12]'
                  : 'border-border bg-card',
              )}
            >
              <p className="mb-3 text-[14.5px] font-extrabold">
                Personal asignado ({people.length})
              </p>
              {people.length === 0 ? (
                <EmptyState
                  compact
                  title="No hay personal asignado actualmente."
                  description="Registra personal o arrastra a alguien desde 'Disponibles para asignar'."
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {people.map((p) => (
                    <PersonCard
                      key={p.id}
                      person={p}
                      areaId={workCenterId}
                      canManage={isSupervisor}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border p-4">
              <p className="mb-3 text-[14.5px] font-extrabold">Resumen del área</p>
              <div className="relative h-[150px]">
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
                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-[22px] font-extrabold leading-none">{staffing.real}</p>
                  <p className="text-[10px] text-muted-foreground">personas</p>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {donutData.map((row) => (
                  <div key={row.key} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <p className="flex-1 text-xs">{row.label}</p>
                    <p className="text-xs font-bold">
                      {row.value} ({Math.round((row.value / donutTotal) * 100)}%)
                    </p>
                  </div>
                ))}
              </div>

              <div className="my-3 border-t border-border" />
              <div
                className="flex items-start gap-2 rounded-lg p-2.5"
                style={{
                  backgroundColor: hexToRgba(TONE_COLOR[state.tone], 0.1),
                  border: `1px solid ${hexToRgba(TONE_COLOR[state.tone], 0.25)}`,
                }}
              >
                <state.Icon
                  className="mt-px h-[17px] w-[17px] shrink-0"
                  style={{ color: TONE_COLOR[state.tone] }}
                />
                <p className="text-xs font-semibold">{state.description}</p>
              </div>
            </div>
          </div>

          {/* Disponibles + Actividad reciente */}
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-4">
              <p className="mb-3 text-[13.5px] font-extrabold">
                Disponibles para asignar ({available.length})
              </p>
              {available.length === 0 ? (
                <EmptyState
                  compact
                  title="No hay candidatos disponibles"
                  description="Actualmente no hay personal disponible para asignar a esta área."
                />
              ) : (
                <div className="flex flex-col gap-[6.8px]">
                  {available.slice(0, 6).map((p) => (
                    <AvailableCandidateRow key={p.id} person={p} areaId={workCenterId} />
                  ))}
                </div>
              )}
              {available.length > 0 && isSupervisor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRegisterOpen(true)}
                  className="mt-2 font-bold"
                >
                  Ver todos los empleados
                </Button>
              )}
            </div>

            <div className="rounded-2xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13.5px] font-extrabold">Actividad reciente</p>
                {history.items.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllHistory((v) => !v)}
                    className="font-bold"
                  >
                    {showAllHistory ? 'Ver menos' : 'Ver todo'}
                  </Button>
                )}
              </div>
              {history.loading ? (
                <p className="text-xs text-muted-foreground">Cargando…</p>
              ) : history.error ? (
                <p className="text-xs text-muted-foreground">
                  No se pudo cargar la actividad reciente.
                </p>
              ) : historyItems.length === 0 ? (
                <EmptyState
                  compact
                  title="Sin actividad reciente"
                  description="Todavía no hay asignaciones o movimientos registrados para esta área."
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {historyItems.map((h) => (
                    <div key={h.id} className="flex items-start gap-2">
                      <div
                        className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                        style={{ backgroundColor: hexToRgba('#10B981', 0.14), color: '#10B981' }}
                      >
                        <UserPlus className="h-[13px] w-[13px]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold leading-[1.3]">
                          {h.employeeName} — {h.action === 'MOVED' ? 'Reasignación' : 'Asignación'}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground">
                          {h.byName ? `Por ${h.byName} · ` : ''}
                          {relativeTimeEs(h.movedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Franja inferior de informacion */}
          <div
            className="flex items-center gap-2 rounded-2xl border border-border p-3"
            style={{ backgroundColor: hexToRgba('#3B82F6', 0.03) }}
          >
            <Info className="h-[17px] w-[17px] shrink-0 text-[#3B82F6]" />
            <p className="text-xs text-muted-foreground">
              {area.name} es un área de soporte. La asignación de personal se gestiona directamente
              por los responsables autorizados.
            </p>
          </div>
        </div>

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
      </DialogContent>
    </Dialog>
  )
}
