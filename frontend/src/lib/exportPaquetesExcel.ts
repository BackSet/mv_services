import * as XLSX from 'xlsx';
import type { Paquete } from '@/services/paquetes.service';

// =============================================================================
// Helpers
// =============================================================================

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// =============================================================================
// Definición de columnas
// =============================================================================

type ColType = 'text' | 'number' | 'date';

type ColDef = {
  key: keyof Paquete | 'shipperNombre' | 'consolidadoLabel' | 'posicion';
  label: string;
  width: number;
  type: ColType;
  format?: string; // formato numérico de Excel (z)
};

const COLUMNS: ColDef[] = [
  { key: 'numeroGuia',       label: 'Guía',          width: 22, type: 'text' },
  { key: 'destinatario',     label: 'Destinatario',  width: 26, type: 'text' },
  { key: 'ref',              label: 'Ref',           width: 16, type: 'text' },
  { key: 'contenido',        label: 'Contenido',     width: 30, type: 'text' },
  { key: 'pesoLbs',          label: 'Peso (lbs)',    width: 12, type: 'number', format: '#,##0.00' },
  { key: 'pesoKgs',          label: 'Peso (kgs)',    width: 12, type: 'number', format: '#,##0.00' },
  { key: 'shipperNombre',    label: 'Shipper',       width: 22, type: 'text' },
  { key: 'consolidadoLabel', label: 'Consolidado',   width: 18, type: 'text' },
  { key: 'posicion',         label: 'Pos. cons.',    width: 10, type: 'number', format: '0' },
  { key: 'fechaRegistro',    label: 'Fecha registro', width: 20, type: 'date', format: 'dd/mm/yyyy hh:mm' },
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
  };
}

// =============================================================================
// Construcción de la hoja "Paquetes"
// =============================================================================

function buildPaquetesSheet(paquetes: Paquete[]): XLSX.WorkSheet {
  const TITLE_ROW = 1;     // A1: título
  const META_ROW = 2;      // A2: meta
  const HEADER_ROW = 4;    // fila 4 (1-based) = índice 3
  const DATA_START_ROW = 5;
  const totalCols = COLUMNS.length;

  const ws: XLSX.WorkSheet = {};

  // --- Título y meta ---
  const titulo = 'MV Services — Listado de paquetes';
  const meta = `Generado: ${new Date().toLocaleString('es', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })}   •   Total registros: ${paquetes.length.toLocaleString('es')}`;

  ws[XLSX.utils.encode_cell({ r: TITLE_ROW - 1, c: 0 })] = { t: 's', v: titulo };
  ws[XLSX.utils.encode_cell({ r: META_ROW - 1, c: 0 })]  = { t: 's', v: meta };

  // --- Cabeceras ---
  for (let c = 0; c < totalCols; c++) {
    ws[XLSX.utils.encode_cell({ r: HEADER_ROW - 1, c })] = { t: 's', v: COLUMNS[c].label };
  }

  // --- Datos ---
  paquetes.forEach((p, i) => {
    for (let c = 0; c < totalCols; c++) {
      const col = COLUMNS[c];
      const val = getCellValue(p, col);
      const ref = XLSX.utils.encode_cell({ r: DATA_START_ROW - 1 + i, c });
      if (val == null || val === '') {
        ws[ref] = { t: 's', v: '' };
        continue;
      }
      if (col.type === 'number' && typeof val === 'number') {
        ws[ref] = { t: 'n', v: val, z: col.format };
      } else if (col.type === 'date' && val instanceof Date) {
        ws[ref] = { t: 'd', v: val, z: col.format };
      } else {
        ws[ref] = { t: 's', v: String(val) };
      }
    }
  });

  // --- Fila de totales (al final de los datos) ---
  const totalsRow = DATA_START_ROW - 1 + paquetes.length;
  ws[XLSX.utils.encode_cell({ r: totalsRow, c: 0 })] = { t: 's', v: 'TOTALES' };

  // Sumas para columnas numéricas vía fórmula SUM
  for (let c = 0; c < totalCols; c++) {
    const col = COLUMNS[c];
    if (col.type !== 'number') continue;
    const colLetter = XLSX.utils.encode_col(c);
    const firstRow = DATA_START_ROW;             // 1-based
    const lastRow = DATA_START_ROW + paquetes.length - 1;
    const ref = XLSX.utils.encode_cell({ r: totalsRow, c });
    ws[ref] = {
      t: 'n',
      f: `SUM(${colLetter}${firstRow}:${colLetter}${lastRow})`,
      z: col.format,
    };
  }

  // --- Rango y meta de hoja ---
  const lastRow = totalsRow;
  const lastCol = totalCols - 1;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } });

  // Anchos
  ws['!cols'] = COLUMNS.map((c) => ({ wch: c.width }));

  // Alturas (título y meta más altas)
  ws['!rows'] = [
    { hpt: 24 }, // título
    { hpt: 16 }, // meta
    { hpt: 6 },  // separador
    { hpt: 20 }, // header
  ];

  // Merges: título y meta a lo ancho de la tabla
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ];

  // Freeze: cabeceras y primera columna
  ws['!freeze'] = { xSplit: 1, ySplit: HEADER_ROW } as unknown as XLSX.WorkSheet['!freeze'];
  // Algunos lectores usan '!views' para freeze panes
  (ws as unknown as { '!views': unknown[] })['!views'] = [
    { state: 'frozen', xSplit: 1, ySplit: HEADER_ROW, topLeftCell: 'B5', activePane: 'bottomRight' },
  ];

  // AutoFilter sobre cabeceras + datos (excluye fila de totales)
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: HEADER_ROW - 1, c: 0 },
      e: { r: DATA_START_ROW - 1 + paquetes.length - 1, c: lastCol },
    }),
  };

  return ws;
}

