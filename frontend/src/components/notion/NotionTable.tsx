import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
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
};

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
}) {
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
                <th className="w-10 h-10 px-2 text-left border-b border-border/30 bg-muted/20">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedSet.size === rows.length}
                    onChange={toggleAll}
                    className="rounded border-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
              )}
              {columns.map((c, idx) => (
                <th
                  key={idx}
                  className={cn(
                    'h-10 px-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-muted/20',
                    c.className
                  )}
                >
                  <div className="flex items-center gap-1">
                    {c.header}
                  </div>
                </th>
              ))}
              {hasActions && (
                <th className="h-10 w-[80px] px-3 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-muted/20">
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
                    <td className="w-10 px-2 py-2.5 align-middle" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedSet.has(id)}
                        onChange={() => toggleRow(id)}
                        className="rounded border-input"
                      />
                    </td>
                  )}
                  {columns.map((c, idx) => (
                    <td key={idx} className={cn('px-3 py-2.5 align-middle', c.className)}>
                      <div className="truncate">
                        {c.cell(row)}
                      </div>
                    </td>
                  ))}
                  {hasActions && rowActions && (
                    <td
                      className="w-[80px] px-3 py-2.5 align-middle text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
