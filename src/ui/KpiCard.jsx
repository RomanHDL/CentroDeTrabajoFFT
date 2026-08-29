import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn, hexToRgba } from '@/lib/utils'

const ACCENTS = {
  blue: '#3B82F6',
  green: '#10B981',
  red: '#EF4444',
  amber: '#F59E0B',
  purple: '#A855F7',
  cyan: '#06B6D4',
  slate: '#64748B',
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accent = 'blue',
  trend,
  trendLabel = '',
  onClick,
  compact = false,
}) {
  const color = ACCENTS[accent] || ACCENTS.blue
  const isPositive = trend > 0
  const trendColor = isPositive ? '#10B981' : '#EF4444'

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: role/tabIndex/onKeyDown de abajo ya cubren teclado cuando onClick esta presente, biome no evalua el ternario en runtime
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick(e)
              }
            }
          : undefined
      }
      className={cn(
        'relative h-full overflow-hidden rounded-2xl border border-l-[3px] border-[color:var(--kpi-border)] bg-[color:var(--kpi-bg)] transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
        compact ? 'p-3.5' : 'p-5',
        onClick &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-[color:var(--kpi-accent)] hover:shadow-[0_8px_24px_var(--kpi-border)]',
      )}
      style={{
        '--kpi-accent': color,
        '--kpi-border': hexToRgba(color, 0.12),
        '--kpi-bg': hexToRgba(color, 0.02),
        borderLeftColor: color,
      }}
    >
      {icon && (
        <div
          className={cn(
            'mb-2.5 grid shrink-0 place-items-center rounded-lg border',
            compact
              ? 'h-8 w-8 [&>svg]:h-4 [&>svg]:w-4'
              : 'h-[38px] w-[38px] [&>svg]:h-[18px] [&>svg]:w-[18px]',
          )}
          style={{
            backgroundColor: hexToRgba(color, 0.1),
            color,
            borderColor: hexToRgba(color, 0.15),
          }}
        >
          {icon}
        </div>
      )}
      <p
        className={cn(
          'mb-1 font-bold uppercase tracking-[0.6px] text-muted-foreground',
          compact ? 'text-[10px]' : 'text-[11px]',
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          'mb-1 font-extrabold leading-none tracking-[-0.5px] text-foreground',
          compact ? 'text-[22px]' : 'text-[28px]',
        )}
      >
        {value}
      </p>
      {(subtitle || typeof trend === 'number') && (
        <div className="flex flex-wrap items-center gap-1.5">
          {subtitle && <p className="text-xs font-medium text-muted-foreground">{subtitle}</p>}
          {typeof trend === 'number' && trend !== 0 && (
            <span
              className="inline-flex h-5 items-center gap-0.5 rounded-full border px-1 text-[10px] font-bold"
              style={{
                backgroundColor: hexToRgba(trendColor, 0.08),
                color: trendColor,
                borderColor: hexToRgba(trendColor, 0.18),
              }}
            >
              {isPositive ? (
                <TrendingUp className="h-[13px] w-[13px]" />
              ) : (
                <TrendingDown className="h-[13px] w-[13px]" />
              )}
              {`${isPositive ? '+' : ''}${trend} ${trendLabel}`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
