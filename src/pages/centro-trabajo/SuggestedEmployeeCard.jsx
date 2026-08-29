import { Button } from '@/components/ui/button'
import { cardClass, metricChipClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import { getSkillsForEmployee } from '../../data/personnel/repository'
import { workCenterById } from '../../data/production/catalog'
import EmployeeAvatar from './EmployeeAvatar'

export default function SuggestedEmployeeCard({ candidate, onAssign, disabled }) {
  const skills = getSkillsForEmployee(candidate.employee.id)

  const statusLabel = !candidate.present
    ? 'No registrado hoy'
    : candidate.assignment
      ? `Asignado en ${workCenterById(candidate.assignment.areaId)?.name || candidate.assignment.areaId}`
      : 'Disponible'

  const statusTone = !candidate.present ? 'default' : candidate.assignment ? 'warn' : 'ok'

  return (
    <div className={cn(cardClass, 'p-3')}>
      <div className="flex items-start gap-2.5">
        <EmployeeAvatar employee={candidate.employee} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-extrabold">
            {candidate.employee.employeeNumber} — {candidate.employee.name}
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {skills.map((s) => s.stationName).join(' · ')}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className={metricChipClass(statusTone)}>{statusLabel}</span>
          </div>
        </div>
        <Button
          size="sm"
          disabled={disabled}
          onClick={() => onAssign(candidate)}
          className="shrink-0 font-bold normal-case"
        >
          Asignar
        </Button>
      </div>
    </div>
  )
}
