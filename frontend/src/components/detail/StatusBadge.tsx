import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export type StatusVariant = 'active' | 'completed' | 'in-progress' | 'pending' | 'error' | 'inactive'

interface StatusBadgeProps {
  label: string
  variant: StatusVariant
  icon?: LucideIcon
  className?: string
}

const variantStyles: Record<StatusVariant, string> = {
  active: 'bg-success/10 text-success border-success/20',
  completed: 'bg-success/10 text-success border-success/20',
  'in-progress': 'bg-accent-soft text-accent-soft-foreground border-accent/20',
  pending: 'bg-warning/15 text-warning border-warning/25',
  error: 'bg-error/10 text-error border-error/20',
  inactive: 'bg-muted/60 text-muted-foreground border-border/60',
}

const dotStyles: Record<StatusVariant, string> = {
  active: 'bg-success',
  completed: 'bg-success',
  'in-progress': 'bg-accent animate-pulse',
  pending: 'bg-warning',
  error: 'bg-error',
  inactive: 'bg-muted-foreground/50',
}

export function StatusBadge({ label, variant, icon: Icon, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('border font-medium gap-1.5 py-1', variantStyles[variant], className)}
    >
      {Icon ? (
        <Icon className="h-3 w-3" />
      ) : (
        <span
          aria-hidden
          className={cn('inline-block h-1.5 w-1.5 rounded-full', dotStyles[variant])}
        />
      )}
      {label}
    </Badge>
  )
}
