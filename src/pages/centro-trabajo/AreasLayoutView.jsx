import { X } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cardClass } from '@/lib/pageStyles'
import { cn } from '@/lib/utils'
import OperatingFloorPlan from '../../components/OperatingFloorPlan'
import { describeZoneSelection } from '../../components/WorkAreaMap'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { PHYSICAL_ZONES } from '../../data/production/layoutZones'
import { BASE_SNAPSHOT_DATE, getPeopleWithoutArea } from '../../data/production/personnelByArea'
import AreaDetailPanel from './AreaDetailPanel'
import WorkAreaBottomSummary from './WorkAreaBottomSummary'

/* ─────────────────────────────────────────────
   "Areas de trabajo" (2026-08-25, a peticion explicita del usuario):
   el layout ya NO es WorkAreaMap (el mockup anterior) sino el MISMO
   plano grande que ya se usaba en /layout-2d -- OperatingFloorPlan,
   el componente compartido -- para que Centro de Trabajo, Layout 2D
   y (antes) Dashboard nunca muestren dos disenos distintos del mismo
   piso. No-readOnly: click/drag&drop/asignar siguen funcionando
   exactamente igual que antes con WorkAreaMap. WorkAreaMap.jsx sigue
   existiendo solo por su helper describeZoneSelection (usado abajo
   para el caso especial "FFT" que dispara AreaCoverageSummaryCard),
   ya no se renderiza en ningun lado.

   El panel de detalle (AreaDetailPanel + Drawer lateral/inferior)
   sigue existiendo tal cual, pero ahora solo lo abre un click en
   "Resumen por área" (WorkAreaBottomSummary) -- un click directo
   sobre el plano abre el propio drawer/dialog de OperatingFloorPlan
   (igual que en Layout 2D), no este panel.

   Fase 6c (Centro de Trabajo): portado de MUI a Tailwind -- SOLO el
   wrapper propio (texto de encabezado, panel flotante de detalle).
   OperatingFloorPlan.jsx (1279 lineas de canvas pan/zoom) se deja
   intacto a proposito, como su propio paso aislado -- se sigue
   renderizando tal cual, anidado dentro de este wrapper ya convertido
   (mismo patron de coexistencia MUI-dentro-de-Tailwind usado en todo
   este migracion). El Drawer responsivo (derecha en desktop, abajo en
   movil) se reescribe con Dialog + clases Tailwind `md:` en vez de
   useMediaQuery+Drawer de MUI -- el punto de quiebre exacto (768px)
   no es pixel-critico aqui, solo es un cambio de disposicion. */
export default function AreasLayoutView({ onOpenLine }) {
  usePersonnelVersion()
  const [selection, setSelection] = useState(null)
  const sinZona = getPeopleWithoutArea()

  function handleSelectArea(id) {
    if (id === 'FFT' || id === '__FFT__') {
      setSelection(describeZoneSelection(PHYSICAL_ZONES.FFT))
      return
    }
    setSelection({ type: 'area', id })
  }

  const panel = (
    <AreaDetailPanel
      selection={selection}
      onSelectArea={handleSelectArea}
      onOpenFullDrawer={onOpenLine}
    />
  )

  return (
    <div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Punto de partida: snapshot real desde LAYOUT FFT.xlsx (hoja BASE) — {BASE_SNAPSHOT_DATE}.
        Arrastrar o asignar a alguien actualiza su ubicación de hoy sin modificar ese snapshot.
        Números de empleado pendientes: BASE no trae esa columna todavía.
      </p>

      {/* Sin cardHeader propio (2026-08-25): OperatingFloorPlan ya trae su
          propio titulo "Área operando" + leyenda arriba, tener los dos
          duplicaria el encabezado. */}
      <div className={cn(cardClass, 'mb-4')}>
        <OperatingFloorPlan />
      </div>

      {/* Ventana flotante con el detalle — mismo patron en desktop/tablet
          (panel lateral derecho) y movil (panel inferior), para que
          click en cualquier zona/area siempre abra algo visible al
          instante, sin depender de una columna fija en pantalla. */}
      <Dialog open={Boolean(selection)} onOpenChange={(next) => !next && setSelection(null)}>
        <DialogContent
          className={cn(
            'inset-x-0 bottom-0 top-auto flex max-h-[85vh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-b-none rounded-t-2xl',
            'md:inset-y-0 md:bottom-auto md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[420px] md:rounded-none',
          )}
        >
          <DialogTitle className="sr-only">Detalle del área</DialogTitle>
          <div className="flex shrink-0 items-center justify-between border-b border-border p-3">
            <p className="text-[15px] font-extrabold">Detalle del área</p>
            <DialogClose asChild>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{panel}</div>
        </DialogContent>
      </Dialog>

      {/* Rediseño 2026-08-25 (a peticion explicita del usuario) -- ver
          WorkAreaBottomSummary.jsx. */}
      <WorkAreaBottomSummary onSelectArea={handleSelectArea} sinZona={sinZona} />
    </div>
  )
}
