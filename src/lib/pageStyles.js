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

// Fase 6c (Centro de Trabajo -- SelfAssignDialog): reemplaza <Alert
// severity="warning|info|error"> de MUI. El tema MUI (src/ui/theme.js)
// nunca personalizo los colores de severidad de Alert -- son los
// default de MUI, que este repo no tenia portados a Tailwind todavia --
// asi que se reusa el MISMO mapa de tonos warn/info/bad ya establecido
// en METRIC_CHIP_TONES/STATUS_CHIP_TONES (el vocabulario de color
// semantico real de esta migracion), solo con el layout base de
// alertVariants (src/components/ui/alert.jsx: rounded-lg border px-4
// py-3 text-sm) en vez de la forma de chip/pill. Reusable tal cual por
// los demas archivos gigantes pendientes que tambien usan <Alert
// severity=...>.
const ALERT_TONES = {
  warning: METRIC_CHIP_TONES.warn,
  info: METRIC_CHIP_TONES.info,
  error: METRIC_CHIP_TONES.bad,
}

export function alertToneClass(severity = 'info') {
  return cn(
    'relative w-full rounded-lg border px-4 py-3 text-sm',
    ALERT_TONES[severity] || ALERT_TONES.info,
  )
}

// Fase 6c (Centro de Trabajo -- EmployeeHistoryDialog): reemplaza ps.emptyText
// (color text.secondary, textAlign center, py:5, fontSize 0.875rem, fontWeight
// 500, opacity .7) -- mismos valores exactos, como className.
export const emptyTextClass =
  'py-10 text-center text-sm font-medium text-muted-foreground opacity-70'

// Fase 6c (Centro de Trabajo -- EmployeeHistoryDialog): variante que
// alertToneClass (arriba) no cubre todavia -- MUI Alert severity="success",
// mismo tono verde ya establecido en METRIC_CHIP_TONES.ok. Funcion separada
// (no se toca ALERT_TONES/alertToneClass ya escritos) para minimizar riesgo
// de colision mientras otro agente edita este archivo en paralelo.
export function alertSuccessClass() {
  return cn('relative w-full rounded-lg border px-4 py-3 text-sm', METRIC_CHIP_TONES.ok)
}

// Fase 6c (Centro de Trabajo -- LineLikeAreaDetail): reemplaza ps.kpiCard(accent)
// -- mismo mapa de 7 acentos (border/borde-izquierdo/fondo/glow de hover) copiado
// literal de src/ui/pageStyles.js, como className. El borde izquierdo de 3px usa
// las utilidades direccionales border-l-* de Tailwind (no colisionan con el
// border de los otros 3 lados via tailwind-merge, son grupos distintos).
const KPI_ACCENT_CLASS = {
  blue: 'border-[#DBEAFE] border-l-[3px] border-l-[#3B82F6] bg-[rgba(59,130,246,.02)] hover:border-[#3B82F6] hover:shadow-[0_8px_24px_rgba(59,130,246,.08)] dark:border-[rgba(59,130,246,.18)] dark:bg-[rgba(59,130,246,.04)] dark:hover:shadow-[0_8px_24px_rgba(59,130,246,.08),0_0_0_1px_rgba(59,130,246,.18)]',
  green:
    'border-[#A7F3D0] border-l-[3px] border-l-[#10B981] bg-[rgba(16,185,129,.02)] hover:border-[#10B981] hover:shadow-[0_8px_24px_rgba(16,185,129,.08)] dark:border-[rgba(16,185,129,.18)] dark:bg-[rgba(16,185,129,.04)] dark:hover:shadow-[0_8px_24px_rgba(16,185,129,.08),0_0_0_1px_rgba(16,185,129,.18)]',
  red: 'border-[#FEE2E2] border-l-[3px] border-l-[#EF4444] bg-[rgba(239,68,68,.02)] hover:border-[#EF4444] hover:shadow-[0_8px_24px_rgba(239,68,68,.08)] dark:border-[rgba(239,68,68,.18)] dark:bg-[rgba(239,68,68,.04)] dark:hover:shadow-[0_8px_24px_rgba(239,68,68,.08),0_0_0_1px_rgba(239,68,68,.18)]',
  amber:
    'border-[#FEF3C7] border-l-[3px] border-l-[#F59E0B] bg-[rgba(245,158,11,.02)] hover:border-[#F59E0B] hover:shadow-[0_8px_24px_rgba(245,158,11,.08)] dark:border-[rgba(245,158,11,.18)] dark:bg-[rgba(245,158,11,.04)] dark:hover:shadow-[0_8px_24px_rgba(245,158,11,.08),0_0_0_1px_rgba(245,158,11,.18)]',
  purple:
    'border-[#EDE9FE] border-l-[3px] border-l-[#A855F7] bg-[rgba(168,85,247,.02)] hover:border-[#A855F7] hover:shadow-[0_8px_24px_rgba(168,85,247,.08)] dark:border-[rgba(168,85,247,.18)] dark:bg-[rgba(168,85,247,.04)] dark:hover:shadow-[0_8px_24px_rgba(168,85,247,.08),0_0_0_1px_rgba(168,85,247,.18)]',
  cyan: 'border-[#A5F3FC] border-l-[3px] border-l-[#06B6D4] bg-[rgba(6,182,212,.02)] hover:border-[#06B6D4] hover:shadow-[0_8px_24px_rgba(6,182,212,.08)] dark:border-[rgba(6,182,212,.18)] dark:bg-[rgba(6,182,212,.04)] dark:hover:shadow-[0_8px_24px_rgba(6,182,212,.08),0_0_0_1px_rgba(6,182,212,.18)]',
  slate:
    'border-[#E2E8F0] border-l-[3px] border-l-[#64748B] bg-[rgba(100,116,139,.03)] hover:border-[#64748B] hover:shadow-[0_8px_24px_rgba(100,116,139,.08)] dark:border-[rgba(100,116,139,.22)] dark:bg-[rgba(100,116,139,.05)] dark:hover:shadow-[0_8px_24px_rgba(100,116,139,.08),0_0_0_1px_rgba(100,116,139,.22)]',
}

export function kpiCardClass(accent = 'blue') {
  return cn(
    'relative h-full overflow-hidden rounded-[30px] border p-5 transition-all duration-200 ease-[cubic-bezier(.4,0,.2,1)] hover:-translate-y-0.5',
    KPI_ACCENT_CLASS[accent] || KPI_ACCENT_CLASS.blue,
  )
}

// progressBar/progressFill: reemplaza ps.progressBar (track) -- el color/ancho
// del relleno son valores en tiempo de ejecucion (pct, color), asi que el
// relleno se sigue aplicando via style inline en el llamador (mismo patron ya
// usado en SupportAreaDetail.jsx para la barra de cobertura), esta clase solo
// cubre el track estatico.
export const progressBarClass =
  'h-1.5 overflow-hidden rounded-full bg-black/[.06] dark:bg-white/[.06]'
