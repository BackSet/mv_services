import ExcelJS from 'exceljs';
import type { Paquete } from '@/services/paquetes.service';
import {
  BRAND_HEX,
  brandToARGB,
  formatPrintDate,
  getBrandLogoAbsoluteUrl,
  PRINT_BRAND_TEXT,
} from '@/lib/print/brandTokens';

// =============================================================================
// Helpers
// =============================================================================

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// =============================================================================
// Definición de columnas
// =============================================================================

type ColType = 'text' | 'number' | 'date';

type ColDef = {
  key:
    | keyof Paquete
    | 'shipperNombre'
    | 'consolidadoLabel'
    | 'posicion';
  label: string;
  width: number;
  type: ColType;
  format?: string;
  align?: 'left' | 'right' | 'center';
};

const COLUMNS: ColDef[] = [
  { key: 'numeroGuia',       label: 'Guía',           width: 22, type: 'text' },
  { key: 'destinatario',     label: 'Destinatario',   width: 28, type: 'text' },
  { key: 'ref',              label: 'Ref',            width: 16, type: 'text' },
  { key: 'contenido',        label: 'Contenido',      width: 32, type: 'text' },
  { key: 'pesoLbs',          label: 'Peso (lbs)',     width: 12, type: 'number', format: '#,##0.00', align: 'right' },
  { key: 'pesoKgs',          label: 'Peso (kgs)',     width: 12, type: 'number', format: '#,##0.00', align: 'right' },
  { key: 'shipperNombre',    label: 'Shipper',        width: 22, type: 'text' },
  { key: 'consolidadoLabel', label: 'Consolidado',    width: 18, type: 'text' },
  { key: 'posicion',         label: 'Pos. cons.',     width: 10, type: 'number', format: '0', align: 'right' },
  { key: 'fechaRegistro',    label: 'Fecha registro', width: 20, type: 'date',   format: 'dd/mm/yyyy hh:mm' },
];

function getCellValue(p: Paquete, col: ColDef): string | number | Date | null {
  switch (col.key) {
    case 'numeroGuia':       return p.numeroGuia ?? '';
    case 'destinatario':     return p.destinatario ?? '';
    case 'ref':              return p.ref ?? '';
    case 'contenido':        return p.contenido ?? '';
    case 'pesoLbs':          return p.pesoLbs ?? null;
    case 'pesoKgs':          return p.pesoKgs ?? null;
    case 'shipperNombre':    return p.shipper?.nombre ?? '';
    case 'consolidadoLabel': return p.consolidado?.numeroGuia ?? (p.consolidado ? `#${p.consolidado.id}` : '');
    case 'posicion':         return p.posicionEnConsolidado ?? null;
    case 'fechaRegistro':    return parseDate(p.fechaRegistro ?? null);
    default:                 return '';
  }
}

// =============================================================================
// Resumen
// =============================================================================

function calcResumen(paquetes: Paquete[]) {
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
  return {
    total: paquetes.length,
    totalLbs,
    totalKgs,
    conShipper,
    sinShipper: paquetes.length - conShipper,
    consolidados,
    sinConsolidar: paquetes.length - consolidados,
    pctShipper: paquetes.length > 0 ? Math.round((conShipper / paquetes.length) * 100) : 0,
    pctConsolidado: paquetes.length > 0 ? Math.round((consolidados / paquetes.length) * 100) : 0,
  };
}

// =============================================================================
// Helpers de estilo (paleta MV)
// =============================================================================

const FONT_NAME = 'Calibri';

const FILL_BLACK = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: brandToARGB('black') },
};

const FILL_ORANGE = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: brandToARGB('orange') },
};

const FILL_ORANGE_FADED = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: brandToARGB('orangeFaded') },
};

const FILL_GRAY_LIGHT = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: brandToARGB('grayLight') },
};

const FILL_ZEBRA = {
  type: 'pattern' as const,
  pattern: 'solid' as const,
  fgColor: { argb: brandToARGB('zebra') },
};

const BORDER_GRAY: ExcelJS.Borders = {
  top:    { style: 'thin', color: { argb: brandToARGB('grayBorder') } },
  left:   { style: 'thin', color: { argb: brandToARGB('grayBorder') } },
  bottom: { style: 'thin', color: { argb: brandToARGB('grayBorder') } },
  right:  { style: 'thin', color: { argb: brandToARGB('grayBorder') } },
  diagonal: { style: 'thin', color: { argb: brandToARGB('grayBorder') } },
};

