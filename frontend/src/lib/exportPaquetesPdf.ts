import { jsPDF } from 'jspdf';
import type { Paquete } from '@/services/paquetes.service';
import {
  BRAND_RGB,
  type RGB,
  formatPrintDate,
  formatPrintNumber,
  PRINT_BRAND_TEXT,
} from '@/lib/print/brandTokens';

// =============================================================================
// Alias locales (legibilidad) — la fuente de verdad es `brandTokens.ts`
// =============================================================================

const BRAND = BRAND_RGB;
const formatFecha = (s: string | null | undefined, withTime = true) => formatPrintDate(s, withTime);
const formatNumber = formatPrintNumber;

// =============================================================================
// Helpers de pintado jsPDF
// =============================================================================

function setFill(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function setDraw(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
function setText(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }

// =============================================================================
// Configuración de columnas
// =============================================================================

type Align = 'left' | 'right' | 'center';

type ColDef = {
  key: string;
  label: string;
  w: number;
  align?: Align;
  mono?: boolean;
};

const COLS: ColDef[] = [
  { key: 'numeroGuia',    label: 'Guía',         w: 36, mono: true },
  { key: 'destinatario',  label: 'Destinatario', w: 38 },
  { key: 'ref',           label: 'Ref',          w: 22, mono: true },
  { key: 'contenido',     label: 'Contenido',    w: 36 },
  { key: 'pesoLbs',       label: 'Lbs',          w: 14, align: 'right' },
  { key: 'pesoKgs',       label: 'Kgs',          w: 14, align: 'right' },
  { key: 'shipper',       label: 'Shipper',      w: 28 },
  { key: 'consolidado',   label: 'Consolidado',  w: 22, mono: true },
  { key: 'posicion',      label: 'Pos.',         w: 12, align: 'right' },
  { key: 'fechaRegistro', label: 'Fecha reg.',   w: 25 },
];

function getCellValue(p: Paquete, key: string): string {
  switch (key) {
    case 'numeroGuia':    return p.numeroGuia ?? '—';
    case 'destinatario':  return p.destinatario ?? '—';
    case 'ref':           return p.ref ?? '—';
    case 'contenido':     return p.contenido ?? '—';
    case 'pesoLbs':       return p.pesoLbs != null ? formatNumber(p.pesoLbs) : '—';
    case 'pesoKgs':       return p.pesoKgs != null ? formatNumber(p.pesoKgs) : '—';
    case 'shipper':       return p.shipper?.nombre ?? '—';
    case 'consolidado':   return p.consolidado?.numeroGuia ?? (p.consolidado ? `#${p.consolidado.id}` : '—');
    case 'posicion':      return p.posicionEnConsolidado != null ? `#${p.posicionEnConsolidado}` : '—';
    case 'fechaRegistro': return formatFecha(p.fechaRegistro ?? null);
    default:              return '—';
  }
}

// =============================================================================
// Layout (mm) — A4 landscape
// =============================================================================

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN_X = 12;
const MARGIN_TOP = 0;       // header empieza en el borde con la banda de marca
const MARGIN_BOTTOM = 14;

const HEADER_BAND_H = 4;    // banda naranja superior
const HEADER_BLOCK_H = 30;  // alto total del encabezado
const SUMMARY_H = 22;
const TABLE_HEADER_H = 9;
const LINE_H = 3.6;
const ROW_PAD_Y = 1.8;
const CELL_PAD_X = 2.2;

// =============================================================================
// Cálculo de columnas (escaladas para usar todo el ancho)
// =============================================================================

function getScaledCols(): { cols: ColDef[]; bounds: number[]; totalWidth: number } {
  const available = PAGE_W - 2 * MARGIN_X;
  const sum = COLS.reduce((s, c) => s + c.w, 0);
  const scale = available / sum;
  const cols = COLS.map((c) => ({ ...c, w: c.w * scale }));
  const bounds: number[] = [MARGIN_X];
  let x = MARGIN_X;
  for (const c of cols) {
    x += c.w;
    bounds.push(x);
  }
  return { cols, bounds, totalWidth: available };
}

// =============================================================================
// Resumen
// =============================================================================

type Resumen = {
  total: number;
  totalLbs: number;
  totalKgs: number;
  conShipper: number;
  consolidados: number;
  pctShipper: number;
  pctConsolidado: number;
};

function calcResumen(paquetes: Paquete[]): Resumen {
  let totalLbs = 0;
  let totalKgs = 0;
  let conShipper = 0;
  let consolidados = 0;
  for (const p of paquetes) {
    if (p.pesoLbs != null) totalLbs += p.pesoLbs;
    if (p.pesoKgs != null) totalKgs += p.pesoKgs;
    if (p.shipper) conShipper++;
    if (p.consolidado) consolidados++;
  }
  const total = paquetes.length;
  return {
    total,
    totalLbs,
    totalKgs,
    conShipper,
    consolidados,
    pctShipper:      total > 0 ? Math.round((conShipper / total) * 100) : 0,
    pctConsolidado:  total > 0 ? Math.round((consolidados / total) * 100) : 0,
  };
}

// =============================================================================
// Exportación principal
// =============================================================================

export function exportPaquetesPdf(paquetes: Paquete[], filename?: string): void {
  if (!paquetes.length) return;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { cols, bounds, totalWidth } = getScaledCols();
  const resumen = calcResumen(paquetes);
  const fechaGeneracion = formatFecha(new Date().toISOString());

  let y = MARGIN_TOP;

  // ---------------------------------------------------------------------------
  // Encabezado de marca
  // ---------------------------------------------------------------------------
  const drawHeader = () => {
    // Banda fina superior naranja (acento de marca)
    setFill(doc, BRAND.orange);
    doc.rect(0, 0, PAGE_W, HEADER_BAND_H, 'F');

    const baseY = HEADER_BAND_H + 7;

    // Wordmark "MVSERVICES" (sin logo cuadrado)
    setText(doc, BRAND.black);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(PRINT_BRAND_TEXT.wordmarkLeft, MARGIN_X, baseY);
    const mvW = doc.getTextWidth(PRINT_BRAND_TEXT.wordmarkLeft);
    setText(doc, BRAND.orange);
    doc.text(PRINT_BRAND_TEXT.wordmarkRight, MARGIN_X + mvW, baseY);

    // Subtítulo
    setText(doc, BRAND.grayMid);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(PRINT_BRAND_TEXT.systemSubtitle, MARGIN_X, baseY + 4);

    // Bloque derecho: título del reporte
    setText(doc, BRAND.grayDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const titulo = 'Listado de paquetes';
    const tw = doc.getTextWidth(titulo);
    doc.text(titulo, PAGE_W - MARGIN_X - tw, baseY - 0.5);

    // Meta a la derecha
    setText(doc, BRAND.grayMid);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const metaLines = [
      `Generado: ${fechaGeneracion}`,
      `Total registros: ${resumen.total.toLocaleString('es')}`,
    ];
    let metaY = baseY + 4;
    for (const line of metaLines) {
      const w = doc.getTextWidth(line);
      doc.text(line, PAGE_W - MARGIN_X - w, metaY);
      metaY += 3.6;
    }

    // Línea separadora con acento naranja a la izquierda
    const sepY = HEADER_BLOCK_H - 2;
    setDraw(doc, BRAND.grayBorder);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, sepY, PAGE_W - MARGIN_X, sepY);
    // segmento naranja inicial
    setDraw(doc, BRAND.orange);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_X, sepY, MARGIN_X + 22, sepY);

    y = HEADER_BLOCK_H + 2;
  };

  // ---------------------------------------------------------------------------
  // Tarjetas de resumen (KPIs)
  // ---------------------------------------------------------------------------
  const drawSummary = () => {
    type Card = { label: string; value: string; accent?: RGB };
    const cards: Card[] = [
      { label: 'Total paquetes',   value: resumen.total.toLocaleString('es'),                           accent: BRAND.orange },
      { label: 'Peso total (lbs)', value: formatNumber(resumen.totalLbs),                               accent: BRAND.grayDark },
      { label: 'Peso total (kgs)', value: formatNumber(resumen.totalKgs),                               accent: BRAND.grayDark },
      { label: 'Con shipper',      value: `${resumen.conShipper} / ${resumen.total}  •  ${resumen.pctShipper}%`,         accent: resumen.pctShipper === 100 ? BRAND.success : BRAND.warning },
      { label: 'Consolidados',     value: `${resumen.consolidados} / ${resumen.total}  •  ${resumen.pctConsolidado}%`,   accent: resumen.pctConsolidado === 100 ? BRAND.success : BRAND.warning },
    ];

    const gap = 3;
    const cardW = (totalWidth - gap * (cards.length - 1)) / cards.length;
    const cardH = SUMMARY_H - 2;
    let cx = MARGIN_X;

    for (const card of cards) {
      // Fondo
      setFill(doc, BRAND.grayLight);
      setDraw(doc, BRAND.grayBorder);
      doc.setLineWidth(0.2);
      doc.roundedRect(cx, y, cardW, cardH, 1.8, 1.8, 'FD');

      // Barra acento izquierda (4 colores de marca)
      const accent = card.accent ?? BRAND.orange;
      setFill(doc, accent);
      doc.rect(cx, y, 1.2, cardH, 'F');

      // Etiqueta
      setText(doc, BRAND.grayMid);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(card.label.toUpperCase(), cx + 4, y + 5);

      // Valor
      setText(doc, BRAND.grayDark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(card.value, cx + 4, y + 13.5);

      cx += cardW + gap;
    }

    y += SUMMARY_H;
  };

  // ---------------------------------------------------------------------------
  // Cabecera de tabla
  // ---------------------------------------------------------------------------
  const drawTableHeader = () => {
    // Fondo negro
    setFill(doc, BRAND.black);
    doc.rect(MARGIN_X, y, totalWidth, TABLE_HEADER_H, 'F');

    // Línea acento naranja debajo
    setFill(doc, BRAND.orange);
    doc.rect(MARGIN_X, y + TABLE_HEADER_H, totalWidth, 0.6, 'F');

    setText(doc, BRAND.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);

    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      const x = bounds[c];
      const align: Align = col.align ?? 'left';
      const tx = align === 'right' ? x + col.w - CELL_PAD_X
              : align === 'center' ? x + col.w / 2
              : x + CELL_PAD_X;
      doc.text(col.label.toUpperCase(), tx, y + TABLE_HEADER_H - 3, { align });
    }

    y += TABLE_HEADER_H + 0.6;
    setText(doc, BRAND.grayDark);
  };

  // ---------------------------------------------------------------------------
  // Pie de página
  // ---------------------------------------------------------------------------
  const drawFooter = (pageNum: number, totalPages?: number) => {
    const yFooter = PAGE_H - 7;

    // Línea superior gris
    setDraw(doc, BRAND.grayBorder);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, yFooter - 4, PAGE_W - MARGIN_X, yFooter - 4);

    // Acento naranja
    setDraw(doc, BRAND.orange);
    doc.setLineWidth(0.8);
    doc.line(MARGIN_X, yFooter - 4, MARGIN_X + 14, yFooter - 4);

    // Marca textual
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, BRAND.black);
    doc.text(PRINT_BRAND_TEXT.wordmarkLeft, MARGIN_X, yFooter);
    const mvW = doc.getTextWidth(PRINT_BRAND_TEXT.wordmarkLeft);
    setText(doc, BRAND.orange);
    doc.text(PRINT_BRAND_TEXT.wordmarkRight, MARGIN_X + mvW, yFooter);
    const svcW = doc.getTextWidth(PRINT_BRAND_TEXT.wordmarkRight);

    setText(doc, BRAND.grayMid);
    doc.setFont('helvetica', 'normal');
    doc.text(`  •  Reporte de paquetes  •  ${PRINT_BRAND_TEXT.url}`, MARGIN_X + mvW + svcW, yFooter);

    // Página
    setText(doc, BRAND.grayDark);
    doc.setFont('helvetica', 'bold');
    const pageText = totalPages ? `Página ${pageNum} de ${totalPages}` : `Página ${pageNum}`;
    const pw = doc.getTextWidth(pageText);
    doc.text(pageText, PAGE_W - MARGIN_X - pw, yFooter);
  };

  // ---------------------------------------------------------------------------
  // Salto de página
  // ---------------------------------------------------------------------------
  const newPage = () => {
    doc.addPage('a4', 'l');
    y = MARGIN_TOP;
    drawHeader();
    drawTableHeader();
  };

  // ---------------------------------------------------------------------------
  // Pintar fila
  // ---------------------------------------------------------------------------
  const drawRow = (p: Paquete, index: number) => {
    doc.setFontSize(8);

    let rowLines = 1;
    const cellLines: string[][] = [];
    for (const col of cols) {
      const raw = getCellValue(p, col.key);
      const lines = doc.splitTextToSize(raw, col.w - CELL_PAD_X * 2);
      cellLines.push(lines);
      if (lines.length > rowLines) rowLines = lines.length;
    }

    const rowH = rowLines * LINE_H + ROW_PAD_Y * 2;

    if (y + rowH > PAGE_H - MARGIN_BOTTOM) {
      newPage();
    }

    // Zebra (filas pares con leve fondo)
    if (index % 2 === 1) {
      setFill(doc, BRAND.zebra);
      doc.rect(MARGIN_X, y, totalWidth, rowH, 'F');
    }

    // Texto de cada celda
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      const lines = cellLines[c];
      const x = bounds[c];
      const align: Align = col.align ?? 'left';
      const tx = align === 'right' ? x + col.w - CELL_PAD_X
              : align === 'center' ? x + col.w / 2
              : x + CELL_PAD_X;

      // Estilo según columna
      if (col.mono) {
        doc.setFont('courier', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      // Color: dato vacío en gris claro, valor real en gris oscuro
      const isEmpty = lines.length === 1 && lines[0] === '—';
      setText(doc, isEmpty ? BRAND.grayMid : BRAND.grayDark);

      let cellY = y + ROW_PAD_Y + LINE_H - 0.6;
      for (const line of lines) {
        doc.text(line, tx, cellY, { align });
        cellY += LINE_H;
      }
    }

    // Borde inferior fino
    setDraw(doc, BRAND.grayBorder);
    doc.setLineWidth(0.1);
    doc.line(MARGIN_X, y + rowH, MARGIN_X + totalWidth, y + rowH);

    y += rowH;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  drawHeader();
  drawSummary();
  drawTableHeader();
  for (let i = 0; i < paquetes.length; i++) {
    drawRow(paquetes[i], i);
  }

  // Footer en todas las páginas con conteo real
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  // Metadata del documento
  doc.setProperties({
    title: `${PRINT_BRAND_TEXT.wordmarkLeft}${PRINT_BRAND_TEXT.wordmarkRight} — Listado de paquetes`,
    subject: 'Reporte de paquetes',
    author: `${PRINT_BRAND_TEXT.wordmarkLeft}${PRINT_BRAND_TEXT.wordmarkRight}`,
    creator: `${PRINT_BRAND_TEXT.wordmarkLeft}${PRINT_BRAND_TEXT.wordmarkRight}`,
  });

  const name = filename ?? `paquetes_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
}
