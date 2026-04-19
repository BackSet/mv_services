import { useEffect, useMemo, useRef, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Shipper } from '@/services/shippers.service';

interface ShipperComboboxProps {
  shippers: Shipper[];
  value: number | '';
  onChange: (shipperId: number | '') => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function getCantonesLabel(shipper: Shipper): string | null {
  const cantones = (shipper.direcciones ?? [])
    .map((d) => d.canton)
    .filter((c): c is string => !!c);
  const unique = [...new Set(cantones)];
  return unique.length > 0 ? unique.join(', ') : null;
}

function getSearchText(shipper: Shipper): string {
  return [
    shipper.nombre,
    shipper.nombreEncargado,
    ...(shipper.direcciones ?? []).map((d) => d.canton),
    ...(shipper.direcciones ?? []).map((d) => d.ciudad),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

const PANEL_MAX_HEIGHT = 320;

/**
 * Combobox filtrable de Shipper.
 * Usa Radix Popover para garantizar el correcto manejo del foco, portal y
 * cierre fuera, incluso cuando se renderiza dentro de un Dialog modal.
 */
export function ShipperCombobox({
  shippers,
  value,
  onChange,
  placeholder = 'Buscar shipper…',
  disabled,
  className,
}: ShipperComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const [lastOpen, setLastOpen] = useState(open);
  const [lastSearch, setLastSearch] = useState(search);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  if (open !== lastOpen) {
    setLastOpen(open);
    setActiveIndex(0);
    if (!open) setSearch('');
  }
  if (search !== lastSearch) {
    setLastSearch(search);
    setActiveIndex(0);
  }

  const selectedShipper = useMemo(
    () => (value !== '' ? shippers.find((s) => s.id === value) ?? null : null),
    [shippers, value],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return shippers;
    const q = search.toLowerCase();
    return shippers.filter((s) => getSearchText(s).includes(q));
  }, [shippers, search]);

  // Mantenemos el ancho del trigger para que el panel coincida visualmente.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) {
        setTriggerWidth(triggerRef.current.getBoundingClientRect().width);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open]);

  // Foco al input cuando abre (efecto secundario sobre DOM, no estado React).
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Auto-scroll del item activo
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-shipper-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const select = (id: number) => {
    onChange(id === value ? '' : id);
    setOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) select(item.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(Math.max(filtered.length - 1, 0));
    }
  };

  const cantonesSel = selectedShipper ? getCantonesLabel(selectedShipper) : null;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50',
            className,
          )}
        >
          {selectedShipper ? (
            <span className="flex items-center gap-2 truncate text-left min-w-0">
              <span className="truncate">{selectedShipper.nombre}</span>
              {cantonesSel && (
                <span className="text-[11px] text-muted-foreground truncate">
                  — {cantonesSel}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {selectedShipper && !disabled && (
              <span
                role="button"
                aria-label="Quitar selección"
                tabIndex={-1}
                className="h-4 w-4 rounded-sm hover:bg-accent flex items-center justify-center"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange('');
                }}
              >
                <X className="h-3 w-3 opacity-60" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          style={{ width: triggerWidth }}
          className={cn(
            'z-[1000] rounded-md border border-border bg-popover shadow-lg overflow-hidden outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
          onOpenAutoFocus={(e) => {
            // Evita que Radix mueva el foco al PopoverContent;
            // preferimos enviarlo al input de búsqueda.
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div role="listbox" aria-label="Shippers">
            <div className="flex items-center border-b border-border px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                ref={inputRef}
                className="flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Buscar por nombre o cantón…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleInputKeyDown}
                autoComplete="off"
                spellCheck={false}
              />
              {search && (
                <button
                  type="button"
                  className="ml-1 h-5 w-5 rounded-sm hover:bg-accent flex items-center justify-center"
                  onClick={() => {
                    setSearch('');
                    inputRef.current?.focus();
                  }}
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3 w-3 opacity-60" />
                </button>
              )}
            </div>
            <div
              ref={listRef}
              className="overflow-y-auto p-1"
              style={{ maxHeight: PANEL_MAX_HEIGHT - 80 }}
            >
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No se encontró ningún shipper.
                </div>
              ) : (
                filtered.map((s, idx) => {
                  const isActive = idx === activeIndex;
                  const isSelected = value === s.id;
                  const cantones = getCantonesLabel(s);
                  return (
                    <div
                      key={s.id}
                      data-shipper-idx={idx}
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                        isSelected && !isActive && 'bg-accent/40',
                      )}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onPointerDown={(e) => {
                        // Prevenir que el blur del input altere el foco antes
                        // de hacer la selección.
                        e.preventDefault();
                        select(s.id);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4 shrink-0',
                          isSelected ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm truncate">{s.nombre}</span>
                        {(s.nombreEncargado || cantones) && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {[s.nombreEncargado, cantones].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {filtered.length > 0 && (
              <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between bg-muted/20">
                <span className="tabular-nums">
                  {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
                </span>
                <span className="hidden sm:inline">
                  ↑↓ navegar · Enter seleccionar · Esc cerrar
                </span>
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
