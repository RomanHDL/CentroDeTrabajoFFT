import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  alertSuccessClass,
  alertToneClass,
  emptyTextClass,
  metricChipClass,
  sectionTitleClass,
} from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import {
  getAbsentEmployeeIds,
  getAssignmentHistory,
  getCurrentAssignment,
  getLateEmployeeIds,
  getMovementsForEmployee,
  getSkillsForEmployee,
  releaseAssignment,
  setAttendanceStatus,
  todayISO,
} from '../../data/personnel/repository'
import { workCenterById } from '../../data/production/catalog'
import { useRoleMode } from '../../state/roleMode'
import { EmptyState } from '../../ui'
import EmployeeAvatar from './EmployeeAvatar'
import MoveConfirmDialog from './MoveConfirmDialog'

function areaLabel(id) {
  return workCenterById(id)?.name || id || '—'
}

export default function EmployeeHistoryDialog({ employee, open, onClose, onChanged }) {
  const { t } = useTranslation('centroTrabajo')
  const MOVEMENT_LABEL = {
    CHECK_IN: t('employeeHistoryDialog.checkInLabel'),
    MOVE: t('employeeHistoryDialog.movementMove'),
    RELEASE: t('employeeHistoryDialog.movementRelease'),
  }
  const { isSupervisor } = useRoleMode()
  const today = todayISO()
  const [moveOpen, setMoveOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  // "Marcar falta" (2026-09-15, a peticion explicita del usuario) -- SEPARADO a proposito de
  // moveOpen/handleRelease: `attendanceConfirm` guarda el status pendiente de confirmar
  // ('AUSENTE'|'PRESENTE'), nunca reutiliza la accion de Liberar. `attendanceError` es local a
  // este mini-dialogo (no usa el Alert de arriba, que es para feedback de exito).
  const [attendanceConfirm, setAttendanceConfirm] = useState(null)
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false)
  const [attendanceError, setAttendanceError] = useState('')

  // `open`/`feedback` fuerzan refrescar estos datos cada vez que el dialogo se
  // reabre o cambia el feedback (tras liberar/mover), aunque no se lean dentro
  // del callback -- comportamiento original preservado tal cual (mismo criterio
  // que LineHistoryDialog.jsx).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const currentAssignment = useMemo(
    () => (employee ? getCurrentAssignment(employee.id) : null),
    [employee, open, feedback],
  )
  // Asistencia de HOY (2026-09-15, "Marcar falta") -- consulta real, separada por completo de
  // currentAssignment: la persona puede estar ASIGNADA + FALTA al mismo tiempo, nunca se
  // excluyen (ver getAbsentEmployeeIds/getLateEmployeeIds, repository.js).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba de currentAssignment
  const isAbsentToday = useMemo(
    () => Boolean(employee) && getAbsentEmployeeIds().includes(employee.id),
    [employee, open, feedback],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba de currentAssignment
  const isLateToday = useMemo(
    () => Boolean(employee) && getLateEmployeeIds().includes(employee.id),
    [employee, open, feedback],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const skills = useMemo(
    () => (employee ? getSkillsForEmployee(employee.id) : []),
    [employee, open],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const todaysMovements = useMemo(
    () => (employee ? getMovementsForEmployee(employee.id, today) : []),
    [employee, today, open, feedback],
  )
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const pastAssignments = useMemo(
    () => (employee ? getAssignmentHistory(employee.id).filter((a) => a.date !== today) : []),
    [employee, today, open],
  )

  if (!employee) return null

  const handleRelease = () => {
    const res = releaseAssignment(employee.id)
    if (res.status === 'OK') {
      setFeedback(t('employeeHistoryDialog.releaseFeedback'))
      onChanged?.()
    }
  }

  // "Marcar falta"/"Quitar falta" (2026-09-15) -- DELIBERADAMENTE async/esperado (mismo criterio
  // que setEmployeeUnassignedReason en PersonalSinAsignarTab.jsx): nunca toca currentAssignment,
  // solo la asistencia de hoy. Si el servidor rechaza, se muestra el error real aqui mismo (nunca
  // un estado fantasma que un poll corrija despues en silencio).
  const handleConfirmAttendance = async () => {
    const status = attendanceConfirm
    setAttendanceSubmitting(true)
    setAttendanceError('')
    try {
      await setAttendanceStatus(employee, status)
      setFeedback(
        status === 'AUSENTE'
          ? t('employeeHistoryDialog.markAbsentFeedback')
          : t('employeeHistoryDialog.unmarkAbsentFeedback'),
      )
      setAttendanceConfirm(null)
      onChanged?.()
    } catch (e) {
      setAttendanceError(e.message || t('employeeHistoryDialog.markAbsentErrorFallback'))
    } finally {
      setAttendanceSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[600px]">
        <div className="flex items-center gap-3 px-6 py-4">
          <EmployeeAvatar employee={employee} size={44} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="font-extrabold">
                {employee.employeeNumber} — {employee.name}
              </DialogTitle>
              {isAbsentToday && (
                <span className={metricChipClass('bad')}>
                  {t('employeeHistoryDialog.absentTodayBadge')}
                </span>
              )}
              {!isAbsentToday && isLateToday && (
                <span className={metricChipClass('warn')}>
                  {t('employeeHistoryDialog.lateTodayBadge')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentAssignment
                ? `${areaLabel(currentAssignment.areaId)} · ${currentAssignment.stationId}`
                : t('employeeHistoryDialog.noCurrentAssignment')}
            </p>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto border-y border-border px-6 py-4">
          {feedback && (
            <Alert className={cn(alertSuccessClass(), 'mb-4 pr-9')}>
              {feedback}
              <button
                type="button"
                onClick={() => setFeedback('')}
                className="absolute right-2 top-2 rounded-full p-1 hover:bg-black/[.06] dark:hover:bg-white/[.08]"
              >
                <X className="h-4 w-4" />
              </button>
            </Alert>
          )}

          {currentAssignment && (
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
              <div>
                <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                  {t('employeeHistoryDialog.currentLocationLabel')}
                </p>
                <p className="font-bold">
                  {areaLabel(currentAssignment.areaId)} · {currentAssignment.stationId}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase text-muted-foreground">
                  {t('employeeHistoryDialog.checkInLabel')}
                </p>
                <p className="font-bold">{currentAssignment.checkInAt}</p>
              </div>
            </div>
          )}

          <p className={cn(sectionTitleClass, 'mb-2 text-[13px]')}>
            {t('employeeHistoryDialog.skillsTitle')}
          </p>
          {skills.length === 0 ? (
            <p className={cn(emptyTextClass, 'py-3 text-left')}>
              {t('employeeHistoryDialog.noSkillsMessage')}
            </p>
          ) : (
            <div className="mb-4 flex flex-wrap gap-x-1.5 gap-y-1.5">
              {skills.map((s) => (
                <span key={s.id} className={metricChipClass('info')}>
                  {s.stationName}
                </span>
              ))}
            </div>
          )}

          <p className={cn(sectionTitleClass, 'mb-2 mt-4 text-[13px]')}>
            {t('employeeHistoryDialog.todayHistoryTitle')}
          </p>
          {todaysMovements.length === 0 ? (
            <EmptyState
              compact
              title={t('employeeHistoryDialog.noMovementsTitle')}
              description={t('employeeHistoryDialog.noMovementsDescription')}
            />
          ) : (
            <div className="mb-4 flex flex-col gap-2">
              {todaysMovements.map((m) => (
                <div
                  key={m.id}
                  className="flex gap-3 rounded-[20px] bg-black/[.04] p-[8.8px] dark:bg-white/[.08]"
                >
                  <p className="min-w-[44px] text-[13px] font-extrabold">{m.movedAt}</p>
                  <div>
                    <p className="text-[13px] font-bold">{MOVEMENT_LABEL[m.type] || m.type}</p>
                    <p className="text-[12.5px] text-muted-foreground">
                      {m.fromAreaId
                        ? `${areaLabel(m.fromAreaId)} / ${m.fromStationId} → ${m.toAreaId ? `${areaLabel(m.toAreaId)} / ${m.toStationId}` : t('employeeHistoryDialog.noAssignment')}`
                        : `${areaLabel(m.toAreaId)} · ${m.toStationId}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className={cn(sectionTitleClass, 'mb-2 mt-4 text-[13px]')}>
            {t('employeeHistoryDialog.pastDaysTitle')}
          </p>
          {pastAssignments.length === 0 ? (
            <EmptyState
              compact
              title={t('employeeHistoryDialog.noPastHistoryTitle')}
              description={t('employeeHistoryDialog.noPastHistoryDescription')}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {pastAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex gap-3 rounded-[20px] border border-border p-[8.8px]"
                >
                  <p className="min-w-[60px] text-[13px] font-extrabold">
                    {dayjs(a.date).format('DD/MM')}
                  </p>
                  <div>
                    <p className="text-[13px] font-bold">{areaLabel(a.areaId)}</p>
                    <p className="text-[12.5px] text-muted-foreground">{a.stationId}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 px-6 py-4">
          {isSupervisor && currentAssignment && (
            <>
              {/* "Marcar falta"/"Quitar falta" (2026-09-15) -- accion independiente a proposito,
                  NUNCA reutiliza handleRelease: no toca currentAssignment, solo la asistencia de
                  hoy (ver comentario grande de setAttendanceStatus, repository.js). */}
              <Button
                variant="outline"
                onClick={() => setAttendanceConfirm(isAbsentToday ? 'PRESENTE' : 'AUSENTE')}
                className={cn(
                  'font-bold',
                  isAbsentToday ? 'text-emerald-600 hover:text-emerald-600' : 'text-red-600 hover:text-red-600',
                )}
              >
                {isAbsentToday
                  ? t('employeeHistoryDialog.unmarkAbsentButton')
                  : t('employeeHistoryDialog.markAbsentButton')}
              </Button>
              <Button
                variant="ghost"
                onClick={handleRelease}
                className="font-bold text-destructive hover:text-destructive"
              >
                {t('employeeHistoryDialog.releaseButton')}
              </Button>
              <Button variant="outline" onClick={() => setMoveOpen(true)} className="font-bold">
                {t('employeeHistoryDialog.moveButton')}
              </Button>
            </>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            {t('employeeHistoryDialog.closeButton')}
          </Button>
        </div>
      </DialogContent>

      <MoveConfirmDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        employee={employee}
        currentAssignment={currentAssignment}
        onDone={() => {
          setFeedback(t('employeeHistoryDialog.moveFeedback'))
          onChanged?.()
        }}
      />

      {/* Confirmacion de "Marcar falta"/"Quitar falta" (2026-09-15) -- dialogo simple, sin
          seleccion de destino (a diferencia de MoveConfirmDialog): solo confirma un cambio de
          asistencia, la asignacion mostrada abajo nunca cambia. */}
      <Dialog
        open={Boolean(attendanceConfirm)}
        onOpenChange={(next) => !next && setAttendanceConfirm(null)}
      >
        <DialogContent className="max-w-[440px]">
          <div className="px-6 py-4">
            <DialogTitle className="font-extrabold">
              {attendanceConfirm === 'AUSENTE'
                ? t('employeeHistoryDialog.markAbsentConfirmTitle')
                : t('employeeHistoryDialog.unmarkAbsentConfirmTitle')}
            </DialogTitle>
          </div>
          <div className="border-y border-border px-6 py-4">
            <div className="mb-3 flex items-center gap-2.5">
              <EmployeeAvatar employee={employee} size={36} />
              <div>
                <p className="text-[13px] font-bold">{employee.name}</p>
                {currentAssignment && (
                  <p className="text-[12px] text-muted-foreground">
                    {areaLabel(currentAssignment.areaId)} · {currentAssignment.stationId}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {attendanceConfirm === 'AUSENTE'
                ? t('employeeHistoryDialog.markAbsentConfirmDescription')
                : t('employeeHistoryDialog.unmarkAbsentConfirmDescription')}
            </p>
            {attendanceError && (
              <Alert className={cn(alertToneClass('error'), 'mt-3')}>{attendanceError}</Alert>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => setAttendanceConfirm(null)}
              disabled={attendanceSubmitting}
            >
              {t('employeeHistoryDialog.cancelButton')}
            </Button>
            <Button onClick={handleConfirmAttendance} disabled={attendanceSubmitting}>
              {attendanceConfirm === 'AUSENTE'
                ? t('employeeHistoryDialog.markAbsentConfirmButton')
                : t('employeeHistoryDialog.unmarkAbsentConfirmButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
