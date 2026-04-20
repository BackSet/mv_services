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
        'w-full flex-1 flex flex-col min-h-0 overflow-hidden bg-background',
        className,
      )}
    >
      <div
        className={cn(
          'px-6 sm:px-8 lg:px-10 py-6 border-b border-border/60 bg-background/85 backdrop-blur-xl z-10 shrink-0',
          headerClassName,
        )}
      >
        <PageHeader
          icon={icon}
          title={title}
          subtitle={subtitle}
          actions={actions}
          className={cn(
            'pb-0 border-b-0 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4',
            pageHeaderClassName,
          )}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-6 sm:px-8 lg:px-10">
        {children}
      </div>
    </PageContainer>
  );
}
