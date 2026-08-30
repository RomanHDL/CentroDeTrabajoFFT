import { Inbox } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export default function EmptyState({ icon, title, description = '', action, compact = false }) {
  const { t } = useTranslation('app')
  const resolvedTitle = title ?? t('emptyState.defaultTitle')

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        compact ? 'py-6' : 'py-10',
      )}
    >
      <div
        className={cn(
          'mb-4 grid place-items-center rounded-[30px] border border-black/[.06] bg-black/[.02] text-muted-foreground dark:border-white/[.06] dark:bg-white/[.03]',
          compact ? 'h-12 w-12' : 'h-16 w-16',
          compact ? '[&>svg]:h-6 [&>svg]:w-6' : '[&>svg]:h-8 [&>svg]:w-8',
          '[&>svg]:opacity-40',
        )}
      >
        {icon || <Inbox />}
      </div>
      <p className={cn('mb-1 font-semibold text-foreground', compact ? 'text-[13px]' : 'text-sm')}>
        {resolvedTitle}
      </p>
      {description && (
        <p
          className={cn(
            'max-w-[360px] leading-[1.5] text-muted-foreground',
            compact ? 'text-xs' : 'text-[13px]',
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
