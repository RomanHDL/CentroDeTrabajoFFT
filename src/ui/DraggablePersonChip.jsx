import { cn } from '@/lib/utils'
import { useEmployeeDragSource } from './dnd'

/* Envoltura generica: hace arrastrable cualquier renderizado de una
   persona (tag, fila, tarjeta) sin duplicar su estilo visual. Usada
   en WorkAreaMap, AreaDetailPanel, LineDetailDrawer y la banda de
   "Personal disponible".

   Fase 6c: convertido de MUI (Box + sx) a Tailwind -- `sx` se
   reemplaza por `className` (mismos 4 usos reales en todo el repo:
   'block', 'w-full', 'shrink-0', 'flex-1 min-w-0'), `&:active` pasa a
   la pseudo-clase `active:` de Tailwind. */
export default function DraggablePersonChip({ employeeId, children, className }) {
  const { dragging, dragProps } = useEmployeeDragSource(employeeId)
  return (
    <div
      {...dragProps}
      className={cn(
        'cursor-grab transition-opacity duration-150 active:cursor-grabbing',
        dragging ? 'opacity-40' : 'opacity-100',
        className,
      )}
    >
      {children}
    </div>
  )
}
