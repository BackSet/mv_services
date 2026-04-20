import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Spacing = '3' | '4' | '5' | '6' | '8';

const spacingMap: Record<Spacing, string> = {
  '3': 'space-y-3',
  '4': 'space-y-4',
  '5': 'space-y-5',
  '6': 'space-y-6',
  '8': 'space-y-8',
};

export function PageContent({
  children,
  className,
  spacing = '6',
}: {
  children: ReactNode;
  className?: string;
  spacing?: Spacing;
}) {
  return <div className={cn('py-6', spacingMap[spacing], className)}>{children}</div>;
}

