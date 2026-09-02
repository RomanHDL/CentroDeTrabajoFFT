import dayjs from 'dayjs'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  History,
  Search,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  cardClass,
  cardHeaderClass,
  cardHeaderSubtitleClass,
  cardHeaderTitleClass,
  cellTextClass,
  cellTextSecondaryClass,
  metricChipClass,
  statusChipClass,
  tableHeaderRowClass,
  tableRowClass,
} from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { getBajaEmployees } from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getRoleLabels } from '../../layout/roleLabels'
import { EmptyState } from '../../ui'
// Reutiliza la MISMA card KPI horizontal que ya usa "Personal" (2026-09-02, a peticion
// explicita del usuario: "Bajas" debe adoptar el mismo lenguaje visual de Personal, sin
// copiar su funcionalidad). "Ultima baja" usa el slot `children` (aditivo, ver el propio
// comentario de DashboardKpiCard) porque su contenido real -- nombre + fecha -- no encaja
// en el slot rigido de numero grande que usan las otras 2 cards.
import DashboardKpiCard from '../dashboard/DashboardKpiCard'
import EmployeeAvatar from './EmployeeAvatar'

/* Personal ya no asignable (2026-08-24, a peticion explicita del usuario): getBajaEmployees()
   ya excluye de cualquier busqueda/asignacion/movimiento -- esta pestaña sigue siendo de SOLO
   LECTURA, nunca se ofrece reactivar/mover/registrar desde aqui (esa regla NO cambia con este
   rediseño). BAJA puede venir del snapshot ESTATICO historico (sin fecha real, sin usuario
   real detras) o del mecanismo en vivo "Personal sin asignar" (fecha + usuario reales) --
   getBajaEmployees() ya devuelve ambos mezclados, sin cambios aqui.

   Rediseño 2026-09-02 (a peticion explicita del usuario, mockup proporcionado) -- SOLO esta
   pestaña. 3 KPI (Total/Este mes/Última baja, sin una 4ta card "con área de origen" -- esa
   card se elimina a proposito, el área de origen se queda solo como columna/filtro de la
   tabla), buscador+filtros reales, tabla compacta, paginacion real.

   Decisiones tomadas siguiendo la regla "ganan los datos reales" del usuario cuando el mockup
   asumia algo que no existe en el modelo real:
   - Motivo: el enum UnassignedReason solo tiene BAJA/TURNO/FALTA (schema.js) -- en ESTA
     pestaña (status==='BAJA') el unico motivo real posible es "Baja", nunca "Baja
     voluntaria"/"Terminación de contrato" (esos values del mockup no existen en el sistema).
   - "Registrado por": Employee.unassignedReasonSetByUserId ya existia en la BD pero nunca se
     exponia al frontend -- se resuelve ahora en roster.js (mismo requireAuth de siempre,
     ningun endpoint/permiso nuevo) y se hidrata via el mismo pipeline de statusOverrides que
     ya usa "Fecha de baja". null para bajas historicas (nunca hubo un usuario real detras).
   - "Fecha de registro" (columna separada del mockup): investigado -- no existe un segundo
     timestamp distinto en el modelo real; unassignedReasonSetAt ES simultaneamente "cuándo se
     marcó" y "fecha de la baja" (set-unassigned-reason.js las escribe en el mismo instante).
     Mostrar dos columnas idénticas hubiera sido confuso/redundante, así que se dejó una sola
     "Fecha de baja" (mismo campo que ya mostraba esta pestaña antes del rediseño).
   - Acciones: investigado -- ningún registro de Bajas ofrece hoy una acción real (reactivar
     vive solo como script manual puntual, nunca como funcionalidad de UI) -- sin columna de
     acciones, para no poner un botón decorativo sin funcionalidad real detrás.
   - Filtro "Turno" del mockup de Sin asignar no aplica aquí; en su lugar, siguiendo el mismo
     mockup de ESTA pestaña, los filtros reales son Motivo/Área/Fecha/Ordenar. */

const PAGE_SIZE_OPTIONS = [10, 25, 50]

function dateVal(e) {
  return e.unassignedReasonSetAt ? new Date(e.unassignedReasonSetAt).getTime() : 0
}

