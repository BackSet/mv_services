import { type ReactNode, useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'

interface ListToolbarProps {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: ReactNode
  actions?: ReactNode
  className?: string
  searchInputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  actions,
  className,
  searchInputProps,
}: ListToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search ?? '')
  const [lastExternalSearch, setLastExternalSearch] = useState(search)
  const debouncedSearch = useDebounce(localSearch, 300)

  if (search !== lastExternalSearch) {
    setLastExternalSearch(search)
    if (search !== undefined && search !== localSearch) {
      setLocalSearch(search)
    }
  }

  useEffect(() => {
    if (search !== undefined && debouncedSearch === search) return
    onSearchChange?.(debouncedSearch)
  }, [debouncedSearch, search, onSearchChange])

  const handleClearSearch = () => {
    setLocalSearch('')
    onSearchChange?.('')
  }

  return (
    <div className={cn('flex flex-col gap-4 py-5 border-b border-border/60', className)}>
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {onSearchChange && (
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-10 pr-9"
              {...searchInputProps}
            />
            {localSearch && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={handleClearSearch}
                onPointerDown={(e) => e.preventDefault()}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
          {filters && (
            <div className="flex flex-wrap items-center gap-2">
              {filters}
            </div>
          )}
          {actions}
        </div>
      </div>
    </div>
  )
}
