import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type PageSpacing = '0' | '4' | '6' | '8';

const widthClass: Record<PageWidth, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  full: 'max-w-none',
};

const spacingClass: Record<PageSpacing, string> = {
  '0': 'space-y-0',
  '4': 'space-y-4',
  '6': 'space-y-6',
  '8': 'space-y-8',
};

export function PageContainer({
  children,
  width = 'xl',
  spacing = '6',
  className,
}: {
  children: ReactNode;
  width?: PageWidth;
  spacing?: PageSpacing;
  className?: string;
}) {
  return (
    <div className={cn('w-full mx-auto', widthClass[width], spacingClass[spacing], className)}>
      {children}
    </div>
  );
}
