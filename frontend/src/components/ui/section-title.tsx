import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SectionTitleProps {
  title: string;
  variant?: 'form' | 'detail';
  icon?: React.ReactNode;
  description?: string;
  className?: string;
  as?: 'h2' | 'h3';
}

export function SectionTitle({
  title,
  variant = 'form',
  icon,
  description,
  className,
  as: Component = 'h2',
}: SectionTitleProps) {
  return (
    <div className={cn('flex items-start gap-2', variant === 'form' && 'pb-3 border-b border-border/40 mb-4', className)}>
      {icon}
      <div className="min-w-0">
        <Component
          className={cn(
            variant === 'form' && 'text-sm font-semibold text-foreground',
            variant === 'detail' && 'text-sm font-medium text-muted-foreground uppercase tracking-wider'
          )}
        >
          {title}
        </Component>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}
