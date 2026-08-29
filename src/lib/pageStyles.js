import { cn } from './utils'

/* Fase 6c (MI Stack Reference): equivalente Tailwind de src/ui/pageStyles.js
 * (usePageStyles), pero SOLO para las claves que de verdad usa el Dashboard
 * (page, card, cardHeader, cardHeaderTitle, cardHeaderSubtitle, pageTitle,
 * pageSubtitle, metricChip) -- NO reemplaza
 * el archivo original, que sigue vivo y sin tocar para los ~25 archivos
 * (centro-trabajo, registro-personal, etc.) que todavia no se convierten a
 * Tailwind. Cuando esos archivos tengan su turno, se les agregan aqui las
 * claves adicionales que necesiten (kpiCard, statusChip, gauge, ...), nunca
 * antes de que se usen de verdad.
 */

// page: min-h-[calc(100vh-40px)] + animate-fade-in-up (keyframe real en
// tailwind.config.js, replica pixel a pixel `page.animation` del original).
export const pageClass = 'min-h-[calc(100vh-40px)] animate-fade-in-up'

export const pageTitleClass =
  'text-[1.25rem] font-extrabold tracking-[-0.4px] text-foreground sm:text-[1.5rem]'

export const pageSubtitleClass = 'mt-0.5 text-[13px] font-medium text-muted-foreground'

// card/cardHeader*: bordes y fondos usan los mismos tokens shadcn (border,
// card) que el resto de Fase 6 -- MUI usaba un divider ligeramente distinto
// por modo, pero unificar en el token compartido es la evolucion esperada
// del sistema de diseño, no un pixel-match exigido explicitamente para
// Dashboard (a diferencia de Sidebar/AppLayout).
export const cardClass =
  'overflow-hidden rounded-[30px] border border-border transition-shadow duration-200 hover:shadow-md'

export const cardHeaderClass =
  'flex items-center gap-2 border-b border-border bg-black/[.015] px-5 py-3.5 dark:bg-white/[.02]'

export const cardHeaderTitleClass = 'text-[0.9rem] font-bold tracking-[-0.1px] text-foreground'

export const cardHeaderSubtitleClass = 'text-xs text-muted-foreground'

const METRIC_CHIP_TONES = {
  default:
    'border-[#E2E8F0] bg-[#F8FAFC] text-[#334155] dark:border-white/[.08] dark:bg-white/[.05] dark:text-[#E2E8F0]',
  info: 'border-[#A5F3FC] bg-[#ECFEFF] text-[#0E7490] dark:border-[rgba(6,182,212,.15)] dark:bg-[rgba(6,182,212,.08)] dark:text-[#67E8F9]',
  warn: 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] dark:border-[rgba(245,158,11,.15)] dark:bg-[rgba(245,158,11,.08)] dark:text-[#FCD34D]',
  ok: 'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857] dark:border-[rgba(16,185,129,.15)] dark:bg-[rgba(16,185,129,.08)] dark:text-[#6EE7B7]',
  bad: 'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] dark:border-[rgba(239,68,68,.15)] dark:bg-[rgba(239,68,68,.08)] dark:text-[#FCA5A5]',
}

// metricChip(tone): reemplaza ps.metricChip(tone) -- mismo mapa de colores
// exacto (hex/rgba literales copiados de pageStyles.js), como className de
// Tailwind en vez de objeto sx. Uso: <span className={metricChipClass('info')}>
export function metricChipClass(tone = 'default') {
  return cn(
    'inline-flex h-7 items-center rounded-lg border px-2.5 text-xs font-semibold',
    METRIC_CHIP_TONES[tone] || METRIC_CHIP_TONES.default,
  )
}

// Fase 6c (Centro de Trabajo, primer lote -- BajasTab): claves de tabla que
// no usaba Dashboard. tableHeaderRowClass va en <TableRow> (shadcn
// TableHead ya trae su propio color base, esto solo agrega el fondo/
// mayusculas/tracking que MUI aplicaba via '& .MuiTableCell-head').
export const tableHeaderRowClass =
  '[&>th]:bg-black/[.02] dark:[&>th]:bg-white/[.03] [&>th]:text-[0.6875rem] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-[0.6px] [&>th]:text-[rgba(71,85,105,1)] dark:[&>th]:text-[rgba(148,163,184,1)]'

// tableRowClass(idx): hover + zebra impar, mismo criterio que
// ps.tableRow(idx) del original.
export function tableRowClass(idx) {
  return cn(
    'transition-colors hover:bg-[rgba(59,130,246,.02)] dark:hover:bg-[rgba(59,130,246,.04)]',
    idx % 2 === 1 && 'bg-black/[.008] dark:bg-white/[.01]',
  )
}

export const cellTextClass = 'text-[0.8125rem] text-foreground'
export const cellTextSecondaryClass = 'text-[0.8125rem] text-muted-foreground'

const STATUS_CHIP_TONES = {
  PENDIENTE:
    'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309] dark:border-[rgba(245,158,11,.18)] dark:bg-[rgba(245,158,11,.10)] dark:text-[#FCD34D]',
  'EN PROCESO':
    'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8] dark:border-[rgba(59,130,246,.18)] dark:bg-[rgba(59,130,246,.10)] dark:text-[#93C5FD]',
  COMPLETADA:
    'border-[#A7F3D0] bg-[#ECFDF5] text-[#047857] dark:border-[rgba(16,185,129,.18)] dark:bg-[rgba(16,185,129,.10)] dark:text-[#6EE7B7]',
  CANCELADA:
    'border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] dark:border-[rgba(239,68,68,.18)] dark:bg-[rgba(239,68,68,.10)] dark:text-[#FCA5A5]',
}

// statusChip(status): reemplaza ps.statusChip(status) -- mismo mapa exacto
// de src/ui/pageStyles.js, como className.
export function statusChipClass(status) {
  return cn(
    'inline-flex h-6 items-center rounded-full border px-2 text-xs font-semibold',
    STATUS_CHIP_TONES[status] || STATUS_CHIP_TONES.PENDIENTE,
  )
}

// Fase 6c (Centro de Trabajo, primer lote -- AreaStaffSummary): reemplaza
// ps.sectionTitle (fontWeight 700, fontSize 15, letterSpacing -0.2,
// color text.primary) -- mismos valores exactos, como className.
export const sectionTitleClass = 'text-[15px] font-bold tracking-[-0.2px] text-foreground'
