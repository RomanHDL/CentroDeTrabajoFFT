import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
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

const MOVEMENT_LABEL = { CHECK_IN: 'Entrada', MOVE: 'Movimiento', RELEASE: 'Puesto liberado' }

export default function EmployeeHistoryDialog({ employee, open, onClose, onChanged }) {
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
      setFeedback('Puesto liberado. El empleado sigue presente hoy, sin asignación.')
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
                : 'Sin asignación actual'}
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
                  Ubicación actual
                </p>
                <p className="font-bold">
                  {areaLabel(currentAssignment.areaId)} · {currentAssignment.stationId}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase text-muted-foreground">Entrada</p>
                <p className="font-bold">{currentAssignment.checkInAt}</p>
              </div>
            </div>
          )}

          <p className={cn(sectionTitleClass, 'mb-2 text-[13px]')}>Habilidades</p>
          {skills.length === 0 ? (
            <p className={cn(emptyTextClass, 'py-3 text-left')}>
              Sin habilidades registradas todavía.
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

          <p className={cn(sectionTitleClass, 'mb-2 mt-4 text-[13px]')}>Historial hoy</p>
          {todaysMovements.length === 0 ? (
            <EmptyState
              compact
              title="Sin movimientos hoy"
              description="Este empleado no se ha registrado hoy."
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
                        ? `${areaLabel(m.fromAreaId)} / ${m.fromStationId} → ${m.toAreaId ? `${areaLabel(m.toAreaId)} / ${m.toStationId}` : 'sin asignación'}`
                        : `${areaLabel(m.toAreaId)} · ${m.toStationId}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className={cn(sectionTitleClass, 'mb-2 mt-4 text-[13px]')}>Días anteriores</p>
          {pastAssignments.length === 0 ? (
            <EmptyState
              compact
              title="Sin historial previo"
              description="No hay asignaciones registradas en días anteriores."
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
                Liberar asignación
              </Button>
              <Button variant="outline" onClick={() => setMoveOpen(true)} className="font-bold">
                Mover empleado
              </Button>
            </>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>

      <MoveConfirmDialog
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        employee={employee}
        currentAssignment={currentAssignment}
        onDone={() => {
          setFeedback('Empleado movido correctamente.')
          onChanged?.()
        }}
      />
    </Dialog>
  )
}
