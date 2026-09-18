import { cn } from '@/lib/utils'
import { formatInt } from './formatters'

/* "Insight del día" (2026-09-17, a peticion explicita del usuario: "un mensaje generado por
   CÁLCULO REAL -- nunca IA, nunca texto externo"). El texto sale de un template i18n con
   interpolacion de numeros YA calculados por el backend (todayKpi) -- esta funcion solo decide
   CUAL template usar (mas/menos/igual/sin dato), nunca redacta nada nuevo ni llama a ningun
   servicio externo. */
export default function InsightBanner({ t, insight }) {
  const pctChange = insight?.pctChange
  const qty = insight?.qty ?? 0
  const previous = insight?.previousSameWeekday ?? 0

  let text
  let tone
  if (typeof pctChange !== 'number') {
    text = t('insightNoDataTemplate')
    tone = 'neutral'
  } else if (pctChange > 0) {
    text = t('insightMoreTemplate', { pct: pctChange.toFixed(1), current: formatInt(qty), previous: formatInt(previous) })
    tone = 'good'
  } else if (pctChange < 0) {
    text = t('insightLessTemplate', {
      pct: Math.abs(pctChange).toFixed(1),
      current: formatInt(qty),
      previous: formatInt(previous),
    })
    tone = 'bad'
  } else {
    text = t('insightEqualTemplate', { current: formatInt(qty), previous: formatInt(previous) })
    tone = 'neutral'
  }

  const TONE_CLASSES = {
    good: 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]',
    bad: 'border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  }

  return (
    <div className={cn('rounded-xl border px-6 py-4 text-[16px] font-semibold', TONE_CLASSES[tone])}>{text}</div>
  )
}
