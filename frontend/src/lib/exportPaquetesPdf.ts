import { jsPDF } from 'jspdf';
import type { Paquete } from '@/services/paquetes.service';

function formatFecha(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return s;
  }
}

const COLS = [
  { key: 'numeroGuia', label: 'Guía', w: 38 },
  { key: 'destinatario', label: 'Destinatario', w: 30 },
  { key: 'ref', label: 'Ref', w: 20 },
  { key: 'contenido', label: 'Contenido', w: 24 },
  { key: 'pesoLbs', label: 'Lbs', w: 14 },
  { key: 'pesoKgs', label: 'Kgs', w: 14 },
  { key: 'shipper', label: 'Shipper', w: 20 },
  { key: 'consolidado', label: 'Consol.', w: 18 },
  { key: 'fechaRegistro', label: 'Fecha reg.', w: 18 },
] as const;

const LINE_HEIGHT_MM = 4;
const TABLE_HEADER_HEIGHT = 10;
const MARGIN = 14;
const PAGE_HEIGHT = 210 - 2 * MARGIN; // A4 landscape
const TITLE_HEIGHT = 18;
const CELL_PADDING_X = 2;

/** Posiciones X de los bordes de cada columna (izq de col 0, izq de col 1, ..., derecho de última) */
function getColumnBounds(): number[] {
  let x = MARGIN;
  const bounds: number[] = [x];
  for (const col of COLS) {
    x += col.w;
    bounds.push(x);
  }
  return bounds;
}

function getCellValue(p: Paquete, key: string): string {
  switch (key) {
    case 'numeroGuia': return p.numeroGuia ?? '';
    case 'destinatario': return p.destinatario ?? '';
    case 'ref': return p.ref ?? '';
    case 'contenido': return p.contenido ?? '';
    case 'pesoLbs': return p.pesoLbs != null ? String(p.pesoLbs.toFixed(2)) : '';
    case 'pesoKgs': return p.pesoKgs != null ? String(p.pesoKgs.toFixed(2)) : '';
    case 'shipper': return p.shipper?.nombre ?? '';
    case 'consolidado': return p.consolidado?.numeroGuia ?? (p.consolidado ? `#${p.consolidado.id}` : '');
    case 'fechaRegistro': return formatFecha(p.fechaRegistro ?? null);
    default: return '';
  }
}

export function exportPaquetesPdf(paquetes: Paquete[], filename?: string): void {
  if (!paquetes.length) return;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const bounds = getColumnBounds();

  const drawGrid = (yTop: number, yBottom: number) => {
    doc.setLineWidth(0.2);
    doc.setDrawColor(180, 180, 180);
    const xStart = bounds[0];
    const xEnd = bounds[bounds.length - 1];
    doc.line(xStart, yTop, xEnd, yTop);
    doc.line(xStart, yBottom, xEnd, yBottom);
    for (let i = 0; i < bounds.length; i++) {
      doc.line(bounds[i], yTop, bounds[i], yBottom);
    }
  };

  const drawPageTitle = () => {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MV Services', MARGIN, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Listado de paquetes — ${new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, MARGIN, y);
    y += TITLE_HEIGHT - 8;
  };

  const drawTableHeader = () => {
    const yHeaderTop = y;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    for (let c = 0; c < COLS.length; c++) {
      const col = COLS[c];
      const x = bounds[c] + CELL_PADDING_X;
      doc.text(col.label, x, y + 6);
    }
    y += TABLE_HEADER_HEIGHT;
    doc.setFont('helvetica', 'normal');
    drawGrid(yHeaderTop, y);
  };

  const drawRow = (p: Paquete) => {
    doc.setFontSize(8);
    let rowLines = 1;
    const cellLines: string[][] = [];
    for (const col of COLS) {
      const raw = getCellValue(p, col.key);
      const lines = doc.splitTextToSize(raw || '—', col.w - CELL_PADDING_X * 2);
      cellLines.push(lines);
      if (lines.length > rowLines) rowLines = lines.length;
    }
    const rowHeightMm = rowLines * LINE_HEIGHT_MM;
    if (y + rowHeightMm > PAGE_HEIGHT + MARGIN) {
      doc.addPage('a4', 'l');
      y = MARGIN;
      drawPageTitle();
      drawTableHeader();
    }
    const rowY0 = y;
    for (let c = 0; c < COLS.length; c++) {
      const lines = cellLines[c];
      const x = bounds[c] + CELL_PADDING_X;
      let cellY = rowY0 + 3;
      for (const line of lines) {
        doc.text(line, x, cellY);
        cellY += LINE_HEIGHT_MM;
      }
    }
    y += rowHeightMm;
    drawGrid(rowY0, y);
  };

  drawPageTitle();
  drawTableHeader();
  for (const p of paquetes) {
    drawRow(p);
  }

  const name = filename ?? `paquetes_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(name);
}
