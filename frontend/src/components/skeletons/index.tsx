import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const TRACK_CLS = 'rounded-2xl border border-border/70 bg-card shadow-soft';

function range(n: number): number[] {
  return Array.from({ length: Math.max(0, n) }, (_, i) => i);
}

// =============================================================================
// KPIs
// =============================================================================

export function KpiCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando indicadores"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {range(count).map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/70 bg-card px-5 py-5 shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Toolbar (search + filtros)
// =============================================================================

export function ToolbarSkeleton({ filters = 1 }: { filters?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando filtros"
      className="flex items-center gap-2 flex-wrap"
    >
      <Skeleton className="h-9 flex-1 min-w-[200px] max-w-md" />
      {range(filters).map((i) => (
        <Skeleton key={i} className="h-8 w-32" />
      ))}
      <div className="ml-auto flex items-center gap-1.5">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

// =============================================================================
// Tabs
// =============================================================================

export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando pestañas"
      className="flex items-center gap-1 border-b border-border/50 -mx-4 px-4"
    >
      {range(count).map((i) => (
        <div key={i} className="px-3 py-2">
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Table
// =============================================================================

export function TableSkeleton({
  rows = 8,
  columns = 5,
  showCheckbox = false,
  showActions = true,
  density = 'comfortable',
}: {
  rows?: number;
  columns?: number;
  showCheckbox?: boolean;
  showActions?: boolean;
  density?: 'comfortable' | 'compact';
}) {
  const cellPad = density === 'compact' ? 'px-4 py-2' : 'px-4 py-3.5';
  const headerPad = density === 'compact' ? 'h-10 px-4' : 'h-11 px-4';
  return (
    <div
      role="status"
      aria-label="Cargando tabla"
      className="w-full overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {showCheckbox && (
                <th className={cn('w-10 text-left border-b border-border/60', headerPad)}>
                  <Skeleton className="h-4 w-4" />
                </th>
              )}
              {range(columns).map((i) => (
                <th
                  key={i}
                  className={cn('text-left border-b border-border/60', headerPad)}
                >
                  <Skeleton className="h-3 w-20" />
                </th>
              ))}
              {showActions && (
                <th className={cn('w-[72px] text-right border-b border-border/60', headerPad)}>
                  <Skeleton className="h-3 w-12 ml-auto" />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {range(rows).map((r) => (
              <tr key={r} className="border-b border-border/40 last:border-b-0">
                {showCheckbox && (
                  <td className={cn(cellPad)}>
                    <Skeleton className="h-4 w-4" />
                  </td>
                )}
                {range(columns).map((c) => (
                  <td key={c} className={cellPad}>
                    <Skeleton className={cn('h-4', c === 0 ? 'w-32' : c === columns - 1 ? 'w-16' : 'w-24')} />
                  </td>
                ))}
                {showActions && (
                  <td className={cn(cellPad, 'text-right')}>
                    <Skeleton className="h-6 w-6 ml-auto" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// Pagination
// =============================================================================

export function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}

// =============================================================================
// List page (KPIs + tabs + toolbar + table + pagination)
// =============================================================================

export function ListPageSkeleton({
  kpis = 4,
  columns = 5,
  rows = 8,
  tabs = 0,
  showCheckbox = false,
  filters = 1,
}: {
  kpis?: number;
  columns?: number;
  rows?: number;
  tabs?: number;
  showCheckbox?: boolean;
  filters?: number;
}) {
  return (
    <div role="status" aria-label="Cargando contenido" className="space-y-4">
      {kpis > 0 && <KpiCardsSkeleton count={kpis} />}
      {tabs > 0 && <TabsSkeleton count={tabs} />}
      <ToolbarSkeleton filters={filters} />
      <TableSkeleton rows={rows} columns={columns} showCheckbox={showCheckbox} />
      <PaginationSkeleton />
    </div>
  );
}

// =============================================================================
// Card grid (Solicitudes shippers)
// =============================================================================

export function CardGridSkeleton({
  cards = 4,
  fields = 4,
}: {
  cards?: number;
  fields?: number;
}) {
  return (
    <div role="status" aria-label="Cargando tarjetas" className="space-y-3">
      {range(cards).map((i) => (
        <article
          key={i}
          className={cn(TRACK_CLS, 'p-4 space-y-3')}
        >
          <div className="flex items-start gap-3">
            <Skeleton variant="circle" className="h-10 w-10 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {range(fields).map((f) => (
              <div key={f} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </article>
      ))}
    </div>
  );
}

// =============================================================================
// Section card (banner + grid de campos label/value)
// =============================================================================

export function SectionCardSkeleton({
  fields = 4,
  cols = 3,
}: {
  fields?: number;
  cols?: 2 | 3;
}) {
  const gridCls = cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className={cn(TRACK_CLS, 'p-5 space-y-4')}>
      <div className="flex items-center gap-2">
        <Skeleton variant="circle" className="h-5 w-5" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className={cn('grid gap-4', gridCls)}>
        {range(fields).map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-full max-w-[220px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Detail page (banner + KPIs + N section cards)
// =============================================================================

export function DetailPageSkeleton({
  kpis = 4,
  sections = [3],
}: {
  kpis?: number;
  sections?: number[];
}) {
  return (
    <div role="status" aria-label="Cargando detalle" className="space-y-4">
      <div className={cn(TRACK_CLS, 'p-5')}>
        <div className="flex items-center gap-4">
          <Skeleton variant="circle" className="h-14 w-14 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-6 w-64" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      {kpis > 0 && <KpiCardsSkeleton count={kpis} />}
      {sections.map((fieldsCount, i) => (
        <SectionCardSkeleton key={i} fields={fieldsCount * 2} cols={3} />
      ))}
    </div>
  );
}

// =============================================================================
// Form page
// =============================================================================

export function FormPageSkeleton({
  sections = [3],
}: {
  sections?: number[];
}) {
  return (
    <div role="status" aria-label="Cargando formulario" className="space-y-4">
      <div className={cn(TRACK_CLS, 'p-5')}>
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="h-10 w-10 shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
      </div>
      {sections.map((fieldsCount, i) => (
        <div key={i} className={cn(TRACK_CLS, 'p-5 space-y-4')}>
          <div className="flex items-center gap-2">
            <Skeleton variant="circle" className="h-5 w-5" />
            <Skeleton className="h-4 w-44" />
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {range(fieldsCount).map((f) => (
              <div key={f} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-end gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

// =============================================================================
// List rows (Dashboard panels, RolView usuarios, NotificacionesBell, búsqueda global)
// =============================================================================

export function ListRowsSkeleton({
  rows = 5,
  compact = false,
  columns = 1,
}: {
  rows?: number;
  compact?: boolean;
  columns?: 1 | 2;
}) {
  const py = compact ? 'py-1.5' : 'py-2.5';
  const containerGrid = columns === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-1';
  return (
    <div role="status" aria-label="Cargando lista" className={containerGrid}>
      {range(rows).map((i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-2.5 px-2 rounded-md',
            py,
          )}
        >
          <Skeleton variant="circle" className={cn(compact ? 'h-6 w-6' : 'h-8 w-8', 'shrink-0')} />
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className={cn('h-3.5', compact ? 'w-24' : 'w-40')} />
            {!compact && <Skeleton className="h-3 w-32" />}
          </div>
          <Skeleton className={cn(compact ? 'h-3 w-10' : 'h-4 w-16', 'shrink-0')} />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Dashboard
// =============================================================================

export function DashboardSkeleton({
  variant = 'ops',
}: {
  variant?: 'ops' | 'shipper';
}) {
  const kpis = variant === 'ops' ? 4 : 3;
  return (
    <div role="status" aria-label="Cargando dashboard" className="space-y-4">
      <KpiCardsSkeleton count={kpis} />
      {variant === 'ops' && (
        <div className={cn(TRACK_CLS, 'p-4 flex items-center gap-2 flex-wrap')}>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      )}
      <div className={cn('grid gap-4', variant === 'ops' ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
        <div className={cn(TRACK_CLS, 'p-4 space-y-3')}>
          <Skeleton className="h-4 w-32" />
          <ListRowsSkeleton rows={4} />
        </div>
        <div className={cn(TRACK_CLS, 'p-4 space-y-3')}>
          <Skeleton className="h-4 w-32" />
          <ListRowsSkeleton rows={5} />
        </div>
        {variant === 'ops' && (
          <div className={cn(TRACK_CLS, 'p-4 space-y-3')}>
            <Skeleton className="h-4 w-32" />
            <ListRowsSkeleton rows={5} />
          </div>
        )}
      </div>
    </div>
  );
}
