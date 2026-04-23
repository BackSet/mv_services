import { cn } from "@/lib/utils";
import { getBrandLogoPath } from "@/lib/print/brandTokens";

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
  showSubtitle = false,
  subtitle = "Sistema de Gestión",
}: {
  size?: BrandSize;
  className?: string;
  showSubtitle?: boolean;
  subtitle?: string;
}) {
  const { text, dot, gap } = sizeMap[size];

  const content = (
    <span className={cn("inline-flex items-baseline", gap, "font-serif tracking-tight")}>
      <span>MV</span>
      <span className="text-accent">Services</span>
      <span
        aria-hidden
        className={cn("ml-0.5 rounded-full bg-accent self-center", dot)}
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
 * Marca compacta (logo PNG) para cabeceras, sidebar y auth.
 */
export function BrandMark({
  size = 32,
  className,
  decorative = false,
}: {
  size?: number;
  className?: string;
  /** Si true, la imagen es puramente decorativa (p. ej. junto al wordmark `Brand`). */
  decorative?: boolean;
}) {
  return (
    <img
      src={getBrandLogoPath()}
      alt={decorative ? "" : "MV Services"}
      width={size}
      height={size}
      decoding="async"
      draggable={false}
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-block flex-shrink-0 object-contain rounded-xl shadow-soft ring-1 ring-border/40 bg-card/80",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
