import dayjs from 'dayjs'
import {
  ArrowLeft,
  ArrowLeftRight,
  Hand,
  History,
  Info,
  Moon,
  Settings,
  Sun,
  UserPlus,
  UserSearch,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  alertToneClass,
  cardClass,
  cardHeaderClass,
  cardHeaderSubtitleClass,
  cardHeaderTitleClass,
  cellTextClass,
  cellTextSecondaryClass,
  kpiCardClass,
  progressBarClass,
  sectionTitleClass,
  statusChipClass,
  tableHeaderRowClass,
  tableRowClass,
} from '@/lib/pageStyles'
import { cn, hexToRgba } from '@/lib/utils'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import {
  deactivateLineStation,
  fetchLineStationConfig,
} from '../../data/personnel/lineStationConfig'
import {
  getPersonnelVisualType,
  LINE_VISUAL_TYPE_ORDER,
  LINE_VISUAL_TYPES,
} from '../../data/personnel/lineVisualType'
import {
  checkInEmployee,
  getLineWorkstationsWithOccupancy,
  getSuggestedCandidates,
  reconcileLineAssignments,
} from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import {
  CURRENT_SHIFT,
  canonicalOperationalAreaId,
  getCurrentShift,
  LINE_FAMILY_AREA_IDS,
  operationalGroupMembers,
  workCenterById,
} from '../../data/production/catalog'
import {
  AREA_STATUS_META,
  classifyAreaStatus,
  getActividadForEmployee,
  getEffectiveTodayRoster,
  getGroupAreaStaffing,
  getGroupPeople,
  getPeopleWithoutStation,
} from '../../data/production/personnelByArea'
import { useAuth } from '../../state/auth'
import { useDndAssign } from '../../state/dndAssign'
import { useRoleMode } from '../../state/roleMode'
import { EmptyState } from '../../ui'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useEmployeeDropTarget } from '../../ui/dnd'
import AssignedPersonChip from './AssignedPersonChip'
import AvailablePersonnelTray from './AvailablePersonnelTray'
import EmployeeAssignSearchBar from './EmployeeAssignSearchBar'
import EmployeeAvatar from './EmployeeAvatar'
import EmployeeHistoryDialog from './EmployeeHistoryDialog'
import LineHistoryDialog from './LineHistoryDialog'
import LineStationConfigDrawer from './LineStationConfigDrawer'
import LineVisualLegend, { LineTypeIcon } from './LineVisualLegend'
import LineWorkstationCard from './LineWorkstationCard'
import MoveConfirmDialog from './MoveConfirmDialog'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
import StationAssignDialog from './StationAssignDialog'
import SuggestedEmployeeCard from './SuggestedEmployeeCard'
import WorkCenterNavControls from './WorkCenterNavControls'

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
   solo por defensividad (ver getAreaDetailVariant, catalog.js).

   Fase 6c (Centro de Trabajo): portado de MUI a Tailwind. Es el archivo
   mas grande del repo -- reutiliza integramente toda la logica de
   datos/acciones sin tocar, solo cambia la capa de presentacion. */

/* Zona de "soltar aqui" generica -- solo se usa hoy en el caso
   defensivo (area futura sin estaciones que cayera aqui por
   clasificacion por defecto, ver getAreaDetailVariant, catalog.js). */
function DropZoneBanner({ areaId, label }) {
  const { isOver, dropProps } = useEmployeeDropTarget(areaId)
  return (
    <div
      {...dropProps}
      className={cn(
        'flex min-h-[64px] items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed transition-all duration-150',
        isOver ? 'border-[#3B82F6] bg-[#3B82F6]/[0.08] dark:bg-[#3B82F6]/[0.18]' : 'border-border',
      )}
    >
      <Hand
        className={cn('h-[18px] w-[18px]', isOver ? 'text-[#3B82F6]' : 'text-muted-foreground/60')}
      />
      <p
        className={cn(
          'text-[12.5px] font-bold',
          isOver ? 'text-[#3B82F6]' : 'text-muted-foreground',
        )}
      >
        {isOver
          ? `Soltar para asignar a ${label}`
          : `Arrastra empleados aquí para asignarlos a ${label}`}
      </p>
    </div>
  )
}

