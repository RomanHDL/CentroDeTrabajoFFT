import { cardClass, cardHeaderClass, cardHeaderTitleClass } from '@/lib/pageStyles'
import { formatInt } from './formatters'

/* "Tabla cruzada" condición × tamaño (2026-09-18, a peticion explicita del usuario -- mismo formato
   que "RESUMEN: unidades por tamaño y clasificación" del dashboard REAL de la empresa
   (BinManager/FFTDashboardProduction), pero filtrado a las 7 condiciones vendibles y usando SOLO el
   periodo comparable de la semana actual (mismo criterio que el resto de este dashboard). Un guion
   "-" en una celda (no "0") cuando esa combinacion condicion×tamaño no tuvo ninguna pieza, igual
   que se ve en la tabla real de referencia. */
export default function ConditionSizeCrosstabTable({ t, conditionSizeCrosstab }) {
  const { sizes, rows, totalsBySize, grandTotal } = conditionSizeCrosstab
  if (rows.length === 0) return null

  return (
    <div className={cardClass}>
      <div className={cardHeaderClass}>
        <p className={cardHeaderTitleClass}>{t('crosstabTitle')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-white">
              <th className="bg-[#0F2C59] px-4 py-2.5">{t('colCondition')}</th>
              {sizes.map((size) => (
                <th key={size ?? 'null'} className="bg-[#0F2C59] px-3 py-2.5 text-right">
                  {size === null ? t('sizeUnknownLabel') : `${size}"`}
                </th>
              ))}
              <th className="bg-[#0F2C59] px-4 py-2.5 text-right">{t('colTotalGeneral')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="border-b border-border/60">
                <td className="px-4 py-2 font-semibold">
                  {row.code}
                  {row.name && <span className="ml-1 font-normal text-muted-foreground">· {row.name}</span>}
                </td>
                {sizes.map((size) => {
                  const qty = row.bySize[size ?? 'null']
                  return (
                    <td key={size ?? 'null'} className="px-3 py-2 text-right text-muted-foreground">
                      {qty > 0 ? formatInt(qty) : '—'}
                    </td>
                  )
                })}
                <td className="bg-[#EFF6FF] px-4 py-2 text-right font-bold text-[#0F2C59]">{formatInt(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold text-white">
              <td className="bg-[#0F2C59] px-4 py-2.5">{t('colTotalGeneral')}</td>
              {sizes.map((size) => (
                <td key={size ?? 'null'} className="bg-[#0F2C59] px-3 py-2.5 text-right">
                  {formatInt(totalsBySize[size ?? 'null'])}
                </td>
              ))}
              <td className="bg-[#0F2C59] px-4 py-2.5 text-right">{formatInt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
