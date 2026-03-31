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
  'in-progress': 'bg-info/10 text-info border-info/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  error: 'bg-error/10 text-error border-error/20',
  inactive: 'bg-muted/40 text-muted-foreground border-border/50',
}

export function StatusBadge({ label, variant, icon: Icon, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('border font-medium', variantStyles[variant], className)}
    >
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  )
}
