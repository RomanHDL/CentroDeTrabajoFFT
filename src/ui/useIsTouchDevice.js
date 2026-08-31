import { useEffect, useState } from 'react'

const QUERY = '(hover: hover) and (pointer: fine)'

/* Unica fuente de verdad de "es un dispositivo touch" (tablet/celular)
   vs "tiene mouse real" (desktop/laptop) — por CAPACIDAD del
   dispositivo, nunca por ancho de pantalla (una ventana chica con
   mouse real sigue reportando hover:hover + pointer:fine). Ya se
   usaba este mismo media query en AppLayout para decidir el modo del
   sidebar (overlay por hover vs drawer con hamburguesa); ahora vive
   aqui para que la restriccion de navegacion/rutas (2026-08-20, a
   peticion del usuario: en touch solo Registro de personal y Centro
   de Trabajo) use exactamente la misma deteccion.

   Fase 6c: reemplaza useMediaQuery('...') de MUI por matchMedia nativo
   (mismo patron ya usado en src/ui/RotateDeviceHint.jsx).

   2026-08-31 (bug real reportado por el usuario en tablet fisica, sin
   sidebar ni forma de navegar a otro modulo): varias tablets (sobre
   todo Windows, o con soporte de lapiz/trackpad) reportan
   `pointer: fine` como verdadero AUNQUE el usuario interactue por
   touch -- con la deteccion anterior (solo la media query) esas
   tablets quedaban clasificadas como "desktop con mouse", y
   AppLayout.jsx les mostraba el hotspot invisible de hover en vez del
   boton hamburguesa+Sheet, sin ningun mecanismo alcanzable por touch
   para abrir el sidebar. Fix: si el dispositivo reporta CUALQUIER
   capacidad tactil real (`ontouchstart`/`maxTouchPoints`), se trata
   como touch sin importar lo que diga la media query -- un mouse real
   sigue funcionando igual de bien con el boton hamburguesa, asi que
   priorizar touch cuando ambas capacidades coexisten es siempre
   seguro (nunca deja a nadie sin forma de abrir el menu). */
function hasTouchCapability() {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0
}

export function useIsTouchDevice() {
  const [hasFineHover, setHasFineHover] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const handleChange = () => setHasFineHover(mql.matches)
    handleChange()
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return !hasFineHover || hasTouchCapability()
}
