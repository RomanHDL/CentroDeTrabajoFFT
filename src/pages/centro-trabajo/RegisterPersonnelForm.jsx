import { CheckCircle2, ChevronRight, Clock, Hourglass, LayoutGrid } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  findOrCreateNoNumberEmployee,
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
  getCurrentShift,
  OFFICIAL_SHIFTS,
  SHIFT_OPTIONS,
  WORK_CENTERS,
  workCenterById,
} from '../../data/production/catalog'
import { useAreaGroup } from '../../data/production/useAreaGroup'
import { useAuth } from '../../state/auth'
import EmployeeSearchField from './EmployeeSearchField'
import {
  DEFAULT_LINE_FAMILY_AREA_ID,
  getLineOptions,
  getPrimaryAreaId,
  getPrimaryAreaOptions,
  isLineFamilyArea,
  LINE_FAMILY_GROUP_ID,
} from './registerPersonnelAreas'
import StationPickerDialog from './StationPickerDialog'

const emptyForm = (fixedAreaId) => ({
  employee: null,
  employeeNumberTyped: '',
  name: '',
  noNumber: false,
  areaId: fixedAreaId || WORK_CENTERS[0].id,
  stationId: '',
})

/* Turno automático (2026-09-14, a petición explícita del usuario -- "usar la lógica que ya
   existe, no duplicarla"): getCurrentShift() (catalog.js) YA calcula el turno real según la hora
   del sistema -- se reutiliza tal cual, sin repetir el cálculo aquí. Lo único nuevo es este
   puente de vocabulario: el valor que este formulario siempre guardó en DailyAssignment.shift es
   uno de SHIFT_OPTIONS (Matutino/Vespertino/Nocturno -- contrato existente que NO se toca, lo
   sigue leyendo dashboardMetrics.js), mientras que getCurrentShift() devuelve las 3 etiquetas
   OFICIALES (Matutino/Tiempo extra/Noche). Se mapean por POSICIÓN (mismos 3 tramos horarios, en
   el mismo orden en ambos arreglos) para no inventar un vocabulario nuevo ni duplicar el cálculo
   de hora -- nunca se elige a mano cuál corresponde a cuál. */
