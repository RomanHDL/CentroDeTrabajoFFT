import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva('relative w-full rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-background text-foreground',
      destructive: 'border-destructive/50 bg-destructive/10 text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
})

function Alert({ className, variant, ...props }) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

export { Alert }
