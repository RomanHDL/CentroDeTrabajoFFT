import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  cardClass,
  cardHeaderClass,
  cardHeaderSubtitleClass,
  cardHeaderTitleClass,
} from '@/lib/pageStyles'
import EmptyState from '../../ui/EmptyState'

/* Envoltura comun de las cards de graficas del Dashboard rediseñado
   (2026-08-25) -- header consistente (mismo lenguaje visual que el
   resto del sistema, cardClass/cardHeaderClass de src/lib/pageStyles.js)
   + los 3 estados que pide el prompt (Partes 46-48): loading (skeleton
   con la misma forma, nunca pantalla en blanco), error (mensaje +
   Reintentar, sin tumbar el resto del Dashboard) y empty state
   especifico (nunca ceros engañosos). */
export default function ChartCard({
  title,
  subtitle,
  height = 280,
  loading,
  error,
  onRetry,
  empty,
  emptyMessage,
  children,
}) {
  return (
    <div className={`${cardClass} flex h-full flex-col`}>
      <div className={cardHeaderClass}>
        <div className="min-w-0">
          <p className={cardHeaderTitleClass}>{title}</p>
          {subtitle && <p className={cardHeaderSubtitleClass}>{subtitle}</p>}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        {loading ? (
          <div className="animate-pulse rounded-2xl bg-muted" style={{ height }} />
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center gap-3 text-center"
            style={{ height }}
          >
            <p className="text-[13px] text-muted-foreground">No se pudieron cargar estos datos.</p>
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={onRetry} className="font-bold normal-case">
                <RefreshCw className="h-3.5 w-3.5" />
                Reintentar
              </Button>
            )}
          </div>
        ) : empty ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <EmptyState compact title={emptyMessage || 'Sin datos disponibles.'} />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
