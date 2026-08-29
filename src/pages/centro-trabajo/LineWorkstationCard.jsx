import { MoreVertical, UserX } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, hexToRgba } from '@/lib/utils'
import { getPersonnelVisualType } from '../../data/personnel/lineVisualType'
import { getActividadForEmployee } from '../../data/production/personnelByArea'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useEmployeeDropTargetStation } from '../../ui/dnd'
import EmployeeAvatar from './EmployeeAvatar'
import { LineTypeIcon } from './LineVisualLegend'

/* ─────────────────────────────────────────────
   Tarjeta de estacion, exclusiva de WC LINEA 0-10 (2026-08-28, "REDISEÑO DE
   WC LINEA 0 A WC LINEA 10"; ampliada 2026-08-27, "estaciones configurables
   por ADMINISTRADOR"; agrandada 2026-08-27, "AJUSTE VISUAL MUY ESPECIFICO
   -- cards mas grandes/legibles", a peticion explicita del usuario). Separada
   a proposito de LineStationCard.jsx -- ese sigue intacto, usado
   exclusivamente por LineLikeAreaDetail.jsx.

   Layout VERTICAL centrado (seccion 3 del pedido de agrandado): encabezado
   (orden + nombre de estacion + menu admin), fila de categoria, bloque
   central con avatar + nombre de empleado (hasta 2 lineas reservadas SIEMPRE,
   para que todas las cards midan lo mismo sin importar el largo del nombre --
   seccion 10: "todas las cards de una misma distribucion deben mantener una
   altura visual consistente"), rol requerido (hasta 2 lineas), estado. La
   categoria (LIDERAZGO/CALIDAD/PRODUCCION/TECNICO/SUMINISTRO/APOYO) sigue
   siendo una propiedad de la ESTACION, no del ocupante -- se calcula siempre
   (con o sin ocupante). Estado (ocupada/disponible) sigue siendo un sistema
   de color SEPARADO (borde/fondo de la card).

   Fase 6c (Centro de Trabajo): convertido de MUI (Paper/Box/Typography +
   sx + Menu/MenuItem) a Tailwind + shadcn/ui + lucide-react. Los colores de
   acento/borde/fondo dependen del estado (isOver/selected/occupant) Y del
   modo claro/oscuro (antes alpha(color, theme.palette.mode==='dark'?a:b) via
   useTheme) -- se resuelven con el mismo patron de pares de variables CSS
   --*-light/--*-dark ya establecido en LineStationCard.jsx (fijadas en
   runtime via style, consumidas por clases estaticas bg-[var(...)]/
   dark:bg-[var(...)]), para no perder la distincion light/dark del
   original. El menu admin (IconButton+Menu/MenuItem de MUI) pasa a
   DropdownMenu/DropdownMenuItem (mismo patron ya usado en
   SpecialAreaDetail.jsx/SupportAreaDetail.jsx). El area de click del
   ocupante sigue sin poder ser un <button> real -- esta anidada dentro de
   la tarjeta (que ya tiene role="button", ademas de ser blanco de drop de
   HTML5 DnD) y dentro de DraggablePersonChip (draggable=true nativo), mismo
   criterio ya aplicado en LineStationCard.jsx/LeadershipRow.jsx. */
