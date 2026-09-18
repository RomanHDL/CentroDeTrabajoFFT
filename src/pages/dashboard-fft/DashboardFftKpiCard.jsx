import { cn } from '@/lib/utils'
import { formatInt, formatPct } from './formatters'

/* KPI grande del "Dashboard FFT" (rediseño 2026-09-18 -- version TV compacta, misma informacion que
   la version anterior pero con menos alto de card para que la fila de 4 KPIs deje mas espacio
   vertical al bloque principal). Verde SOLO para resultados positivos, rojo para negativos, nunca
   otro color para la comparacion (a peticion explicita del usuario). `hidden`: si no hay un dato
   real (ej. "Meta semanal", nunca configurada), el KPI completo NO se renderiza -- nunca un
   placeholder con numero inventado.

   `displayValue` (nuevo): permite mostrar un texto YA formateado (ej. "-27.2%") en vez de pasar por
   formatInt -- usado por el 4o KPI ("VS SEMANA ANTERIOR", 2026-09-18 a peticion explicita del
   usuario), que muestra un porcentaje como valor principal, no una cantidad de piezas. `valueTone`
   colorea ese valor principal en verde/rojo (solo para ese caso; los KPIs de cantidad siempre usan
   el azul marino de texto, igual que antes). Ambos son opcionales y no cambian el comportamiento de
   los 3 KPIs existentes que no los usan. */
export default function DashboardFftKpiCard({
  title,
  value,
  displayValue,
  unit,
  comparisonLabel,
  pctChange,
  referenceValue,
  valueTone,
  hidden,
  hideComparisonRow,
}) {
  if (hidden) return null
  const hasComparison = typeof pctChange === 'number'
  const isUp = hasComparison && pctChange >= 0
  const pctText = hasComparison ? formatPct(pctChange) : null
  const mainValue = displayValue ?? formatInt(value)
  const toneColorClass =
    valueTone === 'up'
      ? 'text-[#047857]'
      : valueTone === 'down'
        ? 'text-[#B91C1C]'
        : 'text-[#0F2C59]'

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[clamp(11px,0.72vw,15px)] font-bold uppercase tracking-[0.1em] text-slate-500">
        {title}
      </p>
      <div>
        <p
          className={cn(
            'text-[clamp(28px,3vw,52px)] font-black leading-none tracking-tight',
            toneColorClass,
          )}
        >
          {mainValue}
        </p>
        <p className="mt-1 text-[clamp(10px,0.6vw,13px)] font-medium text-slate-400">{unit}</p>
      </div>

      <div
        className={cn(
          'mt-2 flex min-h-[22px] flex-wrap items-center gap-2',
          hideComparisonRow && 'hidden',
        )}
      >
        {hasComparison ? (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[clamp(11px,0.65vw,13px)] font-extrabold',
              isUp ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEF2F2] text-[#B91C1C]',
            )}
          >
            {pctText}
          </span>
        ) : (
          <span className="text-[clamp(10px,0.6vw,12.5px)] text-slate-400">{comparisonLabel}</span>
        )}
        {hasComparison && referenceValue !== null && referenceValue !== undefined && (
          <span className="text-[clamp(10px,0.6vw,12.5px)] text-slate-400">
            ({formatInt(referenceValue)})
          </span>
        )}
      </div>
    </div>
  )
}
