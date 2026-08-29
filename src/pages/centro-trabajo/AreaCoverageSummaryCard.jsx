import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { hexToRgba } from '@/lib/utils'
import { usePersonnelVersion } from '../../data/personnel/usePersonnelVersion'
import { getAllAreaSummaries } from '../../data/production/personnelByArea'

const VISIBLE_LIMIT = 8

/* "Resumen por area" -- mismos datos de siempre (getAllAreaSummaries,
   personnelByArea.js), restylado a mini-cards uniformes con barra de
   cobertura (antes no la tenian) -- a peticion explicita del usuario
   (2026-08-25). Antes vivia junto al resumen general dentro de
   AreaSummaryStrip.jsx (ya no existe, se dividio en 2 componentes). */
export default function AreaCoverageSummaryCard({ onSelectArea }) {
  const [showAll, setShowAll] = useState(false)
  // `version` fuerza refrescar getAllAreaSummaries() cuando cambia el estado
  // de personal, aunque no se lea dentro del callback -- comportamiento
  // original (usePersonnelVersion + useMemo) preservado tal cual.
  const version = usePersonnelVersion()
  // biome-ignore lint/correctness/useExhaustiveDependencies: ver comentario arriba
  const summaries = useMemo(() => getAllAreaSummaries(), [version])
  const withPeople = summaries.filter((s) => s.count > 0)
  const visible = showAll ? summaries : withPeople.slice(0, VISIBLE_LIMIT)

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <p className="text-[14.5px] font-extrabold">Resumen por área</p>
          <p className="text-[11.5px] text-muted-foreground">
            Personal actual frente a la plantilla ideal, por área
          </p>
        </div>
        {(summaries.length > visible.length || showAll) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll((v) => !v)}
            className="shrink-0 gap-1 font-bold text-primary hover:text-primary"
          >
            {showAll ? 'Ver menos' : 'Ver todas las áreas'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {visible.map((s) => {
          const ideal = s.ideal ?? null
          const hasIdeal = ideal != null && ideal > 0
          const complete = hasIdeal && s.count >= ideal
          const missing = hasIdeal ? ideal - s.count : 0
          const pct = hasIdeal ? (s.count / ideal) * 100 : null
          const barPct = pct != null ? Math.min(pct, 100) : 0
          const color = !hasIdeal
            ? s.count > 0
              ? '#10B981'
              : '#94A3B8'
            : complete
              ? '#10B981'
              : '#EF4444'
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectArea(s.id)}
              style={{ borderLeftColor: color }}
              className="block min-w-0 cursor-pointer rounded-[20px] border border-l-[3px] border-border p-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)]"
            >
              <p className="truncate text-[12.5px] font-extrabold">{s.name}</p>
              <p className="mt-[1.2px] text-base font-extrabold">
                {hasIdeal ? `${s.count} / ${ideal}` : s.count}
              </p>
              <p className="mb-1 text-[10px] font-bold" style={{ color }}>
                {hasIdeal
                  ? complete
                    ? 'Completa'
                    : missing === 1
                      ? 'Falta 1'
                      : `Faltan ${missing}`
                  : s.count > 0
                    ? 'Con personal'
                    : 'Sin plantilla'}
              </p>
              {hasIdeal ? (
                <div className="flex items-center gap-[4.8px]">
                  <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${barPct}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="shrink-0 text-[9.5px] font-bold" style={{ color }}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
              ) : (
                <div
                  className="h-[5px] rounded-full"
                  style={{ backgroundColor: hexToRgba(color, 0.15) }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