export default function LineWorkstationCard({
  workAreaId,
  workstation,
  selected,
  onSelect,
  onEmployeeClick,
  isAdmin,
  onEdit,
  onDeactivate,
}) {
  const occupant = workstation.occupants[0] || null
  const available = workstation.isAvailable

  const actividad = occupant?.employee?.id ? getActividadForEmployee(occupant.employee.id) : null
  const visualType = getPersonnelVisualType({
    stationRole: workstation.role,
    actividad,
    category: workstation.category,
  })

  const { isOver, dropProps } = useEmployeeDropTargetStation(workAreaId, workstation.name)

  const highlighted = isOver || selected
  const accent = highlighted ? '#3B82F6' : occupant ? '#10B981' : '#F59E0B'

  const cardStyle = {
    '--wc-border-light': highlighted ? accent : hexToRgba(accent, 0.35),
    '--wc-border-dark': highlighted ? accent : hexToRgba(accent, 0.4),
    '--wc-bg-light': isOver ? hexToRgba(accent, 0.08) : occupant ? '#F7FEFB' : '#FFFCF5',
    '--wc-bg-dark': isOver ? hexToRgba(accent, 0.18) : hexToRgba(accent, occupant ? 0.06 : 0.05),
    '--wc-accent-bg-light': hexToRgba(accent, 0.14),
    '--wc-accent-bg-dark': hexToRgba(accent, 0.22),
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: no puede ser <button> real -- es blanco de drop de HTML5 DnD (dropProps) y contiene un area interactiva anidada (click en el ocupante, mas abajo); ambos casos son incompatibles con un <button> nativo, por eso usa role/tabIndex/onKeyDown manuales (mismo criterio que LineStationCard.jsx/LeadershipRow.jsx).
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
      style={cardStyle}
      className={cn(
        'relative box-border flex h-48 cursor-pointer flex-col gap-[4.8px] rounded-[30px] border-[1.5px] p-[14px] transition-all duration-150',
        'border-[color:var(--wc-border-light)] bg-[var(--wc-bg-light)] dark:border-[color:var(--wc-border-dark)] dark:bg-[var(--wc-bg-dark)]',
        'hover:border-[#3B82F6] hover:shadow-[0_4px_16px_rgba(0,0,0,.08)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,.35)]',
        available && !occupant ? 'border-dashed' : 'border-solid',
      )}
    >
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-1.5 top-1.5 inline-flex items-center justify-center rounded-full p-[3.2px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreVertical className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onEdit?.(workstation)}>Editar puesto</DropdownMenuItem>
            <DropdownMenuItem disabled={!!occupant} onClick={() => onDeactivate?.(workstation)}>
              Eliminar puesto
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className={cn('flex min-w-0 items-start gap-1.5', isAdmin && 'pr-6')}>
        <div
          className="mt-[0.8px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[var(--wc-accent-bg-light)] text-[11px] font-extrabold dark:bg-[var(--wc-accent-bg-dark)]"
          style={{ color: accent }}
        >
          {workstation.order}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="line-clamp-2 min-w-0 flex-1 break-words text-[13px] font-extrabold leading-[1.25]">
              {workstation.name}
            </p>
          </TooltipTrigger>
          <TooltipContent>{workstation.name}</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex min-h-4 items-center gap-1">
        {visualType && (
          <>
            <LineTypeIcon type={visualType} size={12} />
            <p
              className="truncate text-[9.5px] font-extrabold uppercase tracking-[0.3px]"
              style={{ color: visualType.color }}
            >
              {visualType.label}
            </p>
          </>
        )}
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-1">
        {occupant ? (
          <DraggablePersonChip
            employeeId={occupant.employee?.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              width: '100%',
            }}
          >
            {/* biome-ignore lint/a11y/useSemanticElements: no puede ser <button> real -- ya esta anidado dentro de la tarjeta que tambien tiene role="button" arriba, y dentro de DraggablePersonChip (draggable=true nativo); un <button> anidado en otro seria HTML invalido y podria alterar el drag & drop de HTML5 (mismo criterio que LineStationCard.jsx/LeadershipRow.jsx). */}
            <div
              onClick={(e) => {
                e.stopPropagation()
                onEmployeeClick(occupant.employee)
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onEmployeeClick(occupant.employee)
                }
              }}
              className="flex w-full flex-col items-center gap-1"
            >
              <EmployeeAvatar employee={occupant.employee} size={40} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="line-clamp-2 min-h-[2.4em] w-full break-words text-center text-[12.5px] font-bold leading-[1.2]">
                    {occupant.employee?.name || '—'}
                  </p>
                </TooltipTrigger>
                <TooltipContent>{occupant.employee?.name || ''}</TooltipContent>
              </Tooltip>
            </div>
          </DraggablePersonChip>
        ) : (
          <>
            <UserX className="h-[30px] w-[30px] text-[#F59E0B]/[0.55] dark:text-[#F59E0B]/[0.7]" />
            <p className="min-h-[2.4em] text-center text-[11.5px] font-bold text-muted-foreground">
              Sin asignar
            </p>
          </>
        )}
        <p className="line-clamp-2 min-h-[2.4em] w-full break-words text-center text-[10.5px] leading-[1.25] text-muted-foreground">
          {workstation.requiredRole}
        </p>
      </div>

      <div className="flex items-center justify-center gap-[4.8px]">
        <div
          className={cn(
            'h-[7px] w-[7px] shrink-0 rounded-full',
            occupant ? 'bg-[#10B981]' : 'bg-[#F59E0B]',
          )}
        />
        <p
          className={cn(
            'text-[11px] font-extrabold tracking-[0.3px]',
            occupant ? 'text-[#059669]' : 'text-[#B45309]',
          )}
        >
          {occupant ? 'OCUPADA' : 'DISPONIBLE'}
        </p>
      </div>
    </div>
  )
}
