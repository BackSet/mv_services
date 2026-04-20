import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

type SkeletonVariant = 'rect' | 'circle';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

export function Skeleton({ className, variant = 'rect', ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden bg-muted/60 animate-shimmer',
        variant === 'rect' && 'rounded-md',
        variant === 'circle' && 'rounded-full',
        className,
      )}
      {...props}
    />
  );
}

export default Skeleton;
