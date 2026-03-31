import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card px-8 py-12 text-center', className)}>
      <div className="h-11 w-11 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <div className="mt-3 text-sm font-medium text-foreground">{title}</div>
      {description ? <div className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