function sortEmployees(list, sortBy) {
  const arr = [...list]
  switch (sortBy) {
    case 'FECHA_ASC':
      return arr.sort((a, b) => dateVal(a) - dateVal(b))
    case 'NOMBRE_ASC':
      return arr.sort((a, b) => a.name.localeCompare(b.name))
    case 'NOMBRE_DESC':
      return arr.sort((a, b) => b.name.localeCompare(a.name))
    default:
      return arr.sort((a, b) => dateVal(b) - dateVal(a))
  }
}

function getPageWindow(current, total, size = 5) {
  if (total <= size) return Array.from({ length: total }, (_, i) => i + 1)
  let start = Math.max(1, current - Math.floor(size / 2))
  let end = start + size - 1
  if (end > total) {
    end = total
    start = end - size + 1
  }
  return Array.from({ length: size }, (_, i) => start + i)
}

export default function BajasTab() {
  const { t } = useTranslation('centroTrabajo')
  const version = usePersonnelVersion()
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('TODAS')
  const [motivoFilter, setMotivoFilter] = useState('TODOS')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('FECHA_DESC')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza recalcular aunque no se lea en el callback (mismo patron en todo este folder)
  const baja = useMemo(() => getBajaEmployees(), [version])

  const areaOptions = useMemo(() => {
    const set = new Set()
    for (const e of baja) if (e.areaHistorica) set.add(e.areaHistorica)
    return [...set].sort()
  }, [baja])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const from = dateFrom ? dayjs(dateFrom) : null
    const to = dateTo ? dayjs(dateTo) : null
    const list = baja.filter((e) => {
      if (areaFilter !== 'TODAS' && e.areaHistorica !== areaFilter) return false
      if (motivoFilter !== 'TODOS' && e.unassignedReason !== motivoFilter) return false
      if (
        from &&
        (!e.unassignedReasonSetAt || dayjs(e.unassignedReasonSetAt).isBefore(from, 'day'))
      )
        return false
      if (to && (!e.unassignedReasonSetAt || dayjs(e.unassignedReasonSetAt).isAfter(to, 'day')))
        return false
      if (!q) return true
      return e.name.toLowerCase().includes(q) || (e.employeeNumber || '').toLowerCase().includes(q)
    })
    return sortEmployees(list, sortBy)
  }, [baja, query, areaFilter, motivoFilter, dateFrom, dateTo, sortBy])

  // biome-ignore lint/correctness/useExhaustiveDependencies: reinicia a pagina 1 cuando cambia cualquier filtro, no solo pageSize
  useEffect(() => {
    setPage(1)
  }, [query, areaFilter, motivoFilter, dateFrom, dateTo, sortBy, pageSize])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const clampedPage = Math.min(page, totalPages)
  const pageStart = (clampedPage - 1) * pageSize
  const pageRows = filtered.slice(pageStart, pageStart + pageSize)
  const pageWindow = getPageWindow(clampedPage, totalPages)

  const totalBajas = baja.length
  const thisMonthCount = useMemo(() => {
    const now = dayjs()
    return baja.filter(
      (e) => e.unassignedReasonSetAt && dayjs(e.unassignedReasonSetAt).isSame(now, 'month'),
    ).length
  }, [baja])
  const lastBaja = useMemo(() => {
    const withDate = baja.filter((e) => e.unassignedReasonSetAt)
    if (!withDate.length) return null
    return withDate.reduce((latest, e) => (dateVal(e) > dateVal(latest) ? e : latest))
  }, [baja])

  function resetFilters() {
    setQuery('')
    setAreaFilter('TODAS')
    setMotivoFilter('TODOS')
    setDateFrom('')
    setDateTo('')
    setSortBy('FECHA_DESC')
  }
  const hasActiveFilters =
    query ||
    areaFilter !== 'TODAS' ||
    motivoFilter !== 'TODOS' ||
    dateFrom ||
    dateTo ||
    sortBy !== 'FECHA_DESC'

  return (
    <div className={cn(cardClass, 'mt-4')}>
      <div className={cn(cardHeaderClass, 'justify-between')}>
        <div>
          <p className={cardHeaderTitleClass}>{t('bajasTab.title')}</p>
          <p className={cardHeaderSubtitleClass}>{t('bajasTab.subtitle')}</p>
        </div>
        <span className={cn(metricChipClass('info'), 'shrink-0 rounded-full')}>
          {t('bajasTab.countChip', { count: totalBajas })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b border-border p-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardKpiCard
          icon={<Users />}
          accent="#3B82F6"
          title={t('bajasTab.kpiTotalTitle')}
          subtitle={t('bajasTab.kpiTotalSubtitle')}
          value={totalBajas}
        />
        <DashboardKpiCard
          icon={<CalendarDays />}
          accent="#06B6D4"
          title={t('bajasTab.kpiMonthTitle')}
          subtitle={t('bajasTab.kpiMonthSubtitle')}
          value={thisMonthCount}
        />
        <DashboardKpiCard
          icon={<History />}
          accent="#EF4444"
          title={t('bajasTab.kpiLastTitle')}
          subtitle={t('bajasTab.kpiLastSubtitle')}
        >
          {lastBaja ? (
            <>
              <p className="truncate text-[15px] font-extrabold text-red-700 dark:text-red-400">
                {lastBaja.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {dayjs(lastBaja.unassignedReasonSetAt).format('DD/MM/YYYY')}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('bajasTab.kpiLastEmpty')}</p>
          )}
        </DashboardKpiCard>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('bajasTab.searchPlaceholder')}
            className="h-9 bg-card pl-9"
          />
        </div>
        <Select value={motivoFilter} onValueChange={setMotivoFilter}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">{t('bajasTab.filterMotivoAll')}</SelectItem>
            <SelectItem value="BAJA">{t('bajasTab.statusBaja')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">{t('bajasTab.filterAreaAll')}</SelectItem>
            {areaOptions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[145px] text-xs"
            aria-label={t('bajasTab.filterDateFromLabel')}
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-[145px] text-xs"
            aria-label={t('bajasTab.filterDateToLabel')}
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="h-9 w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FECHA_DESC">{t('bajasTab.sortDateDesc')}</SelectItem>
            <SelectItem value="FECHA_ASC">{t('bajasTab.sortDateAsc')}</SelectItem>
            <SelectItem value="NOMBRE_ASC">{t('bajasTab.sortNameAsc')}</SelectItem>
            <SelectItem value="NOMBRE_DESC">{t('bajasTab.sortNameDesc')}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasActiveFilters}
          onClick={resetFilters}
          className="h-9"
        >
          {t('bajasTab.clearFiltersButton')}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className={tableHeaderRowClass}>
              <TableHead>{t('bajasTab.columnEmployee')}</TableHead>
              <TableHead>{t('bajasTab.columnName')}</TableHead>
              <TableHead>{t('bajasTab.columnLastArea')}</TableHead>
              <TableHead>{t('bajasTab.columnBajaDate')}</TableHead>
              <TableHead>{t('bajasTab.columnMotivo')}</TableHead>
              <TableHead>{t('bajasTab.columnRegisteredBy')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((e, idx) => (
              <TableRow key={e.id} className={tableRowClass(idx)}>
                <TableCell className={cn(cellTextClass, 'font-mono font-semibold')}>
                  {e.employeeNumber}
                </TableCell>
                <TableCell className={cellTextClass}>
                  <div className="flex items-center gap-2.5">
                    <EmployeeAvatar employee={e} size={28} />
                    <span className="truncate">{e.name}</span>
                  </div>
                </TableCell>
                <TableCell className={cellTextSecondaryClass}>{e.areaHistorica || '—'}</TableCell>
                <TableCell className={cellTextSecondaryClass}>
                  {e.unassignedReasonSetAt
                    ? dayjs(e.unassignedReasonSetAt).format('DD/MM/YYYY HH:mm')
                    : '—'}
                </TableCell>
                <TableCell>
                  <span className={statusChipClass('CANCELADA')}>{t('bajasTab.statusBaja')}</span>
                </TableCell>
                <TableCell className={cellTextSecondaryClass}>
                  {e.registeredByName ? (
                    <div>
                      <p className="font-medium text-foreground">{e.registeredByName}</p>
                      {e.registeredByRole && (
                        <p className="text-xs text-muted-foreground">
                          {getRoleLabels()[e.registeredByRole] || e.registeredByRole}
                        </p>
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    compact
                    title={t('bajasTab.emptyTitle')}
                    description={t('bajasTab.emptyDescription')}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {t('bajasTab.paginationShowing', {
            from: filtered.length ? pageStart + 1 : 0,
            to: Math.min(pageStart + pageSize, filtered.length),
            total: filtered.length,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t('bajasTab.perPage', { count: n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={clampedPage <= 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={clampedPage <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageWindow.map((n) => (
              <Button
                key={n}
                size="icon"
                variant={n === clampedPage ? 'default' : 'outline'}
                className="h-8 w-8 text-xs"
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={clampedPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={clampedPage >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
