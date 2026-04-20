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
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 px-10 py-16 text-center',
        className,
      )}
    >
      <div className="h-12 w-12 rounded-2xl bg-accent-soft flex items-center justify-center text-accent">
        {icon ?? <Loader2 className="h-5 w-5 animate-spin" />}
      </div>
      <div className="mt-4 font-serif text-lg tracking-tight text-foreground">{label}</div>
      {description ? (
        <div className="mt-1.5 text-sm text-muted-foreground max-w-md leading-relaxed">
          {description}
        </div>
      ) : null}
    </div>
  )
}
