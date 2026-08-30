import {
  ArrowLeft,
  ArrowLeftRight,
  BrushCleaning,
  CheckCircle2,
  Dumbbell,
  Eye,
  GraduationCap,
  Info,
  MoreVertical,
  Network,
  Shield,
  TriangleAlert,
  UserMinus,
  UserPlus,
  Users2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { fetchLineStationConfig } from '../../data/personnel/lineStationConfig'
import { getCurrentAssignment } from '../../data/personnel/repository'
import { getAllRealTeamLeaders } from '../../data/personnel/teamLeaderRegistry'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import {
  LINE_FAMILY_AREA_IDS,
  SUPPORT_AREA_DESCRIPTIONS,
  workCenterById,
} from '../../data/production/catalog'
import {
  AREA_STATUS_META,
  classifyAreaStatus,
  getAreaStaffing,
  getPeopleByArea,
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
   (ver ese archivo para la garantia completa).

   Fase 6c (Centro de Trabajo): portado de MUI a Tailwind. Dialog
   fullScreen -> DialogContent con className que sobreescribe position/
   size (tailwind-merge resuelve el conflicto con las clases centradas
   por defecto del primitivo). */

// AREA_TYPE_META (Icon+color por tipo de área especial, sin texto en
// español) vive a nivel de modulo -- las etiquetas traducibles
// (roleLabel/category) se resuelven una sola vez dentro de
// SpecialAreaDetail (el componente exportado) y se pasan hacia abajo como
// parte del `meta` combinado (Fase 4 i18n, ver regla de "lookup compartido"
// del plan de extraccion).
const AREA_TYPE_META = {
  CAPACITACION: { Icon: GraduationCap, color: '#2563EB' },
  TEAM_LEADER: { Icon: Users2, color: '#16A34A' },
  ENTRENADOR: { Icon: Dumbbell, color: '#D97706' },
  LIMPIEZA: { Icon: BrushCleaning, color: '#0891B2' },
  GERENTE: { Icon: Network, color: '#7C3AED' },
  SUPERVISOR: { Icon: Shield, color: '#DC2626' },
}

function describeAreaState(real, ideal, t) {
  if (ideal == null)
    return { tone: 'ok', Icon: CheckCircle2, label: t('specialAreaDetail.stateNoTemplate') }
  if (real === 0)
    return { tone: 'bad', Icon: TriangleAlert, label: t('specialAreaDetail.stateNoStaff') }
  if (real >= ideal)
    return { tone: 'ok', Icon: CheckCircle2, label: t('specialAreaDetail.stateComplete') }
  return {
    tone: 'warn',
    Icon: TriangleAlert,
    label:
      real / ideal >= 0.5
        ? t('specialAreaDetail.statePartial')
        : t('specialAreaDetail.stateMissingStaff'),
  }
}

const TONE_COLOR = { ok: '#10B981', warn: '#F59E0B', bad: '#EF4444' }

// areaId no se usa dentro del cuerpo (pre-existente en el original,
// se conserva el mismo contrato de props de siempre).
// biome-ignore lint/correctness/noUnusedFunctionParameters: ver comentario arriba
function PersonRow({ person, areaId, meta, canManage }) {
  const { t } = useTranslation('centroTrabajo')
  const dnd = useDndAssign()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const assignment = getCurrentAssignment(person.id)

  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="flex items-center gap-3">
        <DraggablePersonChip employeeId={person.id}>
          <EmployeeAvatar employee={person} size={44} />
        </DraggablePersonChip>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold">{person.name}</p>
          <span
            className="mt-[2.8px] inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px] font-extrabold tracking-[0.3px]"
            style={{ backgroundColor: hexToRgba(meta.color, 0.12), color: meta.color }}
          >
            <meta.Icon className="h-[13px] w-[13px]" />
            {meta.roleLabel.toUpperCase()}
          </span>
        </div>
        <span
          className="inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-bold"
          style={{ backgroundColor: hexToRgba('#10B981', 0.14), color: '#10B981' }}
        >
          {(person.status || t('specialAreaDetail.statusActiveDefault')).toUpperCase()}
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
              {t('specialAreaDetail.viewDetail')}
            </DropdownMenuItem>
            {canManage &&
              (assignment ? (
                <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  {t('specialAreaDetail.moveToOtherArea')}
                </DropdownMenuItem>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem disabled>
                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                        {t('specialAreaDetail.moveToOtherArea')}
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {t('specialAreaDetail.moveDisabledTooltip')}
                  </TooltipContent>
                </Tooltip>
              ))}
            {canManage && (
              <DropdownMenuItem onClick={() => dnd.requestRelease(person.id)}>
                <UserMinus className="mr-2 h-4 w-4" />
                {t('specialAreaDetail.releaseFromArea')}
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

function TeamLeaderReferenceRow({ leader, meta }) {
  const { t } = useTranslation('centroTrabajo')
  const [historyOpen, setHistoryOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setHistoryOpen(true)}
        className="w-full rounded-2xl border border-border p-3 text-left transition-colors hover:border-[--tl-color]"
        style={{ '--tl-color': meta.color }}
      >
        <div className="flex items-center gap-3">
          <EmployeeAvatar employee={leader.employee} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">
              {leader.employee?.name}
              {leader.employeeNumber ? ` · #${leader.employeeNumber}` : ''}
            </p>
            <span
              className="mt-[2.8px] inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px] font-extrabold tracking-[0.3px]"
              style={{ backgroundColor: hexToRgba(meta.color, 0.12), color: meta.color }}
            >
              <Users2 className="h-[13px] w-[13px]" />
              {t('specialAreaDetail.teamLeaderBadge')}
            </span>
            <p className="mt-[2.8px] truncate text-[11px] text-muted-foreground">
              {t('specialAreaDetail.currentAreaLabel')} <b>{leader.areaName}</b>
            </p>
          </div>
          <span
            className="inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-bold"
            style={{ backgroundColor: hexToRgba('#10B981', 0.14), color: '#10B981' }}
          >
            {t('specialAreaDetail.activeBadge')}
          </span>
        </div>
      </button>
      <EmployeeHistoryDialog
        employee={historyOpen ? leader.employee : null}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onChanged={() => {}}
      />
    </>
  )
}

export default function SpecialAreaDetail({
  workCenterId,
  open,
  onClose,
  previous,
  next,
  onNavigate,
}) {
  const { t } = useTranslation('centroTrabajo')
  // roleLabel/category traducidos, resueltos una sola vez aqui (componente
  // exportado) y combinados con Icon/color (AREA_TYPE_META, nivel de
  // modulo) -- se pasan hacia abajo como `meta` a PersonRow y como prop
  // `meta` a TeamLeaderReferenceRow (Fase 4 i18n, lookup compartido).
  const AREA_TYPE_LABELS = {
    CAPACITACION: {
      roleLabel: t('specialAreaDetail.roleCapacitacion'),
      category: t('specialAreaDetail.categoryApoyoDesarrollo'),
    },
    TEAM_LEADER: {
      roleLabel: t('specialAreaDetail.roleTeamLeader'),
      category: t('specialAreaDetail.categoryLiderazgo'),
    },
    ENTRENADOR: {
      roleLabel: t('specialAreaDetail.roleEntrenador'),
      category: t('specialAreaDetail.categoryEntrenamiento'),
    },
    LIMPIEZA: {
      roleLabel: t('specialAreaDetail.roleLimpieza'),
      category: t('specialAreaDetail.categoryServiciosGenerales'),
    },
    GERENTE: {
      roleLabel: t('specialAreaDetail.roleGerente'),
      category: t('specialAreaDetail.categoryGerencia'),
    },
    SUPERVISOR: {
      roleLabel: t('specialAreaDetail.roleSupervisor'),
      category: t('specialAreaDetail.categorySupervision'),
    },
  }
  const version = usePersonnelVersion()
  const { isSupervisor } = useRoleMode()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [selfAssignOpen, setSelfAssignOpen] = useState(false)

  // Cierra los dialogos si se navega a otra área (workCenterId cambia) --
  // dependencia intencional aunque no se lea dentro del callback.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  useEffect(() => {
    setRegisterOpen(false)
    setSelfAssignOpen(false)
  }, [workCenterId])

  const area = workCenterId ? workCenterById(workCenterId) : null
  const meta = workCenterId
    ? { ...AREA_TYPE_META[workCenterId], ...AREA_TYPE_LABELS[workCenterId] }
    : null
  // `version` fuerza recalcular staffing/people cuando cambia el estado de
  // personal, aunque no se lea dentro del callback (mismo patron ya usado
  // en otros archivos de este folder).
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
    if (!isTeamLeaderHub) {
      setLineConfigsReady(false)
      return
    }
    let cancelled = false
    Promise.all([...LINE_FAMILY_AREA_IDS].map((id) => fetchLineStationConfig(id))).then(() => {
      if (!cancelled) setLineConfigsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [isTeamLeaderHub])
  // version/lineConfigsReady fuerzan recalcular aunque no se lean dentro
  // del callback -- mismo patron ya usado en otros archivos de este folder.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const allLeaders = useMemo(
    () => (isTeamLeaderHub ? getAllRealTeamLeaders() : []),
    [isTeamLeaderHub, version, lineConfigsReady],
  )

  if (!area || !staffing || !meta) return null

  const status = classifyAreaStatus(staffing.real, staffing.ideal)
  const statusMeta = status ? AREA_STATUS_META[status] : null
  const headerLabel = statusMeta
    ? statusMeta.label
    : people.length > 0
      ? t('specialAreaDetail.headerLabelHasStaff')
      : t('specialAreaDetail.headerLabelNoStaffToday')
  const coveragePct =
    staffing.ideal != null && staffing.ideal > 0
      ? Math.round((staffing.real / staffing.ideal) * 100)
      : null
  const state = describeAreaState(staffing.real, staffing.ideal, t)
  const description = SUPPORT_AREA_DESCRIPTIONS[area.id] || null
  const headerColor = statusMeta?.color || '#10B981'

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="inset-0 left-0 top-0 flex h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none bg-background">
        <DialogTitle className="sr-only">
          {t('specialAreaDetail.dialogTitle', {
            areaName: area?.name || t('specialAreaDetail.areaFallback'),
          })}
        </DialogTitle>
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-3.5 py-3 md:px-6">
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
                className="inline-flex h-6 items-center rounded-full border px-2 text-xs font-bold"
                style={{
                  backgroundColor: hexToRgba(headerColor, 0.14),
                  color: headerColor,
                  borderColor: hexToRgba(headerColor, 0.35),
                }}
              >
                {headerLabel}
              </span>
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              {isTeamLeaderHub
                ? t('specialAreaDetail.teamLeaderHubSubtitle')
                : t('specialAreaDetail.areaSubtitle', { category: meta.category.toLowerCase() })}
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
            {isSupervisor
              ? t('specialAreaDetail.registerPersonnelButton')
              : t('specialAreaDetail.selfAssignButton')}
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div key={workCenterId} className="min-h-0 flex-1 overflow-y-auto p-3.5 md:p-6">
          {/* Franja ÁREA ESPECIAL · categoría */}
          <div
            className="mb-4 flex items-center gap-2 rounded-[14px] border px-4 py-2.5"
            style={{
              borderColor: hexToRgba(meta.color, 0.3),
              backgroundColor: hexToRgba(meta.color, 0.06),
            }}
          >
            <meta.Icon className="h-[18px] w-[18px]" style={{ color: meta.color }} />
            <p
              className="text-[11.5px] font-extrabold uppercase tracking-[0.4px]"
              style={{ color: meta.color }}
            >
              {t('specialAreaDetail.specialAreaCategoryBadge', { category: meta.category })}
            </p>
          </div>

          {/* Tira de metricas compacta */}
          <div className="mb-5 overflow-hidden rounded-2xl border border-border">
            <div className="flex flex-col md:flex-row md:divide-x md:divide-border">
              <div className="flex-[1_1_170px] px-3.5 py-2.5 md:px-[18px]">
                <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-muted-foreground">
                  {isTeamLeaderHub
                    ? t('specialAreaDetail.metricLeadersActive')
                    : t('specialAreaDetail.metricPeopleShown')}
                </p>
                <p className="text-[22px] font-extrabold leading-none">
                  {isTeamLeaderHub ? allLeaders.length : people.length}
                </p>
              </div>
              {isTeamLeaderHub && (
                <div className="flex-[1_1_170px] px-3.5 py-2.5 md:px-[18px]">
                  <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-muted-foreground">
                    {t('specialAreaDetail.metricWorkAreas')}
                  </p>
                  <p className="text-[22px] font-extrabold leading-none">
                    {new Set(allLeaders.map((l) => l.areaId)).size}
                  </p>
                </div>
              )}
              <div className="flex-[1_1_170px] px-3.5 py-2.5 md:px-[18px]">
                <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-muted-foreground">
                  {t('specialAreaDetail.metricAreaStatus')}
                </p>
                <div className="flex items-center gap-1.5">
                  <state.Icon className="h-4 w-4" style={{ color: TONE_COLOR[state.tone] }} />
                  <p className="text-[15px] font-extrabold">{state.label}</p>
                </div>
              </div>
              <div className="flex-[1_1_150px] px-3.5 py-2.5 md:px-[18px]">
                <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-muted-foreground">
                  {isTeamLeaderHub
                    ? t('specialAreaDetail.metricTemplate')
                    : t('specialAreaDetail.metricCoverage')}
                </p>
                <p
                  className={cn(
                    'text-[21px] font-extrabold leading-[1.1]',
                    !isTeamLeaderHub && coveragePct != null && coveragePct >= 100
                      ? 'text-[#10B981]'
                      : 'text-foreground',
                  )}
                >
                  {isTeamLeaderHub
                    ? t('specialAreaDetail.metricNotApplicable')
                    : coveragePct != null
                      ? `${coveragePct}%`
                      : '—'}
                </p>
              </div>
              {!isTeamLeaderHub && (
                <div className="flex-[1_1_110px] px-3.5 py-2.5 md:px-[18px]">
                  <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-muted-foreground">
                    {t('specialAreaDetail.metricIdealTemplate')}
                  </p>
                  <p className="text-[21px] font-extrabold leading-[1.1]">
                    {staffing.ideal ?? '—'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Personal del área */}
          <div
            {...dropProps}
            className={cn(
              'mb-5 rounded-2xl border p-4 transition-all duration-150',
              isOver
                ? 'border-[#3B82F6] bg-[#3B82F6]/[0.05] dark:bg-[#3B82F6]/[0.12]'
                : 'border-border bg-card',
            )}
          >
            <p className="mb-3 text-[14.5px] font-extrabold">
              {t('specialAreaDetail.areaPersonnelTitle', { count: people.length })}
            </p>
            {people.length === 0 ? (
              <EmptyState
                compact
                title={t('specialAreaDetail.emptyPersonnelTitle')}
                description={t('specialAreaDetail.emptyPersonnelDescription', {
                  role: meta.roleLabel.toLowerCase(),
                })}
              />
            ) : (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {people.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    areaId={workCenterId}
                    meta={meta}
                    canManage={isSupervisor}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Líderes activos -- SOLO WC Team Leader */}
          {isTeamLeaderHub && (
            <div className="mb-5 rounded-2xl border border-border p-4">
              <p className="mb-0.5 text-[14.5px] font-extrabold">
                {t('specialAreaDetail.activeLeadersTitle', { count: allLeaders.length })}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                {t('specialAreaDetail.activeLeadersSubtitle')}
              </p>
              {allLeaders.length === 0 ? (
                <EmptyState
                  compact
                  title={t('specialAreaDetail.emptyLeadersTitle')}
                  description={t('specialAreaDetail.emptyLeadersDescription')}
                />
              ) : (
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {allLeaders.map((leader) => (
                    <TeamLeaderReferenceRow
                      key={leader.employee.id}
                      leader={leader}
                      meta={{ ...AREA_TYPE_META.TEAM_LEADER, ...AREA_TYPE_LABELS.TEAM_LEADER }}
                    />
                  ))}
                </div>
              )}
              <div
                className="mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5"
                style={{
                  backgroundColor: hexToRgba('#3B82F6', 0.06),
                  borderColor: hexToRgba('#3B82F6', 0.2),
                }}
              >
                <Info className="mt-px h-4 w-4 shrink-0 text-[#3B82F6]" />
                <p className="text-[11.5px] text-muted-foreground">
                  {t('specialAreaDetail.leadersReferenceNote')}
                </p>
              </div>
            </div>
          )}

          {description && (
            <div
              className="flex items-center gap-2 rounded-2xl border border-border p-3"
              style={{ backgroundColor: hexToRgba('#3B82F6', 0.03) }}
            >
              <Info className="h-[17px] w-[17px] shrink-0 text-[#3B82F6]" />
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          )}
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
