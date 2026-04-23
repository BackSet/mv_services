import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  BRAND_HEX,
  BRAND_FONT_PRINT,
  PRINT_BRAND_TEXT,
  escapePrintHtml,
  getBrandLogoAbsoluteUrl,
  nowPrintStamp,
} from '@/lib/print/brandTokens';

// =============================================================================
// Tipos públicos
// =============================================================================

export type PackageLabel = {
  numeroGuia: string;
  shipperNombre?: string | null;
  shipperEncargado?: string | null;
  destinatarioNombre?: string | null;
  ref?: string | null;
  pesoLbs?: number | null;
  pesoKgs?: number | null;
  contenido?: string | null;
  fecha?: string | null;
  consolidadoGuia?: string | null;
  /** Posición 1-based del paquete dentro de su consolidado (si aplica). */
  posicionEnConsolidado?: number | null;
  /** Total de paquetes en el consolidado (para mostrar 12/45). */
  totalEnConsolidado?: number | null;
};

/** Tamaños de etiqueta soportados (nominal). */
export type LabelSize = '4x6' | '4x4' | '3x5' | '2x4';

/**
 * Modo de impresión:
 * - `thermal` (DEFAULT): optimizado para impresoras térmicas Zebra (ZD420/ZD620/GK420/etc.).
 *   Solo blanco/negro sólido, bordes gruesos, sin grises sutiles, sin radios redondeados,
 *   sin colores corporativos en tinta (el naranja no se imprime en térmicas).
 * - `color`: para impresoras láser/inkjet de oficina. Usa el acento naranja MV y radios suaves.
 */
export type PrintMode = 'thermal' | 'color';

export type PrintOptions = {
  pageSize?: LabelSize;
  /** Orientación: portrait (default) o landscape. */
  orientation?: 'portrait' | 'landscape';
  mode?: PrintMode;
  title?: string;
  /** Si true, agrega un QR del número de guía junto al barcode. */
  withQR?: boolean;
  /** Cierra la ventana automáticamente después de imprimir. */
  autoClose?: boolean;
  /** Si false, no dispara `window.print()` automáticamente al cargar (útil para preview). */
  autoPrint?: boolean;
};

// =============================================================================
// Helpers internos
// =============================================================================

const escapeHtml = escapePrintHtml;
const nowStamp = nowPrintStamp;

const PAGE_DIMENSIONS_IN: Record<LabelSize, { w: number; h: number }> = {
  '4x6': { w: 4, h: 6 },
  '4x4': { w: 4, h: 4 },
  '3x5': { w: 3, h: 5 },
  '2x4': { w: 2, h: 4 },
};

function barcodeSvg(value: string, opts?: { height?: number; width?: number }): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    height: opts?.height ?? 130,
    width: opts?.width ?? 3,
    background: 'transparent',
    lineColor: '#000000',
  });
  return svg.outerHTML;
}

async function qrSvg(value: string, sizePx: number): Promise<string> {
  return QRCode.toString(value, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#000000', light: '#FFFFFF' },
    width: sizePx,
  });
}

