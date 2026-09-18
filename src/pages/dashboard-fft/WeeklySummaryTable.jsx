import { cn } from '@/lib/utils'
import { formatInt, formatPct } from './formatters'
import { tvCardClass, tvCardHeaderClass, tvSectionTitleClass } from './tvStyles'

/* "Resumen diario de la semana" -- rediseño 2026-09-18 (TV, a peticion explicita del usuario:
   "disposición horizontal... esta estructura ocupa muchísimo menos espacio vertical"). Misma fuente
   real sin cambios (`weeklySummaryTable.rows`/`.total`, ya calculados por
   server-lib/fftDashboardAggregation.js) -- este componente solo TRANSPONE la tabla (antes:
   Día×fila / metrica×columna; ahora: metrica×fila / Día×columna), una tabla mas ancha que alta en
   vez de 7 filas verticales, para caber en 1 sola pantalla de TV sin scroll. Un dia futuro
   (`isFuture`) sigue mostrando "—" en vez de "0"/"-100%" -- nunca se infiere produccion cero de un
   dia que todavia no paso. */
export default function WeeklySummaryTable({ t, weeklySummaryTable }) {
  const { rows, total } = weeklySummaryTable
  const totalDiff = total.currentQty - total.previousQty

  return (
    <div className={cn(tvCardClass, 'shrink-0')}>
      <div className={tvCardHeaderClass()}>
        <p className={tvSectionTitleClass}>{t('summaryTableTitle')}</p>
      </div>
      <div className="overflow-x-auto px-1 py-1">
        <table className="w-full min-w-[760px] border-collapse text-[clamp(12px,0.7vw,15px)]">
          <thead>
            <tr className="text-left text-[clamp(9px,0.5vw,11px)] font-bold uppercase tracking-[0.06em] text-slate-400">
              <th className="w-[160px] px-3 py-1.5" />
              {rows.map((row) => (
                <th
                  key={row.date}
                  className={cn(
                    'px-2 py-1.5 text-right',
                    row.isToday && 'rounded-t-md bg-[#EFF6FF]',
                  )}
                >
                  {t(`weekday${row.label}`)}
                </th>
              ))}
              <th className="px-3 py-1.5 text-right">{t('totalRowLabel')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-semibold text-slate-500">
                {t('colPreviousWeekShort')}
              </td>
              {rows.map((row) => (
                <td
                  key={row.date}
                  className={cn(
                    'px-2 py-1.5 text-right text-slate-500',
                    row.isToday && 'bg-[#EFF6FF]',
                  )}
                >
                  {formatInt(row.previousQty)}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-bold text-slate-500">
                {formatInt(total.previousQty)}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-semibold text-[#0F2C59]">
                {t('colCurrentWeekShort')}
              </td>
              {rows.map((row) => (
                <td
                  key={row.date}
                  className={cn(
                    'px-2 py-1.5 text-right font-bold text-[#0F2C59]',
                    row.isToday && 'bg-[#EFF6FF]',
                  )}
                >
                  {row.isFuture ? '—' : formatInt(row.currentQty)}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-extrabold text-[#0F2C59]">
                {formatInt(total.currentQty)}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-3 py-1.5 font-semibold text-slate-500">{t('colDifference')}</td>
              {rows.map((row) => {
                const diff = row.isFuture ? null : row.currentQty - row.previousQty
                return (
                  <td
                    key={row.date}
                    className={cn(
                      'px-2 py-1.5 text-right font-bold',
                      row.isToday && 'bg-[#EFF6FF]',
                      diff === null && 'text-slate-400',
                      diff > 0 && 'text-[#047857]',
                      diff < 0 && 'text-[#B91C1C]',
                    )}
                  >
                    {diff === null ? '—' : `${diff >= 0 ? '+' : ''}${formatInt(diff)}`}
                  </td>
                )
              })}
              <td
                className={cn(
                  'px-3 py-1.5 text-right font-extrabold',
                  totalDiff > 0 && 'text-[#047857]',
                  totalDiff < 0 && 'text-[#B91C1C]',
                )}
              >
                {totalDiff >= 0 ? '+' : ''}
                {formatInt(totalDiff)}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="rounded-bl-md px-3 py-1.5 font-semibold text-slate-500">
                {t('colVariation')}
              </td>
              {rows.map((row) => {
                const pctText = row.isFuture ? null : formatPct(row.pctChange)
                return (
                  <td
                    key={row.date}
                    className={cn(
                      'px-2 py-1.5 text-right font-bold',
                      row.isToday && 'rounded-b-md bg-[#EFF6FF]',
                      pctText === null && 'text-slate-400',
                      typeof row.pctChange === 'number' && row.pctChange > 0 && 'text-[#047857]',
                      typeof row.pctChange === 'number' && row.pctChange < 0 && 'text-[#B91C1C]',
                    )}
                  >
                    {pctText ?? '—'}
                  </td>
                )
              })}
              <td
                className={cn(
                  'px-3 py-1.5 text-right font-extrabold',
                  typeof total.pctChange === 'number' && total.pctChange > 0 && 'text-[#047857]',
                  typeof total.pctChange === 'number' && total.pctChange < 0 && 'text-[#B91C1C]',
                )}
              >
                {formatPct(total.pctChange) ?? '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
