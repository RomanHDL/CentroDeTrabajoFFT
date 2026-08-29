import { CheckCircle2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { alertToneClass, metricChipClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import {
  checkInEmployee,
  getCurrentAssignment,
  getSuggestedCandidates,
  hasSkill,
  isPresentToday,
  moveEmployee,
  searchEmployees,
} from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { CURRENT_SHIFT, workCenterById } from '../../data/production/catalog'
import { EmptyState } from '../../ui'
import EmployeeAvatar from './EmployeeAvatar'

/* ─────────────────────────────────────────────
   Asignar personal tocando directamente una estacion disponible
   (Distribucion de estaciones) — sin navegar a otra pantalla.

   Reutiliza integramente la MISMA fuente de datos y las MISMAS
   acciones que ya existian (repository.js: searchEmployees,
   getSuggestedCandidates, checkInEmployee, moveEmployee): esto es
   una UI nueva sobre la logica que ya funcionaba en
   RegisterPersonnelDialog, no una segunda fuente de verdad.

   Flujo: buscar (o elegir de la lista sugerida) -> seleccionar ->
   confirmar (o resolver conflicto si ya tiene ubicacion hoy) ->
   listo. checkInEmployee/moveEmployee llaman notify() internamente,
   asi que toda la UI que use usePersonnelVersion() (la propia
   Distribucion de estaciones, Personal asignado, contadores, etc.)
   se refresca sola, sin F5.
   ───────────────────────────────────────────── */
export default function StationAssignDialog({ open, onClose, areaId, station, onDone }) {
  const version = usePersonnelVersion()
  const [query, setQuery] = useState('')
  const [showAllSuggested, setShowAllSuggested] = useState(false)
  const [step, setStep] = useState('SEARCH') // SEARCH | CONFIRM | CONFLICT | SUCCESS
  const [selected, setSelected] = useState(null)
  const [conflictAssignment, setConflictAssignment] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  // `station` fuerza reiniciar el formulario tambien cuando el dialogo ya
  // esta abierto y se elige otra estacion sin cerrarlo, aunque no se lea
  // dentro del callback -- comportamiento original preservado tal cual.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  useEffect(() => {
    if (open) {
      setQuery('')
      setShowAllSuggested(false)
      setStep('SEARCH')
      setSelected(null)
      setConflictAssignment(null)
      setError('')
      setResult(null)
    }
  }, [open, station])

  const areaName = workCenterById(areaId)?.name || areaId

  // `version` fuerza recalcular cuando cambia el personal (checkIn/move/release
  // en otra parte de la app), aunque no se lea dentro del callback -- patron ya
  // establecido en el resto del repo (ver mismo criterio en SelfAssignDialog.jsx).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const suggested = useMemo(() => {
    if (!open || !station || query.trim()) return []
    return getSuggestedCandidates(areaId, station.name, { includeAbsent: showAllSuggested })
  }, [open, areaId, station, query, showAllSuggested, version])

  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const searchResults = useMemo(() => {
    if (!open || !station || !query.trim()) return []
    return searchEmployees(query)
      .map((e) => ({
        employee: e,
        compatible: hasSkill(e.id, station.name),
        assignment: getCurrentAssignment(e.id),
        present: isPresentToday(e.id),
      }))
      .sort(
        (a, b) =>
          Number(b.compatible) - Number(a.compatible) ||
          a.employee.name.localeCompare(b.employee.name),
      )
  }, [open, query, station, version])

  if (!station) return null

  function pick(employee, assignment) {
    setSelected(employee)
    setError('')
    if (assignment) {
      setConflictAssignment(assignment)
      setStep('CONFLICT')
    } else {
      setStep('CONFIRM')
    }
  }

  function handleAssign() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    const res = checkInEmployee({
      employeeId: selected.id,
      employeeNumber: selected.employeeNumber,
      areaId,
      stationId: station.name,
      shift: CURRENT_SHIFT,
    })
    if (res.status === 'OK') {
      setResult({ employee: res.employee })
      setStep('SUCCESS')
      onDone?.()
    } else if (res.status === 'CONFLICT') {
      setConflictAssignment(res.assignment)
      setStep('CONFLICT')
    } else {
      setError(res.message || 'No se pudo asignar. Intenta de nuevo.')
    }
    setSubmitting(false)
  }

  function handleMove() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    const res = moveEmployee({
      employeeId: selected.id,
      toAreaId: areaId,
      toStationId: station.name,
      shift: CURRENT_SHIFT,
    })
    if (res.status === 'OK') {
      setResult({ employee: selected })
      setStep('SUCCESS')
      onDone?.()
    } else {
      setError(res.message || 'No se pudo mover al empleado. Intenta de nuevo.')
    }
    setSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[600px]">
        {step === 'SEARCH' && (
          <>
            <DialogHeader>
              <DialogTitle>Asignar personal — {station.name}</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-2">
              <div className="mb-4 flex flex-wrap gap-2">
                <span className={metricChipClass('default')}>Estación: {station.name}</span>
                <span className={metricChipClass('info')}>
                  Rol requerido: {station.requiredRole}
                </span>
                <span className={metricChipClass('warn')}>Disponible</span>
              </div>

              <div className="relative mb-5">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground opacity-50" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por número de empleado o nombre..."
                  className="h-auto rounded-[25px] py-3 pl-9 text-[17px]"
                />
              </div>

              {error && <Alert className={cn(alertToneClass('error'), 'mb-4')}>{error}</Alert>}

              {!query.trim() && (
                <>
                  <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.4px] text-muted-foreground">
                    Personal sugerido para {station.requiredRole}
                  </p>
                  {suggested.length === 0 ? (
                    <EmptyState
                      compact
                      title="Sin candidatos"
                      description="Nadie presente hoy tiene esta habilidad registrada todavía."
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      {suggested.map((c) => (
                        <ResultRow
                          key={c.employee.id}
                          employee={c.employee}
                          compatible
                          present={c.present}
                          assignment={c.assignment}
                          onSelect={() => pick(c.employee, c.assignment)}
                        />
                      ))}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllSuggested((v) => !v)}
                    className="mt-2 font-bold"
                  >
                    {showAllSuggested ? 'Ocultar no registrados hoy' : 'Ver más opciones'}
                  </Button>
                </>
              )}

              {query.trim() &&
                (searchResults.length === 0 ? (
                  <EmptyState
                    compact
                    title="No se encontró personal"
                    description="No encontramos empleados que coincidan con esta búsqueda."
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    {searchResults.map((r) => (
                      <ResultRow
                        key={r.employee.id}
                        employee={r.employee}
                        compatible={r.compatible}
                        present={r.present}
                        assignment={r.assignment}
                        onSelect={() => pick(r.employee, r.assignment)}
                      />
                    ))}
                  </div>
                ))}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <Button variant="ghost" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </>
        )}

        {step === 'CONFIRM' && selected && (
          <>
            <DialogHeader>
              <DialogTitle>Confirmar asignación</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
                Empleado seleccionado
              </p>
              <div className="my-3 flex items-center gap-3">
                <EmployeeAvatar employee={selected} size={44} />
                <div>
                  <p className="text-[16px] font-extrabold">{selected.name}</p>
                  <p className="text-[12.5px] text-muted-foreground">
                    Empleado #{selected.employeeNumber}
                  </p>
                </div>
              </div>
              <div className="my-3 border-t border-border" />
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.5px] text-muted-foreground">
                Asignación
              </p>
              <p className="text-[14px]">
                Estación: <b>{station.name}</b>
              </p>
              <p className="text-[14px]">
                Rol requerido: <b>{station.requiredRole}</b>
              </p>
              <p className="text-[14px]">
                Área: <b>{areaName}</b>
              </p>
              {error && <Alert className={cn(alertToneClass('error'), 'mt-4')}>{error}</Alert>}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <Button variant="ghost" onClick={() => setStep('SEARCH')}>
                Cancelar
              </Button>
              <Button disabled={submitting} onClick={handleAssign} className="font-bold">
                Asignar a {station.name}
              </Button>
            </div>
          </>
        )}

        {step === 'CONFLICT' && selected && conflictAssignment && (
          <>
            <DialogHeader>
              <DialogTitle>Este empleado ya está asignado</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-2">
              <p className="text-[16px] font-extrabold">{selected.name}</p>
              <p className="mb-3 text-[12.5px] text-muted-foreground">
                Empleado #{selected.employeeNumber}
              </p>
              <div className="rounded-[20px] bg-black/[.04] p-3 dark:bg-white/[.08]">
                <p className="text-[11px] font-bold uppercase text-muted-foreground">Actualmente</p>
                <p className="font-bold">
                  {workCenterById(conflictAssignment.areaId)?.name || conflictAssignment.areaId} —{' '}
                  {conflictAssignment.stationId}
                </p>
                <p className="text-[12.5px] text-muted-foreground">
                  Entrada: {conflictAssignment.checkInAt}
                </p>
              </div>
              {conflictAssignment.areaId === areaId &&
              conflictAssignment.stationId === station.name ? (
                <Alert className={cn(alertToneClass('info'), 'mt-4')}>
                  Ya está asignado exactamente a esta estación.
                </Alert>
              ) : (
                <p className="mt-4 text-[13px] text-muted-foreground">
                  Nueva ubicación: <b>{areaName}</b> — {station.name}
                </p>
              )}
              {error && <Alert className={cn(alertToneClass('error'), 'mt-4')}>{error}</Alert>}
            </div>
            <div className="flex flex-wrap justify-end gap-2 px-6 pb-5">
              <Button variant="ghost" onClick={() => setStep('SEARCH')}>
                Cancelar
              </Button>
              <Button
                disabled={
                  submitting ||
                  (conflictAssignment.areaId === areaId &&
                    conflictAssignment.stationId === station.name)
                }
                onClick={handleMove}
                className="font-bold"
              >
                Mover a esta estación
              </Button>
            </div>
          </>
        )}

        {step === 'SUCCESS' && result && (
          <div className="px-6 pb-6 pt-8 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-[#10B981]" />
            <p className="mb-2 text-[16px] font-extrabold">Asignado correctamente</p>
            <p className="text-[17px] font-extrabold">{result.employee.name}</p>
            <p className="mb-5 text-[12.5px] text-muted-foreground">
              #{result.employee.employeeNumber} · {station.name}
            </p>
            <Button onClick={onClose} className="font-bold">
              Cerrar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ResultRow({ employee, compatible, present, assignment, onSelect }) {
  const statusLabel = assignment
    ? `Asignado — ${assignment.stationId}`
    : present
      ? 'Disponible hoy'
      : 'No registrado hoy'
  const statusColor = assignment ? '#B45309' : present ? '#047857' : null
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-border p-2.5">
      <EmployeeAvatar employee={employee} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold">{employee.name}</p>
        <p className="text-[11.5px] text-muted-foreground">
          Empleado #{employee.employeeNumber}
          {compatible ? ' · Habilidad registrada' : ''}
        </p>
        <p
          className={cn('text-[11px] font-bold', !statusColor && 'text-muted-foreground')}
          style={statusColor ? { color: statusColor } : undefined}
        >
          {statusLabel}
        </p>
      </div>
      <Button variant="outline" onClick={onSelect} className="h-10 min-w-24 shrink-0 font-bold">
        Seleccionar
      </Button>
    </div>
  )
}