function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(Number(n))) return '';
  return Number(n).toLocaleString('es-EC', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Calcula el tamaño de fuente (clase) para el destinatario según longitud. */
function destSizeClass(name: string): string {
  const len = (name || '').length;
  if (len <= 12) return 'dest-xl';
  if (len <= 20) return 'dest-lg';
  if (len <= 30) return 'dest-md';
  return 'dest-sm';
}

/** Últimos 4 caracteres alfanuméricos de la guía (para verificación visual rápida). */
function tailDigits(numeroGuia: string): string {
  const cleaned = (numeroGuia || '').replace(/[^A-Za-z0-9]/g, '');
  return cleaned.slice(-4).toUpperCase();
}

// =============================================================================
// Generación HTML
// =============================================================================

async function buildHtml(
  labels: PackageLabel[],
  opts: Required<PrintOptions>,
): Promise<string> {
  const total = labels.length;
  const stamp = nowStamp();
  const isThermal = opts.mode === 'thermal';
  const brandLogoAbs = getBrandLogoAbsoluteUrl();
  const brandLogoSrcEsc = escapeHtml(brandLogoAbs);

  const dims = PAGE_DIMENSIONS_IN[opts.pageSize];
  const pageWIn = opts.orientation === 'landscape' ? dims.h : dims.w;
  const pageHIn = opts.orientation === 'landscape' ? dims.w : dims.h;

  const safe = labels.map((l) => ({
    ...l,
    numeroGuia: String(l.numeroGuia ?? '').trim(),
    shipperNombre: (l.shipperNombre || '').trim(),
    shipperEncargado: (l.shipperEncargado || '').trim() || null,
    destinatarioNombre: (l.destinatarioNombre || '').trim() || 'SIN DESTINATARIO',
    ref: (l.ref || '').trim() || null,
    contenido: (l.contenido || '').trim() || null,
    consolidadoGuia: (l.consolidadoGuia || '').trim() || null,
    posicionEnConsolidado: l.posicionEnConsolidado ?? null,
    totalEnConsolidado: l.totalEnConsolidado ?? null,
  }));

  // Pre-genera QR codes en paralelo si se piden (asíncrono).
  const qrCodes = opts.withQR
    ? await Promise.all(safe.map((l) => qrSvg(l.numeroGuia, 110)))
    : safe.map(() => '');

  const pageHtml = safe
    .map((l, idx) => {
      const svg = barcodeSvg(l.numeroGuia);
      const qr = qrCodes[idx];
      const shipperEnc = l.shipperEncargado;
      const shipperNom = l.shipperNombre || '—';
      const destClass = destSizeClass(l.destinatarioNombre);
      const tail = tailDigits(l.numeroGuia);

      const pesoChips: string[] = [];
      if (l.pesoLbs != null && l.pesoLbs > 0) {
        pesoChips.push(
          `<span class="chip chip-strong"><span class="chip-num">${formatNumber(l.pesoLbs)}</span><span class="chip-u">LB</span></span>`,
        );
      }
      if (l.pesoKgs != null && l.pesoKgs > 0) {
        pesoChips.push(
          `<span class="chip"><span class="chip-num">${formatNumber(l.pesoKgs)}</span><span class="chip-u">KG</span></span>`,
        );
      }

      const counter =
        total > 1
          ? `<span class="counter">${idx + 1}<span class="counter-sep">/</span>${total}</span>`
          : '';

      // Bloque de "ruta" (consolidado + posición) — destacado solo si hay datos.
      const hasRoute = l.consolidadoGuia || l.posicionEnConsolidado != null;
      let routeBlock = '';
      if (hasRoute) {
        const posTxt =
          l.posicionEnConsolidado != null
            ? l.totalEnConsolidado != null
              ? `${l.posicionEnConsolidado}/${l.totalEnConsolidado}`
              : `#${l.posicionEnConsolidado}`
            : '';
        routeBlock = `
          <section class="route-block">
            ${
              l.consolidadoGuia
                ? `<div class="route-cell route-consol">
                    <div class="route-label">CONSOLIDADO</div>
                    <div class="route-value">${escapeHtml(l.consolidadoGuia)}</div>
                  </div>`
                : ''
            }
            ${
              posTxt
                ? `<div class="route-cell route-pos">
                    <div class="route-label">POS</div>
                    <div class="route-value route-value-big">${escapeHtml(posTxt)}</div>
                  </div>`
                : ''
            }
          </section>`;
      }

      const qrBlock = opts.withQR
        ? `<div class="qr-frame" aria-label="Código QR">${qr}</div>`
        : '';

      const brandWordmark = `<div class="brand-text">
                <span class="brand-mv">${escapeHtml(PRINT_BRAND_TEXT.wordmarkLeft)}</span><span class="brand-sv">${escapeHtml(PRINT_BRAND_TEXT.wordmarkRight)}</span>
              </div>`;

      const brandBarLeft = isThermal
        ? brandWordmark
        : `<div class="brand-bar-left">
                <img class="brand-logo" src="${brandLogoSrcEsc}" alt="MV Services" width="72" height="36" decoding="async" />
                ${brandWordmark}
              </div>`;

      return `
        <div class="page">
          <div class="label">
            <!-- Marcas de esquina -->
            <span class="corner tl"></span>
            <span class="corner tr"></span>
            <span class="corner bl"></span>
            <span class="corner br"></span>

            <!-- Banda superior -->
            <header class="brand-bar">
              ${brandBarLeft}
              <div class="brand-meta">
                ${counter}
                <span class="brand-date">${escapeHtml(stamp)}</span>
              </div>
            </header>

            ${routeBlock}

            <!-- Destinatario -->
            <section class="dest-block">
              <div class="block-tag">DESTINATARIO</div>
              <div class="dest-name ${destClass}">${escapeHtml(l.destinatarioNombre)}</div>
              ${l.ref ? `<div class="dest-ref"><span class="ref-tag">REF</span><span class="ref-val">${escapeHtml(l.ref)}</span></div>` : ''}
            </section>

            <!-- Shipper / peso -->
            <section class="grid-info">
              <div class="info-cell">
                <div class="info-tag">SHIPPER</div>
                <div class="info-value">${escapeHtml(shipperNom)}</div>
                ${shipperEnc ? `<div class="info-sub">${escapeHtml(shipperEnc)}</div>` : ''}
              </div>
              ${
                pesoChips.length > 0
                  ? `<div class="info-cell info-cell-right">
                      <div class="info-tag">PESO</div>
                      <div class="chips">${pesoChips.join('')}</div>
                    </div>`
                  : ''
              }
            </section>

            ${
              l.contenido
                ? `<section class="content-block">
                    <div class="block-tag">CONTENIDO</div>
                    <div class="content-text">${escapeHtml(l.contenido)}</div>
                  </section>`
                : ''
            }

            <!-- Códigos -->
            <section class="codes-block ${opts.withQR ? 'with-qr' : ''}">
              <div class="barcode-frame">
                <div class="barcode-svg">${svg}</div>
                <div class="guide-number">${escapeHtml(l.numeroGuia)}</div>
              </div>
              ${qrBlock}
            </section>

            <!-- Pie con verificación visual rápida (últimos 4 chars) -->
            <footer class="foot-bar">
              <span class="foot-left">GUÍA · ${escapeHtml(l.numeroGuia)}</span>
              ${tail ? `<span class="foot-tail" aria-label="Verificación rápida">${escapeHtml(tail)}</span>` : ''}
              <span class="foot-right">${escapeHtml(PRINT_BRAND_TEXT.url)}</span>
            </footer>
          </div>
        </div>
      `;
    })
    .join('');

  // ---------------------------------------------------------------------------
  // CSS — distinto comportamiento entre modo `thermal` y `color`
  // ---------------------------------------------------------------------------
  const radii = isThermal
    ? { md: '0', sm: '0', pill: '0' }
    : { md: '4px', sm: '3px', pill: '999px' };

  const accentColor = isThermal ? '#000000' : BRAND_HEX.orange;
  const accentBg = isThermal ? '#000000' : BRAND_HEX.orange;
  const accentText = isThermal ? '#FFFFFF' : '#FFFFFF';
  const accentSoftBg = isThermal ? '#FFFFFF' : BRAND_HEX.orangeFaded;
  const accentSoftBorder = isThermal ? '#000000' : BRAND_HEX.orange;
  const subtleGray = isThermal ? '#000000' : BRAND_HEX.grayMid;
  const subtleBorder = isThermal ? '#000000' : BRAND_HEX.grayBorder;
  const softFill = isThermal ? '#FFFFFF' : BRAND_HEX.grayLight;
  const softFillStrong = isThermal ? '#000000' : BRAND_HEX.black;
  const tagFill = isThermal ? '#000000' : BRAND_HEX.grayLight;
  const tagText = isThermal ? '#FFFFFF' : BRAND_HEX.black;
  const tagBorder = isThermal ? '#000000' : BRAND_HEX.grayBorder;
  const screenPreviewBg = isThermal ? '#E5E7EB' : BRAND_HEX.grayLight;

  const autoCloseScript = opts.autoClose
    ? `window.addEventListener('afterprint', () => { setTimeout(() => window.close(), 200); });`
    : '';
  const autoPrintScript = opts.autoPrint
    ? `window.addEventListener('load', () => { setTimeout(() => { window.focus(); window.print(); }, 350); });`
    : '';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.title)}</title>
    <style>
      :root {
        --mv-black: #000000;
        --mv-white: #FFFFFF;
        --mv-accent: ${accentColor};
        --mv-accent-bg: ${accentBg};
        --mv-accent-text: ${accentText};
        --mv-accent-soft-bg: ${accentSoftBg};
        --mv-accent-soft-border: ${accentSoftBorder};
        --mv-subtle: ${subtleGray};
        --mv-subtle-border: ${subtleBorder};
        --mv-soft-fill: ${softFill};
        --mv-soft-fill-strong: ${softFillStrong};
        --mv-tag-fill: ${tagFill};
        --mv-tag-text: ${tagText};
        --mv-tag-border: ${tagBorder};
        --r-md: ${radii.md};
        --r-sm: ${radii.sm};
        --r-pill: ${radii.pill};
      }

      @page { size: ${pageWIn}in ${pageHIn}in; margin: 0; }
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }

      body {
        font-family: ${BRAND_FONT_PRINT.sans};
        color: var(--mv-black);
        background: var(--mv-white);
        -webkit-font-smoothing: ${isThermal ? 'subpixel-antialiased' : 'antialiased'};
        text-rendering: geometricPrecision;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* === Página === */
      .page {
        width: ${pageWIn}in;
        height: ${pageHIn}in;
        break-after: page;
        page-break-after: always;
        page-break-inside: avoid;
        display: flex;
      }
      .page:last-child {
        break-after: auto;
        page-break-after: auto;
      }

      /* === Etiqueta === */
      .label {
        position: relative;
        width: ${pageWIn}in;
        height: ${pageHIn}in;
        padding: 0.16in;
        display: grid;
        grid-template-rows: auto auto auto auto auto 1fr auto;
        gap: 0.06in;
        background: var(--mv-white);
        overflow: hidden;
      }

      /* Marcas de esquina (estética + ayuda visual de área de impresión) */
      .corner {
        position: absolute;
        width: 12px;
        height: 12px;
        border-color: var(--mv-black);
        border-style: solid;
        border-width: 0;
      }
      .corner.tl { top: 4px; left: 4px; border-top-width: 2px; border-left-width: 2px; }
      .corner.tr { top: 4px; right: 4px; border-top-width: 2px; border-right-width: 2px; }
      .corner.bl { bottom: 4px; left: 4px; border-bottom-width: 2px; border-left-width: 2px; }
      .corner.br { bottom: 4px; right: 4px; border-bottom-width: 2px; border-right-width: 2px; }

      /* === Banda superior === */
      .brand-bar {
        background: var(--mv-black);
        color: var(--mv-white);
        padding: 5px 9px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: var(--r-sm);
        position: relative;
        overflow: hidden;
      }
      .brand-bar-left {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .brand-logo {
        height: 18px;
        width: auto;
        max-width: 72px;
        object-fit: contain;
        flex-shrink: 0;
      }
      ${
        isThermal
          ? ''
          : `.brand-bar::after {
              content: "";
              position: absolute;
              left: 0; right: 0; bottom: 0;
              height: 2px;
              background: var(--mv-accent);
            }`
      }
      .brand-text {
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.12em;
        line-height: 1;
      }
      .brand-mv { color: var(--mv-white); }
      .brand-sv {
        color: ${isThermal ? 'var(--mv-white)' : 'var(--mv-accent)'};
        margin-left: 1px;
        ${isThermal ? 'opacity: .85;' : ''}
      }
      .brand-meta {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      .counter {
        display: inline-flex;
        align-items: baseline;
        background: ${isThermal ? 'var(--mv-white)' : 'var(--mv-accent)'};
        color: var(--mv-black);
        padding: 2px 6px;
        border-radius: var(--r-sm);
        font-weight: 800;
        font-size: 11px;
        letter-spacing: 0;
      }
      .counter-sep { margin: 0 1px; opacity: .7; }
      .brand-date {
        font-family: ${BRAND_FONT_PRINT.mono};
        font-size: 9.5px;
        color: ${isThermal ? '#FFFFFF' : '#D4D4D4'};
        letter-spacing: 0;
      }

      /* === Bloque de Ruta (Consolidado + Posición) === */
      .route-block {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
        align-items: stretch;
      }
      .route-cell {
        border: 1.5px solid var(--mv-black);
        border-radius: var(--r-sm);
        padding: 4px 7px;
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
        background: var(--mv-white);
      }
      .route-pos {
        background: var(--mv-black);
        color: var(--mv-white);
        align-items: center;
        justify-content: center;
        min-width: 0.85in;
        padding: 4px 10px;
      }
      .route-label {
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        line-height: 1;
        opacity: .85;
      }
      .route-value {
        font-family: ${BRAND_FONT_PRINT.mono};
        font-size: 16px;
        font-weight: 800;
        line-height: 1.1;
        text-transform: uppercase;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .route-value-big {
        font-size: 22px;
        letter-spacing: 0.04em;
      }

      /* === Bloques genéricos === */
      .block-tag,
      .info-tag {
        font-size: 8.5px;
        font-weight: 800;
        color: var(--mv-tag-text);
        background: var(--mv-tag-fill);
        border: 1px solid var(--mv-tag-border);
        padding: 2px 6px;
        border-radius: var(--r-sm);
        text-transform: uppercase;
        letter-spacing: 0.14em;
        display: inline-block;
        line-height: 1.4;
      }

      /* === Destinatario === */
      .dest-block {
        text-align: center;
        padding: 8px 6px 6px;
        border: 2px solid var(--mv-black);
        border-radius: var(--r-md);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        position: relative;
      }
      ${
        isThermal
          ? ''
          : `.dest-block::before {
              content: "";
              position: absolute;
              left: -2px;
              top: 12px;
              bottom: 12px;
              width: 4px;
              background: var(--mv-accent);
              border-radius: 2px;
            }`
      }
      .dest-name {
        font-weight: 900;
        line-height: 1.0;
        text-transform: uppercase;
        overflow-wrap: anywhere;
        word-break: break-word;
        color: var(--mv-black);
      }
      .dest-xl { font-size: 38px; }
      .dest-lg { font-size: 30px; }
      .dest-md { font-size: 24px; }
      .dest-sm { font-size: 18px; }
      .dest-ref {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
      }
      .ref-tag {
        background: var(--mv-black);
        color: var(--mv-white);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.14em;
        padding: 2px 6px;
        border-radius: var(--r-sm);
      }
      .ref-val {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.04em;
        font-family: ${BRAND_FONT_PRINT.mono};
      }

      /* === Grid info (shipper / peso) === */
      .grid-info {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
        align-items: stretch;
      }
      .info-cell {
        border: 1px solid var(--mv-black);
        border-radius: var(--r-sm);
        padding: 4px 6px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        background: var(--mv-white);
      }
      .info-cell-right { align-items: flex-end; }
      .info-value {
        font-size: 12px;
        font-weight: 700;
        line-height: 1.2;
        text-transform: uppercase;
        overflow-wrap: anywhere;
        color: var(--mv-black);
      }
      .info-sub {
        font-size: 10px;
        font-weight: 600;
        color: var(--mv-subtle);
        line-height: 1.2;
      }
      .chips {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .chip {
        display: inline-flex;
        align-items: baseline;
        gap: 3px;
        border: 1px solid var(--mv-black);
        padding: 2px 6px;
        border-radius: var(--r-pill);
        font-family: ${BRAND_FONT_PRINT.mono};
        background: var(--mv-white);
        color: var(--mv-black);
      }
      .chip-strong {
        background: var(--mv-black);
        color: var(--mv-white);
      }
      .chip-num {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0;
      }
      .chip-u {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.06em;
      }

      /* === Contenido === */
      .content-block {
        border: 1px solid var(--mv-subtle-border);
        background: var(--mv-soft-fill);
        border-radius: var(--r-sm);
        padding: 4px 6px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .content-text {
        font-size: 11px;
        line-height: 1.25;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--mv-black);
        max-height: 2.6em;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      /* === Códigos (barcode + opcional QR) === */
      .codes-block {
        display: grid;
        grid-template-columns: 1fr;
        gap: 6px;
        align-items: stretch;
        padding-top: 2px;
      }
      .codes-block.with-qr {
        grid-template-columns: 1fr auto;
      }
      .barcode-frame {
        border: 1.5px solid var(--mv-black);
        border-radius: var(--r-sm);
        padding: 6px 8px 4px;
        background: var(--mv-white);
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: center;
        min-width: 0;
      }
      .barcode-svg svg {
        display: block;
        width: 100%;
        height: 0.78in;
      }
      .guide-number {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.18em;
        font-family: ${BRAND_FONT_PRINT.mono};
        text-align: center;
        margin-top: 2px;
        color: var(--mv-black);
      }
      .qr-frame {
        border: 1.5px solid var(--mv-black);
        border-radius: var(--r-sm);
        padding: 4px;
        background: var(--mv-white);
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 0.95in;
      }
      .qr-frame svg {
        display: block;
        width: 0.90in;
        height: 0.90in;
      }

      /* === Pie === */
      .foot-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        border-top: 1px solid var(--mv-black);
        padding-top: 4px;
        font-size: 8.5px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: var(--mv-black);
        text-transform: uppercase;
      }
      .foot-left {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: ${BRAND_FONT_PRINT.mono};
        letter-spacing: 0.04em;
      }
      .foot-tail {
        background: var(--mv-black);
        color: var(--mv-white);
        font-family: ${BRAND_FONT_PRINT.mono};
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.18em;
        padding: 2px 6px;
        border-radius: var(--r-sm);
      }
      .foot-right {
        color: var(--mv-subtle);
        font-weight: 600;
        text-transform: lowercase;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }

      /* === Vista previa en pantalla === */
      @media screen {
        body {
          background: ${screenPreviewBg};
          padding: 24px;
        }
        .page {
          margin: 0 auto 24px;
          background: var(--mv-white);
          box-shadow: 0 8px 24px rgba(0, 0, 0, .14);
          ${isThermal ? '' : 'border-radius: 6px;'}
        }
      }

      /* === Ajustes específicos para tamaños pequeños === */
      ${
        opts.pageSize === '2x4' || opts.pageSize === '3x5'
          ? `
        .dest-xl { font-size: 26px; }
        .dest-lg { font-size: 22px; }
        .dest-md { font-size: 18px; }
        .dest-sm { font-size: 14px; }
        .guide-number { font-size: 16px; letter-spacing: 0.12em; }
        .barcode-svg svg { height: 0.55in; }
        .label { padding: 0.10in; gap: 0.05in; }
      `
          : ''
      }
    </style>
  </head>
  <body>
    ${pageHtml}
    <script>
      ${autoCloseScript}
      ${autoPrintScript}
    </script>
  </body>
</html>`;
}

// =============================================================================
// API pública
// =============================================================================

export async function printPackageLabels(
  labels: PackageLabel[],
  options?: PrintOptions,
): Promise<void> {
  const opts: Required<PrintOptions> = {
    pageSize: options?.pageSize ?? '4x6',
    orientation: options?.orientation ?? 'portrait',
    mode: options?.mode ?? 'thermal',
    title: options?.title ?? 'Etiquetas',
    withQR: options?.withQR ?? false,
    autoClose: options?.autoClose ?? false,
    autoPrint: options?.autoPrint ?? true,
  };

  if (!labels.length) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const w = window.open('', '_blank');
  if (!w) {
    alert('No se pudo abrir la ventana de impresión. Habilita los popups para este sitio.');
    return;
  }

  // Mensaje provisional mientras se generan los QR
  w.document.open();
  w.document.write(
    `<!doctype html><meta charset="utf-8"><title>${escapeHtml(opts.title)}</title>` +
      `<body style="font-family:${BRAND_FONT_PRINT.sans};color:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F8F9FA">` +
      `<div style="text-align:center"><div style="font-size:14px;font-weight:700;letter-spacing:.06em">Generando etiquetas…</div><div style="font-size:11px;color:#737373;margin-top:6px">Mantén esta pestaña abierta</div></div></body>`,
  );

  try {
    const html = await buildHtml(labels, opts);
    w.document.open();
    w.document.write(html);
    w.document.close();
  } catch (err) {
    console.error('Error generando etiquetas:', err);
    w.document.open();
    w.document.write(
      `<!doctype html><meta charset="utf-8"><body style="font-family:${BRAND_FONT_PRINT.sans};padding:24px;color:#000"><h1 style="font-size:16px">No se pudieron generar las etiquetas</h1><pre style="font-size:11px;color:#DC2626">${escapeHtml(String(err))}</pre></body>`,
    );
    w.document.close();
  }
}
