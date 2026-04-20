import type { ReactNode } from 'react';

export type KpiAccent = 'primary' | 'success' | 'warning' | 'muted' | 'info' | 'brand';

const accentClasses: Record<KpiAccent, { iconBox: string; bar: string }> = {
  brand: {
    iconBox: 'bg-accent-soft text-accent',
    bar: 'bg-accent',
  },
  primary: {
    iconBox: 'bg-foreground/10 text-foreground',
    bar: 'bg-foreground',
  },
  success: {
    iconBox: 'bg-success/10 text-success',
    bar: 'bg-success',
  },
  warning: {
    iconBox: 'bg-warning/15 text-warning',
    bar: 'bg-warning',
  },
  info: {
    iconBox: 'bg-info/10 text-info',
    bar: 'bg-info',
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
  accent = 'brand',
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
    <div className="rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-soft transition-all duration-200 ease-claude hover:border-foreground/15 hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-serif text-3xl tabular-nums leading-tight text-foreground">
            {value}
          </div>
          {hint && (
            <div className="mt-1.5 text-xs text-muted-foreground tabular-nums">{hint}</div>
          )}
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.iconBox}`}
        >
          {icon}
        </span>
      </div>
      {typeof progress === 'number' && (
        <div className="mt-4 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ease-claude ${a.bar}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded-md border border-border bg-muted/60 font-mono text-[10px] inline-flex items-center">
      {children}
    </kbd>
  );
}
