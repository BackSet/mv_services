import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  icon,
  title,
  subtitle,
  actions,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 pb-3 border-b border-border/40',
        className
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon ? (
          <div className="h-8 w-8 rounded bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0">
          <div className="text-xl font-semibold text-foreground tracking-tight truncate">
            {title}
          </div>
          {subtitle ? (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      {actions ? <div className="shrink-0 flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
