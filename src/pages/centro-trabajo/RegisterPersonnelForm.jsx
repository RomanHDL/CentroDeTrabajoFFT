import { CheckCircle2, Hourglass } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { alertToneClass, metricChipClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import {
  checkInEmployee,
  createEmployee,
  getCurrentAssignment,
  getPendingMoves,
  getStationOccupancy,
  hasSkill,
  moveEmployee,
  requestMove,
} from '../../data/personnel/repository'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getWorkstationsForLine } from '../../data/personnel/workstations'
import {
  CURRENT_SHIFT,
  SHIFT_OPTIONS,
  WORK_CENTERS,
  workCenterById,
} from '../../data/production/catalog'
import { useAuth } from '../../state/auth'
import EmployeeSearchField from './EmployeeSearchField'

const emptyForm = (fixedAreaId) => ({
  employee: null,
  employeeNumberTyped: '',
  name: '',
  noNumber: false,
  areaId: fixedAreaId || WORK_CENTERS[0].id,
  stationId: '',
  shift: CURRENT_SHIFT,
})

/**
 * Formulario de registro de personal (check-in diario), compartido
 * entre el dialogo de Centro de Trabajo (RegisterPersonnelDialog) y
 * la pagina propia "Registro de personal" — misma logica de negocio
 * en un solo lugar para que nunca se desincronicen.
 *
 * "No tiene numero de empleado": quien no tiene numero real se
 * registra como 'PROYECTO' (valor que MUCHAS personas comparten a
 * proposito, ver SHARED_PLACEHOLDER_NUMBERS en repository.js) y se
 * identifica por su nombre completo — por eso siempre crea un
 * empleado NUEVO (nunca busca por numero, que seria ambiguo) y hace
 * el check-in pasando employeeId directo.
 *
 * fixedAreaId: si se abre desde dentro de una linea, el area ya se
 * conoce y no se vuelve a pedir (menos toques en tablet).
 */
