import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { getActividadForEmployee } from '../../data/production/personnelByArea'
import EmployeeAvatar from './EmployeeAvatar'

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.4px] text-muted-foreground">
        {label}
      </p>
      {typeof value === 'string' ? (
        <p className="mt-0.5 text-sm font-semibold">{value}</p>
      ) : (
        <div className="mt-[3.2px]">{value}</div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Detalle rapido de una persona de "Personal disponible" (2026-08-28,
   a peticion explicita del usuario) -- tap/click en una tarjeta abre
   esto en vez de asignar directo; el drag & drop sigue siendo el
   camino rapido, sin cambios. Solo datos REALES ya disponibles en el
   sistema (nunca correo/telefono/puesto/antiguedad inventados): No.
   empleado (o "PROYECTO" si no tiene, nunca un numero ficticio),
   estado, area actual, turno, y la actividad real de BASE si existe
   (mismo codigo crudo que ya usa SupportAreaDetail, sin traducirlo).
   "Asignar" reutiliza el flujo existente (onAssign, provisto por quien
   renderiza esto) -- nunca una segunda logica de asignacion. ───────────────────────────────────────────── */
export default function EmployeeAvailableDetailDialog({ employee, open, onClose, onAssign }) {
  if (!employee) return null
  const numberLabel = formatEmployeeNumber(employee.employeeNumber)
  const actividad = getActividadForEmployee(employee.id)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalle del empleado</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogHeader>
        <div className="px-6 pb-2">
          <div className="mb-5 flex items-center gap-3">
            <EmployeeAvatar employee={employee} size={52} />
            <p className="text-[16px] font-extrabold leading-[1.2]">{employee.name}</p>
          </div>
          <div className="flex flex-col gap-3.5">
            <DetailRow label="No. empleado" value={numberLabel} />
            <DetailRow
              label="Estado"
              value={
                <Badge
                  variant="outline"
                  className="border-[#10B98155] bg-[#10B98122] font-bold text-[#047857]"
                >
                  Disponible
                </Badge>
              }
            />
            <DetailRow label="Área actual" value="Sin área asignada" />
            <DetailRow label="Turno" value="Sin turno asignado hoy" />
            {actividad && <DetailRow label="Actividad registrada (BASE)" value={actividad} />}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="ghost" onClick={onClose} className="font-bold">
            Cancelar
          </Button>
          {onAssign && (
            <Button onClick={onAssign} className="rounded-[20px] font-bold">
              Asignar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
