import { CheckCircle2, Info, Lightbulb, OctagonAlert, TriangleAlert } from 'lucide-react'
import { cardClass, cardHeaderClass, cardHeaderTitleClass } from '@/lib/pageStyles'
import { EmptyState } from '../../ui'

const TONE = {
  bad: { color: '#EF4444', Icon: OctagonAlert },
  warn: { color: '#F59E0B', Icon: TriangleAlert },
  ok: { color: '#10B981', Icon: CheckCircle2 },
  info: { color: '#3B82F6', Icon: Info },
}

// Misma matematica que MUI alpha(color, opacity) (rgba real, no el hack de
// sufijo hex de 2 digitos) -- evita depender de @mui/material/styles.
function withAlpha(hex, opacity) {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`
}

/* "Hallazgos del día" -- reglas deterministicas (dashboardMetrics.js),
   NUNCA texto generado por IA (Parte 21 del prompt). Iconos circulares
   de color + texto corto en 2 líneas (Parte 23), máximo 6 filas, en 2
   columnas cuando hay espacio para no alargar la card verticalmente. */
export default function FindingsCard({ findings }) {
  return (
    <div className={`${cardClass} h-full`}>
      <div className={cardHeaderClass}>
        <div className="flex items-center gap-1.5">
          <Lightbulb className="h-[18px] w-[18px] text-[#F59E0B]" />
          <p className={cardHeaderTitleClass}>Hallazgos del día</p>
        </div>
      </div>
      <div className="p-4">
        {findings.length === 0 ? (
          <EmptyState
            compact
            title="Sin hallazgos por ahora"
            description="No hay condiciones destacables con los datos actuales."
          />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {findings.map((f) => {
              const { color, Icon } = TONE[f.tone] || TONE.info
              return (
                <div key={f.id} className="flex items-start gap-[8.8px]">
                  <div
                    className="mt-[0.8px] grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full"
                    style={{ backgroundColor: withAlpha(color, 0.14), color }}
                  >
                    <Icon className="h-[15px] w-[15px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold leading-[1.3]">{f.title}</p>
                    <p className="text-[11.5px] leading-[1.3] text-muted-foreground">{f.detail}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
