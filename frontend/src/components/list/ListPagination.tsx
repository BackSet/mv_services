import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ListPaginationProps {
  page: number
  totalPages: number
  totalItems?: number
  size?: number
  onPageChange: (nextPage: number) => void
  className?: string
  showRange?: boolean
  variant?: 'compact' | 'full'
  pageSizeOptions?: number[]
  onPageSizeChange?: (next: number) => void
}

export function ListPagination({
  page,
  totalPages,
  totalItems,
  size = 20,
  onPageChange,
  className,
  showRange = true,
  variant = 'full',
  pageSizeOptions,
  onPageSizeChange,
}: ListPaginationProps) {
  if (totalPages <= 1 && !onPageSizeChange) return null

  const canPrev = page > 0
  const canNext = page < totalPages - 1
  const total = typeof totalItems === 'number' ? totalItems : 0
  const from = total ? page * size + 1 : 0
  const to = total ? Math.min((page + 1) * size, total) : 0

  return (
    <div className={cn('flex items-center justify-between pt-4 border-t border-border/40 gap-2 flex-wrap', className)}>
      <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
        {showRange && total > 0 ? (
          <span>Mostrando <strong>{from}</strong>–<strong>{to}</strong> de <strong>{total}</strong></span>
        ) : (
          <span>Página {page + 1} de {totalPages}</span>
        )}
        {pageSizeOptions && onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider">Por página</span>
            <select
              value={size}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs"
            >
              {pageSizeOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        {variant === 'full' && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 min-h-10 min-w-10 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
              onClick={() => onPageChange(0)}
              disabled={!canPrev}
              aria-label="Primera página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 min-h-10 min-w-10 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
              onClick={() => onPageChange(page - 1)}
              disabled={!canPrev}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center justify-center min-w-[3rem] text-sm font-medium tabular-nums px-1">
              {page + 1} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 min-h-10 min-w-10 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
              onClick={() => onPageChange(page + 1)}
              disabled={!canNext}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 min-h-10 min-w-10 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
              onClick={() => onPageChange(totalPages - 1)}
              disabled={!canNext}
              aria-label="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </>
        )}
        {variant === 'compact' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={!canPrev}
              className="h-8 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1.5" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={!canNext}
              className="h-8 text-xs"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
