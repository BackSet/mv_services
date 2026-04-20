/**
 * Tokens de marca MV Services aplicables a documentos imprimibles
 * (PDF con jsPDF, hojas con ExcelJS, etiquetas HTML).
 *
 * IMPORTANTE: estos colores deben mantenerse alineados con `frontend/src/index.css`
 * para que los documentos generados respeten el mismo lenguaje visual del sistema.
 */

export type RGB = [number, number, number];

/** Paleta principal en formato HEX (`#RRGGBB`). */
export const BRAND_HEX = {
  black: '#000000',
  blackSoft: '#0C0C0C',
  grayDark: '#37352F',
  grayMid: '#737373',
  grayBorder: '#EEEEEE',
  grayLight: '#F8F9FA',
  zebra: '#FCFCFB',
  orange: '#FF6B35',
  orangeSoft: '#FF8C5A',
  orangeFaded: '#FFF0E8',
  white: '#FFFFFF',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
} as const;

export type BrandColor = keyof typeof BRAND_HEX;

/** Variante en RGB tupla (útil para jsPDF). */
export const BRAND_RGB: Record<BrandColor, RGB> = {
  black: [0, 0, 0],
  blackSoft: [12, 12, 12],
  grayDark: [55, 53, 47],
  grayMid: [115, 115, 115],
  grayBorder: [238, 238, 238],
  grayLight: [248, 249, 250],
  zebra: [252, 252, 251],
  orange: [255, 107, 53],
  orangeSoft: [255, 140, 90],
  orangeFaded: [255, 240, 232],
  white: [255, 255, 255],
  success: [22, 163, 74],
  warning: [217, 119, 6],
  error: [220, 38, 38],
};

/** Convierte el HEX de la paleta al formato `FFRRGGBB` (alpha=FF) que usa ExcelJS. */
export function brandToARGB(c: BrandColor): string {
  return 'FF' + BRAND_HEX[c].slice(1).toUpperCase();
}

/** Stacks tipográficos sugeridos para impresión / pantalla. */
export const BRAND_FONT_PRINT = {
  /** Stack sans-serif principal — equivalente al `--font-sans` del sistema. */
  sans:
    '"Helvetica Neue", Helvetica, Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  /** Stack monoespaciado para guías, IDs y números técnicos. */
  mono:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  /** Familia serif (DM Serif Display) — solo cuando esté disponible en el medio. */
  serif: '"DM Serif Display", Georgia, "Times New Roman", serif',
} as const;

/** Constantes textuales de marca para encabezados/pies de documentos. */
export const PRINT_BRAND_TEXT = {
  wordmarkLeft: 'MV',
  wordmarkRight: 'SERVICES',
  systemSubtitle: 'SISTEMA DE GESTIÓN',
  url: 'mvservices.app',
} as const;

// =============================================================================
// Helpers compartidos por todos los exportadores / imprimibles
// =============================================================================

/** Formato de fecha estándar para documentos en español (CR/EC/AR…). */
export function formatPrintDate(
  s: string | Date | null | undefined,
  withTime = true,
): string {
  if (s == null) return '—';
  try {
    const d = typeof s === 'string' ? new Date(s) : s;
    if (Number.isNaN(d.getTime())) return typeof s === 'string' ? s : '—';
    return withTime
      ? d.toLocaleString('es', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : d.toLocaleDateString('es', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
  } catch {
    return typeof s === 'string' ? s : '—';
  }
}

/** Formato de número con separadores de miles y decimales fijos. */
export function formatPrintNumber(n: number, decimals = 2): string {
  return n.toLocaleString('es', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Formato de timestamp tipo `dd/MM/yyyy HH:mm` independiente de Locale. */
export function nowPrintStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/** Sanitización HTML básica (para imprimibles HTML que se inyectan dinámicamente). */
export function escapePrintHtml(v: unknown): string {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
