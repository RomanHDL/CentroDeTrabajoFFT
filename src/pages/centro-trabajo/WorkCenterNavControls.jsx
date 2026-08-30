import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/* ─────────────────────────────────────────────
   Anterior / Siguiente entre Work Centers -- 2026-08-27, a peticion
   explicita del usuario. Componente UNICO reutilizado tal cual en los
   3 headers de detalle (LineDetailDrawer/OperationalAreaDetail/
   SupportAreaDetail) -- nunca una copia de esta UI por archivo.

   `previous`/`next` son objetos WORK_CENTERS (o null en el primer/
   ultimo elemento -- ver getWorkCenterNavContext, catalog.js) --
   siempre lineal, nunca circular (null deshabilita el boton en vez de
   dar la vuelta). `onNavigate(id)` lo decide quien renderiza esto
   (AreaDetail.jsx), nunca logica de navegacion propia aqui.

   Responsive (Parte 5/28 del pedido): en pantallas angostas (tablet
   chica) el boton muestra "Anterior"/"Siguiente" genericos (nunca se
   desborda ni corta el nombre real a la mitad); el nombre real siempre
   esta disponible via Tooltip, y aparece completo en el boton desde
   sm hacia arriba. Atajo de teclado opcional (Alt+Flecha) -- nunca
   intercepta flechas mientras se esta escribiendo en un input/textarea.

   Fase 6c: portado de MUI a Tailwind. */
const BTN_CLASS =
  'flex min-w-0 items-center gap-1 rounded-[10px] border border-border bg-card px-[11px] py-1 text-[12.5px] font-bold leading-[1.3] text-foreground transition-colors hover:border-[#3B82F6] hover:bg-[rgba(59,130,246,.06)] dark:hover:bg-[rgba(59,130,246,.14)] disabled:cursor-not-allowed disabled:border-border disabled:opacity-35'

export default function WorkCenterNavControls({ previous, next, onNavigate }) {
  const { t } = useTranslation('centroTrabajo')
  useEffect(() => {
    function onKeyDown(e) {
      if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
      if (e.key === 'ArrowLeft' && previous) {
        e.preventDefault()
        onNavigate(previous.id)
      }
      if (e.key === 'ArrowRight' && next) {
        e.preventDefault()
        onNavigate(next.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previous, next, onNavigate])

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={!previous}
            onClick={() => previous && onNavigate(previous.id)}
            className={BTN_CLASS}
          >
            <ChevronLeft className="h-[17px] w-[17px]" />
            <span className="hidden sm:inline">
              {previous?.name || t('workCenterNavControls.previousLabel')}
            </span>
            <span className="sm:hidden">{t('workCenterNavControls.previousLabel')}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {previous ? previous.name : t('workCenterNavControls.noPreviousArea')}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && onNavigate(next.id)}
            className={BTN_CLASS}
          >
            <span className="hidden sm:inline">
              {next?.name || t('workCenterNavControls.nextLabel')}
            </span>
            <span className="sm:hidden">{t('workCenterNavControls.nextLabel')}</span>
            <ChevronRight className="h-[17px] w-[17px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{next ? next.name : t('workCenterNavControls.noNextArea')}</TooltipContent>
      </Tooltip>
    </div>
  )
}
