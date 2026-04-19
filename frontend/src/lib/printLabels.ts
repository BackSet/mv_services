import JsBarcode from 'jsbarcode';

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
};

type PrintOptions = {
  pageSize?: '4x6';
  title?: string;
  /** Cierra la ventana automáticamente después de imprimir */
  autoClose?: boolean;
};

function escapeHtml(v: string) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function barcodeSvg(value: string, opts?: { height?: number; width?: number }): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    height: opts?.height ?? 110,
    width: opts?.width ?? 3,
    background: 'transparent',
    lineColor: '#000000',
  });
  return svg.outerHTML;
}

function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(Number(n))) return '';
  return Number(n).toLocaleString('es-EC', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function nowStamp(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

/**
 * Calcula la clase de tamaño de fuente para el destinatario según longitud,
 * para que nombres largos no rompan el layout.
 */
function destSizeClass(name: string): string {
  const len = (name || '').length;
  if (len <= 14) return 'dest-xl';
  if (len <= 22) return 'dest-lg';
  if (len <= 32) return 'dest-md';
  return 'dest-sm';
}

function buildHtml(labels: PackageLabel[], opts: Required<PrintOptions>) {
  const total = labels.length;
  const stamp = nowStamp();

  const safe = labels.map((l) => ({
    ...l,
    numeroGuia: String(l.numeroGuia ?? '').trim(),
    shipperNombre: (l.shipperNombre || '').trim(),
    shipperEncargado: (l.shipperEncargado || '').trim() || null,
    destinatarioNombre: (l.destinatarioNombre || '').trim() || 'SIN DESTINATARIO',
    ref: (l.ref || '').trim() || null,
    contenido: (l.contenido || '').trim() || null,
    consolidadoGuia: (l.consolidadoGuia || '').trim() || null,
  }));

  const pageHtml = safe
    .map((l, idx) => {
      const svg = barcodeSvg(l.numeroGuia);
      const shipperEnc = l.shipperEncargado;
      const shipperNom = l.shipperNombre || '—';
      const destClass = destSizeClass(l.destinatarioNombre);

      const pesoChips: string[] = [];
      if (l.pesoLbs != null && l.pesoLbs > 0) {
        pesoChips.push(`<span class="chip chip-strong"><span class="chip-num">${formatNumber(l.pesoLbs)}</span><span class="chip-u">LB</span></span>`);
      }
      if (l.pesoKgs != null && l.pesoKgs > 0) {
        pesoChips.push(`<span class="chip"><span class="chip-num">${formatNumber(l.pesoKgs)}</span><span class="chip-u">KG</span></span>`);
      }

      const counter = total > 1
        ? `<span class="counter">${idx + 1}<span class="counter-sep">/</span>${total}</span>`
        : '';

      const consolidadoBadge = l.consolidadoGuia
        ? `<div class="consol-badge"><span class="consol-label">CONSOL</span><span class="consol-val">${escapeHtml(l.consolidadoGuia)}</span></div>`
        : '';

      return `
        <div class="page">
          <div class="label">
            <!-- Marcas de esquina -->
            <span class="corner tl"></span>
            <span class="corner tr"></span>
            <span class="corner bl"></span>
            <span class="corner br"></span>

            <!-- Banda superior negra -->
            <header class="brand-bar">
              <div class="brand-text">
                <span class="brand-mv">MV</span><span class="brand-sv">SERVICES</span>
              </div>
              <div class="brand-meta">
                ${counter}
                <span class="brand-date">${escapeHtml(stamp)}</span>
              </div>
            </header>

            <!-- Destinatario -->
            <section class="block dest-block">
              <div class="block-tag">DESTINATARIO</div>
              <div class="dest-name ${destClass}">${escapeHtml(l.destinatarioNombre)}</div>
              ${l.ref ? `<div class="dest-ref"><span class="ref-tag">REF</span><span class="ref-val">${escapeHtml(l.ref)}</span></div>` : ''}
            </section>

            <!-- Datos secundarios: shipper / peso -->
            <section class="grid-info">
              <div class="info-cell">
                <div class="info-tag">SHIPPER</div>
                <div class="info-value">${escapeHtml(shipperNom)}</div>
                ${shipperEnc ? `<div class="info-sub">${escapeHtml(shipperEnc)}</div>` : ''}
              </div>
              ${pesoChips.length > 0 ? `
                <div class="info-cell info-cell-right">
                  <div class="info-tag">PESO</div>
                  <div class="chips">${pesoChips.join('')}</div>
                </div>
              ` : ''}
            </section>

            ${l.contenido ? `
              <section class="content-block">
                <div class="block-tag">CONTENIDO</div>
                <div class="content-text">${escapeHtml(l.contenido)}</div>
              </section>
            ` : ''}

            <!-- Código de barras -->
            <section class="barcode-block">
              ${consolidadoBadge}
              <div class="barcode-frame">
                <div class="barcode-svg">${svg}</div>
              </div>
              <div class="guide-number">${escapeHtml(l.numeroGuia)}</div>
            </section>

            <!-- Pie -->
            <footer class="foot-bar">
              <span class="foot-left">GUÍA · ${escapeHtml(l.numeroGuia)}</span>
              <span class="foot-right">mvservices.app</span>
            </footer>
          </div>
        </div>
      `;
    })
    .join('');

  const autoCloseScript = opts.autoClose
    ? `window.addEventListener('afterprint', () => { setTimeout(() => window.close(), 200); });`
    : '';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(opts.title)}</title>
    <style>
      @page { size: 4in 6in; margin: 0; }
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: "Helvetica Neue", Helvetica, Arial, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #000;
        background: #fff;
        -webkit-font-smoothing: antialiased;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* === Página === */
      .page {
        width: 4in;
        height: 6in;
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
        width: 4in;
        height: 6in;
        padding: 0.18in 0.18in 0.14in 0.18in;
        display: grid;
        grid-template-rows: auto auto auto auto 1fr auto;
        gap: 0.07in;
        background: #fff;
        overflow: hidden;
      }

      /* Marcas de esquina (estética + ayuda visual de área de impresión) */
      .corner {
        position: absolute;
        width: 14px;
        height: 14px;
        border-color: #000;
        border-style: solid;
        border-width: 0;
      }
      .corner.tl { top: 6px; left: 6px; border-top-width: 2px; border-left-width: 2px; }
      .corner.tr { top: 6px; right: 6px; border-top-width: 2px; border-right-width: 2px; }
      .corner.bl { bottom: 6px; left: 6px; border-bottom-width: 2px; border-left-width: 2px; }
      .corner.br { bottom: 6px; right: 6px; border-bottom-width: 2px; border-right-width: 2px; }

      /* === Banda superior === */
      .brand-bar {
        background: #000;
        color: #fff;
        padding: 6px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 3px;
      }
      .brand-text {
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.12em;
        line-height: 1;
      }
      .brand-mv { color: #fff; }
      .brand-sv { color: #f97316; margin-left: 1px; }
      .brand-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.04em;
      }
      .counter {
        display: inline-flex;
        align-items: baseline;
        background: #f97316;
        color: #000;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 800;
        font-size: 11px;
        letter-spacing: 0;
      }
      .counter-sep { margin: 0 1px; opacity: .7; }
      .brand-date {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
        font-size: 9.5px;
        color: #d4d4d4;
        letter-spacing: 0;
      }

      /* === Bloques genéricos === */
      .block-tag,
      .info-tag {
        font-size: 8.5px;
        font-weight: 800;
        color: #000;
        background: #f0f0f0;
        padding: 2px 6px;
        border-radius: 2px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        display: inline-block;
        line-height: 1.4;
      }

      /* === Destinatario === */
      .dest-block {
        text-align: center;
        padding: 8px 4px 6px;
        border: 2px solid #000;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .dest-name {
        font-weight: 900;
        line-height: 1.02;
        text-transform: uppercase;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .dest-xl { font-size: 38px; }
      .dest-lg { font-size: 32px; }
      .dest-md { font-size: 26px; }
      .dest-sm { font-size: 20px; }
      .dest-ref {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
      }
      .ref-tag {
        background: #000;
        color: #fff;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.14em;
        padding: 2px 6px;
        border-radius: 2px;
      }
      .ref-val {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.04em;
      }

      /* === Grid info (shipper / peso) === */
      .grid-info {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: stretch;
      }
      .info-cell {
        border: 1px solid #000;
        border-radius: 3px;
        padding: 4px 6px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .info-cell-right { align-items: flex-end; }
      .info-value {
        font-size: 12px;
        font-weight: 700;
        line-height: 1.2;
        text-transform: uppercase;
        overflow-wrap: anywhere;
      }
      .info-sub {
        font-size: 10px;
        font-weight: 600;
        color: #444;
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
        border: 1px solid #000;
        padding: 2px 6px;
        border-radius: 999px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      .chip-strong {
        background: #000;
        color: #fff;
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
        border: 1px solid #000;
        border-radius: 3px;
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
        max-height: 2.6em;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      /* === Código de barras === */
      .barcode-block {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding-top: 2px;
      }
      .consol-badge {
        position: absolute;
        top: -2px;
        right: 0;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: #fff;
        border: 1px solid #000;
        padding: 1px 5px;
        border-radius: 2px;
      }
      .consol-label {
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.1em;
        background: #000;
        color: #fff;
        padding: 1px 3px;
        border-radius: 1px;
      }
      .consol-val {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 10px;
        font-weight: 800;
      }
      .barcode-frame {
        width: 100%;
        border: 1.5px solid #000;
        border-radius: 3px;
        padding: 6px 8px 4px;
        background: #fff;
      }
      .barcode-svg svg {
        display: block;
        width: 100%;
        height: 0.75in;
      }
      .guide-number {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.18em;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        text-align: center;
        margin-top: 2px;
      }

      /* === Pie === */
      .foot-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid #000;
        padding-top: 4px;
        font-size: 8.5px;
        font-weight: 700;
        letter-spacing: 0.06em;
        color: #000;
        text-transform: uppercase;
      }
      .foot-right { color: #555; font-weight: 600; }

      /* Vista previa en pantalla (cuando aún no se imprime) */
      @media screen {
        body {
          background: #e5e7eb;
          padding: 24px;
        }
        .page {
          margin: 0 auto 24px;
          background: #fff;
          box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
        }
      }
    </style>
  </head>
  <body>
    ${pageHtml}
    <script>
      ${autoCloseScript}
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.focus();
          window.print();
        }, 350);
      });
    </script>
  </body>
</html>`;
}

export function printPackageLabels(labels: PackageLabel[], options?: PrintOptions) {
  const opts: Required<PrintOptions> = {
    pageSize: '4x6',
    title: options?.title ?? 'Etiquetas',
    autoClose: options?.autoClose ?? false,
  };

  if (!labels.length) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const w = window.open('', '_blank');
  if (!w) {
    alert('No se pudo abrir la ventana de impresión. Habilita los popups para este sitio.');
    return;
  }

  const html = buildHtml(labels, opts);
  w.document.open();
  w.document.write(html);
  w.document.close();
}
