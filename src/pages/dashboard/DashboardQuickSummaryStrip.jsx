import { cardClass, cardHeaderClass, cardHeaderTitleClass } from '@/lib/pageStyles'

/* "Resumen rápido del centro de trabajo" (2026-08-26) -- franja
   horizontal compacta al final del Dashboard, a peticion explicita del
   usuario ("NO duplicar cards gigantes"). Todos los valores ya vienen
   calculados por useDashboardMetrics() -- esta card no computa nada
   nuevo, solo re-muestra en compacto lo que las cards/graficas de arriba
   ya mostraron en detalle (misma fuente, cero calculo propio).

   Fase 6c: portado de MUI (Paper/Stack + Skeleton) a Tailwind. El divider
   invisible del Stack original (Box sin border-width, solo borderColor)
   no aportaba nada visual y se omite; el borde inferior real que si se
   veia en mobile vivia en el selector "& > div" (todo hijo directo del
   Stack), reproducido aqui directo en Item. */
function Item({ label, value, loading }) {
  return (
    <div className="min-w-[120px] flex-[1_1_140px] border-b border-border px-3 py-[8.8px] sm:border-b-0 md:px-[18px]">
      <p className="mb-[3.2px] text-[10px] font-extrabold uppercase tracking-[0.5px] text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <div className="h-[26px] w-12 animate-pulse rounded bg-muted" />
      ) : (
        <p className="text-[19px] font-extrabold leading-none">{value}</p>
      )}
    </div>
  )
}

export default function DashboardQuickSummaryStrip({ metrics, loading }) {
  const areasTotal = metrics?.areas?.length ?? 0
  const coverage = metrics?.kpis?.coveragePct != null ? `${metrics.kpis.coveragePct}%` : 'Sin meta'

  return (
    <div className={`${cardClass} mt-4`}>
      <div className={cardHeaderClass}>
        <p className={cardHeaderTitleClass}>Resumen rápido del centro de trabajo</p>
      </div>
      <div className="flex flex-col sm:flex-row">
        <Item label="Áreas totales" value={areasTotal} loading={loading} />
        <Item
          label="Personal en turno"
          value={metrics?.kpis?.personalActual ?? 0}
          loading={loading}
        />
        <Item
          label="Personas faltantes"
          value={metrics?.kpis?.personalFaltante ?? 0}
          loading={loading}
        />
        <Item
          label="Líneas operativas"
          value={metrics ? `${metrics.kpis.lineasOperando} / ${metrics.kpis.lineasTotal}` : '—'}
          loading={loading}
        />
        <Item label="Cobertura general" value={coverage} loading={loading} />
        <Item
          label="Movimientos hoy"
          value={metrics?.dailyMovements?.total ?? 0}
          loading={loading}
        />
      </div>
    </div>
  )
}