/* "07:00" -> "07:00 AM" -- solo para mostrar el horario real del
   turno oficial (OFFICIAL_SHIFTS, catalog.js); el resto del sistema
   sigue guardando/mostrando horas en 24h ("HH:mm") tal cual. */
function formatHour12(hhmm) {
  return dayjs(`2000-01-01 ${hhmm}`, 'YYYY-MM-DD HH:mm').format('hh:mm A')
}

export default function LineDetailDrawer({
  workCenterId,
  open,
  onClose,
  previous,
  next,
  onNavigate,
}) {
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const staffing = useMemo(
    () => (memberIds.length ? getGroupAreaStaffing(memberIds) : null),
    [workCenterId, version],
  )
  const areaStatusKey =
    staffing?.ideal != null ? classifyAreaStatus(staffing.real, staffing.ideal) : null
  const areaStatusMeta = areaStatusKey ? AREA_STATUS_META[areaStatusKey] : null
  const coveragePct = staffing?.ideal ? Math.round((staffing.real / staffing.ideal) * 100) : null
  const currentOfficialShift = getCurrentShift()
  const ShiftIcon = currentOfficialShift.id === 'NOCHE' ? Moon : Sun
  // biome-ignore lint/correctness/useExhaustiveDependencies: version/configVersion fuerzan recalcular aunque no se lean en el callback (mismo patron en todo este folder)
  const workstations = useMemo(
    () => (canonicalId ? getLineWorkstationsWithOccupancy(canonicalId) : []),
    [canonicalId, version, configVersion],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const people = useMemo(
    () => (memberIds.length ? getGroupPeople(memberIds) : []),
    [workCenterId, version],
  )

  /* Carga la configuracion real de puestos de esta linea (DB, ver
     lineStationConfig.js) al abrir -- mientras no llegue, `workstations`
     sigue viniendo del generador JS de siempre (comportamiento identico).
     configLoaded solo se activa si la respuesta trajo filas reales, para
     no exponer edicion/eliminacion contra ids sinteticos (ver comentario
     junto al estado arriba). */
  useEffect(() => {
    if (!open || !isStationBased || !canonicalId) {
      setConfigLoaded(false)
      return
    }
    let cancelled = false
    setConfigLoaded(false)
    fetchLineStationConfig(canonicalId).then((rows) => {
      if (cancelled) return
      setConfigLoaded(Boolean(rows?.length))
      setConfigVersion((v) => v + 1)
    })
    return () => {
      cancelled = true
    }
  }, [canonicalId, isStationBased, open])

  function handleStationConfigChanged() {
    setConfigVersion((v) => v + 1)
  }

  async function handleDeactivateStation(w) {
    setActionError('')
    if (w.occupants?.length > 0) {
      setActionError(
        'No se puede eliminar este puesto porque actualmente tiene personal asignado. Reasígnalo primero.',
      )
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
      const actividad = occupant?.employee?.id
        ? getActividadForEmployee(occupant.employee.id)
        : null
      const vt = getPersonnelVisualType({ stationRole: w.role, actividad, category: w.category })
      if (vt?.key === 'LIDERAZGO') {
        leadership.push(w)
        return
      }
      const key = vt?.key || '__SIN_CLASIFICAR__'
      const label = vt?.label || 'Otros puestos'
      const color = vt?.color || '#94A3B8'
      if (!byCategory.has(key)) byCategory.set(key, { key, label, color, stations: [] })
      byCategory.get(key).stations.push(w)
    })
    const groups = LINE_VISUAL_TYPE_ORDER.filter((t) => t.key !== 'LIDERAZGO')
      .map((t) => byCategory.get(t.key))
      .filter(Boolean)
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: memberIds se recalcula desde workCenterId en cada render, incluirlo forzaria un loop -- mismo patron en todo este folder
  useEffect(() => {
    if (!open || !isStationBased || !canonicalId) return
    const ids = memberIds
      .flatMap((id) => getGroupPeople([id]))
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((p) => p.id)
    reconcileLineAssignments(canonicalId, ids)
  }, [canonicalId, isStationBased, open])

  const selectedStation = useMemo(() => {
    if (!workstations.length) return null
    return (
      workstations.find((w) => w.name === selectedStationName) ||
      workstations.find((w) => w.isAvailable) ||
      workstations[0]
    )
  }, [workstations, selectedStationName])

  const selectedStationOccupantActividad = selectedStation?.occupants[0]?.employee?.id
    ? getActividadForEmployee(selectedStation.occupants[0].employee.id)
    : null
  const selectedStationVisualType = selectedStation
    ? getPersonnelVisualType({
        stationRole: selectedStation.role,
        actividad: selectedStationOccupantActividad,
        category: selectedStation.category,
      })
    : null

  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const roster = useMemo(
    () =>
      memberIds.length ? getEffectiveTodayRoster().filter((r) => memberIds.includes(r.areaId)) : [],
    [workCenterId, version],
  )
  // "PERSONAL SIN ESTACIÓN" (2026-08-28, "CORRECCIÓN DE PUESTOS Y ESTACIONES OPERATIVAS", a
  // peticion explicita del usuario) -- 100% derivado, ver getPeopleWithoutStation
  // (personnelByArea.js): nunca escribe nada, solo compara contra `workstations` (la lista real
  // actual). Si una estacion se elimina/renombra (ej. Team Leader/Montaje 2 en esta correccion),
  // quien la ocupaba aparece aqui, sin perderse.
  const peopleWithoutStation = useMemo(
    () => (memberIds.length ? getPeopleWithoutStation(memberIds, workstations) : []),
    [memberIds, workstations],
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
  const headerColor = areaStatusMeta?.color || (people.length > 0 ? '#10B981' : '#94A3B8')

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="inset-0 left-0 top-0 flex h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none bg-background">
        <DialogTitle className="sr-only">Detalle de {area?.name || 'área'}</DialogTitle>
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-3 py-3.5 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-[20px] font-extrabold tracking-[-0.4px]">{area.name}</p>
          <span
            className="inline-flex h-6 items-center rounded-full border px-2 text-xs font-bold"
            style={{
              backgroundColor: hexToRgba(headerColor, 0.13),
              color: headerColor,
              borderColor: hexToRgba(headerColor, 0.33),
            }}
          >
            {areaStatusMeta
              ? areaStatusMeta.label
              : people.length > 0
                ? 'Con personal'
                : 'Sin personal hoy'}
          </span>
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
          {isStationBased && staffing.ideal != null ? (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              <div className={cn(kpiCardClass('blue'), 'md:col-span-1')}>
                <p className="text-[10px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
                  Asignación actual
                </p>
                <p className="mt-0.5 text-xl font-extrabold">
                  {staffing.real} / {staffing.ideal}
                </p>
                <p className="text-[11px] text-muted-foreground">personas</p>
              </div>
              <div className={cn(kpiCardClass('slate'), 'md:col-span-1')}>
                <p className="text-[10px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
                  Dotación ideal
                </p>
                <p className="mt-0.5 text-xl font-extrabold">{staffing.ideal}</p>
                <p className="text-[11px] text-muted-foreground">personas</p>
              </div>
              <div
                className={cn(kpiCardClass(staffing.diff < 0 ? 'red' : 'green'), 'md:col-span-1')}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
                  {staffing.diff > 0
                    ? 'Personal adicional'
                    : staffing.diff === 0
                      ? 'Cobertura'
                      : 'Faltan'}
                </p>
                <p
                  className="mt-0.5 text-xl font-extrabold"
                  style={{ color: staffing.diff < 0 ? '#EF4444' : '#10B981' }}
                >
                  {staffing.diff === 0 ? '✓' : Math.abs(staffing.diff)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {staffing.diff === 0
                    ? 'Completa'
                    : `persona${Math.abs(staffing.diff) === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className={cn(kpiCardClass('purple'), 'sm:col-span-1 md:col-span-2')}>
                <p className="text-[10px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
                  Turno actual
                </p>
                <div className="mt-0.5 flex items-center gap-1">
                  <ShiftIcon className="h-[18px] w-[18px] text-[#A855F7]" />
                  <p className="text-[15px] font-extrabold">{currentOfficialShift.label}</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatHour12(currentOfficialShift.start)} –{' '}
                  {formatHour12(currentOfficialShift.end)} · {dayjs().format('DD/MM/YYYY')}
                </p>
              </div>
              <div
                className={cn(
                  kpiCardClass(coveragePct >= 100 ? 'green' : 'cyan'),
                  'col-span-2 flex flex-col justify-center sm:col-span-3 md:col-span-6',
                )}
              >
                <div className="mb-2 flex justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
                    Cobertura de la línea
                  </p>
                  <p className="text-[15px] font-extrabold">{coveragePct}%</p>
                </div>
                <div className={progressBarClass}>
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
                    style={{
                      width: `${Math.max(0, Math.min(100, coveragePct))}%`,
                      backgroundColor: coveragePct >= 100 ? '#10B981' : '#06B6D4',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <p className="text-[22px] font-extrabold">
                {staffing.ideal != null
                  ? `${staffing.real} / ${staffing.ideal} personas`
                  : personnelCountLabel}
              </p>
              {staffing.ideal == null && (
                <p className="text-[13px] font-bold text-muted-foreground">
                  Sin plantilla definida
                </p>
              )}
            </div>
          )}

          {isStationBased && (
            <div className={cn(cardClass, 'mb-4 flex flex-wrap items-center gap-4 p-3 md:p-4')}>
              <div className="min-w-0 flex-1">
                <LineVisualLegend />
              </div>
              {isAdmin && configLoaded && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditStationId(null)
                    setConfigDrawerOpen(true)
                  }}
                  className="shrink-0 font-bold"
                >
                  <Settings className="h-4 w-4" />
                  Configurar puestos
                </Button>
              )}
            </div>
          )}

          <div className="mb-6 max-w-[480px]">
            <EmployeeAssignSearchBar areaId={canonicalId} />
          </div>

          {actionError && (
            <Alert className={cn(alertToneClass('error'), 'mb-4')}>
              {actionError}
              <button
                type="button"
                onClick={() => setActionError('')}
                className="absolute right-2 top-2 rounded-full p-1 hover:bg-black/[.06] dark:hover:bg-white/[.08]"
              >
                <X className="h-4 w-4" />
              </button>
            </Alert>
          )}

          {isStationBased ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* Columna principal */}
              <div className="md:col-span-8">
                <div className={cn(cardClass, 'mb-4')}>
                  <div className={cardHeaderClass}>
                    <div className="min-w-0 flex-1">
                      <p className={cardHeaderTitleClass}>Distribución de estaciones</p>
                      <p className={cardHeaderSubtitleClass}>
                        Toca (o arrastra a alguien) sobre una estación disponible
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <p className="text-xs font-bold text-muted-foreground">
                        {workstations.length} posiciones
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-[15px] w-[15px] text-muted-foreground/60" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Los roles se repiten según la cantidad de posiciones requeridas en la
                          línea.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 p-4">
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
                  </div>
                </div>

                {peopleWithoutStation.length > 0 && (
                  <div className={cn(cardClass, 'mb-4')}>
                    <div className={cardHeaderClass}>
                      <div className="min-w-0 flex-1">
                        <p className={cardHeaderTitleClass}>
                          Personal sin estación ({peopleWithoutStation.length})
                        </p>
                        <p className={cardHeaderSubtitleClass}>
                          Siguen asignados a esta línea, pero su puesto ya no existe en la
                          configuración actual
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 p-4">
                      {peopleWithoutStation.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 rounded-xl border border-border p-2.5"
                        >
                          <EmployeeAvatar employee={r.employee} size={36} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold">
                              {r.employee?.name || '—'}
                            </p>
                            <p className="truncate text-[11.5px] text-muted-foreground">
                              {r.stationId ? `Antes: ${r.stationId}` : 'Sin puesto registrado hoy'}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setMoveTarget({ employee: r.employee, currentAssignment: r })
                            }
                            className="shrink-0 font-bold"
                          >
                            <UserSearch className="h-4 w-4" />
                            Asignar a estación
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={cn(cardClass, 'mb-4')}>
                  <div className={cardHeaderClass}>
                    <p className={cardHeaderTitleClass}>
                      Personal asignado a la línea hoy ({roster.length})
                    </p>
                  </div>
                  <div className="max-h-[340px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow className={tableHeaderRowClass}>
                          <TableHead>No. empleado</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Estación</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Entrada</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {roster.map((r, idx) => {
                          const ws = workstations.find((w) => w.name === r.stationId)
                          const isReal = r.source === 'REGISTRO'
                          const rowActividad = getActividadForEmployee(r.employeeId)
                          const rowType = getPersonnelVisualType({
                            stationRole: ws?.role,
                            actividad: rowActividad,
                            category: ws?.category,
                          })
                          return (
                            <TableRow key={r.id} className={tableRowClass(idx)}>
                              <TableCell className={cn(cellTextClass, 'font-mono font-semibold')}>
                                {formatEmployeeNumber(r.employeeNumber)}
                              </TableCell>
                              <TableCell className={cellTextClass}>
                                <DraggablePersonChip employeeId={r.employeeId}>
                                  {r.employee?.name || '—'}
                                </DraggablePersonChip>
                              </TableCell>
                              <TableCell className={cellTextSecondaryClass}>
                                {r.stationId || '—'}
                              </TableCell>
                              <TableCell className={cellTextSecondaryClass}>
                                {ws?.requiredRole || '—'}
                              </TableCell>
                              <TableCell>
                                {rowType ? (
                                  <span
                                    className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-bold"
                                    style={{
                                      backgroundColor: hexToRgba(rowType.color, 0.12),
                                      color: rowType.color,
                                      borderColor: hexToRgba(rowType.color, 0.3),
                                    }}
                                  >
                                    <LineTypeIcon type={rowType} size={12} />
                                    {rowType.label.toUpperCase()}
                                  </span>
                                ) : (
                                  <p className={cellTextSecondaryClass}>—</p>
                                )}
                              </TableCell>
                              <TableCell className={cellTextSecondaryClass}>
                                {r.checkInAt || '—'}
                              </TableCell>
                              <TableCell>
                                {isReal ? (
                                  <span className={statusChipClass('COMPLETADA')}>Presente</span>
                                ) : (
                                  <span className={statusChipClass('PENDIENTE')}>
                                    Sin check-in hoy
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setHistoryEmployee(r.employee)}
                                  className="font-bold"
                                >
                                  Ver detalle
                                </Button>
                                {isReal && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => dnd.requestRelease(r.employeeId)}
                                    className="font-bold text-destructive hover:text-destructive"
                                  >
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
                              <EmptyState
                                compact
                                title="Nadie asignado todavía"
                                description="Usa 'Registrar personal', arrastra a alguien sobre una estación, o asigna un candidato sugerido a la derecha."
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="border-t border-border p-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLineHistoryOpen(true)}
                      className="font-bold"
                    >
                      <History className="h-4 w-4" />
                      Ver historial de la línea
                    </Button>
                  </div>
                </div>

                <div className={cn(cardClass, 'p-4')}>
                  <AvailablePersonnelTray scopedAreaId={canonicalId} title="Personal disponible" />
                </div>
              </div>

              {/* Columna lateral */}
              <div className="md:col-span-4">
                <div className={cn(cardClass, 'mb-4')}>
                  <div className={cardHeaderClass}>
                    <div className="min-w-0 flex-1">
                      <p className={cardHeaderTitleClass}>Detalle de estación</p>
                      {selectedStation && (
                        <p className={cardHeaderSubtitleClass}>
                          Posición {selectedStation.order} de {workstations.length}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    {!selectedStation && (
                      <EmptyState
                        compact
                        title="Selecciona una estación"
                        description="Toca cualquier estación para ver su detalle."
                      />
                    )}
                    {selectedStation && (
                      <>
                        <div className="mb-1 flex items-center gap-2">
                          {selectedStationVisualType && (
                            <div
                              className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full"
                              style={{
                                backgroundColor: hexToRgba(selectedStationVisualType.color, 0.14),
                              }}
                            >
                              <LineTypeIcon type={selectedStationVisualType} size={14} />
                            </div>
                          )}
                          <p
                            className="text-[17px] font-extrabold"
                            style={{
                              color: selectedStation.isAvailable ? '#B45309' : undefined,
                            }}
                          >
                            {selectedStation.name}
                          </p>
                        </div>
                        <p className="mb-2 text-[12.5px] text-muted-foreground">
                          Rol requerido: <b>{selectedStation.requiredRole}</b> ·{' '}
                          {selectedStation.occupants.length}/{selectedStation.capacity}
                        </p>
                        <div className="mb-3 flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: selectedStation.isAvailable ? '#F59E0B' : '#10B981',
                            }}
                          />
                          <p
                            className="text-[11px] font-extrabold tracking-[0.3px]"
                            style={{ color: selectedStation.isAvailable ? '#B45309' : '#059669' }}
                          >
                            {selectedStation.isAvailable ? 'DISPONIBLE' : 'OCUPADA'}
                          </p>
                        </div>

                        <p className={cn(sectionTitleClass, 'mb-2 text-[12.5px]')}>
                          Información de la estación
                        </p>
                        <div className="mb-3 flex flex-col gap-2">
                          <div>
                            <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                              Área
                            </p>
                            <p className="text-[13px] font-bold">
                              {area.isProduction ? 'Producción' : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                              Tipo
                            </p>
                            <p className="text-[13px] font-bold">Operativo</p>
                          </div>
                          <div>
                            <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                              Turno
                            </p>
                            <p className="text-[13px] font-bold">
                              {currentOfficialShift.label} (
                              {formatHour12(currentOfficialShift.start)} –{' '}
                              {formatHour12(currentOfficialShift.end)})
                            </p>
                          </div>
                          <div>
                            <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                              Categoría
                            </p>
                            <p
                              className="text-[13px] font-bold"
                              style={{ color: selectedStationVisualType?.color }}
                            >
                              {selectedStationVisualType?.label || 'Sin clasificar'}
                            </p>
                          </div>
                        </div>

                        {selectedStation.occupants.length > 0 && (
                          <>
                            <div className="my-3 border-t border-border" />
                            <p className={cn(sectionTitleClass, 'mb-2 text-[12.5px]')}>
                              Empleado asignado
                            </p>
                            <div className="mb-3 flex flex-col gap-2">
                              {selectedStation.occupants.map((o) => (
                                <button
                                  type="button"
                                  key={o.id}
                                  onClick={() => setHistoryEmployee(o.employee)}
                                  className="flex w-full items-center gap-2.5 text-left"
                                >
                                  <EmployeeAvatar employee={o.employee} size={36} />
                                  <div>
                                    <p className="text-[13px] font-bold">
                                      {o.employeeNumber} — {o.employee?.name}
                                    </p>
                                    <p className="text-[11.5px] text-muted-foreground">
                                      Entrada {o.checkInAt}
                                    </p>
                                    {selectedStationVisualType && (
                                      <p
                                        className="text-[10.5px] font-extrabold tracking-[0.3px]"
                                        style={{ color: selectedStationVisualType.color }}
                                      >
                                        {selectedStationVisualType.label.toUpperCase()}
                                      </p>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>

                            {/* Area de origen / Tipo de apoyo -- SOLO para Apoyo/Calidad
                               (unico caso con algo genuinamente distinto que decir).
                               Nunca inventado: area de origen = el `role` real de la
                               estacion (workstation.role), tipo de apoyo = descriptor
                               fijo de la categoria (no un dato inventado por persona). */}
                            {selectedStationVisualType?.key === 'CALIDAD' && (
                              <div className="mb-3 flex flex-col gap-2">
                                <div>
                                  <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                                    Área de origen
                                  </p>
                                  <p className="text-[13px] font-bold">{selectedStation.role}</p>
                                </div>
                                <div>
                                  <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                                    Tipo de apoyo
                                  </p>
                                  <p className="text-[13px] font-bold">Transversal</p>
                                </div>
                              </div>
                            )}

                            <div className="my-3 border-t border-border" />
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setHistoryEmployee(selectedStation.occupants[0].employee)
                                }
                                className="flex-1 font-bold"
                              >
                                <History className="h-4 w-4" />
                                Ver historial
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setHistoryEmployee(selectedStation.occupants[0].employee)
                                }
                                className="flex-1 font-bold"
                              >
                                <ArrowLeftRight className="h-4 w-4" />
                                Cambiar asignación
                              </Button>
                            </div>
                          </>
                        )}

                        {selectedStation.isAvailable && (
                          <>
                            <div className="my-3 border-t border-border" />
                            <p className={cn(sectionTitleClass, 'mb-2.5 text-[13px]')}>
                              Personal sugerido
                            </p>
                            {suggestions.length === 0 ? (
                              <EmptyState
                                compact
                                title="Sin candidatos"
                                description="Nadie presente hoy tiene esta habilidad registrada todavía."
                              />
                            ) : (
                              <div className="flex flex-col gap-2">
                                {suggestions.map((c) => (
                                  <SuggestedEmployeeCard
                                    key={c.employee.id}
                                    candidate={c}
                                    onAssign={handleAssignSuggested}
                                    disabled={!c.present}
                                  />
                                ))}
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIncludeAbsent((v) => !v)}
                              className="mt-2 font-bold"
                            >
                              {includeAbsent ? 'Ocultar no registrados hoy' : 'Ver más opciones'}
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className={cn(cardClass, 'p-4')}>
                  <p className={cn(sectionTitleClass, 'mb-3 text-[13px]')}>Resumen de la línea</p>
                  <div className="flex flex-col gap-2">
                    {lineSummary.groups.map((g) => (
                      <div key={g.key} className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: g.color }}
                        />
                        <p className="flex-1 truncate text-[12.5px]">{g.label}</p>
                        <p className="text-[12.5px] font-bold">
                          {g.occupied} / {g.total}
                        </p>
                      </div>
                    ))}
                  </div>
                  {staffing.ideal != null && (
                    <>
                      <div className="my-3 border-t border-border" />
                      <div className="flex items-center gap-2">
                        <p className="flex-1 text-[12.5px] font-extrabold">Total asignado</p>
                        <p className="text-[12.5px] font-extrabold">
                          {staffing.real} / {staffing.ideal}
                        </p>
                      </div>
                      {staffing.diff < 0 && (
                        <div className="mt-1 flex items-center gap-2">
                          <p className="flex-1 text-xs text-[#EF4444]">Faltan por cubrir</p>
                          <p className="text-xs font-bold text-[#EF4444]">
                            {Math.abs(staffing.diff)}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Vista simplificada, solo por defensividad -- ver comentario junto
               a isStationBased arriba. Nunca "Distribucion de estaciones" aqui. */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-8">
                <div className={cn(cardClass, 'mb-4')}>
                  <div className={cardHeaderClass}>
                    <p className={cardHeaderTitleClass}>Personal asignado ({people.length})</p>
                  </div>
                  <div className="p-4">
                    {people.length === 0 ? (
                      <EmptyState
                        compact
                        title="Nadie asignado todavía"
                        description="Registra personal o arrastra a alguien desde 'Personal disponible'."
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {people.map((p) => (
                          <AssignedPersonChip key={p.id} employeeId={p.id} name={p.name} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <DropZoneBanner areaId={canonicalId} label={area.name} />
                </div>

                <div className={cn(cardClass, 'p-4')}>
                  <AvailablePersonnelTray scopedAreaId={canonicalId} />
                </div>
              </div>
            </div>
          )}
        </div>

        <StationAssignDialog
          open={Boolean(assignStation)}
          onClose={() => setAssignStation(null)}
          areaId={canonicalId}
          station={assignStation}
          onDone={() => {}}
        />
        <RegisterPersonnelDialog
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          fixedAreaId={canonicalId}
          onDone={() => {}}
        />
        <SelfAssignDialog
          open={selfAssignOpen}
          onClose={() => setSelfAssignOpen(false)}
          fixedAreaId={canonicalId}
          onDone={() => {}}
        />
        <EmployeeHistoryDialog
          employee={historyEmployee}
          open={Boolean(historyEmployee)}
          onClose={() => setHistoryEmployee(null)}
          onChanged={() => {}}
        />
        <LineHistoryDialog
          lineId={canonicalId}
          open={lineHistoryOpen}
          onClose={() => setLineHistoryOpen(false)}
        />
        {isAdmin && configLoaded && (
          <LineStationConfigDrawer
            open={configDrawerOpen}
            onClose={() => {
              setConfigDrawerOpen(false)
              setEditStationId(null)
            }}
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
      </DialogContent>
    </Dialog>
  )
}
