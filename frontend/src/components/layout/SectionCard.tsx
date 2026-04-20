import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/**
 * Paleta unificada bajo tokens MV: por defecto naranja MV (acento de marca).
 * Las claves antiguas (blue/green/etc.) se mapean a tokens semánticos para
 * mantener compatibilidad con páginas existentes sin colores arcoíris.
 */
const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  brand: { bg: 'bg-accent-soft', text: 'text-accent' },
  orange: { bg: 'bg-accent-soft', text: 'text-accent' },
  blue: { bg: 'bg-info/10', text: 'text-info' },
  green: { bg: 'bg-success/10', text: 'text-success' },
  red: { bg: 'bg-error/10', text: 'text-error' },
  violet: { bg: 'bg-accent-soft', text: 'text-accent' },
  amber: { bg: 'bg-warning/15', text: 'text-warning' },
  gray: { bg: 'bg-muted/60', text: 'text-muted-foreground' },
};

export function SectionCard({
  icon: Icon,
  iconColor = 'brand',
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
  const color = COLOR_MAP[iconColor] ?? COLOR_MAP.brand;

  return (
    <div
      className={cn(
        'border border-border/70 rounded-2xl bg-card shadow-soft overflow-hidden',
        className,
      )}
    >
      <div className="px-6 sm:px-7 py-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', color.bg)}>
              <Icon className={cn('h-4 w-4', color.text)} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg leading-tight tracking-tight text-foreground">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      </div>
      <div className={noPadding ? '' : 'p-6 sm:p-7'}>{children}</div>
    </div>
  );
}