// =============================================================================
// Hoja "Resumen"
// =============================================================================

function buildResumenSheet(paquetes: Paquete[]): XLSX.WorkSheet {
  const r = calcResumen(paquetes);
  const fechaGen = new Date().toLocaleString('es', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const aoa: (string | number)[][] = [
    ['MV Services — Resumen de exportación'],
    [`Generado: ${fechaGen}`],
    [],
    ['Métrica', 'Valor'],
    ['Total paquetes', r.total],
    ['Peso total (lbs)', Number(r.totalLbs.toFixed(2))],
    ['Peso total (kgs)', Number(r.totalKgs.toFixed(2))],
    ['Con shipper', r.conShipper],
    ['Sin shipper', r.sinShipper],
    ['Consolidados', r.consolidados],
    ['Sin consolidar', r.sinConsolidar],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [{ wch: 28 }, { wch: 18 }];
  ws['!rows'] = [{ hpt: 24 }, { hpt: 16 }, { hpt: 6 }, { hpt: 20 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ];

  // Aplicar formatos numéricos a las celdas de valores
  const numericFormats: Record<number, string> = {
    4: '#,##0',          // total paquetes
    5: '#,##0.00',       // lbs
    6: '#,##0.00',       // kgs
    7: '#,##0',          // con shipper
    8: '#,##0',          // sin shipper
    9: '#,##0',          // consolidados
    10: '#,##0',         // sin consolidar
  };
  for (const [rowStr, fmt] of Object.entries(numericFormats)) {
    const ref = XLSX.utils.encode_cell({ r: Number(rowStr), c: 1 });
    if (ws[ref]) ws[ref].z = fmt;
  }

  return ws;
}

// =============================================================================
// API pública
// =============================================================================

export function exportPaquetesExcel(paquetes: Paquete[], filename?: string): void {
  if (!paquetes.length) return;

  const wb = XLSX.utils.book_new();

  // Propiedades del libro
  wb.Props = {
    Title: 'Listado de paquetes',
    Subject: 'Reporte de paquetes',
    Author: 'MV Services',
    CreatedDate: new Date(),
  };

  XLSX.utils.book_append_sheet(wb, buildResumenSheet(paquetes), 'Resumen');
  XLSX.utils.book_append_sheet(wb, buildPaquetesSheet(paquetes), 'Paquetes');

  const name = filename ?? `paquetes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name, { cellDates: true, compression: true });
}
