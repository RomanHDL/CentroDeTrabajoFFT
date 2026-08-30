import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { subscribeToast } from './toast'

// Mismo mapa de colores fijo ya establecido en el resto de Fase 6c
// (METRIC_CHIP_TONES/KPI_ACCENT_CLASS de src/lib/pageStyles.js) para
// success/error/warning/info, pero como "filled" solido (fondo saturado +
// texto blanco) -- eso es lo que variant="filled" de MUI Alert hacia aqui, a
// diferencia del estilo "outline claro" de alertToneClass (pensado para
// paneles inline, no para un toast flotante). No se agrega a pageStyles.js
// porque ningun otro archivo usa la variante filled.
const TONE_CLASS = {
  success: 'bg-emerald-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-500 text-white',
}

const AUTO_HIDE_MS = 3200

/* Monta UNA sola vez cerca de la raiz de la app (App.jsx). Muestra
   los toasts de showToast() uno a la vez, en orden — mismo patron de cola
   que la version MUI original (avanzar solo cuando el toast actual termina
   su animacion de salida, no en un efecto reactivo simple, para no perder
   mensajes que llegan casi al mismo tiempo, p. ej. "asignado" + advertencia
   de plantilla). onExited de MUI Snackbar se reemplaza por onTransitionEnd
   sobre la transicion CSS local de opacidad (mismo proposito: no desmontar
   `current` hasta que la animacion de salida realmente termino). */
export default function ToastHost() {
  const [queue, setQueue] = useState([])
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(null)
  const hideTimer = useRef(null)

  useEffect(() => subscribeToast((toast) => setQueue((q) => [...q, toast])), [])

  useEffect(() => {
    if (queue.length && !current) {
      setCurrent(queue[0])
      setQueue((q) => q.slice(1))
      setOpen(true)
    } else if (queue.length && current && open) {
      setOpen(false)
    }
  }, [queue, current, open])

  useEffect(() => {
    if (!open || !current) return undefined
    hideTimer.current = setTimeout(() => setOpen(false), AUTO_HIDE_MS)
    return () => clearTimeout(hideTimer.current)
  }, [open, current])

  function handleClose() {
    setOpen(false)
  }

  function handleTransitionEnd(e) {
    if (e.propertyName === 'opacity' && !open) setCurrent(null)
  }

  if (!current) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[1400] flex justify-center px-6">
      <div
        role="alert"
        onTransitionEnd={handleTransitionEnd}
        className={cn(
          'pointer-events-auto flex max-w-md items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold shadow-lg transition-all duration-200',
          open ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          TONE_CLASS[current.severity] || TONE_CLASS.success,
        )}
      >
        <span className="flex-1">{current.message}</span>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="shrink-0 opacity-80 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
