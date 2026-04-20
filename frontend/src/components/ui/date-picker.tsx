import * as React from "react";
import { CalendarDays, X } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const ISO_FORMAT = "yyyy-MM-dd";
const DISPLAY_FORMAT = "dd/MM/yyyy";

function fromIso(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, ISO_FORMAT, new Date());
  return isValid(parsed) ? parsed : undefined;
}

export interface DatePickerProps {
  id?: string;
  /** Valor en formato ISO `yyyy-MM-dd` o cadena vacía. */
  value?: string;
  /** Devuelve siempre un string ISO `yyyy-MM-dd` (o vacío al limpiar). */
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Texto opcional para describir el campo (aria-label). */
  ariaLabel?: string;
  /** Limita la fecha mínima seleccionable (ISO). */
  minDate?: string;
  /** Limita la fecha máxima seleccionable (ISO). */
  maxDate?: string;
  /** Permite borrar el valor desde el calendario. Por defecto: true. */
  clearable?: boolean;
  /** Alineación del popover. */
  align?: "start" | "center" | "end";
}

/**
 * DatePicker — sustituye al `<input type="date">` nativo con un calendario
 * propio totalmente integrado al sistema (modo claro/oscuro, tipografía,
 * colores de marca y localización en español).
 *
 * El contrato externo se mantiene como string ISO `yyyy-MM-dd` para que los
 * consumidores existentes no necesiten cambios en su lógica.
 */
export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled,
  className,
  ariaLabel,
  minDate,
  maxDate,
  clearable = true,
  align = "start",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = React.useMemo(() => fromIso(value), [value]);
  const minDateObj = React.useMemo(() => fromIso(minDate), [minDate]);
  const maxDateObj = React.useMemo(() => fromIso(maxDate), [maxDate]);

  const display = selected
    ? format(selected, DISPLAY_FORMAT, { locale: es })
    : "";

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange?.("");
      setOpen(false);
      return;
    }
    onChange?.(format(date, ISO_FORMAT));
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange?.("");
  };

  const handleToday = () => {
    onChange?.(format(new Date(), ISO_FORMAT));
    setOpen(false);
  };

  const hasValue = Boolean(selected);

  return (
    <Popover open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={cn(
            "group relative flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-background pl-3 pr-2 text-left text-sm shadow-soft transition-all duration-150",
            "hover:border-foreground/20",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
            !hasValue && "text-muted-foreground/80",
            hasValue && "text-foreground",
            className,
          )}
        >
          <CalendarDays
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              hasValue ? "text-accent" : "text-muted-foreground",
            )}
            aria-hidden="true"
          />
          <span className="flex-1 truncate tabular-nums">
            {display || placeholder}
          </span>
          {clearable && hasValue && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Borrar fecha"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange?.("");
                }
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected ?? new Date()}
          disabled={
            minDateObj || maxDateObj
              ? (date) => {
                  if (minDateObj && date < minDateObj) return true;
                  if (maxDateObj && date > maxDateObj) return true;
                  return false;
                }
              : undefined
          }
          autoFocus
        />
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              onChange?.("");
              setOpen(false);
            }}
            disabled={!hasValue}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
          >
            Borrar
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="text-xs font-medium text-accent transition-colors hover:text-accent/80"
          >
            Hoy
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
