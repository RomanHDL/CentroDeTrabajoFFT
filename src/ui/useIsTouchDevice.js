import useMediaQuery from '@mui/material/useMediaQuery'

/* Unica fuente de verdad de "es un dispositivo touch" (tablet/celular)
   vs "tiene mouse real" (desktop/laptop) — por CAPACIDAD del
   dispositivo, nunca por ancho de pantalla (una ventana chica con
   mouse real sigue reportando hover:hover + pointer:fine). Ya se
   usaba este mismo media query en AppLayout para decidir el modo del
   sidebar (overlay por hover vs drawer con hamburguesa); ahora vive
   aqui para que la restriccion de navegacion/rutas (2026-08-20, a
   peticion del usuario: en touch solo Registro de personal y Centro
   de Trabajo) use exactamente la misma deteccion. */
export function useIsTouchDevice() {
  const hasFineHover = useMediaQuery('(hover: hover) and (pointer: fine)')
  return !hasFineHover
}
