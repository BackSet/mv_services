import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { PageContainer } from './PageContainer';
import { PageHeader } from './PageHeader';

export interface StandardPageLayoutProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  spacing?: '0' | '4' | '6' | '8';
  className?: string;
  headerClassName?: string;
  pageHeaderClassName?: string;
}

export function StandardPageLayout({
  title,
  subtitle,
  icon,
  actions,
  children,
  width = 'full',
  spacing = '0',
  className,
  headerClassName,
  pageHeaderClassName,
}: StandardPageLayoutProps) {
  return (
    <PageContainer
      width={width}
      spacing={spacing}
      className={cn(
        'w-full flex-1 flex flex-col min-h-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/20',
        className
      )}
    >
      <div
        className={cn(
          'px-4 sm:px-6 py-4 border-b border-border/30 bg-background/70 backdrop-blur-xl z-10 shrink-0',
          headerClassName
        )}
      >
        <PageHeader
          icon={icon}
          title={title}
          subtitle={subtitle}
          actions={actions}
          className={cn(
            'pb-0 border-b-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
            pageHeaderClassName
          )}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-4 sm:px-6">
        {children}
      </div>
    </PageContainer>
  );
}
