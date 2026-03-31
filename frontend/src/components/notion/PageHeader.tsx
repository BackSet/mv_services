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
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div className="space-y-2">
        {emoji && <div className="text-2xl mb-1">{emoji}</div>}
        {Icon && <Icon className="w-8 h-8 text-muted-foreground mb-1" />}
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

