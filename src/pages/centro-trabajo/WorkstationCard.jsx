import { cn } from '@/lib/utils'
import { useEmployeeDropTargetStation } from '../../ui/dnd'
import EmployeeAvatar from './EmployeeAvatar'

/**
 * Una estacion de la linea: ocupada (avatar, numero, nombre) o
 * disponible (borde punteado, "Disponible", rol requerido).
 * Se dibuja dentro de un grid responsive (repeat(auto-fit, ...))
 * en vez de una fila horizontal con scroll — asi caben todas las
 * estaciones de una linea grande (p.ej. Accesorios, 16) sin cortar
 * nada ni depender de scroll lateral. Una estacion DISPONIBLE
 * tambien es destino de soltar: arrastrar a alguien aqui elige esa
 * estacion exacta (nunca una automatica).
 *
 * Fase 6c: convertido de MUI (Paper/Box/Typography/Chip + sx) a Tailwind.
 * Sin useTheme/alpha() -- los 3 estados de borde/fondo (isOver, disponible,
 * ocupado) ya eran independientes del modo claro/oscuro salvo por dos
 * casos puntuales, resueltos con clases dark: directas (sin necesitar el
 * patron de variables CSS --*-light/--*-dark de LineStationCard.jsx, que
 * existe para colores realmente dinamicos, no para estos 3 estados fijos).
 */
export default function WorkstationCard({
  workAreaId,
  workstation,
  selected,
  onSelect,
  onEmployeeClick,
}) {
  const occupant = workstation.occupants[0] || null
  const available = workstation.isAvailable
  const { isOver, dropProps } = useEmployeeDropTargetStation(workAreaId, workstation.name, {
    disabled: !available,
  })

  return (
    // biome-ignore lint/a11y/useSemanticElements: no puede ser <button> real -- contiene un area interactiva anidada (boton del ocupante mas abajo) y es blanco de drop de HTML5 DnD (dropProps); ambos casos son incompatibles con un <button> nativo, por eso usa role/tabIndex/onKeyDown manuales (mismo criterio que LineStationCard.jsx/LeadershipRow.jsx).
    <div
      {...dropProps}
      onClick={() => onSelect(workstation)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(workstation)
        }
      }}
      className={cn(
        'flex h-full cursor-pointer flex-col items-center rounded-[25px] border-[1.5px] p-2.5 text-center transition-all duration-150 hover:border-blue-500',
        available ? 'border-dashed' : 'border-solid',
        isOver || selected
          ? 'border-blue-500'
          : available
            ? 'border-amber-500 dark:border-amber-500/40'
            : 'border-border',
        isOver
          ? 'bg-blue-500/10 dark:bg-blue-500/[0.18]'
          : available
            ? 'bg-amber-500/5 dark:bg-amber-500/[0.06]'
            : 'bg-card',
      )}
    >
      <div className="mb-1.5 flex items-center gap-1 self-start">
        <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-black/[.08] px-1.5 text-[10px] font-extrabold dark:bg-white/[.16]">
          {workstation.order}
        </span>
        <p className="text-left text-[12.5px] font-extrabold leading-[1.2]">{workstation.name}</p>
      </div>

      {occupant ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEmployeeClick(occupant.employee)
          }}
          className="my-1 shrink-0"
        >
          <EmployeeAvatar employee={occupant.employee} size={40} />
        </button>
      ) : (
        <div className="my-1 shrink-0">
          <EmployeeAvatar employee={undefined} size={40} dashed />
        </div>
      )}

      {occupant ? (
        <>
          <p className="truncate text-[12px] font-bold leading-[1.2]">
            {occupant.employee?.name || '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {occupant.stationId ? occupant.checkInAt : ''}
          </p>
        </>
      ) : (
        <p className="truncate text-[10.5px] leading-[1.3] text-muted-foreground">
          {workstation.requiredRole}
        </p>
      )}

      <p
        className={cn(
          'mt-1 text-[10.5px] font-extrabold',
          available
            ? 'text-[#B45309]'
            : workstation.isFull
              ? 'text-[#047857]'
              : 'text-muted-foreground',
        )}
      >
        {available ? 'DISPONIBLE' : `${workstation.occupants.length} / ${workstation.capacity}`}
      </p>
    </div>
  )
}
