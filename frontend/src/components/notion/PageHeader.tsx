import { cn } from '@/lib/utils';

export default function PageHeader({
  title,
  description,
  icon: Icon,
  emoji,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: React.ElementType;
  emoji?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6 pb-6 mb-8 border-b border-border/60',
        className,
      )}
    >
      <div className="space-y-2 min-w-0">
        {emoji ? (
          <div aria-hidden className="text-2xl">
            {emoji}
          </div>
        ) : null}
        {Icon ? (
          <div
            aria-hidden
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent"
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <h1 className="font-serif text-3xl sm:text-4xl leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}

