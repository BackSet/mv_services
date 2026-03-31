import { useState, useMemo } from 'react';
import { ChevronsUpDown, Package } from 'lucide-react';
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
import type { Paquete } from '@/services/paquetes.service';

interface PaqueteSearchComboboxProps {
  paquetes: Paquete[];
  excludeIds?: Set<number>;
  onSelect: (paquete: Paquete) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PaqueteSearchCombobox({
  paquetes,
  excludeIds,
  onSelect,
  placeholder = 'Buscar paquete por guía, destinatario, ref, shipper…',
  disabled,
}: PaqueteSearchComboboxProps) {
  const [open, setOpen] = useState(false);

  const available = useMemo(() => {
    return paquetes
      .filter((p) => {
        if (excludeIds?.has(p.id)) return false;
        if (p.consolidado != null && p.consolidado.id != null) return false;
        return true;
      })
      .map((p) => ({
        ...p,
        keywords: [
          p.numeroGuia,
          p.destinatario,
          p.ref,
          p.contenido,
          p.shipper?.nombre,
        ].filter((v): v is string => !!v),
        label: [
          p.destinatario,
          p.ref ? `Ref: ${p.ref}` : null,
          p.shipper?.nombre,
          p.pesoLbs != null ? `${p.pesoLbs.toFixed(2)} lb` : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'Sin información',
      }));
  }, [paquetes, excludeIds]);

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
          <span className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            {placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por guía, destinatario, ref, shipper…" />
          <CommandList>
            <CommandEmpty>No se encontraron paquetes disponibles.</CommandEmpty>
            <CommandGroup heading={`${available.length} paquete${available.length !== 1 ? 's' : ''} sin consolidado`}>
              {available.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`paq-${p.id}-${p.numeroGuia}`}
                  keywords={p.keywords}
                  onSelect={() => {
                    onSelect(p);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-mono truncate">{p.numeroGuia}</span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {p.label}
                    </span>
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
