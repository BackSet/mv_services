import { cn } from '@/lib/utils';
import { MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type NotionTableAction<T> = {
  label: string;
  icon?: React.ElementType<{ className?: string }>;
  onClick: (row: T) => void;
  destructive?: boolean;
};

export type NotionColumn<T> = {
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
  sortKey?: string;
};

export type SortState = { key: string; dir: 'asc' | 'desc' } | null;

export default function NotionTable<T>({
  columns,
  rows,
  rowKey,
  className,
  onRowClick,
  showCheckbox,
  selectedIds,
  onSelectionChange,
  rowActions,
  density = 'comfortable',
  sort,
  onSortChange,
}: {
  columns: Array<NotionColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
  className?: string;
  onRowClick?: (row: T) => void;
  showCheckbox?: boolean;
  selectedIds?: Set<string | number>;
  onSelectionChange?: (ids: (string | number)[]) => void;
  /** Si se define, se añade una columna ACCIONES con menú (Ver detalles, Editar, Eliminar según lo devuelto) */
  rowActions?: (row: T) => Array<NotionTableAction<T>>;
  density?: 'comfortable' | 'compact';
  sort?: SortState;
  onSortChange?: (next: SortState) => void;
}) {
  const cellPadding = density === 'compact' ? 'px-3 py-1.5' : 'px-3 py-2.5';
  const headerPadding = density === 'compact' ? 'h-9 px-3' : 'h-10 px-3';
  const selectedSet = selectedIds ?? new Set<string | number>();
  const toggleRow = (id: string | number) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(Array.from(next));
  };
  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (selectedSet.size === rows.length) onSelectionChange([]);
    else onSelectionChange(rows.map((r) => rowKey(r)));
  };

  const hasActions = Boolean(rowActions);

  return (
    <div className={cn('w-full border border-border/40 rounded-2xl overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {showCheckbox && (
                <th className={cn('w-10 text-left border-b border-border/30 bg-muted/20', headerPadding)}>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedSet.size === rows.length}
                    onChange={toggleAll}
                    className="rounded border-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              )}
              {columns.map((c, idx) => {
                const isSortable = Boolean(c.sortKey && onSortChange);
                const isActive = sort && c.sortKey && sort.key === c.sortKey;
                const handleSort = () => {
                  if (!isSortable || !onSortChange || !c.sortKey) return;
                  if (!isActive) onSortChange({ key: c.sortKey, dir: 'asc' });
                  else if (sort?.dir === 'asc') onSortChange({ key: c.sortKey, dir: 'desc' });
                  else onSortChange(null);
                };
                return (
                  <th
                    key={idx}
                    className={cn(
                      'text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-muted/20',
                      headerPadding,
                      c.className,
                      isSortable && 'cursor-pointer select-none hover:text-foreground transition-colors'
                    )}
                    onClick={isSortable ? handleSort : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {c.header}
                      {isSortable && (
                        isActive ? (
                          sort?.dir === 'asc'
                            ? <ArrowUp className="h-3 w-3 text-primary" />
                            : <ArrowDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )
                      )}
                    </div>
                  </th>
                );
              })}
              {hasActions && (
                <th className={cn('w-[80px] text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-muted/20', headerPadding)}>
                  ACCIONES
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = rowKey(row);
              return (
                <tr
                  key={id}
                  className={cn(
                    'group border-b border-border/30 last:border-b-0 transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-muted/20' : 'hover:bg-muted/20'
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {showCheckbox && (
                    <td className={cn('w-10 align-middle', cellPadding)} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedSet.has(id)}
                        onChange={() => toggleRow(id)}
                        className="rounded border-input"
                      />
                    </td>
                  )}
                  {columns.map((c, idx) => (
                    <td key={idx} className={cn('align-middle', cellPadding, c.className)}>
                      <div className="truncate">
                        {c.cell(row)}
                      </div>
                    </td>
                  ))}
                  {hasActions && rowActions && (
                    <td
                      className={cn('w-[80px] align-middle text-right', cellPadding)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-60 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                            aria-label="Acciones"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50">
                          <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            ACCIONES
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {rowActions(row).map((action, i) => {
                            const Icon = action.icon;
                            return (
                              <DropdownMenuItem
                                key={i}
                                onClick={(e) => {
                                  e.preventDefault();
                                  action.onClick(row);
                                }}
                                className={cn(
                                  'cursor-pointer',
                                  action.destructive && 'text-destructive focus:text-destructive focus:bg-destructive/10'
                                )}
                              >
                                {Icon && <Icon className="h-3.5 w-3.5 mr-2" />}
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
