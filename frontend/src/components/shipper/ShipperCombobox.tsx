import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { Shipper } from '@/services/shippers.service';

interface ShipperComboboxProps {
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

export function ShipperCombobox({
  shippers,
  value,
  onChange,
  placeholder = 'Buscar shipper…',
  disabled,
}: ShipperComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedShipper = useMemo(
    () => (value !== '' ? shippers.find((s) => s.id === value) ?? null : null),
    [shippers, value],
  );

  const shipperItems = useMemo(
    () =>
      shippers.map((s) => ({
        ...s,
        cantones: getCantonesLabel(s),
        searchText: [
          s.nombre,
          s.nombreEncargado,
          ...(s.direcciones ?? []).map((d) => d.canton),
          ...(s.direcciones ?? []).map((d) => d.ciudad),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      })),
    [shippers],
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 font-normal"
          disabled={disabled}
        >
          {selectedShipper ? (
            <span className="flex items-center gap-2 truncate">
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
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(val, search) => {
            const idStr = val.startsWith('shipper-') ? val.replace('shipper-', '') : val;
            const item = shipperItems.find((s) => String(s.id) === idStr);
            if (!item) return 0;
            return item.searchText.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Buscar por nombre o cantón…" />
          <CommandList>
            <CommandEmpty>No se encontró ningún shipper.</CommandEmpty>
            <CommandGroup>
              {shipperItems.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`shipper-${s.id}`}
                  onSelect={() => {
                    onChange(s.id === value ? '' : s.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === s.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm truncate">{s.nombre}</span>
                    {s.cantones && (
                      <span className="text-[11px] text-muted-foreground truncate">
                        {s.cantones}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
