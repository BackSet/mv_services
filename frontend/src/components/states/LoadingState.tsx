import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type LoadingStateVariant = 'page' | 'inline'

export function LoadingState({
  label = 'Cargando...',
  description,
  icon,
  variant = 'page',
  className,
}: {
  label?: string
  description?: string
  icon?: ReactNode
  variant?: LoadingStateVariant
  className?: string
}) {
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        {icon ?? <Loader2 className="h-4 w-4 animate-spin" />}
        <span>{label}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/5 p-8 text-center',
        className
      )}
    >
      <div className="h-11 w-11 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
        {icon ?? <Loader2 className="h-5 w-5 animate-spin" />}
      </div>
      <div className="mt-3 text-sm font-medium text-foreground">{label}</div>
      {description ? <div className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</div> : null}
    </div>
  )
}
