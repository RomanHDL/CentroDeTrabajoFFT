// Constantes visuales EXCLUSIVAS del rediseño "TV" del Dashboard FFT (2026-09-18, a peticion
// explicita del usuario -- pantalla ejecutiva para una TV Samsung de 65", 1920x1080/3840x2160, SIN
// scroll vertical). Deliberadamente SEPARADAS de src/lib/pageStyles.js (cardClass/cardHeaderClass):
// ese archivo es compartido por ~25 paginas normales de escritorio (radio de 30px, sombra al hover,
// pensado para verse de cerca) -- este dashboard necesita radio mas discreto, CERO sombra/hover
// (pantalla fija, nadie la "usa" con mouse) y tipografia que escale con clamp() en vez de breakpoints
// fijos, asi que se define su propio set minimo aqui en vez de forzar esos cambios al archivo
// compartido (que otras ~25 paginas siguen necesitando tal cual).
import { cn } from '@/lib/utils'

export const tvCardClass =
  'flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white'

// Variante para una tarjeta que es hija DIRECTA del flex-col raiz de la pagina (no una celda de
// grid) y debe quedarse a su alto de contenido natural (shrink-0), ej. WeeklySummaryTable. `h-full`
// de `tvCardClass` seria un bug aqui: en un flex item con flex-basis:auto (que es lo que da
// `shrink-0` sin una clase flex-grow explicita), `height:100%` SE CONVIERTE en el flex-basis --
// la tarjeta pediria el 100% del alto del viewport y le robaria todo el espacio disponible a los
// bloques de graficas de arriba (reproducido en vivo el 2026-09-18: las 2 filas de graficas
// colapsaban a 0px de alto exactamente por esto).
export const tvCardClassAuto =
  'flex shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white'

export function tvCardHeaderClass(extra) {
  return cn(
    'flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5',
    extra,
  )
}

export const tvSectionTitleClass =
  'font-bold text-[#0F2C59] text-[clamp(15px,1.05vw,22px)] leading-tight'
export const tvSectionSubtitleClass = 'text-slate-500 text-[clamp(11px,0.62vw,13px)] leading-tight'

// Texto de datos dentro de tablas/listas compactas (nunca por debajo de 13px, a peticion explicita
// del usuario: "NO utilizar microtexto de 9-10px en información importante").
export const tvLabelClass = 'text-[clamp(13px,0.75vw,16px)]'
export const tvSmallLabelClass = 'text-[clamp(11px,0.6vw,13px)]'
