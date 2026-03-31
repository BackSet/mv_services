import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export default function NotionField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {hint ? <span className="text-[11px] text-muted-foreground/80">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

