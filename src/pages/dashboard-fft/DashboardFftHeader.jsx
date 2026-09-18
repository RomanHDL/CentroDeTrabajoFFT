import dayjs from 'dayjs'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useEffectiveModules } from '@/state/auth'

/* Header del "Dashboard FFT" (rediseño 2026-09-18, a peticion explicita del usuario: version TV
   ejecutiva -- compacto, ~80-100px de alto en Full HD, para dejar el maximo espacio vertical a las
   graficas). Semana actual y de comparación son SIEMPRE dinamicas (currentWeek/previousWeek, ya
   calculadas por server-lib/fftDashboardAggregation.js con semana ISO real) -- nunca un numero de
   semana hardcodeado, ni siquiera como fallback visual. */
function WeekBadge({ label, week, monday, sunday, tone }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border px-3 py-1.5',
        tone === 'current' ? 'border-[#BFDBFE] bg-[#EFF6FF]' : 'border-slate-200 bg-slate-50',
      )}
    >
      <p className="whitespace-nowrap text-[clamp(9px,0.5vw,10.5px)] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 whitespace-nowrap text-[clamp(12px,0.72vw,15px)] font-extrabold text-[#0F2C59]">
        Semana {week} · {dayjs(monday).format('DD/MM')} - {dayjs(sunday).format('DD/MM/YYYY')}
      </p>
    </div>
  )
}

/* "← Volver" -- discreto, SOLO para quien tiene mas de un modulo con acceso efectivo (el usuario TV
   dedicado solo tiene "/dashboard-fft"; un administrador/supervisor que entra a ver la TV siempre
   tiene modulos adicionales). Usa el MISMO dato (effectiveModules) que ya resuelve el guard de
   permisos real -- no se toca RequireModuleAccess ni el modulo registry, esto es puramente un
   affordance visual de navegacion. */
function BackLink() {
  const { modules } = useEffectiveModules()
  if (!modules || modules.length <= 1) return null
  return (
    <Link
      to="/"
      className="mr-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[clamp(10px,0.55vw,12px)] font-semibold text-slate-500 hover:bg-slate-50"
    >
      ← Volver
    </Link>
  )
}

export default function DashboardFftHeader({ t, currentWeek, previousWeek, updatedAt }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <BackLink />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[clamp(10px,0.55vw,12px)] font-black uppercase tracking-[0.3em] text-[#3B82F6]">
              {t('headerEyebrow')}
            </span>
            <h1 className="truncate text-[clamp(20px,1.7vw,34px)] font-black leading-none tracking-tight text-[#0F2C59]">
              {t('headerTitle')}
            </h1>
          </div>
          <p className="mt-0.5 truncate text-[clamp(10px,0.62vw,13px)] font-medium text-slate-500">
            {t('headerSubtitle')}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {currentWeek && previousWeek && (
          <>
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
          </>
        )}
        <div className="flex flex-col items-end gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[clamp(9px,0.5vw,10.5px)] font-bold uppercase tracking-[0.1em] text-slate-600">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
            {t('tvModeLabel')}
          </span>
          {updatedAt && (
            <p className="whitespace-nowrap text-[clamp(9px,0.5vw,11px)] text-slate-400">
              {t('lastUpdatedLabel')}{' '}
              <span className="font-semibold text-slate-600">
                {dayjs(updatedAt).format('HH:mm')}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
