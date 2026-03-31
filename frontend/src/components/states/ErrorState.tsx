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
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/5 p-8 text-center',
        className
      )}
    >
      <div className="h-11 w-11 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
        {icon ?? <AlertTriangle className="h-5 w-5" />}
      </div>
      <div className="mt-3 text-sm font-medium text-foreground">{title}</div>
      {description ? <div className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
