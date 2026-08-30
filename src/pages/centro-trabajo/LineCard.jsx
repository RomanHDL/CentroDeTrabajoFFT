import { Users } from 'lucide-react'
import { kpiCardClass, progressBarClass } from '@/lib/pageStyles'
import { cn, hexToRgba } from '@/lib/utils'

const ACCENT_HEX = {
  blue: '#3B82F6',
  green: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  slate: '#64748B',
}

/* Fase 6c: convertido de MUI (Paper/Box/Typography/Stack/Chip + sx) a
   Tailwind. kpiCardClass(accent)/progressBarClass (src/lib/pageStyles.js)
   reemplazan ps.kpiCard(accent)/ps.progressBar (la version MUI, src/ui/
   pageStyles.js) -- mismo mapa de acentos por nombre. summary.status.dot y
   accentColor siguen siendo colores dinamicos en tiempo de ejecucion (no
   un set fijo de 5 hex conocidos de antemano por Tailwind), asi que se
   resuelven con hexToRgba()/style inline (mismo patron ya usado en
   LineStationCard.jsx/LineWorkstationCard.jsx para colores de acento por
   estado), nunca interpolando un className. Sin nodos interactivos
   anidados -> la tarjeta completa es un <button> real (regla de a11y). */
export default function LineCard({ summary, onOpen }) {
  const accentColor = ACCENT_HEX[summary.tone.accent] || ACCENT_HEX.slate
  const pct = summary.pct ?? 0

  return (
    <button
      type="button"
      onClick={() => onOpen(summary.id)}
      className={cn(
        kpiCardClass(summary.tone.accent),
        'flex w-full min-h-[190px] flex-col gap-2 p-4 text-left',
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[17px] font-extrabold tracking-[-0.3px] text-foreground">
          {summary.name}
        </p>
        <span
          className="mt-[4.8px] h-[9px] w-[9px] shrink-0 rounded-full"
          style={{
            backgroundColor: summary.status.dot,
            boxShadow: `0 0 0 3px ${hexToRgba(summary.status.dot, 0.18)}`,
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Users className="h-[15px] w-[15px] text-muted-foreground" />
        <p className="text-[12.5px] font-semibold text-muted-foreground">
          {summary.personnel} / {summary.capacityTotal} personas
        </p>
        <span
          className="inline-flex h-5 items-center rounded-full border px-2 text-[10.5px] font-bold"
          style={{
            backgroundColor: hexToRgba(summary.status.dot, 0.1),
            borderColor: hexToRgba(summary.status.dot, 0.22),
            color: summary.status.dot,
          }}
        >
          {summary.status.label}
        </span>
      </div>

      {summary.stationsAvailable > 0 && (
        <p className="text-[11px] font-bold text-[#B45309]">
          ⚠ {summary.stationsAvailable} estación{summary.stationsAvailable !== 1 ? 'es' : ''}{' '}
          disponible{summary.stationsAvailable !== 1 ? 's' : ''}
        </p>
      )}

      {summary.target == null ? (
        <div className="mt-1">
          <p className="text-[12.5px] italic text-muted-foreground">
            Sin datos de producción todavía
          </p>
        </div>
      ) : (
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-extrabold leading-none text-foreground">
              {summary.production.toLocaleString('es-MX')}
            </p>
            <p className="text-[13px] font-semibold text-muted-foreground">
              / {summary.target.toLocaleString('es-MX')} piezas
            </p>
          </div>

          <div className="mt-2">
            <div className={progressBarClass}>
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
                style={{
                  width: `${Math.max(0, Math.min(100, pct))}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>
            <div className="mt-1 flex justify-between">
              <p className="text-xs font-bold" style={{ color: accentColor }}>
                {pct}% — {summary.tone.label}
              </p>
              <p className="text-[11px] text-muted-foreground">+{summary.ultimaHora} última hora</p>
            </div>
          </div>
        </div>
      )}
    </button>
  )
}
