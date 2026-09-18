import { CATEGORY_COLORS } from './CategoryComparisonChart'
import { formatInt, formatPct } from './formatters'
import {
  tvCardClass,
  tvCardHeaderClass,
  tvLabelClass,
  tvSectionSubtitleClass,
  tvSectionTitleClass,
} from './tvStyles'

/* "Producción por condición" -- version COMPACTA tipo ranking (rediseño 2026-09-18, a peticion
   explicita del usuario: "NO quiero una gráfica grande... quiero una visualización COMPACTA tipo
   ranking"), reemplaza al CategoryComparisonChart de barras para este dashboard. Misma fuente real
   sin cambios (`conditionBreakdown`, orden fijo de las 7 condiciones vendibles, mismos colores
   CATEGORY_COLORS que ya usaba el grafico/tabla anteriores para que el color de cada condicion sea
   consistente en toda la pantalla). Cada fila: barra doble mini (anterior=gris, actual=color de la
   condicion) a escala del maximo real de la lista, con los 2 numeros y el % a la derecha. */
export default function ConditionRankingCard({ t, rows }) {
  const maxQty = Math.max(1, ...rows.map((r) => Math.max(r.currentQty, r.previousQty)))

  return (
    <div className={tvCardClass}>
      <div className={tvCardHeaderClass()}>
        <div className="min-w-0">
          <p className={tvSectionTitleClass}>{t('conditionChartTitle')}</p>
          <p className={tvSectionSubtitleClass}>{t('conditionChartSubtitle')}</p>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 flex-col justify-around gap-1 px-4 py-2">
        {rows.map((row, i) => {
          const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
          const pctText = formatPct(row.pctChange)
          return (
            <div key={row.code} className="flex items-center gap-3">
              <div className="w-[112px] shrink-0 truncate">
                <span className={`${tvLabelClass} font-bold text-[#0F2C59]`}>{row.code}</span>
                {row.name && (
                  <span className="ml-1 text-[clamp(10px,0.55vw,12px)] text-slate-400">
                    {row.name}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-300"
                      style={{ width: `${(row.previousQty / maxQty) * 100}%` }}
                    />
                  </div>
                  <span className={tvSmallText}>{formatInt(row.previousQty)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(row.currentQty / maxQty) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className={`${tvLabelClass} font-extrabold text-[#0F2C59]`}>
                    {formatInt(row.currentQty)}
                  </span>
                </div>
              </div>
              <span
                className={
                  'w-[64px] shrink-0 text-right text-[clamp(12px,0.68vw,15px)] font-extrabold ' +
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
        })}
      </div>
    </div>
  )
}

const tvSmallText = 'text-[clamp(10px,0.55vw,12px)] text-slate-400'
