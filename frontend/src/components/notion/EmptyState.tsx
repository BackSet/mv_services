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
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/50 px-10 py-16 text-center',
        className,
      )}
    >
      <div className="h-14 w-14 rounded-2xl bg-accent-soft flex items-center justify-center text-accent">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <div className="mt-5 font-serif text-xl tracking-tight text-foreground">{title}</div>
      {description ? (
        <div className="mt-2 text-sm text-muted-foreground max-w-md leading-relaxed">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

