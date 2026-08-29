import { ChevronRight, X } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import EmployeeAvatar from './EmployeeAvatar'

const PREVIEW_LIMIT = 5

/* Etiqueta identificadora para gente real cuya zona cruda no corresponde a
   ningun WORK_CENTER del catalogo (2026-08-25, a peticion explicita del
   usuario: CHOFER/PRODUCCION son gente de linea sin linea especifica
   conocida -- se quedan "sin area asignada" pero identificados, en vez de
   inventarles una area propia). */
const ZONA_TAG_LABELS = { PRODUCCION: 'Producción', CHOFER: 'Chofer' }

function personTag(p) {
  return p.asistencia || ZONA_TAG_LABELS[p.areaZona] || null
}

function shortName(name) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return parts[0]
  return `${parts[0]} ${parts[1][0]}.`
}

/* "Personal sin area asignada" -- misma fuente de siempre
   (getPeopleWithoutArea, pasada por props desde AreasLayoutView, sin
   duplicar la llamada) -- antes era una lista de Chips con texto
   siempre visible al expandir; ahora es una preview compacta de
   avatares (a peticion explicita del usuario, 2026-08-25) y "Ver
   lista" abre un dialog simple en vez de crecer la card. */
export default function UnassignedPersonnelCard({ people }) {
  const [open, setOpen] = useState(false)
  const preview = people.slice(0, PREVIEW_LIMIT)
  const extra = Math.max(people.length - PREVIEW_LIMIT, 0)

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className={cn('flex items-start justify-between', people.length && 'mb-3')}>
        <div>
          <p className="text-sm font-extrabold">Personal sin área asignada ({people.length})</p>
          <p className="text-[11px] text-muted-foreground">
            Personas activas sin ubicación asignada en el centro de trabajo
          </p>
        </div>
        {people.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(true)}
            className="shrink-0 gap-1 font-bold text-primary hover:text-primary"
          >
            Ver lista
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {people.length === 0 ? (
        <p className="text-[11.5px] italic text-muted-foreground">
          Todo el personal activo tiene una zona conocida.
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-2.5 gap-y-2">
          {preview.map((p) => {
            const tag = personTag(p)
            return (
              <div key={p.id} className="flex w-14 flex-col items-center gap-[3.2px]">
                <EmployeeAvatar employee={p} size={40} />
                <p className="w-full truncate text-center text-[10px] font-semibold leading-[1.1]">
                  {shortName(p.name)}
                </p>
                {tag && (
                  <p className="w-full truncate text-center text-[8.5px] leading-none text-muted-foreground">
                    {tag}
                  </p>
                )}
              </div>
            )
          })}
          {extra > 0 && (
            <div className="flex w-14 flex-col items-center justify-center gap-[3.2px]">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-xs font-extrabold text-muted-foreground">
                +{extra}
              </div>
              <p className="text-[10px] text-muted-foreground">más</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personal sin área asignada ({people.length})</DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </DialogHeader>
          <div className="flex flex-wrap gap-1.5 px-6 pb-6">
            {people.map((p) => {
              const tag = personTag(p)
              return (
                <Badge key={p.id} variant="secondary">
                  {tag ? `${p.name} (${tag})` : p.name}
                </Badge>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
