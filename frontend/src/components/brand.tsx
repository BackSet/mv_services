import { cn } from "@/lib/utils";

type BrandSize = "sm" | "md" | "lg";

const sizeMap: Record<BrandSize, { text: string; dot: string; gap: string }> = {
  sm: { text: "text-sm", dot: "h-1 w-1", gap: "gap-1" },
  md: { text: "text-base", dot: "h-1.5 w-1.5", gap: "gap-1.5" },
  lg: { text: "text-lg", dot: "h-2 w-2", gap: "gap-2" },
};

/**
 * Wordmark de marca: "MV Services" + punto naranja de acento.
 * Consistente con el favicon. Reemplaza al cuadrado "M".
 */
export function Brand({
  size = "md",
  className,
  href: _href,
  showSubtitle = false,
  subtitle = "Sistema de Gestión",
}: {
  size?: BrandSize;
  className?: string;
  href?: string;
  showSubtitle?: boolean;
  subtitle?: string;
}) {
  const { text, dot, gap } = sizeMap[size];

  const content = (
    <span className={cn("inline-flex items-center", gap, "font-bold tracking-tight")}>
      <span>MV</span>
      <span className="text-mvs-secondary">Services</span>
      <span
        aria-hidden
        className={cn("ml-0.5 rounded-full bg-mvs-secondary", dot)}
      />
    </span>
  );

  if (showSubtitle) {
    return (
      <span className={cn("inline-flex flex-col leading-tight", className)}>
        <span className={text}>{content}</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {subtitle}
        </span>
      </span>
    );
  }

  return <span className={cn(text, className)}>{content}</span>;
}

/**
 * Marca compacta para sidebar colapsado o tab.
 * Cuadrado con "M" + punto naranja de acento.
 */
export function BrandMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-foreground to-foreground/85 font-bold text-background shadow-sm",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden
    >
      M
      <span
        className="absolute -right-0.5 -top-0.5 rounded-full bg-mvs-secondary ring-2 ring-background"
        style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28) }}
      />
    </span>
  );
}
