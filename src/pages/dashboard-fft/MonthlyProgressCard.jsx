import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { cardClass, cardHeaderClass, cardHeaderTitleClass } from '@/lib/pageStyles'
import { formatInt, formatPct } from './formatters'

/* "Avance mensual" (2026-09-17, a peticion explicita del usuario). Sin meta mensual real
   configurada en ningun lado del sistema -- `accumulated.goal` SIEMPRE llega null desde
   server-lib/fftDashboardAggregation.js, asi que la barra de progreso NUNCA se renderiza; en su
   lugar se muestra la comparacion contra el MISMO RANGO de dias del mes anterior (nunca el mes
   anterior completo, para no falsear la conclusion con un mes actual todavia incompleto). Nombres
   de mes via i18n (month1..month12) en vez de dayjs().format('MMMM') -- este proyecto no carga
   ningun locale de dayjs (confirmado, ver shared/isoWeek.js/comentario de investigacion), asi que
   depender de dayjs para el nombre del mes mostraria siempre ingles sin importar el idioma
   elegido; esto evita tocar la configuracion global de dayjs solo para esta pantalla. */
export default function MonthlyProgressCard({ t, monthly }) {
  const { year, month, accumulated } = monthly
  const monthLabel = `${t(`month${month}`)} ${year}`
  const diff = accumulated.currentQty - accumulated.previousRangeQty
  const hasGoal = accumulated.goal !== null && accumulated.goal !== undefined
  const goalPct = hasGoal ? Math.min(100, (accumulated.currentQty / accumulated.goal) * 100) : null

  return (
    <div className={cardClass}>
      <div className={cardHeaderClass}>
        <div>
          <p className={cardHeaderTitleClass}>{t('monthlyProgressTitle')}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{monthLabel}</p>
        </div>
      </div>
      <div className="px-5 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {t('monthlyAccumulatedLabel')}
        </p>
        <p className="mt-1.5 text-[40px] font-black leading-none tracking-tight text-[#0F2C59] dark:text-white">
          {formatInt(accumulated.currentQty)}
        </p>

        {hasGoal ? (
          <div className="mt-3">
            <div className="h-2.5 overflow-hidden rounded-full bg-black/[.06] dark:bg-white/[.08]">
              <div
                className="h-full rounded-full bg-[#F97316]"
                style={{ width: `${Math.max(0, goalPct)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              {t('monthlyGoalLabel')}: {formatInt(accumulated.goal)}
            </p>
          </div>
        ) : (
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-extrabold',
                diff >= 0 ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEF2F2] text-[#B91C1C]',
              )}
            >
              {formatPct(accumulated.pctChange) ?? '—'}
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              {t('monthlyComparisonTemplate', { days: accumulated.comparableDayCount })} ({formatInt(accumulated.previousRangeQty)})
            </span>
          </div>
        )}
        <p className="mt-3 text-[11.5px] text-muted-foreground">
          {dayjs(accumulated.previousRangeFrom).format('DD/MM/YYYY')} - {dayjs(accumulated.previousRangeTo).format('DD/MM/YYYY')}
        </p>
      </div>
    </div>
  )
}
