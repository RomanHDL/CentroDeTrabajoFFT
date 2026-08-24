import { WORK_CENTERS, LINES_ONLY } from './catalog'

/* ─────────────────────────────────────────────
   Aproximacion 2D del plano fisico real (fragmento CAD compartido
   por el usuario 2026-08-24 -- un recorte, NO el plano completo del
   edificio). Solo se dibujan con posicion real las zonas visibles en
   ese fragmento: bahias FFT + conveyor arriba, CT Midea/High Value,
   CT Paletizado, CT Accesorios, y dos zonas de referencia sin area
   de catalogo mapeada (Box Prep, PNP/POC/PEN). Todo lo demas del
   catalogo real (soporte/liderazgo, Linea de Proyecto/CT 0, Sellado,
   Insumos, Suministro de material) no aparece en ese recorte -- se
   muestra aparte en un panel de "otras areas" (ver getUnplottedAreas),
   nunca se le inventa una posicion en el dibujo.

   IMPORTANTE sobre las 10 lineas: el recorte muestra columnas de
   bahia repetidas etiquetadas genericamente "FFT" -- nunca "Linea 1",
   "Linea 2", etc. No hay forma de confirmar desde ese dibujo cual
   bahia fisica corresponde a cual numero de linea del catalogo. Las
   celdas de linea aqui se dibujan en el orden del catalogo
   (LINEA1..LINEA10), NO en un orden fisico verificado -- si algun
   dia se confirma la correspondencia real bahia-a-linea, solo hay
   que reordenar este arreglo.
   ───────────────────────────────────────────── */

export const FFT_LINE_IDS = LINES_ONLY.map((w) => w.id)

/* Zonas dibujadas con posicion real en el plano, cada una ligada a
   un area real del catalogo (conteo en vivo). `gridArea` referencia
   el grid-template-areas armado en Layout2DPage.jsx. */
export const DRAWN_ZONES = [
  { areaId: 'CONVEYOR', gridArea: 'conveyor' },
  ...FFT_LINE_IDS.map((id, i) => ({ areaId: id, gridArea: `line${i + 1}` })),
  { areaId: 'HIGH_VALUE', gridArea: 'midea' },
  { areaId: 'PALETIZADO', gridArea: 'palletizing' },
  { areaId: 'ACCESORIOS', gridArea: 'accessories' },
]

/* Zonas visibles en el recorte SIN area de catalogo mapeada con
   confianza -- se dibujan como referencia (sin conteo) en vez de
   forzar un mapeo incierto a un area real. */
export const REFERENCE_ONLY_ZONES = [
  { label: 'Box Prep', gridArea: 'boxprep' },
  { label: 'PNP / POC / PEN', gridArea: 'pnp' },
]

const DRAWN_IDS = new Set(DRAWN_ZONES.map((z) => z.areaId))

/* Todo lo demas del catalogo real que no aparece en este recorte de
   plano -- se muestra en un panel aparte con su conteo en vivo igual
   que las zonas dibujadas, solo que sin posicion fisica asignada. */
export function getUnplottedAreas() {
  return WORK_CENTERS.filter((w) => !DRAWN_IDS.has(w.id))
}
