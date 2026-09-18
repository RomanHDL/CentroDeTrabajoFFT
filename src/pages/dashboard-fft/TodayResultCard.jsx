import { cn } from '@/lib/utils'
import { formatInt } from './formatters'
import { tvCardClass, tvCardHeaderClass, tvSectionTitleClass } from './tvStyles'

/* "Resultado de hoy" (NUEVO, rediseño 2026-09-18 a peticion explicita del usuario -- tarjeta grande
   junto a "Comparativa semanal de producción" que resume en un vistazo, sin tener que leer la
   grafica, como va el dia de hoy contra el mismo dia de la semana pasada). Usa EXACTAMENTE los
   mismos numeros ya calculados por el backend en `todayKpi` (= `insight`, ver
   server-lib/fftDashboardAggregation.js) -- misma logica de interpretacion (mas/menos/igual/sin
   dato) que InsightBanner.jsx, solo con un layout visual distinto (flecha + % grande en vez de una
   sola linea de texto). InsightBanner.jsx se deja intacto en el codigo por si otra vista lo necesita
   despues; en esta pagina TV se reemplaza por esta tarjeta. */
export default function TodayResultCard({ t, todayKpi }) {
  const pctChange = todayKpi?.pctChange
  const qty = todayKpi?.qty ?? 0
  const previous = todayKpi?.previousSameWeekday ?? 0
  const hasComparison = typeof pctChange === 'number'

  let sentence
  let tone
  if (!hasComparison) {
    sentence = t('insightNoDataTemplate')
    tone = 'neutral'
  } else if (pctChange > 0) {
    sentence = t('insightMoreTemplate', {
      pct: pctChange.toFixed(1),
      current: formatInt(qty),
      previous: formatInt(previous),
    })
    tone = 'good'
  } else if (pctChange < 0) {
    sentence = t('insightLessTemplate', {
      pct: Math.abs(pctChange).toFixed(1),
      current: formatInt(qty),
      previous: formatInt(previous),
    })
    tone = 'bad'
  } else {
    sentence = t('insightEqualTemplate', { current: formatInt(qty), previous: formatInt(previous) })
    tone = 'neutral'
  }

  const TONE = {
    good: { bg: 'bg-[#ECFDF5]', text: 'text-[#047857]', arrow: '↑' },
    bad: { bg: 'bg-[#FEF2F2]', text: 'text-[#B91C1C]', arrow: '↓' },
    neutral: { bg: 'bg-slate-50', text: 'text-slate-500', arrow: '—' },
  }[tone]

  return (
    <div className={tvCardClass}>
      <div className={tvCardHeaderClass()}>
        <p className={tvSectionTitleClass}>{t('todayResultTitle')}</p>
      </div>
      <div
        className={cn(
          'flex flex-1 min-h-0 flex-col items-center justify-center gap-3 rounded-b-xl px-4 py-3 text-center',
          TONE.bg,
        )}
      >
        <p className={cn('text-[clamp(34px,3.4vw,58px)] font-black leading-none', TONE.text)}>
          {hasComparison ? (
            <>
              <span className="mr-1">{TONE.arrow}</span>
              {pctChange >= 0 ? '+' : ''}
              {pctChange.toFixed(1)}%
            </>
          ) : (
            '—'
          )}
        </p>
        <p className="max-w-[26ch] text-[clamp(12px,0.72vw,15px)] font-semibold leading-snug text-slate-600">
          {sentence}
        </p>
        <div className="flex items-center gap-2 text-[clamp(13px,0.8vw,17px)] font-extrabold text-[#0F2C59]">
          <span>
            {formatInt(qty)}{' '}
            <span className="font-medium text-slate-400">{t('todayResultCurrentLabel')}</span>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            {formatInt(previous)}{' '}
            <span className="font-medium text-slate-400">{t('todayResultPreviousLabel')}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
