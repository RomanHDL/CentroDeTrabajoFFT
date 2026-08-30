import { UserX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn, hexToRgba } from '@/lib/utils'
import { getPersonnelRank } from '../../data/personnel/rankSystem'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useEmployeeDropTargetStation } from '../../ui/dnd'
import EmployeeAvatar from './EmployeeAvatar'

/* ─────────────────────────────────────────────
   Tarjeta de estacion para el rediseño de CT LINEA (2026-08-26, a
   peticion explicita del usuario -- mockup "CT LINEA 6"). Componente
   NUEVO, separado de WorkstationCard.jsx (ese sigue usandolo
   WorkAreaMap.jsx, se deja intacto). Misma logica de drop/seleccion
   que WorkstationCard, solo mas rica visualmente: numero de posicion
   en circulo, nombre de estacion (ya unico -- "Etiquetado"/
   "Etiquetado 2", ver workstations.js) siempre visible arriba,
   acento de color por estado.

   SIN accion rapida de "quitar" en la tarjeta a proposito (se probo y
   se quito, 2026-08-26): el icono quedaba demasiado cerca del titulo
   dentro de una tarjeta angosta y un click normal para SELECCIONAR la
   estacion podia liberar a alguien por accidente -- inaceptable en una
   herramienta de produccion real. Quitar/mover sigue disponible por la
   tabla ("Quitar") y por el panel lateral (click en el ocupante).

   Fase 6c: convertido de MUI (Paper/Box/Typography + sx) a Tailwind.
   Los colores de acento/borde/fondo dependen del estado (isOver/
   selected/occupant) Y del modo claro/oscuro (antes alpha(color,
   theme.palette.mode==='dark'?a:b) via useTheme) -- se resuelven ahora
   con el mismo patron de pares de variables CSS --*-light/--*-dark ya
   establecido en DashboardExecKpiCard.jsx (fijadas en runtime via
   style, consumidas por clases estaticas bg-[var(...)]/
   dark:bg-[var(...)]), para no perder la distincion light/dark del
   original. */
