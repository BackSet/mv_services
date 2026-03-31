import { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Shipper } from '@/services/shippers.service';

interface ShipperSelectProps {
  shippers: Shipper[];
  value: number | '';
  onChange: (shipperId: number | '') => void;
  placeholder?: string;
  disabled?: boolean;
}

function getCantonesLabel(shipper: Shipper): string | null {
  const cantones = (shipper.direcciones ?? [])
    .map((d) => d.canton)
    .filter((c): c is string => !!c);
  const unique = [...new Set(cantones)];
  return unique.length > 0 ? unique.join(', ') : null;
}

/**
 * Dropdown filtrable para seleccionar Shipper.
 * Renderiza inline (sin Portal/Popover) para funcionar dentro de Dialogs.
 */
export function ShipperSelect({
  shippers,
  value,
  onChange,
  placeholder = 'Buscar shipper…',
  disabled,
}: ShipperSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedShipper = useMemo(
    () => (value !== '' ? shippers.find((s) => s.id === value) ?? null : null),
    [shippers, value],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return shippers;
    const q = search.toLowerCase();
    return shippers.filter((s) => {
      const text = [
        s.nombre,
        s.nombreEncargado,
        ...(s.direcciones ?? []).map((d) => d.canton),
        ...(s.direcciones ?? []).map((d) => d.ciudad),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [shippers, search]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
      >
        {selectedShipper ? (
          <span className="flex items-center gap-2 truncate text-left">
            <span className="truncate">{selectedShipper.nombre}</span>
            {getCantonesLabel(selectedShipper) && (
              <span className="text-[11px] text-muted-foreground truncate">
                — {getCantonesLabel(selectedShipper)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedShipper && (
            <span
              role="button"
              className="h-4 w-4 rounded-sm hover:bg-accent flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
            >
              <X className="h-3 w-3 opacity-50" />
            </span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </div>
      </button>

      {open && (
        <div className="absolute z-[100] mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              className="flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Buscar por nombre o cantón…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No se encontró ningún shipper.
              </div>
            ) : (
              filtered.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                    'hover:bg-accent hover:text-accent-foreground',
                    value === s.id && 'bg-accent/50',
                  )}
                  onClick={() => {
                    onChange(s.id === value ? '' : s.id);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === s.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm truncate">{s.nombre}</span>
                    {getCantonesLabel(s) && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        {getCantonesLabel(s)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
