import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  alertSuccessClass,
  emptyTextClass,
  metricChipClass,
  sectionTitleClass,
} from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import {
  getAssignmentHistory,
  getCurrentAssignment,
  getMovementsForEmployee,
  getSkillsForEmployee,
  releaseAssignment,
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

  // `open`/`feedback` fuerzan refrescar estos datos cada vez que el dialogo se
  // reabre o cambia el feedback (tras liberar/mover), aunque no se lean dentro
  // del callback -- comportamiento original preservado tal cual (mismo criterio
  // que LineHistoryDialog.jsx).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const currentAssignment = useMemo(
    () => (employee ? getCurrentAssignment(employee.id) : null),
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

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-[600px]">
        <div className="flex items-center gap-3 px-6 py-4">
          <EmployeeAvatar employee={employee} size={44} />
          <div>
            <DialogTitle className="font-extrabold">
              {employee.employeeNumber} — {employee.name}
            </DialogTitle>
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
    </Dialog>
  )
}
