import dayjs from 'dayjs'
import {
  ArrowLeft,
  ArrowLeftRight,
  History,
  Info,
  Moon,
  PersonStanding,
  Sun,
  UserPlus,
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
import { getPersonnelRank } from '../../data/personnel/rankSystem'
import {
  checkInEmployee,
  getLineWorkstationsWithOccupancy,
  getSuggestedCandidates,
  reconcileLineAssignments,
} from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import {
  AREA_STATION_SOURCE_OVERRIDE,
  CURRENT_SHIFT,
  canonicalOperationalAreaId,
  getCurrentShift,
  operationalGroupMembers,
  workCenterById,
} from '../../data/production/catalog'
import {
  AREA_STATUS_META,
  classifyAreaStatus,
  getEffectiveTodayRoster,
  getGroupAreaStaffing,
  getGroupPeople,
  getPeopleWithoutStation,
} from '../../data/production/personnelByArea'
import { useDndAssign } from '../../state/dndAssign'
import { useRoleMode } from '../../state/roleMode'
import { EmptyState } from '../../ui'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import AreaStaffSummary from './AreaStaffSummary'
import AvailablePersonnelTray from './AvailablePersonnelTray'
import EmployeeAssignSearchBar from './EmployeeAssignSearchBar'
import EmployeeAvatar from './EmployeeAvatar'
import EmployeeHistoryDialog from './EmployeeHistoryDialog'
import HierarchyLegend, { RankIcon } from './HierarchyLegend'
import LeadershipRow from './LeadershipRow'
import LineHistoryDialog from './LineHistoryDialog'
import LineStationCard from './LineStationCard'
import MoveConfirmDialog from './MoveConfirmDialog'
import RegisterPersonnelDialog from './RegisterPersonnelDialog'
import SelfAssignDialog from './SelfAssignDialog'
import StationAssignDialog from './StationAssignDialog'
import SuggestedEmployeeCard from './SuggestedEmployeeCard'
import WorkCenterNavControls from './WorkCenterNavControls'

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
   enriquecido.

   Fase 6c (Centro de Trabajo): portado de MUI a Tailwind. HierarchyLegend
   sigue en MUI (coexistencia ya probada -- se renderiza tal cual dentro de
   LeadershipRow.jsx, ya convertido, desde antes de este commit). */

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
const LEADERSHIP_RANK_KEYS = new Set([
  'HEAD_CHIEF_AREA',
  'GERENTE_FFT',
  'SUPERVISOR',
  'TEAM_LEADER',
])

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

export default function LineLikeAreaDetail({
  workCenterId,
  open,
  onClose,
  previous,
  next,
  onNavigate,
}) {
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

  // Reinicio de estado transitorio al cambiar de Work Center (Anterior/
  // Siguiente) -- dependencia intencional aunque no se lea dentro del
  // callback, mismo patron ya usado en otros archivos de este folder.
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
  }, [workCenterId])

  const canonicalId = workCenterId ? canonicalOperationalAreaId(workCenterId) : null
  const memberIds = workCenterId ? operationalGroupMembers(workCenterId) : []
  const area = canonicalId ? workCenterById(canonicalId) : null

  // "Vista filtrada sobre otra area real" (2026-08-28, "corrección navegación Conveyor
  // General", a peticion explicita del usuario) -- ver AREA_STATION_SOURCE_OVERRIDE
  // (catalog.js). Cuando aplica (hoy solo CONVEYOR_PRINCIPAL), `dataAreaId` es de donde
  // salen/se escriben los datos REALES (Paletizado) mientras `area`/el titulo de arriba
  // siguen siendo los de `canonicalId` (Conveyor General) -- nunca se crea una WorkArea/
  // Workstation/DailyAssignment nueva, "una sola fuente real de asignación".
  const stationSource = canonicalId ? AREA_STATION_SOURCE_OVERRIDE[canonicalId] : null
  const dataAreaId = stationSource ? stationSource.sourceAreaId : canonicalId

  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const allSourceWorkstations = useMemo(
    () => (dataAreaId ? getLineWorkstationsWithOccupancy(dataAreaId) : []),
    [dataAreaId, version],
  )
  const workstations = useMemo(() => {
    if (!stationSource) return allSourceWorkstations
    // Renumera `order` 1..N sobre el subconjunto filtrado (solo para mostrar "Posición X
    // de Y" correctamente aqui) -- nunca toca displayOrder real de Paletizado.
    return allSourceWorkstations
      .filter((w) => stationSource.roles.includes(w.role))
      .map((w, i) => ({ ...w, order: i + 1 }))
  }, [allSourceWorkstations, stationSource])

  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const staffing = useMemo(() => {
    if (stationSource) {
      const real = workstations.filter((w) => w.occupants.length > 0).length
      const ideal = workstations.length
      return { ideal, real, diff: real - ideal, status: real >= ideal ? 'COMPLETA' : 'FALTAN' }
    }
    return memberIds.length ? getGroupAreaStaffing(memberIds) : null
  }, [stationSource, workstations, memberIds, version])
  const areaStatusKey =
    staffing?.ideal != null ? classifyAreaStatus(staffing.real, staffing.ideal) : null
  const areaStatusMeta = areaStatusKey ? AREA_STATUS_META[areaStatusKey] : null
  const coveragePct = staffing?.ideal ? Math.round((staffing.real / staffing.ideal) * 100) : null
  const currentOfficialShift = getCurrentShift()
  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const people = useMemo(() => {
    if (stationSource)
      return workstations.flatMap((w) => w.occupants.map((o) => o.employee).filter(Boolean))
    return memberIds.length ? getGroupPeople(memberIds) : []
  }, [stationSource, workstations, memberIds, version])
  const stationGroups = useMemo(() => groupStationsByRank(workstations), [workstations])
  const summaryGroups = useMemo(
    () =>
      stationGroups.map((g) => ({
        key: g.rank ? g.rank.key : '__SIN_CLASIFICAR__',
        label: g.rank ? RANK_SECTION_LABEL[g.rank.key] || g.rank.label : 'Puestos generales',
        color: g.rank ? g.rank.color : '#94A3B8',
        occupied: g.stations.filter((w) => w.occupants.length > 0).length,
        total: g.stations.length,
      })),
    [stationGroups],
  )

  // reconcileLineAssignments es para "corregir asignaciones huerfanas dentro de MI PROPIA
  // area real" -- no aplica a una vista filtrada (stationSource) que ni siquiera tiene
  // puestos propios: correrlo aqui no haria nada util (memberIds no tiene roster real) y
  // podria confundirse con logica que le corresponde a la pantalla real de Paletizado.
  // biome-ignore lint/correctness/useExhaustiveDependencies: memberIds se recalcula desde workCenterId en cada render, incluirlo forzaria un loop -- mismo patron en todo este folder
  useEffect(() => {
    if (!open || !canonicalId || stationSource) return
    const ids = memberIds
      .flatMap((id) => getGroupPeople([id]))
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((p) => p.id)
    reconcileLineAssignments(canonicalId, ids)
  }, [canonicalId, open, stationSource])

  const selectedStation = useMemo(() => {
    if (!workstations.length) return null
    return (
      workstations.find((w) => w.name === selectedStationName) ||
      workstations.find((w) => w.isAvailable) ||
      workstations[0]
    )
  }, [workstations, selectedStationName])

  const selectedStationRank = selectedStation ? getPersonnelRank(selectedStation.role) : null

  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const suggestions = useMemo(() => {
    if (!dataAreaId || !selectedStation || selectedStation.occupants.length > 0) return []
    return getSuggestedCandidates(dataAreaId, selectedStation.name, { includeAbsent })
  }, [dataAreaId, selectedStation, includeAbsent, version])

  // Vista filtrada: el roster real de Paletizado usa areaId='PALETIZADO' (nunca
  // 'CONVEYOR_PRINCIPAL'), asi que memberIds.includes(r.areaId) nunca encontraria a
  // nadie -- se arma directamente desde los 2 puestos ya filtrados (misma fuente real,
  // solo otra forma de leerla). source:'REGISTRO' explicito: son asignaciones reales,
  // nunca sinteticas (isReal/"Quitar" de la tabla dependen de ese campo).
  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const roster = useMemo(() => {
    if (stationSource)
      return workstations.flatMap((w) => w.occupants.map((o) => ({ ...o, source: 'REGISTRO' })))
    return memberIds.length
      ? getEffectiveTodayRoster().filter((r) => memberIds.includes(r.areaId))
      : []
  }, [stationSource, workstations, memberIds, version])
  // "PERSONAL SIN ESTACIÓN" (2026-08-28, "CORRECCIÓN DE PUESTOS Y ESTACIONES OPERATIVAS", a
  // peticion explicita del usuario) -- 100% derivado, ver getPeopleWithoutStation
  // (personnelByArea.js): nunca escribe nada, solo compara contra `workstations` (la lista real
  // actual). Si una estacion se elimina/renombra, quien la ocupaba aparece aqui, sin perderse.
  // No aplica a una vista filtrada (stationSource): "sin estación" compararia contra solo 2
  // puestos de las 18 reales de Paletizado y mostraria a casi todo el mundo por error.
  const peopleWithoutStation = useMemo(
    () =>
      stationSource ? [] : memberIds.length ? getPeopleWithoutStation(memberIds, workstations) : [],
    [stationSource, memberIds, workstations],
  )

  if (!area || !staffing) return null

  const handleAssignSuggested = (candidate) => {
    setActionError('')
    if (!candidate.assignment) {
      const res = checkInEmployee({
        employeeId: candidate.employee.id,
        employeeNumber: candidate.employee.employeeNumber,
        areaId: dataAreaId,
        stationId: selectedStation.name,
        shift: CURRENT_SHIFT,
      })
      if (res.status !== 'OK') setActionError(res.message || 'No se pudo asignar.')
    } else {
      setMoveTarget({
        employee: candidate.employee,
        currentAssignment: candidate.assignment,
        presetTo: { areaId: dataAreaId, stationId: selectedStation.name },
      })
    }
  }

  const ShiftIcon = currentOfficialShift.id === 'NOCHE' ? Moon : Sun
  const headerColor = areaStatusMeta?.color || (people.length > 0 ? '#10B981' : '#94A3B8')

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="inset-0 left-0 top-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 rounded-none bg-background">
        <DialogTitle className="sr-only">Detalle de {area?.name || 'área'}</DialogTitle>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-3 py-3.5 md:px-6">
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

        <div key={workCenterId} className="overflow-y-auto p-3 md:p-6">
          {/* KPIs -- mini-cards con acento de color. */}
          {staffing.ideal != null && (
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
                    Cobertura del área
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
          )}

          {/* Leyenda doble: Jerarquia/Rango + Estado de estacion. */}
          <div className={cn(cardClass, 'mb-4 p-3 md:p-4')}>
            <div className="flex flex-wrap items-center gap-4 md:gap-8">
              <HierarchyLegend />
              <div className="hidden h-8 w-px bg-border md:block" />
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.4px] text-muted-foreground">
                  Estado de estación
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  <p className="text-[11px] font-bold text-muted-foreground">Ocupada</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                  <p className="text-[11px] font-bold text-muted-foreground">Disponible</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
                  <p className="text-[11px] font-bold text-muted-foreground">Sin asignación</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 max-w-[480px]">
            <EmployeeAssignSearchBar areaId={dataAreaId} />
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
                        Cada puesto es una posición individual, 1 persona por puesto.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-4">
                  {stationGroups.map((group) => {
                    const isLeadership = group.rank && LEADERSHIP_RANK_KEYS.has(group.rank.key)
                    const sectionLabel = group.rank
                      ? RANK_SECTION_LABEL[group.rank.key] || group.rank.label
                      : 'Puestos generales'
                    const occupiedCount = group.stations.filter(
                      (w) => w.occupants.length > 0,
                    ).length
                    return (
                      <div
                        key={group.rank ? group.rank.key : 'sin-clasificar'}
                        className="overflow-hidden rounded-xl border"
                        style={{
                          borderColor: group.rank
                            ? hexToRgba(group.rank.color, 0.25)
                            : 'hsl(var(--border))',
                        }}
                      >
                        <div
                          className="flex items-center gap-1.5 px-3 py-1.5"
                          style={{
                            backgroundColor: group.rank
                              ? hexToRgba(group.rank.color, 0.08)
                              : undefined,
                          }}
                        >
                          {group.rank ? (
                            <RankIcon rank={group.rank} size={14} />
                          ) : (
                            <Info className="h-3.5 w-3.5 text-muted-foreground/60" />
                          )}
                          <p
                            className="text-[11px] font-extrabold uppercase tracking-[0.4px]"
                            style={{ color: group.rank ? group.rank.color : undefined }}
                          >
                            {sectionLabel}
                          </p>
                          <div className="flex-1" />
                          <p className="text-[10.5px] font-bold text-muted-foreground">
                            {occupiedCount} / {group.stations.length} puesto
                            {group.stations.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        {isLeadership ? (
                          <div className="flex flex-col gap-2 p-2.5">
                            {group.stations.map((w) => (
                              <LeadershipRow
                                key={w.id}
                                workAreaId={dataAreaId}
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
                          </div>
                        ) : (
                          <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 p-2.5">
                            {group.stations.map((w) => (
                              <LineStationCard
                                key={w.id}
                                workAreaId={dataAreaId}
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
                          </div>
                        )}
                      </div>
                    )
                  })}
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
                        Siguen asignados a esta área, pero su puesto ya no existe en la
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
                          <PersonStanding className="h-4 w-4" />
                          Asignar a estación
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={cn(cardClass, 'mb-4')}>
                <div className={cardHeaderClass}>
                  <p className={cardHeaderTitleClass}>Personal asignado hoy ({roster.length})</p>
                </div>
                <div className="max-h-[340px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow className={tableHeaderRowClass}>
                        <TableHead>No. empleado</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Estación</TableHead>
                        <TableHead>Rol / Rango</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roster.map((r, idx) => {
                        const ws = workstations.find((w) => w.name === r.stationId)
                        const isReal = r.source === 'REGISTRO'
                        const rowRank = ws ? getPersonnelRank(ws.role) : null
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
                            <TableCell>
                              {rowRank ? (
                                <span
                                  className="inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10.5px] font-bold"
                                  style={{
                                    backgroundColor: hexToRgba(rowRank.color, 0.12),
                                    color: rowRank.color,
                                    borderColor: hexToRgba(rowRank.color, 0.3),
                                  }}
                                >
                                  <RankIcon rank={rowRank} size={12} />
                                  {rowRank.label.toUpperCase()}
                                </span>
                              ) : (
                                <p className={cellTextSecondaryClass}>{ws?.requiredRole || '—'}</p>
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
                          <TableCell colSpan={7}>
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
                    Ver historial del área
                  </Button>
                </div>
              </div>

              <div className={cn(cardClass, 'p-4')}>
                <AvailablePersonnelTray scopedAreaId={dataAreaId} title="Personal disponible" />
              </div>
            </div>

            {/* Columna lateral */}
            <div className="md:col-span-4">
              <div className={cn(cardClass, 'mb-4')}>
                <div className={cardHeaderClass}>
                  <div className="min-w-0 flex-1">
                    <p className={cardHeaderTitleClass}>
                      {selectedStation ? 'Detalle de estación' : 'Estación'}
                    </p>
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
                        {selectedStationRank && (
                          <div
                            className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full"
                            style={{ backgroundColor: hexToRgba(selectedStationRank.color, 0.14) }}
                          >
                            <RankIcon rank={selectedStationRank} size={14} />
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
                        Información del puesto
                      </p>
                      <div className="mb-3 flex flex-col gap-2">
                        <div>
                          <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                            Área
                          </p>
                          <p className="text-[13px] font-bold">{area.name}</p>
                        </div>
                        <div>
                          <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                            Tipo
                          </p>
                          <p className="text-[13px] font-bold">Operativo</p>
                        </div>
                        <div>
                          <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                            Jerarquía
                          </p>
                          <p className="text-[13px] font-bold">
                            {selectedStationRank?.label || 'Sin información disponible'}
                          </p>
                        </div>
                      </div>

                      {selectedStation.occupants.length > 0 && (
                        <>
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
                                </div>
                              </button>
                            ))}
                          </div>

                          {/* Informacion adicional -- SOLO para Personal de apoyo (rango
                             PERSONAL_DE_APOYO), unico caso con algo genuinamente distinto
                             que decir. Nunca se inventa: area de origen = el `role` real
                             de la estacion (workstation.role), apoya-en = el area actual,
                             tipo de apoyo = descriptor fijo de la categoria (no un dato
                             inventado por persona), turno = mismo turno oficial calculado
                             arriba. */}
                          {selectedStationRank?.key === 'PERSONAL_DE_APOYO' && (
                            <>
                              <div className="my-3 border-t border-border" />
                              <p className={cn(sectionTitleClass, 'mb-2.5 text-[12.5px]')}>
                                Información adicional
                              </p>
                              <div className="mb-3 flex flex-col gap-2">
                                <div>
                                  <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                                    Área de origen
                                  </p>
                                  <p className="text-[13px] font-bold">{selectedStation.role}</p>
                                </div>
                                <div>
                                  <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                                    Apoya en
                                  </p>
                                  <p className="text-[13px] font-bold">{area.name}</p>
                                </div>
                                <div>
                                  <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                                    Tipo de apoyo
                                  </p>
                                  <p className="text-[13px] font-bold">Transversal</p>
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
                              </div>
                            </>
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

              <AreaStaffSummary
                groups={summaryGroups}
                total={staffing.real}
                ideal={staffing.ideal}
                diff={staffing.diff}
              />

              <div className={cn(cardClass, 'mt-4 p-4')}>
                <HierarchyLegend expanded />
              </div>
            </div>
          </div>
        </div>

        <StationAssignDialog
          open={Boolean(assignStation)}
          onClose={() => setAssignStation(null)}
          areaId={dataAreaId}
          station={assignStation}
          onDone={() => {}}
        />
        <RegisterPersonnelDialog
          open={registerOpen}
          onClose={() => setRegisterOpen(false)}
          fixedAreaId={dataAreaId}
          onDone={() => {}}
        />
        <SelfAssignDialog
          open={selfAssignOpen}
          onClose={() => setSelfAssignOpen(false)}
          fixedAreaId={dataAreaId}
          onDone={() => {}}
        />
        <EmployeeHistoryDialog
          employee={historyEmployee}
          open={Boolean(historyEmployee)}
          onClose={() => setHistoryEmployee(null)}
          onChanged={() => {}}
        />
        <LineHistoryDialog
          lineId={dataAreaId}
          open={lineHistoryOpen}
          onClose={() => setLineHistoryOpen(false)}
        />
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
