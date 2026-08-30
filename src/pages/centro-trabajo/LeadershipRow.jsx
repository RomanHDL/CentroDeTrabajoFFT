import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useEmployeeDropTargetStation } from '../../ui/dnd'
import EmployeeAvatar from './EmployeeAvatar'
import { RankIcon } from './HierarchyLegend'

/* ─────────────────────────────────────────────
   Fila ancha de liderazgo (2026-08-28, "REFINAMIENTO VISUAL Grupo C",
   a peticion explicita del usuario -- Seccion 7: "el líder NO debe verse
   como una estación normal... card horizontal más importante pero
   compacta"). SOLO la usa LineLikeAreaDetail.jsx para el/los puesto(s)
   cuyo rango es de tipo liderazgo (hoy: Team Leader) -- el resto de
   puestos sigue usando LineStationCard.jsx en grid, sin cambios.

   `rank` es siempre un objeto de rankSystem.js (PERSONNEL_RANKS,
   getPersonnelRank) -- mismo sistema que ya usa LineStationCard.jsx/
   HierarchyLegend.jsx en este archivo, nunca lineVisualType.js (ese es
   exclusivo de WC LINEA, sistema visual deliberadamente separado). */
export default function LeadershipRow({
  workAreaId,
  workstation,
  selected,
  onSelect,
  onEmployeeClick,
  rank,
}) {
  const { t } = useTranslation('centroTrabajo')
  const occupant = workstation.occupants[0] || null
  const available = workstation.isAvailable
  const { isOver, dropProps } = useEmployeeDropTargetStation(workAreaId, workstation.name)

  const highlighted = isOver || selected

  // Fase 6c: colores dinamicos de acento/borde/fondo expresados como
  // clases estaticas completas (nunca interpoladas) para que Tailwind
  // JIT las detecte -- equivalente exacto a los alpha(color, d?..:..)
  // del original, usando dark: en vez de theme.palette.mode/useTheme.
  const accentClass = highlighted
    ? 'bg-[rgba(59,130,246,0.14)] text-[#3B82F6] dark:bg-[rgba(59,130,246,0.22)]'
    : occupant
      ? 'bg-[rgba(16,185,129,0.14)] text-[#10B981] dark:bg-[rgba(16,185,129,0.22)]'
      : 'bg-[rgba(245,158,11,0.14)] text-[#F59E0B] dark:bg-[rgba(245,158,11,0.22)]'

  const borderClass = highlighted
    ? 'border-[#3B82F6]'
    : occupant
      ? 'border-[rgba(16,185,129,0.35)] dark:border-[rgba(16,185,129,0.4)]'
      : 'border-[rgba(245,158,11,0.35)] dark:border-[rgba(245,158,11,0.4)]'

  const bgClass = isOver
    ? 'bg-[rgba(59,130,246,0.08)] dark:bg-[rgba(59,130,246,0.18)]'
    : occupant
      ? 'bg-[#F7FEFB] dark:bg-[rgba(16,185,129,0.06)]'
      : 'bg-[#FFFCF5] dark:bg-[rgba(245,158,11,0.05)]'

  return (
    // biome-ignore lint/a11y/useSemanticElements: no puede ser <button> real -- contiene un area interactiva anidada (click en el ocupante, mas abajo) y es blanco de drop de HTML5 DnD (dropProps); ambos casos son incompatibles con un <button> nativo, por eso usa role/tabIndex/onKeyDown manuales.
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
        'flex cursor-pointer items-center gap-3 rounded-[30px] border-[1.5px] p-3 transition-all duration-150',
        'hover:border-[#3B82F6] hover:shadow-[0_4px_16px_rgba(0,0,0,.08)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,.35)]',
        available && !occupant ? 'border-dashed' : 'border-solid',
        borderClass,
        bgClass,
      )}
    >
      <div
        className={cn(
          'grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[11px] font-extrabold',
          accentClass,
        )}
      >
        {workstation.order}
      </div>

      {occupant ? (
        <DraggablePersonChip employeeId={occupant.employee?.id} className="min-w-0 flex-1">
          {/* biome-ignore lint/a11y/useSemanticElements: no puede ser <button> real -- ya esta anidado dentro de la fila que tambien tiene role="button" arriba, y dentro de DraggablePersonChip (draggable=true nativo); un <button> anidado en otro es HTML invalido y podria alterar el drag & drop de HTML5. */}
          <div
            className="flex items-center gap-3"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onEmployeeClick(occupant.employee)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onEmployeeClick(occupant.employee)
              }
            }}
          >
            <EmployeeAvatar employee={occupant.employee} size={42} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-extrabold">{occupant.employee?.name}</p>
              {rank && (
                <div className="mt-0.5 flex items-center gap-[3.2px]">
                  <RankIcon rank={rank} size={12} />
                  <span
                    className="text-[10.5px] font-extrabold uppercase tracking-[0.4px]"
                    style={{ color: rank.color }}
                  >
                    {rank.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        </DraggablePersonChip>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-muted-foreground">
            {t('leadershipRow.unassigned')}
          </p>
          <p className="truncate text-[11px] text-muted-foreground/60">
            {workstation.requiredRole}
          </p>
        </div>
      )}

      <span
        className={cn(
          'shrink-0 text-[10px] font-extrabold tracking-[0.3px]',
          occupant ? 'text-[#059669]' : 'text-[#B45309]',
        )}
      >
        {occupant ? t('leadershipRow.occupied') : t('leadershipRow.available')}
      </span>
    </div>
  )
}
