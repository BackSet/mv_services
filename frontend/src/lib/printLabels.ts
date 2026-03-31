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
};

type PrintOptions = {
  pageSize?: '4x6';
  title?: string;
};

function escapeHtml(v: string) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function barcodeSvg(value: string): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    height: 80, // Taller barcode for full page
    width: 3,   // Wider bars
    background: 'transparent',
  });
  return svg.outerHTML;
}

function buildHtml(labels: PackageLabel[], opts: Required<PrintOptions>) {
  const safe = labels.map((l) => ({
    ...l,
    numeroGuia: String(l.numeroGuia ?? ''),
    shipperNombre: l.shipperNombre || '—',
    shipperEncargado: l.shipperEncargado || null,
    destinatarioNombre: l.destinatarioNombre || '—',
    ref: l.ref || null,
  }));

  // 1 etiqueta por página (4x6 completa)
  const pageHtml = safe
    .map((l) => {
      const svg = barcodeSvg(l.numeroGuia);
      const shipperLinea = l.shipperEncargado
        ? `${l.shipperEncargado} · ${l.shipperNombre}`
        : l.shipperNombre;

      return `
        <div class="page">
          <div class="label">
            <div class="head">
              <div class="brand">MV SERVICES</div>
              <div class="meta">Etiqueta 4x6</div>
            </div>

            <div class="dest-section">
              <div class="dest-label">DESTINATARIO</div>
              <div class="dest-main">${escapeHtml(l.destinatarioNombre)}</div>
              ${l.ref ? `<div class="ref-pill">REF: ${escapeHtml(l.ref)}</div>` : ''}
            </div>

            <div class="shipper-line">SHIPPER: ${escapeHtml(shipperLinea || '—')}</div>

            <div class="barcode-section">
              <div class="barcode-container">${svg}</div>
              <div class="guide-number">${escapeHtml(l.numeroGuia)}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(opts.title)}</title>
    <style>
      @page { size: 4in 6in; margin: 0; }
      html, body { margin: 0; padding: 0; }
      body { 
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        width: 4in;
        height: 6in;
        break-after: page;
        page-break-after: always;
        display: flex;
        flex-direction: column;
      }
      .page:last-child {
        break-after: auto;
        page-break-after: auto;
      }
      .label {
        width: 4in;
        height: 6in;
        box-sizing: border-box;
        padding: 0.25in;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border: none;
        overflow: hidden;
        background: #fff;
      }

      .head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        border-bottom: 1px solid #000;
        padding-bottom: 6px;
      }

      .brand {
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      .meta {
        font-size: 11px;
        font-weight: 600;
        color: #555;
      }

      .dest-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 6px;
        text-align: center;
      }

      .dest-label {
        font-size: 11px;
        font-weight: 600;
        color: #555;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .dest-main {
        font-size: 40px;
        font-weight: 800;
        line-height: 1.06;
        text-transform: uppercase;
        overflow-wrap: anywhere;
      }

      .ref-pill {
        align-self: center;
        margin-top: 4px;
        padding: 4px 10px;
        border: 1px solid #000;
        border-radius: 999px;
        font-size: 14px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      .shipper-line {
        border-top: 1px dashed #888;
        padding-top: 8px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #222;
        text-align: center;
        overflow-wrap: anywhere;
      }

      .barcode-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        width: 100%;
      }
      .barcode-container svg {
        width: 100%;
        height: 80px;
        max-width: 3.5in;
      }
      .guide-number {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 0.15em;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
    </style>
  </head>
  <body>
    ${pageHtml}
    <script>
      window.onload = () => {
        setTimeout(() => {
          window.focus();
          window.print();
        }, 500);
      };
    </script>
  </body>
</html>`;
}

export function printPackageLabels(labels: PackageLabel[], options?: PrintOptions) {
  const opts: Required<PrintOptions> = {
    pageSize: '4x6',
    title: options?.title ?? 'Etiquetas',
  };

  if (!labels.length) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const w = window.open('', '_blank');
  if (!w) {
    alert('No se pudo abrir la ventana de impresión. Habilita popups para este sitio.');
    return;
  }

  const html = buildHtml(labels, opts);
  w.document.open();
  w.document.write(html);
  w.document.close();
}
