import { cn } from '@/lib/utils'
import { formatInt, formatPct } from './formatters'

/* KPI grande del "Dashboard FFT" (2026-09-17) -- DELIBERADAMENTE distinto de ProductionKpiCard
   (Producción FFT): tipografia mas grande y menos color decorativo (sparklines/iconos), pensado
   para leerse a distancia en una TV, no para verse de cerca en un monitor de escritorio. Verde
   SOLO para resultados positivos, rojo para negativos, nunca otro color para la comparacion (a
   peticion explicita del usuario). `hidden` (2026-09-17, "Meta semanal"): si no hay una meta real
   configurada en el sistema, el KPI completo NO se renderiza -- nunca un placeholder con numero
   inventado. */
export default function DashboardFftKpiCard({ title, value, unit, comparisonLabel, pctChange, referenceValue, hidden }) {
  if (hidden) return null
  const hasComparison = typeof pctChange === 'number'
  const isUp = hasComparison && pctChange >= 0
  const pctText = hasComparison ? formatPct(pctChange) : null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {title}
      </p>
      <p className="mt-2.5 text-[44px] font-black leading-none tracking-tight text-[#0F2C59] sm:text-[52px]">
        {formatInt(value)}
      </p>
      <p className="mt-1 text-[13px] font-medium text-slate-400">{unit}</p>

      <div className="mt-3.5 flex min-h-[26px] flex-wrap items-center gap-2">
        {hasComparison ? (
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-extrabold',
              isUp ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEF2F2] text-[#B91C1C]',
            )}
          >
            {pctText}
          </span>
        ) : (
          <span className="text-[12.5px] text-slate-400">{comparisonLabel}</span>
        )}
        {hasComparison && referenceValue !== null && referenceValue !== undefined && (
          <span className="text-[12.5px] text-slate-400">({formatInt(referenceValue)})</span>
        )}
      </div>
    </div>
  )
}
