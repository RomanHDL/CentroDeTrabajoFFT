import { formatInt, formatPct } from './formatters'
import {
  tvCardClass,
  tvCardHeaderClass,
  tvSectionSubtitleClass,
  tvSectionTitleClass,
  tvSmallLabelClass,
} from './tvStyles'

/* "Producción por pulgadas" -- version COMPACTA en 2 columnas (rediseño 2026-09-18, a peticion
   explicita del usuario: la version anterior, un grafico de barras con una barra por cada tamaño
   real detectado -- pueden ser 14+ -- amontonaba las etiquetas de % una encima de otra y era
   ilegible en una TV). Misma fuente real sin cambios (`sizeBreakdown`) -- esta lista NO agrega ni
   quita tamaños, solo los reparte en 2 columnas para que quepan legibles. "Sin dato" (size === null,
   NUNCA escondido, mismo criterio ya usado en el resto del dashboard) siempre se separa al final,
   nunca mezclado entre los tamaños reales. */
function SizeRow({ t, row }) {
  const pctText = formatPct(row.pctChange)
  const isUnknown = row.size === null
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span
        className={
          tvSmallLabelClass +
          ' w-[42px] shrink-0 font-bold ' +
          (isUnknown ? 'text-slate-400' : 'text-[#0F2C59]')
        }
      >
        {isUnknown ? t('sizeUnknownLabel') : `${row.size}"`}
      </span>
      <span className="text-[clamp(12px,0.68vw,15px)] flex-1 text-right font-extrabold text-[#0F2C59]">
        {formatInt(row.currentQty)}
      </span>
      <span
        className={
          'w-[58px] shrink-0 text-right text-[clamp(11px,0.62vw,14px)] font-bold ' +
          (pctText === null
            ? 'text-slate-400'
            : row.pctChange >= 0
              ? 'text-[#047857]'
              : 'text-[#B91C1C]')
        }
      >
        {pctText ?? '—'}
      </span>
    </div>
  )
}

export default function SizeCompactList({ t, rows }) {
  const known = rows.filter((r) => r.size !== null)
  const unknown = rows.find((r) => r.size === null)
  const half = Math.ceil(known.length / 2)
  const colA = known.slice(0, half)
  const colB = known.slice(half)

  return (
    <div className={tvCardClass}>
      <div className={tvCardHeaderClass()}>
        <div className="min-w-0">
          <p className={tvSectionTitleClass}>{t('sizeChartTitle')}</p>
          <p className={tvSectionSubtitleClass}>{t('sizeChartSubtitle')}</p>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 flex-col justify-between px-4 py-2">
        <div className="grid grid-cols-2 gap-x-4 divide-x divide-slate-100">
          <div className="flex flex-col divide-y divide-slate-50 pr-2">
            {colA.map((row) => (
              <SizeRow key={row.size} t={t} row={row} />
            ))}
          </div>
          <div className="flex flex-col divide-y divide-slate-50 pl-2">
            {colB.map((row) => (
              <SizeRow key={row.size} t={t} row={row} />
            ))}
          </div>
        </div>
        {unknown && (
          <div className="mt-1.5 shrink-0 border-t border-slate-100 pt-1.5">
            <SizeRow t={t} row={unknown} />
          </div>
        )}
      </div>
    </div>
  )
}
