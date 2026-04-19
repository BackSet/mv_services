import type { ReactNode } from 'react';

export type KpiAccent = 'primary' | 'success' | 'warning' | 'muted' | 'info';

const accentClasses: Record<KpiAccent, { iconBox: string; bar: string }> = {
  primary: {
    iconBox: 'bg-primary/10 text-primary',
    bar: 'bg-primary',
  },
  success: {
    iconBox: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  warning: {
    iconBox: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  info: {
    iconBox: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    bar: 'bg-sky-500',
  },
  muted: {
    iconBox: 'bg-muted text-muted-foreground',
    bar: 'bg-muted-foreground/40',
  },
};

export function KpiCard({
  icon,
  label,
  value,
  hint,
  accent = 'primary',
  progress,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: KpiAccent;
  progress?: number;
}) {
  const a = accentClasses[accent];
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums leading-tight">{value}</div>
          {hint && <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">{hint}</div>}
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.iconBox}`}>
          {icon}
        </span>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${a.bar}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px] inline-flex items-center">
      {children}
    </kbd>
  );
}
