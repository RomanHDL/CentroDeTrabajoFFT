import { X } from 'lucide-react'
import { useDndAssign } from '../../state/dndAssign'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import EmployeeAvatar from './EmployeeAvatar'

/* ─────────────────────────────────────────────
   Persona ya asignada a una area — arrastrable (para mover a otra
   area, o soltar sobre "Personal disponible" para quitarla) y con
   boton "x" para quitarla con un click (confirmacion ligera vive en
   DndAssignProvider, un solo lugar para toda la app). No duplica
   logica: ambos caminos llaman a requestRelease/releaseAssignment.
   ───────────────────────────────────────────── */
/* `subtitle` (2026-08-26, a peticion explicita del usuario: "los puestos
   que te pasé no los veo en mi layout") -- segunda linea opcional bajo el
   nombre, hoy usada para mostrar el PUESTO/estación real de la persona
   (ej. "Surtidor de Accesorios 3") en areas con plantilla por puesto
   (Accesorios/Paletizado/Insumos). Sin `subtitle` se ve exactamente igual
   que antes -- no rompe ningun uso existente. */
export default function AssignedPersonChip({ employeeId, name, subtitle, size = 32 }) {
  const dnd = useDndAssign()
  return (
    <DraggablePersonChip employeeId={employeeId} className="w-full">
      <div className="flex items-center gap-2 rounded-[20px] border border-border p-2 pr-1">
        <EmployeeAvatar employee={{ name }} size={size} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold">{name}</p>
          {subtitle && <p className="truncate text-[10.5px] text-muted-foreground">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => dnd.requestRelease(employeeId)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </DraggablePersonChip>
  )
}
