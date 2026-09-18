import { cn } from '@/lib/utils'
import { cardClass, cardHeaderClass, cardHeaderTitleClass } from '@/lib/pageStyles'
import { formatInt, formatPct } from './formatters'

/* "Resumen diario de la semana" (2026-09-17, a peticion explicita del usuario): tabla compacta
   Día/Semana anterior/Semana actual/Diferencia/Variación, fila de HOY resaltada, fila de Total al
   final usando SOLO los dias comparables entre ambas semanas (weeklySummaryTable.total ya viene
   calculado asi desde server-lib/fftDashboardAggregation.js -- esta tabla nunca sube los dias
   futuros al total). */
export default function WeeklySummaryTable({ t, weeklySummaryTable }) {
  const { rows, total } = weeklySummaryTable

  return (
    <div className={cardClass}>
      <div className={cardHeaderClass}>
        <p className={cardHeaderTitleClass}>{t('summaryTableTitle')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <th className="px-4 py-2.5">{t('colDay')}</th>
              <th className="px-4 py-2.5 text-right">{t('colPreviousWeekShort')}</th>
              <th className="px-4 py-2.5 text-right">{t('colCurrentWeekShort')}</th>
              <th className="px-4 py-2.5 text-right">{t('colDifference')}</th>
              <th className="px-4 py-2.5 text-right">{t('colVariation')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const diff = row.isFuture ? null : row.currentQty - row.previousQty
              const pctText = row.isFuture ? null : formatPct(row.pctChange)
              return (
                <tr
                  key={row.date}
                  className={cn(
                    'border-b border-border/60 last:border-b-0',
                    row.isToday && 'bg-[#EFF6FF] dark:bg-[rgba(59,130,246,.12)]',
                  )}
                >
                  <td className="px-4 py-2.5 font-semibold">{t(`weekday${row.label}`)}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{formatInt(row.previousQty)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {row.isFuture ? '—' : formatInt(row.currentQty)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-semibold',
                      diff === null && 'text-muted-foreground',
                      diff > 0 && 'text-[#047857]',
                      diff < 0 && 'text-[#B91C1C]',
                    )}
                  >
                    {diff === null ? '—' : `${diff >= 0 ? '+' : ''}${formatInt(diff)}`}
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
          <tfoot>
            <tr className="border-t-2 border-border font-extrabold">
              <td className="px-4 py-3">{t('totalRowLabel')}</td>
              <td className="px-4 py-3 text-right">{formatInt(total.previousQty)}</td>
              <td className="px-4 py-3 text-right">{formatInt(total.currentQty)}</td>
              <td
                className={cn(
                  'px-4 py-3 text-right',
                  total.currentQty - total.previousQty > 0 && 'text-[#047857]',
                  total.currentQty - total.previousQty < 0 && 'text-[#B91C1C]',
                )}
              >
                {total.currentQty - total.previousQty >= 0 ? '+' : ''}
                {formatInt(total.currentQty - total.previousQty)}
              </td>
              <td
                className={cn(
                  'px-4 py-3 text-right',
                  typeof total.pctChange === 'number' && total.pctChange > 0 && 'text-[#047857]',
                  typeof total.pctChange === 'number' && total.pctChange < 0 && 'text-[#B91C1C]',
                )}
              >
                {formatPct(total.pctChange) ?? '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
