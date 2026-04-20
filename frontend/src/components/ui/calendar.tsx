import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar — Wrapper sobre react-day-picker integrado al design system MV.
 * - Localizado en español, semana inicia en lunes.
 * - Usa tokens del tema (accent, accent-soft, muted, foreground) para
 *   integrarse automáticamente con modo claro/oscuro.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={es}
      weekStartsOn={1}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months:
          "flex flex-col sm:flex-row gap-4 sm:gap-6 sm:divide-x sm:divide-border/60",
        month: "space-y-3 sm:px-1 first:sm:pl-0",
        month_caption: "flex justify-center pt-1 relative items-center h-9",
        caption_label: "text-sm font-medium capitalize text-foreground",
        nav: "flex items-center justify-between absolute inset-x-1 top-1",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 text-muted-foreground hover:text-foreground",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 text-muted-foreground hover:text-foreground",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.7rem] uppercase tracking-wide pb-1",
        week: "flex w-full mt-1.5",
        day: cn(
          "relative p-0 text-center text-sm h-9 w-9",
          "[&:has([aria-selected])]:bg-accent-soft/60",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          "focus-within:relative focus-within:z-20",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-md aria-selected:opacity-100",
          "hover:bg-muted hover:text-foreground",
          "transition-colors",
        ),
        range_start:
          "day-range-start aria-selected:bg-accent aria-selected:text-accent-foreground",
        range_end:
          "day-range-end aria-selected:bg-accent aria-selected:text-accent-foreground",
        range_middle:
          "aria-selected:bg-accent-soft aria-selected:text-accent-soft-foreground",
        selected:
          "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-md",
        today:
          "bg-muted text-foreground font-semibold ring-1 ring-inset ring-border rounded-md",
        outside:
          "day-outside text-muted-foreground/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground/40 opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...rest }) => {
          const Icon =
            orientation === "left" || orientation === "up"
              ? ChevronLeft
              : ChevronRight;
          return (
            <Icon
              {...rest}
              className={cn("h-4 w-4", chevronClass)}
              aria-hidden="true"
            />
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
