import { CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { STRICT_SKILL_VALIDATION } from '../../data/personnel/config'
import {
  checkInEmployee,
  getCurrentAssignment,
  getLineCapacitySummary,
  getLineWorkstationsWithOccupancy,
  hasSkill,
} from '../../data/personnel/repository'
import { CURRENT_SHIFT, WORK_CENTERS, workCenterById } from '../../data/production/catalog'
import EmployeeSearchField from './EmployeeSearchField'

/**
 * Flujo de autoasignacion (el propio empleado usa la
 * tablet). NUNCA mueve a alguien que ya tiene asignacion —
 * eso requiere un supervisor. Solo ofrece estaciones
 * realmente disponibles (respeta capacidad).
 */
export default function SelfAssignDialog({ open, onClose, fixedAreaId = null, onDone }) {
  const [employee, setEmployee] = useState(null)
  const [notFoundNumber, setNotFoundNumber] = useState('')
  const [areaId, setAreaId] = useState(fixedAreaId || WORK_CENTERS[0].id)
  const [stationId, setStationId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const currentAssignment = useMemo(
    () => (employee ? getCurrentAssignment(employee.id) : null),
    [employee],
  )
  // `open`/`result` fuerzan recalcular ocupacion/capacidad cuando el dialogo
  // se reabre o justo despues de un registro exitoso, aunque no se lean
  // dentro del callback -- comportamiento original preservado tal cual (ver
  // mismo patron en LineHistoryDialog.jsx).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const lineCapacity = useMemo(() => getLineCapacitySummary(areaId), [areaId, open, result])
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const workstations = useMemo(
    () => getLineWorkstationsWithOccupancy(areaId),
    [areaId, open, result],
  )
  const availableStations = workstations.filter((w) => w.isAvailable)
  const skillOk = employee && stationId ? hasSkill(employee.id, stationId) : true

  const reset = () => {
    setEmployee(null)
    setNotFoundNumber('')
    setAreaId(fixedAreaId || WORK_CENTERS[0].id)
    setStationId('')
    setError('')
    setResult(null)
  }

  const handleSearch = (selected, typedText) => {
    setError('')
    if (selected) {
      setEmployee(selected)
      setNotFoundNumber('')
    } else {
      setEmployee(null)
      setNotFoundNumber(typedText || '')
    }
  }

  const handleConfirm = () => {
    if (submitting || !employee || !stationId) return
    setSubmitting(true)
    setError('')
    const res = checkInEmployee({
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      areaId,
      stationId,
      shift: CURRENT_SHIFT,
    })
    setSubmitting(false)
    if (res.status === 'OK') {
      setResult(res)
      onDone?.()
    } else if (res.status === 'STATION_FULL') {
      setError(res.message)
    } else if (res.status === 'CONFLICT') {
      setError('Ya tienes una asignación registrada hoy.')
    } else {
      setError(res.message || 'No se pudo completar el registro.')
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent>
        {result ? (
          <>
            <div className="px-6 pb-4 pt-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-[#10B981]" />
              <p className="mb-4 text-base font-extrabold">Registro realizado</p>
              <p className="text-lg font-extrabold">
                {result.employee.employeeNumber} — {result.employee.name}
              </p>
              <div className="mt-2 flex flex-row justify-center gap-1.5">
                <span className={metricChipClass('info')}>
                  {workCenterById(result.assignment.areaId)?.name}
                </span>
                <span className={metricChipClass('default')}>{result.assignment.stationId}</span>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                Entrada: {result.assignment.checkInAt}
              </p>
            </div>
            <div className="flex justify-center px-6 pb-5">
              <Button onClick={handleClose} className="font-bold">
                Cerrar
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Registrarme / Autoasignarme</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 px-6 pb-2 pt-1">
              <EmployeeSearchField
                autoFocus
                value={employee}
                onChange={handleSearch}
                label="Tu número o nombre"
              />

              {notFoundNumber && !employee && (
                <Alert className={alertToneClass('warning')}>
                  No encontramos a "{notFoundNumber}". Pide a tu supervisor que te dé de alta.
                </Alert>
              )}

              {employee && currentAssignment && (
                <Alert className={alertToneClass('info')}>
                  <p className="font-extrabold">Ya tienes una asignación</p>
                  {workCenterById(currentAssignment.areaId)?.name} — {currentAssignment.stationId} ·
                  Entrada {currentAssignment.checkInAt}
                  <br />
                  Solicita apoyo de un supervisor si necesitas cambiar.
                </Alert>
              )}

              {employee && !currentAssignment && (
                <>
                  <Alert className={cn(alertToneClass('info'), 'py-1')}>
                    Hoy todavía no tienes asignación.
                  </Alert>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="self-assign-area">Línea / Área</Label>
                    <Select
                      value={areaId}
                      disabled={Boolean(fixedAreaId)}
                      onValueChange={(v) => {
                        setAreaId(v)
                        setStationId('')
                      }}
                    >
                      <SelectTrigger id="self-assign-area">
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

                  {lineCapacity.isFull ? (
                    <Alert className={alertToneClass('warning')}>
                      <p className="font-extrabold">LÍNEA COMPLETA</p>
                      Actualmente no hay estaciones disponibles en {workCenterById(areaId)?.name}.
                      Consulta con tu supervisor o elige otra línea.
                    </Alert>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="self-assign-station">Puesto disponible</Label>
                      <Select value={stationId} onValueChange={(v) => setStationId(v)}>
                        <SelectTrigger id="self-assign-station">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStations.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}{' '}
                              {hasSkill(employee.id, s.name)
                                ? '· compatible con tus habilidades'
                                : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {stationId && !skillOk && (
                    <Alert className={alertToneClass('warning')}>
                      No tienes este rol registrado como habilidad
                      {STRICT_SKILL_VALIDATION ? '' : ', pero puedes continuar'}.
                    </Alert>
                  )}

                  {error && <Alert className={alertToneClass('error')}>{error}</Alert>}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
              <Button variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              {employee && !currentAssignment && (
                <Button
                  onClick={handleConfirm}
                  disabled={!stationId || submitting || (STRICT_SKILL_VALIDATION && !skillOk)}
                  className="font-bold"
                >
                  Asignarme aquí
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
