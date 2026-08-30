import { GripVertical, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatEmployeeNumber } from '../../data/personnel/employeeDisplay'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getAvailablePersonnelToday } from '../../data/production/personnelByArea'
import { useDndAssign } from '../../state/dndAssign'
import { EmptyState } from '../../ui'
import DraggablePersonChip from '../../ui/DraggablePersonChip'
import { useEmployeeDropTargetRelease } from '../../ui/dnd'
import EmployeeAvailableDetailDialog from './EmployeeAvailableDetailDialog'
import EmployeeAvatar from './EmployeeAvatar'

/* ─────────────────────────────────────────────
   Banda de personal disponible para asignar — fuente principal del
   drag & drop. Reutilizada en el layout general (Areas de trabajo)
   y dentro del detalle de cada area/linea (LineDetailDrawer).

   Si se recibe `scopedAreaId`, cada tarjeta tambien admite click/tap
   ("Asignar" sin arrastrar) como alternativa real para tablet/touch y
   accesibilidad (el drag HTML5 no es confiable en touch) — nunca
   depende solo del drag. 2026-08-28 (a peticion explicita del
   usuario): ese click ahora abre primero un detalle rapido de la
   persona (EmployeeAvailableDetailDialog) en vez de asignar directo;
   desde ahi "Asignar" dispara EXACTAMENTE el mismo dnd.requestAssign
   de siempre. El drag sigue siendo instantaneo, sin pasar por el
   detalle.

   Buscador (mismo pedido): filtra `people` -- la MISMA lista que ya
   trae getAvailablePersonnelToday(), nunca una segunda consulta -- por
   nombre o numero de empleado, sin distinguir mayusculas/minusculas.
   El total del encabezado SIEMPRE es people.length (nunca el conteo
   filtrado) — mientras se busca se agrega aparte cuantos resultados
   hay, sin recalcular el total real.

   Scroll horizontal LOCAL de esta lista unicamente; la pagina nunca
   scrollea horizontal por esto.
   ───────────────────────────────────────────── */
export default function AvailablePersonnelTray({
  scopedAreaId,
  title = 'Personal disponible para asignar',
  hideTitle = false,
}) {
  usePersonnelVersion()
  const dnd = useDndAssign()
  const people = getAvailablePersonnelToday()
  const { isOver, dropProps } = useEmployeeDropTargetRelease()
  const [query, setQuery] = useState('')
  const [detailPerson, setDetailPerson] = useState(null)

  const q = query.trim().toLowerCase()
  const filtered = q
    ? people.filter((p) => {
        const numberLabel = formatEmployeeNumber(p.employeeNumber)
        return (
          (p.name || '').toLowerCase().includes(q) ||
          String(p.employeeNumber || '')
            .toLowerCase()
            .includes(q) ||
          numberLabel.toLowerCase().includes(q)
        )
      })
    : people

  return (
    <div
      {...dropProps}
      className={cn(
        'rounded-[20px] border-[1.5px] border-dashed p-2 transition-all duration-150',
        isOver
          ? 'border-[#3B82F6] bg-[rgba(59,130,246,0.08)] dark:bg-[rgba(59,130,246,0.18)]'
          : 'border-transparent',
      )}
    >
      {!hideTitle && (
        <div className="mb-2 flex flex-wrap items-baseline gap-1.5">
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.5px] text-muted-foreground">
            {title} ({people.length})
          </p>
          {q && (
            <p className="text-[11px] text-muted-foreground">
              · {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}
      {isOver && (
        <p className="mb-2 text-[11.5px] font-bold text-[#3B82F6]">
          Soltar aquí para quitar la asignación
        </p>
      )}

      {people.length > 0 && (
        <div className="relative mb-2.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground opacity-50" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o número de empleado..."
            className="h-9 rounded-[20px] bg-card pl-9 pr-9 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/[.06] dark:hover:bg-white/[.08]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {people.length === 0 ? (
        <EmptyState
          compact
          title="No hay personal disponible sin asignación."
          description="Todo el personal activo ya tiene ubicación asignada hoy."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          compact
          title="No se encontraron empleados"
          description="Prueba con otro nombre o número."
        />
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1.5">
          {filtered.map((p) => (
            <DraggablePersonChip key={p.id} employeeId={p.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setDetailPerson(p)}
                className="flex min-w-0 items-center gap-1.5 rounded-[20px] border border-border bg-card p-1.5 pl-2 text-left transition-colors hover:border-[#3B82F6] hover:bg-[rgba(59,130,246,0.05)] dark:hover:bg-[rgba(59,130,246,0.1)]"
              >
                <EmployeeAvatar employee={p} size={30} />
                <div className="min-w-0">
                  <p className="whitespace-nowrap text-[12px] font-bold">{p.name}</p>
                  <p className="whitespace-nowrap text-[10px] text-muted-foreground">
                    {formatEmployeeNumber(p.employeeNumber)}
                  </p>
                </div>
                <GripVertical className="h-[15px] w-[15px] shrink-0 text-muted-foreground/60" />
              </button>
            </DraggablePersonChip>
          ))}
        </div>
      )}

      <EmployeeAvailableDetailDialog
        employee={detailPerson}
        open={Boolean(detailPerson)}
        onClose={() => setDetailPerson(null)}
        onAssign={
          scopedAreaId
            ? () => {
                const person = detailPerson
                setDetailPerson(null)
                dnd.requestAssign(person.id, scopedAreaId)
              }
            : undefined
        }
      />
    </div>
  )
}
