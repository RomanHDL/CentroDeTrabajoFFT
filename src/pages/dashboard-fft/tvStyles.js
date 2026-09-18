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
