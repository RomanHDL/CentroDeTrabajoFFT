import { cn } from '@/lib/utils'
import { cardClass, cardHeaderClass, cardHeaderTitleClass } from '@/lib/pageStyles'
import { CATEGORY_COLORS } from './CategoryComparisonChart'
import { formatInt, formatPct } from './formatters'

/* "Tabla de condiciones" (2026-09-18, a peticion explicita del usuario: "quiero que me pongas las
   7 condiciones en una tabla y su numero correspondiente" -- complementa al grafico de barras de
   "Producción por condición" con los numeros exactos en formato tabla, mas facil de leer con
   precision que la altura de una barra desde lejos en una TV. Mismo estilo/columnas que
   WeeklySummaryTable (Semana anterior/actual/Diferencia/Variación), mismo orden fijo de las 7
   condiciones vendibles y mismos colores que el grafico de barras (CATEGORY_COLORS), para que el
   punto de color de cada fila coincida visualmente con su barra de arriba. */
export default function ConditionTable({ t, conditionBreakdown }) {
  return (
    <div className={cardClass}>
      <div className={cardHeaderClass}>
        <p className={cardHeaderTitleClass}>{t('conditionTableTitle')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <th className="px-4 py-2.5">{t('colCondition')}</th>
              <th className="px-4 py-2.5 text-right">{t('colPreviousWeekShort')}</th>
              <th className="px-4 py-2.5 text-right">{t('colCurrentWeekShort')}</th>
              <th className="px-4 py-2.5 text-right">{t('colDifference')}</th>
              <th className="px-4 py-2.5 text-right">{t('colVariation')}</th>
            </tr>
          </thead>
          <tbody>
            {conditionBreakdown.map((row, i) => {
              const diff = row.currentQty - row.previousQty
              const pctText = formatPct(row.pctChange)
              return (
                <tr key={row.code} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-2.5 font-semibold">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                      />
                      {row.code}
                      {row.name && <span className="font-normal text-muted-foreground">· {row.name}</span>}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{formatInt(row.previousQty)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatInt(row.currentQty)}</td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-semibold',
                      diff === 0 && 'text-muted-foreground',
                      diff > 0 && 'text-[#047857]',
                      diff < 0 && 'text-[#B91C1C]',
                    )}
                  >
                    {diff >= 0 ? '+' : ''}
                    {formatInt(diff)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-semibold',
                      pctText === null && 'text-muted-foreground',
                      typeof row.pctChange === 'number' && row.pctChange > 0 && 'text-[#047857]',
                      typeof row.pctChange === 'number' && row.pctChange < 0 && 'text-[#B91C1C]',
                    )}
                  >
                    {pctText ?? '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