function getAutomaticShiftValue() {
  const index = OFFICIAL_SHIFTS.findIndex((s) => s.id === getCurrentShift().id)
  return SHIFT_OPTIONS[index] || CURRENT_SHIFT
}

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
  cancelLabel,
}) {
  const { t } = useTranslation('centroTrabajo')
  const resolvedCancelLabel = cancelLabel ?? t('registerPersonnelForm.cancelButton')
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
  const [stationPickerOpen, setStationPickerOpen] = useState(false)

  // Selector "Área / Línea" agrupado (2026-09-14, a peticion explicita del usuario, viendo el
  // layout fisico real de FFT): SOLO reemplaza el <Select> plano cuando el grupo activo es FFT y
  // el area no viene ya fija -- en Sorting, o con fixedAreaId, se sigue usando exactamente el
  // <Select> de siempre sobre WORK_CENTERS completo (ver registerPersonnelAreas.js).
  const isFft = useAreaGroup() === 'FFT'
  const useGroupedAreaPicker = isFft && !fixedAreaId
  const primaryAreaOptions = useGroupedAreaPicker
    ? getPrimaryAreaOptions(t('registerPersonnelForm.lineFamilyAreaOption'))
    : []
  const primaryAreaId = getPrimaryAreaId(areaId)
  const showLineSelect = useGroupedAreaPicker && isLineFamilyArea(areaId)
  const lineOptions = showLineSelect ? getLineOptions() : []
  // Migas de pan del picker de estación: cuando el área elegida es la familia de líneas, el
  // primer nivel debe mostrar el grupo ("WC Líneas de producción (FFT)"), no el nombre de la
  // línea especifica (ese va en el segundo nivel) -- `areaName` (arriba) sigue usándose tal cual
  // en el resto del formulario (paneles de conflicto, etc.), donde SI debe ser la línea real.
  const stationPickerAreaName = showLineSelect
    ? t('registerPersonnelForm.lineFamilyAreaOption')
    : areaName
  const stationPickerLineName = showLineSelect ? areaName : null

  const handlePrimaryAreaChange = (nextPrimaryId) => {
    const nextAreaId =
      nextPrimaryId === LINE_FAMILY_GROUP_ID ? DEFAULT_LINE_FAMILY_AREA_ID : nextPrimaryId
    setForm((f) => ({ ...f, areaId: nextAreaId, stationId: '' }))
  }

  const handleLineChange = (nextAreaId) => {
    setForm((f) => ({ ...f, areaId: nextAreaId, stationId: '' }))
  }

  // Estaciones enriquecidas con ocupacion/compatibilidad, mismas funciones de siempre
  // (getStationOccupancy/hasSkill) -- se recalculan en cada render (reactivas a `version`, igual
  // que antes) para que la ventana de Rol/Estación siempre muestre cupo actualizado.
  const stationOptions = stations.map((s) => {
    const occ = getStationOccupancy(areaId, s.name)
    return {
      id: s.id,
      name: s.name,
      count: occ.count,
      capacity: occ.capacity,
      isFull: occ.isFull,
      compatible: form.employee ? hasSkill(form.employee.id, s.name) : false,
    }
  })

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
        eventLabel: t('registerPersonnelForm.eventLabelEntrada'),
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
          eventLabel: t('registerPersonnelForm.eventLabelAsistencia'),
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
      setError(t('registerPersonnelForm.needsNameError'))
    } else {
      setError(res.message || t('registerPersonnelForm.genericCheckInError'))
    }
  }

  const handleConfirm = () => {
    if (submitting || !canSubmit) return
    setSubmitting(true)
    setError('')

    // Turno automatico (ver getAutomaticShiftValue arriba) calculado justo al confirmar, nunca
    // guardado en el estado del formulario -- asi siempre refleja la hora real al momento del
    // registro, aunque el formulario haya quedado abierto un rato.
    const shift = getAutomaticShiftValue()

    if (form.noNumber) {
      let employee
      try {
        employee = findOrCreateNoNumberEmployee(form.name)
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
          shift,
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
        shift,
      }),
    )
    setSubmitting(false)
  }

  const handleMove = async () => {
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
        shift: getAutomaticShiftValue(),
        requestedByUserId: user?.id,
        requestedByName: user?.name,
      })
      if (res.status === 'PENDING') {
        setPendingRequest(res.request)
        setStep('PENDING')
        onDone?.()
      } else {
        setError(res.message || t('registerPersonnelForm.requestFailedError'))
      }
      setSubmitting(false)
      return
    }

    const res = await moveEmployee({
      employeeId: conflict.employee.id,
      toAreaId: areaId,
      toStationId: form.stationId,
      shift: getAutomaticShiftValue(),
    })
    if (res.status === 'OK') {
      setResult({
        employee: conflict.employee,
        assignment: res.assignment,
        eventLabel: t('registerPersonnelForm.eventLabelMovido'),
        eventTime: res.movedAt,
      })
      setStep('SUCCESS')
      onDone?.()
    } else {
      setError(res.message || t('registerPersonnelForm.moveFailedError'))
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
          {t('registerPersonnelForm.employeeHeader', {
            employeeNumber: conflict.employee.employeeNumber,
            name: conflict.employee.name,
          })}
        </p>
        <Alert className={cn(alertToneClass('warning'), 'py-1')}>
          {sameArea
            ? t('registerPersonnelForm.conflictSameAreaMessage')
            : t('registerPersonnelForm.conflictDifferentAreaMessage')}
        </Alert>
        <div className="rounded-[20px] bg-black/[.04] p-3 dark:bg-white/[.08]">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">
            {t('registerPersonnelForm.currentlyDoingLabel')}
          </p>
          <p className="font-bold">
            {workCenterById(conflict.assignment.areaId)?.name || conflict.assignment.areaId} —{' '}
            {conflict.assignment.stationId}
          </p>
          <p className="text-[12.5px] text-muted-foreground">
            {t('registerPersonnelForm.entryTimeLabel', {
              checkInAt: conflict.assignment.checkInAt,
            })}
          </p>
        </div>
        <div className="rounded-[20px] bg-black/[.04] p-3 dark:bg-white/[.08]">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">
            {t('registerPersonnelForm.willDoLabel')}
          </p>
          <p className="font-bold">
            {areaName} — {form.stationId || '—'}
          </p>
        </div>
        {isLider && (
          <Alert className={cn(alertToneClass('info'), 'py-1')}>
            {t('registerPersonnelForm.liderMoveNotice')}
          </Alert>
        )}
        {error && <Alert className={alertToneClass('error')}>{error}</Alert>}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="ghost" onClick={onCancel}>
            {t('registerPersonnelForm.keepCurrentButton')}
          </Button>
          <Button onClick={handleMove} disabled={submitting} className="font-bold">
            {isLider
              ? t('registerPersonnelForm.sendForApprovalButton', { areaName })
              : t('registerPersonnelForm.confirmChangeButton', { areaName })}
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
                ? t('registerPersonnelForm.moveApprovedTitle')
                : t('registerPersonnelForm.moveRejectedTitle')
              : t('registerPersonnelForm.moveSentTitle')}
          </p>
          <p className="text-[18px] font-extrabold">
            {t('registerPersonnelForm.employeeHeader', {
              employeeNumber: pendingRequest.employeeNumber,
              name: pendingRequest.employeeName,
            })}
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
                ? t('registerPersonnelForm.changeAppliedMessage')
                : t('registerPersonnelForm.keptPreviousLocationMessage')
              : t('registerPersonnelForm.pendingVerificationMessage')}
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="ghost" onClick={handleRegisterAnother}>
            {t('registerPersonnelForm.registerAnotherButton')}
          </Button>
          {onCancel && (
            <Button onClick={onCancel} className="font-bold">
              {t('registerPersonnelForm.closeButton')}
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
            {result.alreadyThere
              ? t('registerPersonnelForm.alreadyRegisteredTitle')
              : t('registerPersonnelForm.registrationDoneTitle')}
          </p>
          <p className="text-[18px] font-extrabold">
            {t('registerPersonnelForm.employeeHeader', {
              employeeNumber: result.employee.employeeNumber,
              name: result.employee.name,
            })}
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
            {t('registerPersonnelForm.registerAnotherButton')}
          </Button>
          {onCancel && (
            <Button onClick={onCancel} className="font-bold">
              {t('registerPersonnelForm.closeButton')}
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
        <EmployeeSearchField
          autoFocus
          value={form.employee}
          onChange={handleSearch}
          restrictToExactMatch={isLider}
        />
      )}

      <div className="flex items-center gap-2">
        <Checkbox
          id="rpf-no-number"
          checked={form.noNumber}
          onCheckedChange={(checked) => handleToggleNoNumber(checked === true)}
        />
        <Label htmlFor="rpf-no-number" className="cursor-pointer">
          {t('registerPersonnelForm.noNumberCheckboxLabel')}
        </Label>
      </div>

      {form.noNumber && (
        <>
          <Alert className={cn(alertToneClass('info'), 'py-1')}>
            {t('registerPersonnelForm.noNumberAlertPrefix')} <b>PROYECTO</b>{' '}
            {t('registerPersonnelForm.noNumberAlertSuffix')}
          </Alert>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rpf-name-no-number">{t('registerPersonnelForm.fullNameLabel')}</Label>
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
            {t('registerPersonnelForm.employeeNotRegisteredMessage', { employeeNumber })}
          </Alert>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rpf-name">{t('registerPersonnelForm.fullNameLabel')}</Label>
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
          <Label htmlFor="rpf-area">{t('registerPersonnelForm.areaFieldLabel')}</Label>
          <Input id="rpf-area" value={areaName} disabled />
        </div>
      ) : useGroupedAreaPicker ? (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rpf-area">{t('registerPersonnelForm.areaFieldLabel')}</Label>
            <Select value={primaryAreaId} onValueChange={handlePrimaryAreaChange}>
              <SelectTrigger id="rpf-area" className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {primaryAreaOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Subselector "Línea" (2026-09-14, a peticion explicita del usuario): solo aparece
              cuando el area elegida es "WC Líneas de producción (FFT)" -- ver
              registerPersonnelAreas.js. `areaId` sigue siendo siempre el id real (LINEA1..10,
              PROYECTO) que ya esperaba el backend, el agrupamiento es solo de interfaz. */}
          {showLineSelect && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rpf-line">{t('registerPersonnelForm.lineFieldLabel')}</Label>
              <Select value={areaId} onValueChange={handleLineChange}>
                <SelectTrigger id="rpf-line" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lineOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rpf-area">{t('registerPersonnelForm.areaFieldLabel')}</Label>
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

      {/* Campo "Rol / Estación de hoy" (2026-09-14, a peticion explicita del usuario -- "ya no
          quiero el dropdown tradicional... quiero que el campo abra una ventana flotante
          sencilla"): reemplaza la cuadricula que antes vivia siempre visible aqui mismo (2026-
          09-11) por un campo clickeable que abre StationPickerDialog con esa misma cuadricula
          adentro -- mismo dato/comportamiento de siempre (form.stationId sigue siendo el nombre
          del puesto, mismas funciones getStationOccupancy/hasSkill), solo cambia DONDE se ve. */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rpf-station">{t('registerPersonnelForm.stationLabel')}</Label>
        <button
          id="rpf-station"
          type="button"
          onClick={() => setStationPickerOpen(true)}
          className="flex h-11 w-full items-center gap-2.5 rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LayoutGrid className="h-4 w-4 shrink-0 opacity-60" />
          <span className={cn('flex-1 truncate', !form.stationId && 'text-muted-foreground')}>
            {form.stationId || t('registerPersonnelForm.stationTriggerPlaceholder')}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </div>

      <StationPickerDialog
        open={stationPickerOpen}
        onClose={() => setStationPickerOpen(false)}
        areaName={stationPickerAreaName}
        lineName={stationPickerLineName}
        stations={stationOptions}
        value={form.stationId}
        onConfirm={(stationId) => setForm((f) => ({ ...f, stationId }))}
      />

      {/* Turno automático (2026-09-14, a peticion explicita del usuario -- "el turno debe
          determinarse automáticamente... NO quiero que el usuario seleccione manualmente"):
          reemplaza el <Select> manual de SHIFT_OPTIONS por un indicador de solo lectura, usando
          la MISMA logica de deteccion por hora que ya existe (getCurrentShift, catalog.js). */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rpf-shift">{t('registerPersonnelForm.shiftLabel')}</Label>
        <div
          id="rpf-shift"
          className="flex h-11 w-full items-center gap-2.5 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-foreground"
        >
          <Clock className="h-4 w-4 shrink-0 opacity-60" />
          <span className="font-semibold">{getCurrentShift().label}</span>
          <span className="text-muted-foreground">
            · {t('registerPersonnelForm.shiftAutomaticSuffix')}
          </span>
        </div>
        <p className="text-[11.5px] text-muted-foreground">
          {t('registerPersonnelForm.shiftAutomaticHint')}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="w-full sm:w-auto">
            {resolvedCancelLabel}
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          disabled={!canSubmit || submitting}
          className="w-full font-bold sm:w-auto"
        >
          {t('registerPersonnelForm.confirmRegistrationButton')}
        </Button>
      </div>
    </div>
  )
}