// =============================================================================
// Construcción de la hoja "Paquetes"
// =============================================================================

function buildPaquetesSheet(wb: ExcelJS.Workbook, paquetes: Paquete[], brandLogoId?: number) {
  const ws = wb.addWorksheet('Paquetes', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 4, activeCell: 'B5' }],
    properties: { defaultRowHeight: 16 },
  });

  const totalCols = COLUMNS.length;
  const lastColLetter = ws.getColumn(totalCols).letter;

  ws.columns = COLUMNS.map((c) => ({ width: c.width }));

  // ---------------------------------------------------------------------------
  // Fila 1 — Título principal con marca
  // ---------------------------------------------------------------------------
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = {
    richText: [
      { text: PRINT_BRAND_TEXT.wordmarkLeft, font: { name: FONT_NAME, size: 16, bold: true, color: { argb: brandToARGB('white') } } },
      { text: PRINT_BRAND_TEXT.wordmarkRight, font: { name: FONT_NAME, size: 16, bold: true, color: { argb: brandToARGB('orange') } } },
      { text: '   Listado de paquetes', font: { name: FONT_NAME, size: 13, color: { argb: brandToARGB('grayBorder') } } },
    ],
  };
  titleCell.fill = FILL_BLACK;
  titleCell.alignment = {
    vertical: 'middle',
    horizontal: 'left',
    indent: brandLogoId != null ? 4 : 1,
  };
  ws.getRow(1).height = 30;

  if (brandLogoId != null) {
    ws.addImage(brandLogoId, {
      tl: { col: 0.12, row: 0.08 },
      ext: { width: 100, height: 34 },
    });
  }

  // ---------------------------------------------------------------------------
  // Fila 2 — Banda naranja delgada (acento de marca)
  // ---------------------------------------------------------------------------
  ws.mergeCells(2, 1, 2, totalCols);
  const accentCell = ws.getCell(2, 1);
  accentCell.value = '';
  accentCell.fill = FILL_ORANGE;
  ws.getRow(2).height = 4;

  // ---------------------------------------------------------------------------
  // Fila 3 — Meta (fecha de generación + totales)
  // ---------------------------------------------------------------------------
  ws.mergeCells(3, 1, 3, totalCols);
  const metaCell = ws.getCell(3, 1);
  metaCell.value = `Generado: ${formatPrintDate(new Date())}    •    Total registros: ${paquetes.length.toLocaleString('es')}`;
  metaCell.fill = FILL_GRAY_LIGHT;
  metaCell.font = { name: FONT_NAME, size: 9, color: { argb: brandToARGB('grayMid') } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(3).height = 18;

  // ---------------------------------------------------------------------------
  // Fila 4 — Cabeceras de tabla (negro con texto blanco)
  // ---------------------------------------------------------------------------
  const headerRow = ws.getRow(4);
  COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.label;
    cell.fill = FILL_BLACK;
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: brandToARGB('white') } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: col.align ?? 'left',
      indent: col.align === 'right' ? 0 : 1,
    };
    cell.border = {
      bottom: { style: 'medium', color: { argb: brandToARGB('orange') } },
    };
  });
  headerRow.height = 22;

  // ---------------------------------------------------------------------------
  // Filas 5..N — Datos (con zebra)
  // ---------------------------------------------------------------------------
  const dataStartRow = 5;
  paquetes.forEach((p, i) => {
    const row = ws.getRow(dataStartRow + i);
    const isZebra = i % 2 === 1;

    COLUMNS.forEach((col, c) => {
      const cell = row.getCell(c + 1);
      const val = getCellValue(p, col);

      if (val == null || val === '') {
        cell.value = '—';
        cell.font = { name: FONT_NAME, size: 10, color: { argb: brandToARGB('grayMid') }, italic: true };
      } else if (col.type === 'number' && typeof val === 'number') {
        cell.value = val;
        cell.numFmt = col.format ?? '#,##0.00';
        cell.font = { name: FONT_NAME, size: 10, color: { argb: brandToARGB('grayDark') } };
      } else if (col.type === 'date' && val instanceof Date) {
        cell.value = val;
        cell.numFmt = col.format ?? 'dd/mm/yyyy';
        cell.font = { name: FONT_NAME, size: 10, color: { argb: brandToARGB('grayDark') } };
      } else {
        cell.value = String(val);
        cell.font = { name: FONT_NAME, size: 10, color: { argb: brandToARGB('grayDark') } };
      }

      cell.alignment = {
        vertical: 'middle',
        horizontal: col.align ?? 'left',
        wrapText: col.type === 'text' && col.key !== 'numeroGuia' && col.key !== 'ref',
        indent: col.align === 'right' ? 0 : 1,
      };

      if (isZebra) cell.fill = FILL_ZEBRA;
      cell.border = BORDER_GRAY;
    });

    row.height = 18;
  });

  // ---------------------------------------------------------------------------
  // Fila final — Totales con fórmulas
  // ---------------------------------------------------------------------------
  if (paquetes.length > 0) {
    const totalsRow = ws.getRow(dataStartRow + paquetes.length);
    const firstDataRow = dataStartRow;
    const lastDataRow = dataStartRow + paquetes.length - 1;

    COLUMNS.forEach((col, c) => {
      const cell = totalsRow.getCell(c + 1);
      const colLetter = ws.getColumn(c + 1).letter;

      if (c === 0) {
        cell.value = 'TOTALES';
      } else if (col.type === 'number') {
        cell.value = { formula: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})` };
        cell.numFmt = col.format ?? '#,##0.00';
      } else {
        cell.value = '';
      }

      cell.fill = FILL_ORANGE_FADED;
      cell.font = {
        name: FONT_NAME,
        size: 10,
        bold: true,
        color: { argb: brandToARGB('black') },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.align ?? 'left',
        indent: col.align === 'right' ? 0 : 1,
      };
      cell.border = {
        ...BORDER_GRAY,
        top: { style: 'medium', color: { argb: brandToARGB('orange') } },
      };
    });

    totalsRow.height = 22;
  }

  // ---------------------------------------------------------------------------
  // AutoFilter sobre cabeceras y datos (excluye totales)
  // ---------------------------------------------------------------------------
  if (paquetes.length > 0) {
    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: dataStartRow + paquetes.length - 1, column: totalCols },
    };
  }

  // ---------------------------------------------------------------------------
  // Imprimibilidad: paisaje, ajuste a una página de ancho, área de impresión
  // ---------------------------------------------------------------------------
  ws.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    paperSize: 9, // A4
    horizontalCentered: true,
    printArea: `A1:${lastColLetter}${dataStartRow + paquetes.length}`,
  };
  ws.pageSetup.printTitlesRow = '1:4';

  ws.headerFooter = {
    oddHeader: '',
    oddFooter: `&L&"${FONT_NAME}"&8&K000000MV &K${BRAND_HEX.orange.slice(1)}SERVICES&K808080  •  Listado de paquetes&R&"${FONT_NAME}"&8&K555555Página &P de &N`,
  };
}

// =============================================================================
// Hoja "Resumen"
// =============================================================================

function buildResumenSheet(wb: ExcelJS.Workbook, paquetes: Paquete[], brandLogoId?: number) {
  const r = calcResumen(paquetes);
  const ws = wb.addWorksheet('Resumen', {
    views: [{ showGridLines: false }],
  });

  ws.columns = [
    { width: brandLogoId != null ? 14 : 6 },
    { width: 32 },
    { width: 22 },
    { width: 22 },
    { width: 6 },
  ];

  // --- Fila 1: título ---
  ws.mergeCells(1, 2, 1, 4);
  const titleCell = ws.getCell(1, 2);
  titleCell.value = {
    richText: [
      { text: PRINT_BRAND_TEXT.wordmarkLeft, font: { name: FONT_NAME, size: 18, bold: true, color: { argb: brandToARGB('black') } } },
      { text: PRINT_BRAND_TEXT.wordmarkRight, font: { name: FONT_NAME, size: 18, bold: true, color: { argb: brandToARGB('orange') } } },
      { text: '   Resumen de exportación', font: { name: FONT_NAME, size: 14, color: { argb: brandToARGB('grayDark') } } },
    ],
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 30;

  if (brandLogoId != null) {
    ws.addImage(brandLogoId, {
      tl: { col: 0.1, row: 0.08 },
      ext: { width: 88, height: 30 },
    });
  }

  // --- Fila 2: banda naranja ---
  ws.mergeCells(2, 2, 2, 4);
  const accentCell = ws.getCell(2, 2);
  accentCell.value = '';
  accentCell.fill = FILL_ORANGE;
  ws.getRow(2).height = 3;

  // --- Fila 3: meta ---
  ws.mergeCells(3, 2, 3, 4);
  const metaCell = ws.getCell(3, 2);
  metaCell.value = `Generado: ${formatPrintDate(new Date())}    •    ${PRINT_BRAND_TEXT.systemSubtitle}`;
  metaCell.font = { name: FONT_NAME, size: 9, color: { argb: brandToARGB('grayMid') } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(3).height = 18;

  // --- Filas 5+: Tarjetas tipo KPI (Métrica | Valor | Porcentaje) ---
  type KPI = { label: string; value: number | string; pct?: string; format?: string; accent?: 'orange' | 'success' | 'warning' | 'grayDark' };
  const kpis: KPI[] = [
    { label: 'TOTAL PAQUETES',     value: r.total,                                    format: '#,##0',     accent: 'orange' },
    { label: 'PESO TOTAL (LBS)',   value: Number(r.totalLbs.toFixed(2)),              format: '#,##0.00',  accent: 'grayDark' },
    { label: 'PESO TOTAL (KGS)',   value: Number(r.totalKgs.toFixed(2)),              format: '#,##0.00',  accent: 'grayDark' },
    { label: 'CON SHIPPER',        value: r.conShipper,                               format: '#,##0',     accent: r.pctShipper === 100 ? 'success' : 'warning', pct: `${r.pctShipper}%` },
    { label: 'SIN SHIPPER',        value: r.sinShipper,                               format: '#,##0',     accent: r.sinShipper === 0 ? 'success' : 'warning' },
    { label: 'CONSOLIDADOS',       value: r.consolidados,                             format: '#,##0',     accent: r.pctConsolidado === 100 ? 'success' : 'warning', pct: `${r.pctConsolidado}%` },
    { label: 'SIN CONSOLIDAR',     value: r.sinConsolidar,                            format: '#,##0',     accent: r.sinConsolidar === 0 ? 'success' : 'warning' },
  ];

  let row = 5;
  for (const kpi of kpis) {
    // columna 2: etiqueta
    const labelCell = ws.getCell(row, 2);
    labelCell.value = kpi.label;
    labelCell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: brandToARGB('grayMid') } };
    labelCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    labelCell.fill = FILL_GRAY_LIGHT;
    labelCell.border = {
      left: { style: 'medium', color: { argb: brandToARGB(kpi.accent ?? 'orange') } },
      bottom: { style: 'thin', color: { argb: brandToARGB('grayBorder') } },
    };

    // columna 3: valor
    const valueCell = ws.getCell(row, 3);
    if (typeof kpi.value === 'number') {
      valueCell.value = kpi.value;
      valueCell.numFmt = kpi.format ?? '#,##0';
    } else {
      valueCell.value = kpi.value;
    }
    valueCell.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: brandToARGB('grayDark') } };
    valueCell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
    valueCell.fill = FILL_GRAY_LIGHT;
    valueCell.border = { bottom: { style: 'thin', color: { argb: brandToARGB('grayBorder') } } };

    // columna 4: porcentaje (chip)
    const pctCell = ws.getCell(row, 4);
    if (kpi.pct) {
      pctCell.value = kpi.pct;
      pctCell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: brandToARGB('white') } };
      pctCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: brandToARGB(kpi.accent ?? 'orange') },
      };
      pctCell.alignment = { vertical: 'middle', horizontal: 'center' };
    } else {
      pctCell.value = '';
      pctCell.fill = FILL_GRAY_LIGHT;
    }
    pctCell.border = { bottom: { style: 'thin', color: { argb: brandToARGB('grayBorder') } } };

    ws.getRow(row).height = 26;
    row++;
  }

  ws.pageSetup = {
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 },
    paperSize: 9,
    horizontalCentered: true,
  };
}

// =============================================================================
// API pública
// =============================================================================

export async function exportPaquetesExcel(
  paquetes: Paquete[],
  filename?: string,
): Promise<void> {
  if (!paquetes.length) return;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'MV Services';
  wb.lastModifiedBy = 'MV Services';
  wb.title = 'Listado de paquetes';
  wb.subject = 'Reporte de paquetes';
  wb.company = 'MV Services';
  wb.created = new Date();
  wb.modified = new Date();

  let brandLogoId: number | undefined;
  try {
    const res = await fetch(getBrandLogoAbsoluteUrl());
    if (res.ok) {
      const buf = await res.arrayBuffer();
      brandLogoId = wb.addImage({ buffer: buf, extension: 'png' });
    }
  } catch {
    /* sin logo en Excel si falla la red o el recurso */
  }

  buildResumenSheet(wb, paquetes, brandLogoId);
  buildPaquetesSheet(wb, paquetes, brandLogoId);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const name = filename ?? `paquetes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadBlob(blob, name);
}
