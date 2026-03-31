import { cn } from '@/lib/utils';

export default function PageShell({
  children,
  className,
  size = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'wide' | 'narrow';
}) {
  const maxWidth =
    size === 'wide' ? 'max-w-7xl' : size === 'narrow' ? 'max-w-3xl' : 'max-w-6xl';
  return (
    <div className={cn('w-full', className)}>
      <div className={cn('mx-auto px-6 py-10', maxWidth)}>
        {children}
      </div>
    </div>
  );
}