export default function RegisterPersonnelForm({
  fixedAreaId = null,
  onCancel,
  onDone,
  cancelLabel = 'Cancelar',
}) {
  const { user } = useAuth()
  const isLider = user?.role === 'LIDER'
  const [form, setForm] = useState(() => emptyForm(fixedAreaId))
  const [step, setStep] = useState('FORM') // FORM | CONFLICT | SUCCESS | PENDING
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [conflict, setConflict] = useState(null)
  const [result, setResult] = useState(null)
  const [pendingRequest, setPendingRequest] = useState(null)
  const [resolvedOutcome, setResolvedOutcome] = useState(null) // 'APPROVED' | 'REJECTED' | null
  const version = usePersonnelVersion()

  // Si la solicitud de ESTE modal se resuelve (aprobada/rechazada por otro usuario, via el
  // polling de apiSync.js) mientras el paso PENDING sigue abierto, mostrar el resultado en vez de
  // quedarse esperando indefinidamente (Cambio 7, 2026-08-25). Heuristica simple: si ya no esta
  // en getPendingMoves(), se resolvio; si la asignacion actual del empleado ya coincide con el
  // destino solicitado, fue aprobada, si no, fue rechazada.
  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza refresco cuando la solicitud se resuelve en otra pestaña/usuario, aunque no se lea dentro del callback
  useEffect(() => {
    if (step !== 'PENDING' || !pendingRequest) return
    const stillPending = getPendingMoves().some((p) => p.id === pendingRequest.id)
    if (stillPending) return
    const current = getCurrentAssignment(pendingRequest.employeeId)
    const approved =
      current &&
      current.areaId === pendingRequest.toAreaId &&
      current.stationId === pendingRequest.toStationId
    setResolvedOutcome(approved ? 'APPROVED' : 'REJECTED')
  }, [version, step, pendingRequest])

  useEffect(() => {
    setForm(emptyForm(fixedAreaId))
    setStep('FORM')
    setError('')
    setConflict(null)
    setResult(null)
    setPendingRequest(null)
    setResolvedOutcome(null)
  }, [fixedAreaId])

  const areaId = fixedAreaId || form.areaId
  const areaName = workCenterById(areaId)?.name || areaId
  const stations = useMemo(() => getWorkstationsForLine(areaId), [areaId])

  const employeeNumber = form.employee?.employeeNumber || form.employeeNumberTyped
  const needsName = !form.noNumber && employeeNumber.trim().length > 0 && !form.employee

  const canSubmit = form.noNumber
    ? form.name.trim() && form.stationId && areaId
    : employeeNumber.trim() && form.stationId && areaId && (!needsName || form.name.trim())

  const handleSearch = (selected, typedText) => {
    setForm((f) => ({
      ...f,
      employee: selected,
      employeeNumberTyped: selected ? selected.employeeNumber : typedText || '',
    }))
  }

  const handleToggleNoNumber = (checked) => {
    setForm((f) => ({
      ...f,
      noNumber: checked,
      employee: null,
      employeeNumberTyped: '',
      name: checked ? f.name : '',
    }))
  }

  const applyCheckInResult = (res) => {
    if (res.status === 'OK') {
      setResult({
        employee: res.employee,
        assignment: res.assignment,
        eventLabel: 'Entrada',
        eventTime: res.assignment.checkInAt,
      })
      setStep('SUCCESS')
      onDone?.()
    } else if (res.status === 'CONFLICT') {
      // Mismo empleado, misma área y misma forma de trabajo (estación) que ya tenía hoy: no es
      // una reasignación, solo se cuenta su asistencia de hoy (ya registrada desde su primer
      // check-in) — sin diálogo de confirmación, a peticion explicita del usuario. Cualquier otro
      // caso (otra área, o misma área con otra estación/forma de trabajo) SI es un cambio real y
      // pasa al panel de confirmación (step CONFLICT) para que quede claro que va a moverse.
      const sameSpot =
        res.assignment.areaId === areaId && res.assignment.stationId === form.stationId
      if (sameSpot) {
        const attendanceTime = res.attendance?.checkedInAt || res.assignment.checkInAt
        setResult({
          employee: res.employee,
          assignment: res.assignment,
          eventLabel: 'Asistencia',
          eventTime: attendanceTime,
          alreadyThere: true,
        })
        setStep('SUCCESS')
        onDone?.()
      } else {
        setConflict(res)
        setStep('CONFLICT')
      }
    } else if (res.status === 'STATION_FULL') {
      setError(res.message)
    } else if (res.status === 'NEEDS_NAME') {
      setError('Este número de empleado no está registrado. Captura su nombre para darlo de alta.')
    } else {
      setError(res.message || 'No se pudo registrar. Intenta de nuevo.')
    }
  }

  const handleConfirm = () => {
    if (submitting || !canSubmit) return
    setSubmitting(true)
    setError('')

    if (form.noNumber) {
      let employee
      try {
        employee = createEmployee({ employeeNumber: 'PROYECTO', name: form.name })
      } catch (e) {
        setError(e.message)
        setSubmitting(false)
        return
      }
      applyCheckInResult(
        checkInEmployee({
          employeeId: employee.id,
          areaId,
          stationId: form.stationId,
          shift: form.shift,
        }),
      )
      setSubmitting(false)
      return
    }

    applyCheckInResult(
      checkInEmployee({
        employeeId: form.employee?.id,
        employeeNumber,
        name: needsName ? form.name : undefined,
        areaId,
        stationId: form.stationId,
        shift: form.shift,
      }),
    )
    setSubmitting(false)
  }

  const handleMove = () => {
    if (submitting || !conflict) return
    setSubmitting(true)

    // Un LIDER nunca reubica de una vez: la solicitud queda pendiente
    // hasta que un SUPERVISOR/ADMINISTRADOR la aprueba (peticion
    // explicita del usuario). SUPERVISOR/ADMINISTRADOR siguen moviendo
    // de inmediato, igual que siempre.
    if (isLider) {
      const res = requestMove({
        employeeId: conflict.employee.id,
        toAreaId: areaId,
        toStationId: form.stationId,
        shift: form.shift,
        requestedByUserId: user?.id,
        requestedByName: user?.name,
      })
      if (res.status === 'PENDING') {
        setPendingRequest(res.request)
        setStep('PENDING')
        onDone?.()
      } else {
        setError(res.message || 'No se pudo enviar la solicitud.')
      }
      setSubmitting(false)
      return
    }

    const res = moveEmployee({
      employeeId: conflict.employee.id,
      toAreaId: areaId,
      toStationId: form.stationId,
      shift: form.shift,
    })
    if (res.status === 'OK') {
      setResult({
        employee: conflict.employee,
        assignment: res.assignment,
        eventLabel: 'Movido',
        eventTime: res.movedAt,
      })
      setStep('SUCCESS')
      onDone?.()
    } else {
      setError(res.message || 'No se pudo mover al empleado.')
    }
    setSubmitting(false)
  }

  const handleRegisterAnother = () => {
    setForm(emptyForm(fixedAreaId))
    setStep('FORM')
    setError('')
    setConflict(null)
    setResult(null)
    setPendingRequest(null)
    setResolvedOutcome(null)
  }

  if (step === 'CONFLICT' && conflict) {
    const sameArea = conflict.assignment.areaId === areaId
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[17px] font-extrabold">
          {conflict.employee.employeeNumber} — {conflict.employee.name}
        </p>
        <Alert className={cn(alertToneClass('warning'), 'py-1')}>
          {sameArea
            ? 'Ya está registrado hoy en esta misma área, pero con otra forma de trabajo. Esto lo va a cambiar de estación/rol dentro de la misma área, no solo a contar su asistencia.'
            : 'Ya está registrado hoy en otra área. Esto lo va a mover de área, no solo a contar su asistencia.'}
        </Alert>
        <div className="rounded-[20px] bg-black/[.04] p-3 dark:bg-white/[.08]">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">Actualmente hace</p>
          <p className="font-bold">
            {workCenterById(conflict.assignment.areaId)?.name || conflict.assignment.areaId} —{' '}
            {conflict.assignment.stationId}
          </p>
          <p className="text-[12.5px] text-muted-foreground">
            Entrada: {conflict.assignment.checkInAt}
          </p>
        </div>
        <div className="rounded-[20px] bg-black/[.04] p-3 dark:bg-white/[.08]">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">
            Va a pasar a hacer
          </p>
          <p className="font-bold">
            {areaName} — {form.stationId || '—'}
          </p>
        </div>
        {isLider && (
          <Alert className={cn(alertToneClass('info'), 'py-1')}>
            Como líder, este movimiento se enviará a un supervisor o administrador para su
            aprobación — no se aplica de inmediato.
          </Alert>
        )}
        {error && <Alert className={alertToneClass('error')}>{error}</Alert>}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel}>
            Mantener asignación actual
          </Button>
          <Button onClick={handleMove} disabled={submitting} className="font-bold">
            {isLider ? `Enviar para aprobación — ${areaName}` : `Confirmar cambio — ${areaName}`}
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'PENDING' && pendingRequest) {
    const resolved = resolvedOutcome != null
    const approved = resolvedOutcome === 'APPROVED'
    return (
      <div className="flex flex-col gap-4 pt-2 text-center">
        <div>
          {resolved ? (
            approved ? (
              <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-[#10B981]" />
            ) : (
              <Hourglass className="mx-auto mb-2 h-12 w-12 text-[#EF4444]" />
            )
          ) : (
            <Hourglass className="mx-auto mb-2 h-12 w-12 text-[#F59E0B]" />
          )}
          <p className="mb-4 text-[16px] font-extrabold">
            {resolved
              ? approved
                ? '✓ Movimiento aprobado'
                : '✕ Movimiento rechazado'
              : 'Movimiento enviado para aprobación'}
          </p>
          <p className="text-[18px] font-extrabold">
            {pendingRequest.employeeNumber} — {pendingRequest.employeeName}
          </p>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <span className={metricChipClass('info')}>
              {workCenterById(pendingRequest.toAreaId)?.name || pendingRequest.toAreaId}
            </span>
            <span className={metricChipClass('default')}>{pendingRequest.toStationId}</span>
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {resolved
              ? approved
                ? 'El cambio ya se aplicó.'
                : 'Se mantiene en su ubicación anterior.'
              : 'Un supervisor o administrador debe verificarlo antes de que se aplique.'}
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="ghost" onClick={handleRegisterAnother}>
            Registrar otro
          </Button>
          {onCancel && (
            <Button onClick={onCancel} className="font-bold">
              Cerrar
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (step === 'SUCCESS' && result) {
    return (
      <div className="flex flex-col gap-4 pt-2 text-center">
        <div>
          <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-[#10B981]" />
          <p className="mb-4 text-[16px] font-extrabold">
            {result.alreadyThere ? 'Ya registrada hoy' : 'Registro realizado'}
          </p>
          <p className="text-[18px] font-extrabold">
            {result.employee.employeeNumber} — {result.employee.name}
          </p>
          <div className="mt-2 flex items-center justify-center gap-1.5">
            <span className={metricChipClass('info')}>
              {workCenterById(result.assignment.areaId)?.name || result.assignment.areaId}
            </span>
            <span className={metricChipClass('default')}>{result.assignment.stationId}</span>
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {result.assignment.shift} · {result.eventLabel} {result.eventTime}
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="ghost" onClick={handleRegisterAnother}>
            Registrar otro
          </Button>
          {onCancel && (
            <Button onClick={onCancel} className="font-bold">
              Cerrar
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert className={alertToneClass('error')}>{error}</Alert>}

      {!form.noNumber && (
        <EmployeeSearchField autoFocus value={form.employee} onChange={handleSearch} />
      )}

      <div className="flex items-center gap-2">
        <Checkbox
          id="rpf-no-number"
          checked={form.noNumber}
          onCheckedChange={(checked) => handleToggleNoNumber(checked === true)}
        />
        <Label htmlFor="rpf-no-number" className="cursor-pointer">
          No tiene número de empleado
        </Label>
      </div>

      {form.noNumber && (
        <>
          <Alert className={cn(alertToneClass('info'), 'py-1')}>
            Se registrará como <b>PROYECTO</b> — se identifica por su nombre completo.
          </Alert>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rpf-name-no-number">Nombre completo</Label>
            <Input
              id="rpf-name-no-number"
              autoFocus
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
        </>
      )}

      {needsName && (
        <>
          <Alert className={cn(alertToneClass('warning'), 'py-1')}>
            Empleado {employeeNumber} no registrado — captura su nombre.
          </Alert>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rpf-name">Nombre completo</Label>
            <Input
              id="rpf-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
        </>
      )}

      {fixedAreaId ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rpf-area">Área / Línea</Label>
          <Input id="rpf-area" value={areaName} disabled />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rpf-area">Área / Línea</Label>
          <Select
            value={form.areaId}
            onValueChange={(v) => setForm((f) => ({ ...f, areaId: v, stationId: '' }))}
          >
            <SelectTrigger id="rpf-area">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORK_CENTERS.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rpf-station">Rol / Estación de hoy</Label>
        <Select
          value={form.stationId}
          onValueChange={(v) => setForm((f) => ({ ...f, stationId: v }))}
        >
          <SelectTrigger id="rpf-station">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stations.map((s) => {
              const occ = getStationOccupancy(areaId, s.name)
              const compatible = form.employee ? hasSkill(form.employee.id, s.name) : false
              return (
                <SelectItem key={s.id} value={s.name} disabled={occ.isFull}>
                  {s.name} ({occ.count}/{occ.capacity}){occ.isFull ? ' — completa' : ''}
                  {compatible ? ' ✓ habilidad' : ''}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rpf-shift">Turno</Label>
        <Select value={form.shift} onValueChange={(v) => setForm((f) => ({ ...f, shift: v }))}>
          <SelectTrigger id="rpf-shift">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHIFT_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        <Button onClick={handleConfirm} disabled={!canSubmit || submitting} className="font-bold">
          Confirmar registro
        </Button>
      </div>
    </div>
  )
}
