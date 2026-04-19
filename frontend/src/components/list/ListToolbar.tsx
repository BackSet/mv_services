import { type ReactNode, useEffect, useState, useRef } from 'react'
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
  const debouncedSearch = useDebounce(localSearch, 300)
  const prevDebouncedRef = useRef(debouncedSearch)
  const isInternalChange = useRef(false)

  useEffect(() => {
    if (search === undefined || isInternalChange.current) {
      isInternalChange.current = false
      return
    }
    setLocalSearch(search)
    prevDebouncedRef.current = search
  }, [search])

  useEffect(() => {
    if (prevDebouncedRef.current === debouncedSearch) return
    prevDebouncedRef.current = debouncedSearch
    isInternalChange.current = true
    onSearchChange?.(debouncedSearch)
  }, [debouncedSearch, onSearchChange])

  const handleClearSearch = () => {
    setLocalSearch('')
    prevDebouncedRef.current = ''
    isInternalChange.current = true
    onSearchChange?.('')
  }

  return (
    <div className={cn('flex flex-col gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60', className)}>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {onSearchChange && (
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9 pr-8 h-9"
              {...searchInputProps}
            />
            {localSearch && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={handleClearSearch}
                onPointerDown={(e) => e.preventDefault()}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {filters && (
            <div className="flex items-center gap-2">
              {filters}
            </div>
          )}
          {actions}
        </div>
      </div>
    </div>
  )
}
