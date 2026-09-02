import dayjs from 'dayjs'
import {
  ArrowLeftRight,
  CalendarX,
  CheckCircle2,
  CircleHelp,
  Search,
  Undo2,
  UserCog,
  UserX,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  cardClass,
  cardHeaderClass,
  cardHeaderSubtitleClass,
  cardHeaderTitleClass,
  kpiCardClass,
  metricChipClass,
} from '@/lib/pageStyles'
import { cn, hexToRgba } from '@/lib/utils'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { setEmployeeUnassignedReason } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getPeopleWithoutArea } from '../../data/production/personnelByArea'
import { EmptyState } from '../../ui'
import { showToast } from '../../ui/toast'
import EmployeeAvatar from './EmployeeAvatar'

/* Rediseño 2026-09-02 (a peticion explicita del usuario, mockup proporcionado) --
   EXCLUSIVO de esta pestaña. Bandeja operativa: 4 KPI clickeables que filtran
   (Sin revisar/Falta/Cambio de turno/Baja), buscador real + filtro Motivo, cards
   compactas (colapsan a solo badge+fecha+"Quitar motivo" una vez clasificadas, en vez de
   seguir mostrando los 3 botones), y seleccion multiple para aplicar el mismo motivo a
   varias personas de una vez.

   NINGUNA logica nueva de datos: people sigue siendo getPeopleWithoutArea() (ya excluye
   BAJA automaticamente -- una vez marcada, active=false y la persona se mueve sola a
   Bajas, exactamente el comportamiento ya pedido y confirmado por el usuario el
   2026-09-02; por eso el conteo/tarjeta "Baja" de este apartado normalmente muestra 0 --
   es correcto, no un bug). setEmployeeUnassignedReason (repository.js) sigue siendo la
   UNICA mutacion real, deliberadamente async/esperada -- ver su propio comentario sobre
   por que nunca es fire-and-forget. La seleccion multiple NO agrega ningun endpoint
   nuevo: aplica esa misma mutacion en secuencia (nunca Promise.all concurrente) sobre
   cada persona seleccionada, una por una, para no arriesgar una carga de escritura
   descontrolada contra la BD -- ver handleBulkAction abajo. */

const KPI_DEFS = [
  {
    key: 'SIN_REVISAR',
    accent: 'slate',
    color: '#64748B',
    icon: CircleHelp,
    labelKey: 'personalSinAsignarTab.kpiSinRevisarLabel',
    subtitleKey: 'personalSinAsignarTab.kpiSinRevisarSubtitle',
  },
  {
    key: 'FALTA',
    accent: 'amber',
    color: '#F59E0B',
    icon: CalendarX,
    labelKey: 'personalSinAsignarTab.kpiFaltaLabel',
    subtitleKey: 'personalSinAsignarTab.kpiFaltaSubtitle',
  },
  {
    key: 'TURNO',
    accent: 'blue',
    color: '#3B82F6',
    icon: ArrowLeftRight,
    labelKey: 'personalSinAsignarTab.kpiTurnoLabel',
    subtitleKey: 'personalSinAsignarTab.kpiTurnoSubtitle',
  },
  {
    key: 'BAJA',
    accent: 'red',
    color: '#EF4444',
    icon: UserX,
    labelKey: 'personalSinAsignarTab.kpiBajaLabel',
    subtitleKey: 'personalSinAsignarTab.kpiBajaSubtitle',
  },
]

// Prioridad de agrupacion SOLO quando el filtro es "Todos" (rule 17: sin revisar, falta,
// cambio de turno, baja, en ese orden) -- dentro de cada grupo se conserva el orden que ya
// trae getPeopleWithoutArea() (Array.prototype.sort es estable), nunca se reordena por
// nombre ni se inventa una regla de negocio nueva.
const GROUP_PRIORITY = { FALTA: 1, TURNO: 2, BAJA: 3 }

