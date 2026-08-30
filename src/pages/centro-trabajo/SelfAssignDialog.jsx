import { CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('centroTrabajo')
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
      setError(t('selfAssignDialog.conflictError'))
    } else {
      setError(res.message || t('selfAssignDialog.genericError'))
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
              <p className="mb-4 text-base font-extrabold">{t('selfAssignDialog.successTitle')}</p>
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
                {t('selfAssignDialog.checkInLine', { checkInAt: result.assignment.checkInAt })}
              </p>
            </div>
            <div className="flex justify-center px-6 pb-5">
              <Button onClick={handleClose} className="font-bold">
                {t('selfAssignDialog.closeButton')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('selfAssignDialog.dialogTitle')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 px-6 pb-2 pt-1">
              <EmployeeSearchField
                autoFocus
                value={employee}
                onChange={handleSearch}
                label={t('selfAssignDialog.employeeSearchLabel')}
              />

              {notFoundNumber && !employee && (
                <Alert className={alertToneClass('warning')}>
                  {t('selfAssignDialog.notFoundMessage', { notFoundNumber })}
                </Alert>
              )}

              {employee && currentAssignment && (
                <Alert className={alertToneClass('info')}>
                  <p className="font-extrabold">{t('selfAssignDialog.hasAssignmentTitle')}</p>
                  {workCenterById(currentAssignment.areaId)?.name} — {currentAssignment.stationId} ·{' '}
                  {t('selfAssignDialog.hasAssignmentCheckIn', {
                    checkInAt: currentAssignment.checkInAt,
                  })}
                  <br />
                  {t('selfAssignDialog.supervisorHelpMessage')}
                </Alert>
              )}

              {employee && !currentAssignment && (
                <>
                  <Alert className={cn(alertToneClass('info'), 'py-1')}>
                    {t('selfAssignDialog.noAssignmentYetMessage')}
                  </Alert>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="self-assign-area">{t('selfAssignDialog.areaLabel')}</Label>
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
                      <p className="font-extrabold">{t('selfAssignDialog.lineFullTitle')}</p>
                      {t('selfAssignDialog.lineFullMessage', {
                        areaName: workCenterById(areaId)?.name,
                      })}
                    </Alert>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="self-assign-station">
                        {t('selfAssignDialog.stationLabel')}
                      </Label>
                      <Select value={stationId} onValueChange={(v) => setStationId(v)}>
                        <SelectTrigger id="self-assign-station">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStations.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}{' '}
                              {hasSkill(employee.id, s.name)
                                ? t('selfAssignDialog.compatibleSkillSuffix')
                                : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {stationId && !skillOk && (
                    <Alert className={alertToneClass('warning')}>
                      {t('selfAssignDialog.skillMismatchBase')}
                      {STRICT_SKILL_VALIDATION
                        ? ''
                        : t('selfAssignDialog.skillMismatchContinueSuffix')}
                      .
                    </Alert>
                  )}

                  {error && <Alert className={alertToneClass('error')}>{error}</Alert>}
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
              <Button variant="ghost" onClick={handleClose}>
                {t('selfAssignDialog.cancelButton')}
              </Button>
              {employee && !currentAssignment && (
                <Button
                  onClick={handleConfirm}
                  disabled={!stationId || submitting || (STRICT_SKILL_VALIDATION && !skillOk)}
                  className="font-bold"
                >
                  {t('selfAssignDialog.confirmButton')}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
