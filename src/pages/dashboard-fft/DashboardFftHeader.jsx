import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

/* Header del "Dashboard FFT" (2026-09-17, a peticion explicita del usuario -- pantalla TV, diseño
   empresarial/serio, NUNCA el mismo header animado/lucide de "Producción FFT"). Semana actual y de
   comparación son SIEMPRE dinamicas (currentWeek/previousWeek, ya calculadas por
   server-lib/fftDashboardAggregation.js con semana ISO real) -- nunca un numero de semana
   hardcodeado, ni siquiera como fallback visual. */
function WeekBadge({ label, week, monday, sunday, tone }) {
  return (
    <div
      className={cn(
        'min-w-[220px] rounded-lg border px-4 py-2.5',
        tone === 'current' ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-slate-200 bg-slate-50',
      )}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-[15px] font-extrabold text-[#0F2C59]">
        Semana {week} · {dayjs(monday).format('DD/MM')} - {dayjs(sunday).format('DD/MM/YYYY')}
      </p>
    </div>
  )
}

export default function DashboardFftHeader({ t, currentWeek, previousWeek, updatedAt }) {
  return (
    <div className="border-b-4 border-[#0F2C59] bg-white px-6 py-5 sm:px-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[13px] font-black uppercase tracking-[0.35em] text-[#3B82F6]">
            {t('headerEyebrow')}
          </p>
          <h1 className="mt-1 text-[32px] font-black leading-none tracking-tight text-[#0F2C59] sm:text-[38px]">
            {t('headerTitle')}
          </h1>
          <p className="mt-1.5 text-[15px] font-medium text-slate-500">
            {t('headerSubtitle')}
          </p>
        </div>

        {currentWeek && previousWeek && (
          <div className="flex flex-wrap gap-3">
            <WeekBadge
              label={t('currentWeekLabel')}
              week={currentWeek.isoWeek}
              monday={currentWeek.monday}
              sunday={currentWeek.sunday}
              tone="current"
            />
            <WeekBadge
              label={t('comparisonWeekLabel')}
              week={previousWeek.isoWeek}
              monday={previousWeek.monday}
              sunday={previousWeek.sunday}
              tone="previous"
            />
          </div>
        )}

        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            {t('tvModeLabel')}
          </span>
          {updatedAt && (
            <p className="text-[12px] text-slate-400">
              {t('lastUpdatedLabel')} <span className="font-semibold text-slate-600">{dayjs(updatedAt).format('HH:mm')}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