export default function PersonalSinAsignarTab() {
  const { t } = useTranslation('centroTrabajo')
  const version = usePersonnelVersion()
  const [query, setQuery] = useState('')
  const [motivoFilter, setMotivoFilter] = useState('TODOS')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [savingId, setSavingId] = useState(null)
  const [bulkActing, setBulkActing] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const people = useMemo(() => getPeopleWithoutArea(), [version])

  const counts = useMemo(() => {
    const c = { SIN_REVISAR: 0, FALTA: 0, TURNO: 0, BAJA: 0 }
    for (const p of people) {
      if (!p.unassignedReason) c.SIN_REVISAR += 1
      else c[p.unassignedReason] = (c[p.unassignedReason] || 0) + 1
    }
    return c
  }, [people])

  const filteredPeople = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = people.filter((p) => {
      if (motivoFilter === 'SIN_REVISAR' && p.unassignedReason) return false
      if (motivoFilter !== 'TODOS' && motivoFilter !== 'SIN_REVISAR' && p.unassignedReason !== motivoFilter) {
        return false
      }
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        formatEmployeeNumber(p.employeeNumber).toLowerCase().includes(q)
      )
    })
    if (motivoFilter !== 'TODOS') return matches
    return [...matches].sort(
      (a, b) => (GROUP_PRIORITY[a.unassignedReason] || 0) - (GROUP_PRIORITY[b.unassignedReason] || 0),
    )
  }, [people, motivoFilter, query])

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSetReason(person, reason) {
    setSavingId(person.id)
    try {
      await setEmployeeUnassignedReason(person, reason)
      showToast(
        reason
          ? t('personalSinAsignarTab.reasonSetSuccessToast')
          : t('personalSinAsignarTab.reasonClearedSuccessToast'),
        'success',
      )
    } catch (err) {
      showToast(err.message || t('personalSinAsignarTab.reasonSetErrorFallback'), 'error')
    } finally {
      setSavingId(null)
    }
  }

  // Bulk (2026-09-02): SECUENCIAL a proposito, nunca Promise.all -- no existe (ni se crea
  // aqui) un endpoint bulk real en el backend; disparar N requests concurrentes contra la
  // misma tabla sin evaluar consistencia es justo lo que el usuario pidio evitar. Reusa
  // setEmployeeUnassignedReason persona por persona (la misma mutacion validada de arriba),
  // acumula exito/fallo real y lo reporta en un solo toast al final.
  async function handleBulkAction(reason) {
    const targets = filteredPeople.filter((p) => selectedIds.has(p.id))
    if (targets.length === 0) return
    setBulkActing(true)
    let ok = 0
    let fail = 0
    for (const person of targets) {
      try {
        await setEmployeeUnassignedReason(person, reason)
        ok += 1
      } catch {
        fail += 1
      }
    }
    setBulkActing(false)
    setSelectedIds(new Set())
    if (fail === 0) {
      showToast(t('personalSinAsignarTab.bulkResultToast', { ok, total: targets.length }), 'success')
    } else {
      showToast(
        t('personalSinAsignarTab.bulkResultPartialToast', { ok, total: targets.length, fail }),
        'error',
      )
    }
  }

  return (
    <div className={cn(cardClass, 'mt-4')}>
      <div className={cn(cardHeaderClass, 'justify-between')}>
        <div className="flex items-center gap-2">
          <UserCog className="h-[18px] w-[18px] text-muted-foreground" />
          <div>
            <p className={cardHeaderTitleClass}>{t('personalSinAsignarTab.title')}</p>
            <p className={cardHeaderSubtitleClass}>{t('personalSinAsignarTab.subtitle')}</p>
          </div>
        </div>
        <span className={cn(metricChipClass('warn'), 'shrink-0 rounded-full')}>
          {t('personalSinAsignarTab.countChip', { count: people.length })}
        </span>
      </div>

      {people.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 border-b border-border p-5 sm:grid-cols-2 xl:grid-cols-4">
            {KPI_DEFS.map((def) => (
              <SinAsignarKpiCard
                key={def.key}
                def={def}
                count={counts[def.key]}
                total={people.length}
                active={motivoFilter === def.key}
                onClick={() => setMotivoFilter((prev) => (prev === def.key ? 'TODOS' : def.key))}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('personalSinAsignarTab.searchPlaceholder')}
                className="h-9 bg-card pl-9"
              />
            </div>
            <Button
              type="button"
              variant={motivoFilter === 'TODOS' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setMotivoFilter('TODOS')}
              className="h-9"
            >
              {t('personalSinAsignarTab.filterAllButton')}
            </Button>
            <Select value={motivoFilter} onValueChange={setMotivoFilter}>
              <SelectTrigger className="h-9 w-[168px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">{t('personalSinAsignarTab.filterMotivoAll')}</SelectItem>
                <SelectItem value="SIN_REVISAR">
                  {t('personalSinAsignarTab.filterMotivoSinRevisar')}
                </SelectItem>
                <SelectItem value="FALTA">{t('personalSinAsignarTab.filterMotivoFalta')}</SelectItem>
                <SelectItem value="TURNO">{t('personalSinAsignarTab.filterMotivoTurno')}</SelectItem>
                <SelectItem value="BAJA">{t('personalSinAsignarTab.filterMotivoBaja')}</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">
              {t('personalSinAsignarTab.showingCount', {
                shown: filteredPeople.length,
                total: people.length,
              })}
            </span>
          </div>
        </>
      )}

      {selectedIds.size > 0 && (
        <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-2 dark:border-blue-500/20 dark:bg-blue-500/[.06]">
          <span className="text-[13px] font-semibold text-blue-700 dark:text-blue-300">
            {t('personalSinAsignarTab.selectedCount', { count: selectedIds.size })}
          </span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActing}
              onClick={() => handleBulkAction('BAJA')}
              className="h-7 border-red-200 text-[11px] font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {t('personalSinAsignarTab.bulkBajaButton')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActing}
              onClick={() => handleBulkAction('TURNO')}
              className="h-7 border-blue-200 text-[11px] font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              {t('personalSinAsignarTab.bulkTurnoButton')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={bulkActing}
              onClick={() => handleBulkAction('FALTA')}
              className="h-7 border-amber-200 text-[11px] font-bold text-amber-600 hover:bg-amber-50 hover:text-amber-700"
            >
              {t('personalSinAsignarTab.bulkFaltaButton')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={bulkActing}
              onClick={() => setSelectedIds(new Set())}
              className="h-7 text-[11px] font-semibold text-muted-foreground"
            >
              {t('personalSinAsignarTab.bulkClearSelection')}
            </Button>
          </div>
        </div>
      )}

      <div className="p-4">
        {people.length === 0 ? (
          <EmptyState
            compact
            icon={<CheckCircle2 />}
            title={t('personalSinAsignarTab.emptyTitle')}
            description={t('personalSinAsignarTab.emptyDescription')}
          />
        ) : filteredPeople.length === 0 ? (
          <EmptyState
            compact
            title={t('personalSinAsignarTab.noResultsTitle')}
            description={t('personalSinAsignarTab.noResultsDescription')}
          />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {filteredPeople.map((p) => (
              <PersonaSinAsignarItem
                key={p.id}
                person={p}
                saving={savingId === p.id || bulkActing}
                selected={selectedIds.has(p.id)}
                selectable={!bulkActing}
                onToggleSelect={toggleSelect}
                onSetReason={handleSetReason}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Rediseño 2026-09-02 (a peticion explicita del usuario, mockup proporcionado): las 4 KPI
// pasan de compactas/horizontales a GRANDES -- mismo protagonismo visual que el mockup, con
// porcentaje real del total (nunca hardcodeado, se calcula de `count`/`total` en cada render).
function SinAsignarKpiCard({ def, count, total, active, onClick }) {
  const { t } = useTranslation('centroTrabajo')
  const Icon = def.icon
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        kpiCardClass(def.accent),
        'flex flex-col gap-4 rounded-2xl p-5 text-left hover:translate-y-0',
      )}
      style={
        active
          ? { borderColor: def.color, borderWidth: 2, backgroundColor: hexToRgba(def.color, 0.06) }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: hexToRgba(def.color, 0.12), color: def.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold uppercase tracking-wide text-foreground">
            {t(def.labelKey)}
          </p>
          <p className="truncate text-xs text-muted-foreground">{t(def.subtitleKey)}</p>
        </div>
      </div>
      <div>
        <p className="text-[34px] font-extrabold leading-none" style={{ color: def.color }}>
          {count}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t('personalSinAsignarTab.kpiPercentOfTotal', { pct })}
        </p>
      </div>
    </button>
  )
}

const REASON_LABEL_KEY = {
  BAJA: 'personalSinAsignarTab.reasonBajaLabel',
  TURNO: 'personalSinAsignarTab.reasonTurnoLabel',
  FALTA: 'personalSinAsignarTab.reasonFaltaLabel',
}

// Mismo vocabulario de color YA establecido en pageStyles.js (metricChipClass) -- bad=rojo,
// info=azul, warn=ambar -- nunca un color nuevo inventado para este rediseño.
const REASON_CHIP_TONE = { BAJA: 'bad', TURNO: 'info', FALTA: 'warn' }

function PersonaSinAsignarItem({ person, saving, selected, selectable, onToggleSelect, onSetReason }) {
  const { t } = useTranslation('centroTrabajo')
  const reason = person.unassignedReason || null
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-2xl border border-border p-3 transition-all duration-[180ms] ease-out hover:-translate-y-px hover:border-blue-200 hover:shadow-sm',
        selected && 'border-blue-300 bg-blue-50/50 dark:border-blue-500/40 dark:bg-blue-500/[.05]',
      )}
    >
      <div className="flex items-start gap-2.5">
        <Checkbox
          checked={selected}
          disabled={!selectable}
          onCheckedChange={() => onToggleSelect(person.id)}
          className="mt-2"
          aria-label={t('personalSinAsignarTab.selectAriaLabel', { name: person.name })}
        />
        <EmployeeAvatar employee={person} size={34} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <p className="truncate text-[13px] font-bold leading-tight">{person.name}</p>
            {!reason && (
              <span
                className={cn(metricChipClass('default'), 'h-5 shrink-0 rounded-full px-2 text-[10px]')}
              >
                {t('personalSinAsignarTab.sinRevisarBadge')}
              </span>
            )}
          </div>
          <p className="font-mono text-[11px] text-muted-foreground">
            {formatEmployeeNumber(person.employeeNumber)}
          </p>
        </div>
      </div>

      {reason && (
        <div className="pl-[26px]">
          <span
            className={cn(
              metricChipClass(REASON_CHIP_TONE[reason]),
              'h-5 rounded-full px-2 text-[10.5px] font-semibold',
            )}
          >
            {t(REASON_LABEL_KEY[reason])}
            {person.unassignedReasonSetAt &&
              ` · ${dayjs(person.unassignedReasonSetAt).format('DD/MM/YYYY HH:mm')}`}
          </span>
        </div>
      )}

      <div className="pl-[26px]">
        {reason ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => onSetReason(person, null)}
            className="h-6 px-1.5 text-[10.5px] font-bold text-muted-foreground"
          >
            <Undo2 className="h-3 w-3" />
            {t('personalSinAsignarTab.clearReasonButton')}
          </Button>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => onSetReason(person, 'BAJA')}
              className="h-7 flex-1 min-w-[64px] gap-1 border-red-200 text-[10.5px] font-bold text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <UserX className="h-3 w-3" />
              {t('personalSinAsignarTab.markBajaButton')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => onSetReason(person, 'TURNO')}
              className="h-7 flex-1 min-w-[64px] gap-1 border-blue-200 text-[10.5px] font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowLeftRight className="h-3 w-3" />
              {t('personalSinAsignarTab.markTurnoButton')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => onSetReason(person, 'FALTA')}
              className="h-7 flex-1 min-w-[64px] gap-1 border-amber-200 text-[10.5px] font-bold text-amber-600 hover:bg-amber-50 hover:text-amber-700"
            >
              <CalendarX className="h-3 w-3" />
              {t('personalSinAsignarTab.markFaltaButton')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
