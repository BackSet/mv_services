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
        'flex items-start justify-between gap-4 pb-5 border-b border-border/60',
        className,
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        {icon ? (
          <div className="h-10 w-10 rounded-lg bg-accent-soft flex items-center justify-center text-accent shrink-0">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0">
          <div className="font-serif text-2xl text-foreground tracking-tight truncate">
            {title}
          </div>
          {subtitle ? (
            <div className="text-sm text-muted-foreground mt-1 truncate">
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      {actions ? <div className="shrink-0 flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