export default function LineStationCard({
  workAreaId,
  workstation,
  selected,
  onSelect,
  onEmployeeClick,
  lineLike = false,
}) {
  const { t } = useTranslation('centroTrabajo')
  const occupant = workstation.occupants[0] || null
  const available = workstation.isAvailable
  // Rango visual por área+puesto+rango (2026-08-27, a peticion explicita del usuario) -- por
  // defecto SOLO en areas LINE_LIKE (Familia C: Paletizado/Accesorios/Insumos/Midea/Conveyor
  // General). EXCEPCION explicita (misma fecha, segunda ronda del pedido): el puesto "Calidad"
  // (agregado como puesto real adicional en cada CT LINEA 0..10, ver workstations.js) SI
  // muestra el badge de rango aunque lineLike sea false -- es el UNICO rol de una WC LINEA real
  // que lo hace, ningun otro puesto de linea (Montaje/Prueba eléctrica/...) se ve afectado, el
  // diseño de esas tarjetas sigue exactamente igual que antes. Se deriva del `role` REAL de la
  // estacion (nunca del nombre del empleado, ver rankSystem.js) -- null cuando el puesto no
  // tiene informacion suficiente, nunca se inventa un rango.
  const showRank = lineLike || workstation.role === 'Calidad'
  const rank = showRank && occupant ? getPersonnelRank(workstation.role) : null
  // 2026-08-26: antes se deshabilitaba el drop si la estacion ya estaba
  // ocupada -- ahora SIEMPRE es zona de suelta (peticion explicita del
  // usuario: arrastrar a alguien al puesto de otra persona debe
  // intercambiarlos, no quedar bloqueado). requestAssignToStation
  // (dndAssign.jsx) detecta la ocupacion y decide swap vs asignacion.
  const { isOver, dropProps } = useEmployeeDropTargetStation(workAreaId, workstation.name)

  const highlighted = isOver || selected
  const accent = highlighted ? '#3B82F6' : occupant ? '#10B981' : '#F59E0B'

  const cardStyle = {
    '--ls-border-light': highlighted ? accent : hexToRgba(accent, 0.35),
    '--ls-border-dark': highlighted ? accent : hexToRgba(accent, 0.4),
    '--ls-bg-light': isOver ? hexToRgba(accent, 0.08) : occupant ? '#F7FEFB' : '#FFFCF5',
    '--ls-bg-dark': isOver ? hexToRgba(accent, 0.18) : hexToRgba(accent, occupant ? 0.06 : 0.05),
    '--ls-accent-bg-light': hexToRgba(accent, 0.14),
    '--ls-accent-bg-dark': hexToRgba(accent, 0.22),
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: no puede ser <button> real -- contiene un area interactiva anidada (click en el ocupante, mas abajo) y es blanco de drop de HTML5 DnD (dropProps); ambos casos son incompatibles con un <button> nativo, por eso usa role/tabIndex/onKeyDown manuales (mismo criterio que LeadershipRow.jsx).
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
        'relative flex h-full cursor-pointer flex-col gap-1.5 rounded-[30px] border-[1.5px] p-3 transition-all duration-150',
        'border-[color:var(--ls-border-light)] bg-[var(--ls-bg-light)] dark:border-[color:var(--ls-border-dark)] dark:bg-[var(--ls-bg-dark)]',
        'hover:border-[#3B82F6] hover:shadow-[0_4px_16px_rgba(0,0,0,.08)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,.35)]',
        available && !occupant ? 'border-dashed' : 'border-solid',
      )}
    >
      {/* 2026-08-28, a peticion explicita del usuario ("hay mucho de Ayudante
          General pero son de diferentes roles, identificalos"): el nombre ya
          NO se trunca a una linea (antes "Ayudante General..." ocultaba cual
          era -- Paletizador/Conveyor/Flejado/Escaneador). Ahora se permite
          hasta 2 lineas completas antes de recortar. */}
      <div className="flex min-w-0 items-center gap-1.5">
        <div
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--ls-accent-bg-light)] text-[10.5px] font-extrabold dark:bg-[var(--ls-accent-bg-dark)]"
          style={{ color: accent }}
        >
          {workstation.order}
        </div>
        <p className="line-clamp-2 break-words text-[11.5px] font-extrabold leading-[1.2]">
          {workstation.name}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-1">
        {occupant ? (
          // 2026-08-27, a peticion explicita del usuario ("quiero arrastrarlos
          // entre ahí y que se cambien"): antes solo la fila de la tabla de
          // abajo era arrastrable -- el ocupante mostrado AQUÍ, en la propia
          // tarjeta del puesto, era un simple onClick. Ahora tambien es
          // origen de drag (DraggablePersonChip, mismo hook que ya usa toda
          // la app), para poder arrastrar directo de un puesto a otro dentro
          // de la cuadrícula y disparar el intercambio real (dndAssign.jsx).
          <DraggablePersonChip
            employeeId={occupant.employee?.id}
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}
          >
            {/* biome-ignore lint/a11y/useSemanticElements: no puede ser <button> real -- ya esta anidado dentro de la tarjeta que tambien tiene role="button" arriba, y dentro de DraggablePersonChip (draggable=true nativo); un <button> anidado en otro seria HTML invalido y podria alterar el drag & drop de HTML5 (mismo criterio que LeadershipRow.jsx). */}
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
              className="flex flex-col items-center gap-1"
            >
              <div className="relative">
                <EmployeeAvatar employee={occupant.employee} size={40} />
                {rank && (
                  <div
                    className="pointer-events-none absolute -inset-0.5 rounded-full border-2"
                    style={{ borderColor: rank.color }}
                  />
                )}
              </div>
              <p className="truncate text-center text-[12px] font-bold leading-[1.2]">
                {occupant.employee?.name || '—'}
              </p>
              {rank && (
                <span
                  className="truncate rounded-[50px] bg-[var(--rank-bg-light)] px-1.5 py-[1.2px] text-[8.5px] font-extrabold uppercase tracking-[0.3px] dark:bg-[var(--rank-bg-dark)]"
                  style={{
                    color: rank.color,
                    '--rank-bg-light': hexToRgba(rank.color, 0.12),
                    '--rank-bg-dark': hexToRgba(rank.color, 0.22),
                  }}
                >
                  {rank.label}
                </span>
              )}
              {/* 2026-08-28 ("CORRECCIÓN DE PUESTOS Y ESTACIONES OPERATIVAS", a peticion
                  explicita del usuario, "diferenciar rango y funcion"): rango (badge de arriba)
                  y funcion (workstation.role, el puesto real sin sufijo numerico) son dos datos
                  distintos -- ahora que el rango casi siempre es "Ayudante General", la funcion
                  es la unica forma de saber QUE hace realmente esta persona. Nunca reemplaza al
                  badge de rango, se muestra debajo. */}
              {rank && workstation.role && (
                <p className="truncate text-center text-[10px] leading-[1.2] text-muted-foreground">
                  {workstation.role}
                </p>
              )}
            </div>
          </DraggablePersonChip>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <UserX className="h-[26px] w-[26px] text-[rgba(245,158,11,0.55)] dark:text-[rgba(245,158,11,0.7)]" />
            <p className="truncate text-center text-[10.5px] leading-[1.3] text-muted-foreground">
              {workstation.requiredRole}
            </p>
          </div>
        )}
      </div>

      <p
        className={cn(
          'text-center text-[10px] font-extrabold tracking-[0.3px]',
          occupant ? 'text-[#059669]' : 'text-[#B45309]',
        )}
      >
        {occupant ? t('lineStationCard.statusOccupied') : t('lineStationCard.statusAvailable')}
      </p>
    </div>
  )
}
