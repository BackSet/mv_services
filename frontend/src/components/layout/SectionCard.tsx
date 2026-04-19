import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  gray: { bg: 'bg-muted/50', text: 'text-muted-foreground' },
};

export function SectionCard({
  icon: Icon,
  iconColor = 'blue',
  title,
  description,
  children,
  className,
  noPadding,
  right,
}: {
  icon?: LucideIcon;
  iconColor?: keyof typeof COLOR_MAP;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  right?: ReactNode;
}) {
  const color = COLOR_MAP[iconColor] ?? COLOR_MAP.blue;

  return (
    <div className={cn('border border-border/40 rounded-2xl bg-card/50 backdrop-blur-sm overflow-hidden', className)}>
      <div className="px-6 py-4 border-b border-border/30 bg-muted/10">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', color.bg)}>
              <Icon className={cn('h-3.5 w-3.5', color.text)} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{title}</h3>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      </div>
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
}
