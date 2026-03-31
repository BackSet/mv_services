import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className={cn('flex items-center justify-between gap-4 py-3 text-sm text-muted-foreground', className)}>
      <span>
        Mostrando {start}–{end} de {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-muted/70 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Primera página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-muted/70 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="min-w-[4rem] text-center font-medium text-foreground">
          {page}/{totalPages || 1}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || totalPages === 0}
          className="p-1.5 rounded hover:bg-muted/70 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || totalPages === 0}
          className="p-1.5 rounded hover:bg-muted/70 hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
