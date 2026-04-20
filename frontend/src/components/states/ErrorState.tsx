import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ErrorState({
  title = 'Ocurrió un error',
  description,
  icon,
  action,
  className,
}: {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-destructive/30 bg-destructive/5 px-10 py-16 text-center',
        className,
      )}
    >
      <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
        {icon ?? <AlertTriangle className="h-5 w-5" />}
      </div>
      <div className="mt-4 font-serif text-lg tracking-tight text-foreground">{title}</div>
      {description ? (
        <div className="mt-1.5 text-sm text-muted-foreground max-w-md leading-relaxed">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
