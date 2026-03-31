import * as XLSX from 'xlsx';
import type { Paquete } from '@/services/paquetes.service';

function formatFecha(s: string | null | undefined): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return s;
  }
}

const COLUMNS = ['Guía', 'Destinatario', 'Ref', 'Contenido', 'Peso lbs', 'Peso kgs', 'Shipper', 'Consolidado', 'Fecha registro'] as const;

function toRow(p: Paquete): Record<string, string | number> {
  return {
    'Guía': p.numeroGuia ?? '',
    'Destinatario': p.destinatario ?? '',
    'Ref': p.ref ?? '',
    'Contenido': p.contenido ?? '',
    'Peso lbs': p.pesoLbs != null ? p.pesoLbs : '',
    'Peso kgs': p.pesoKgs != null ? p.pesoKgs : '',
    'Shipper': p.shipper?.nombre ?? '',
    'Consolidado': p.consolidado?.numeroGuia ?? (p.consolidado ? `#${p.consolidado.id}` : ''),
    'Fecha registro': formatFecha(p.fechaRegistro ?? null),
  };
}

export function exportPaquetesExcel(paquetes: Paquete[], filename?: string): void {
  if (!paquetes.length) return;
  const dataRows = paquetes.map(toRow);
  const title = 'MV Services';
  const subtitle = `Listado de paquetes — ${new Date().toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

  // Construir hoja: fila 1 título, fila 2 subtítulo, fila 3 vacía, fila 4 cabeceras, luego datos
  const headerLabels = [...COLUMNS];
  const aoa: (string | number)[][] = [
    [title],
    [subtitle],
    [],
    headerLabels,
    ...dataRows.map((r) => headerLabels.map((h) => r[h] ?? '')),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Anchos de columna según contenido (evitar solapamiento)
  const minWidths = [20, 15, 14, 12, 8, 8, 12, 15, 16];
  const maxLengths = COLUMNS.map((col, i) => {
    let maxLen = col.length;
    for (const row of dataRows) {
      const val = row[col];
      const str = val != null ? String(val) : '';
      if (str.length > maxLen) maxLen = str.length;
    }
    return Math.max(minWidths[i], Math.min(maxLen + 2, 60)); // cap 60 para no columnas gigantes
  });
  ws['!cols'] = maxLengths.map((wch) => ({ wch }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Paquetes');
  const name = filename ?? `paquetes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
}
