import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '@/hooks/useMe';
import { listShippers, type Shipper } from '@/services/shippers.service';
import { ShipperCombobox } from '@/components/shipper/ShipperCombobox';
import { Package, Plus, Eye, Pencil, Trash2, Download, RefreshCcw, FilterX, CalendarDays, Boxes, FileSpreadsheet, FileText, ListChecks, CheckCircle2, AlertCircle, Copy, Rows3, Rows2, Weight, UserRound, Layers, ArrowUp } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import NotionTable from '@/components/notion/NotionTable';
import type { NotionTableAction, SortState } from '@/components/notion/NotionTable';
import EmptyState from '@/components/notion/EmptyState';
import { ListToolbar } from '@/components/list/ListToolbar';
import { ListPagination } from '@/components/list/ListPagination';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { usePaquetesList } from '@/hooks/usePaquetes';
import { deletePaquete } from '@/services/paquetes.service';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import type { Paquete } from '@/services/paquetes.service';
import { exportPaquetesExcel } from '@/lib/exportPaquetesExcel';
import { exportPaquetesPdf } from '@/lib/exportPaquetesPdf';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { KpiCard, Kbd } from '@/components/layout/KpiCard';
import { PageContent } from '@/components/layout/PageContent';

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const STORAGE_KEY = 'paquetes:list:prefs:v1';
const EXPORT_FORMAT_KEY = 'paquetes:export:formato:v1';

type EstadoTab = 'todos' | 'sin-shipper' | 'sin-consolidado' | 'consolidados';

type StoredPrefs = {
  searchQuery?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  filterShipperId?: number | '';
  density?: 'comfortable' | 'compact';
  pageSize?: number;
  sort?: SortState;
  estadoTab?: EstadoTab;
};

function readPrefs(): StoredPrefs {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPrefs) : {};
  } catch {
    return {};
  }
}

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const dayEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

function inDateRange(p: Paquete, desdeStr: string, hastaStr: string): boolean {
  const fecha = p.fechaRegistro ? new Date(p.fechaRegistro) : null;
  if (!fecha) return false;
  const t = fecha.getTime();
  if (desdeStr && t < dayStart(new Date(desdeStr + 'T00:00:00'))) return false;
  if (hastaStr && t > dayEnd(new Date(hastaStr + 'T23:59:59'))) return false;
  return true;
}

function matchesSearch(p: Paquete, q: string): boolean {
  if (!q) return true;
  return Boolean(
    p.numeroGuia?.toLowerCase().includes(q) ||
    p.destinatario?.toLowerCase().includes(q) ||
    p.ref?.toLowerCase().includes(q) ||
    p.contenido?.toLowerCase().includes(q) ||
    p.shipper?.nombre?.toLowerCase().includes(q),
  );
}

export default function PaquetesListPage() {
  const navigate = useNavigate();
  const { me } = useMe();
  const { data: allRows, loading, error, refresh } = usePaquetesList();
  const initialPrefs = useMemo(() => readPrefs(), []);
  const [searchQuery, setSearchQuery] = useState(initialPrefs.searchQuery ?? '');
  const [fechaDesde, setFechaDesde] = useState(initialPrefs.fechaDesde ?? '');
  const [fechaHasta, setFechaHasta] = useState(initialPrefs.fechaHasta ?? '');
  const [filterShipperId, setFilterShipperId] = useState<number | ''>(
    initialPrefs.filterShipperId ?? '',
  );
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(initialPrefs.pageSize ?? 20);
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    initialPrefs.density ?? 'comfortable',
  );
  const [sort, setSort] = useState<SortState>(initialPrefs.sort ?? { key: 'fechaRegistro', dir: 'desc' });
  const [estadoTab, setEstadoTab] = useState<EstadoTab>(initialPrefs.estadoTab ?? 'todos');

  const showShipperFilter = me?.rol === 'OPERARIO' || me?.rol === 'ADMIN' || me?.rol === 'MV_ADMIN';

  useEffect(() => {
    if (!showShipperFilter) return;
    listShippers().then(setShippers).catch(() => setShippers([]));
  }, [showShipperFilter]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefs: StoredPrefs = {
      searchQuery,
      fechaDesde,
      fechaHasta,
      filterShipperId,
      density,
      pageSize,
      sort,
      estadoTab,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [searchQuery, fechaDesde, fechaHasta, filterShipperId, density, pageSize, sort, estadoTab]);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportQue, setExportQue] = useState<'lista' | 'fecha' | 'seleccion'>('lista');
  const [exportFechaDesde, setExportFechaDesde] = useState('');
  const [exportFechaHasta, setExportFechaHasta] = useState('');
  const [exportFormato, setExportFormato] = useState<'excel' | 'pdf'>(() => {
    if (typeof window === 'undefined') return 'excel';
    const saved = window.localStorage.getItem(EXPORT_FORMAT_KEY);
    return saved === 'pdf' ? 'pdf' : 'excel';
  });
  const [exportFilename, setExportFilename] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(EXPORT_FORMAT_KEY, exportFormato); } catch { /* ignore */ }
  }, [exportFormato]);

  // Filas filtradas por todo excepto el tab de estado (base para tabs y lista).
  const baseFilteredRows = useMemo(() => {
    if (!allRows) return [];
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter((r) => {
      if (!matchesSearch(r, q)) return false;
      if (filterShipperId !== '' && r.shipper?.id !== filterShipperId) return false;
      if ((fechaDesde || fechaHasta) && !inDateRange(r, fechaDesde, fechaHasta)) return false;
      return true;
    });
  }, [allRows, searchQuery, filterShipperId, fechaDesde, fechaHasta]);

  const filteredRows = useMemo(() => {
    if (estadoTab === 'sin-shipper') return baseFilteredRows.filter((r) => !r.shipper);
    if (estadoTab === 'sin-consolidado') return baseFilteredRows.filter((r) => !r.consolidado);
    if (estadoTab === 'consolidados') return baseFilteredRows.filter((r) => Boolean(r.consolidado));
    return baseFilteredRows;
  }, [baseFilteredRows, estadoTab]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const getValue = (r: Paquete): string | number | null => {
      switch (sort.key) {
        case 'numeroGuia': return (r.numeroGuia ?? '').toLowerCase();
        case 'destinatario': return (r.destinatario ?? '').toLowerCase();
        case 'ref': return (r.ref ?? '').toLowerCase();
        case 'contenido': return (r.contenido ?? '').toLowerCase();
        case 'pesoLbs': return r.pesoLbs ?? -Infinity;
        case 'shipper': return (r.shipper?.nombre ?? '').toLowerCase();
        case 'consolidado': return (r.consolidado?.numeroGuia ?? (r.consolidado ? `#${r.consolidado.id}` : '')).toLowerCase();
        case 'fechaRegistro': return r.fechaRegistro ? new Date(r.fechaRegistro).getTime() : 0;
        default: return null;
      }
    };
    return [...filteredRows].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return va < vb ? -1 * dir : 1 * dir;
    });
  }, [filteredRows, sort]);

  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const copiarTexto = async (
    texto: string | null | undefined,
    etiqueta: string,
    vacioMsg = 'No hay nada para copiar.',
  ) => {
    if (!texto) {
      toast.info(vacioMsg);
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${etiqueta} ${texto} copiado al portapapeles.`);
    } catch {
      toast.error('No se pudo copiar al portapapeles.');
    }
  };

  const rowActions = (r: Paquete): NotionTableAction<Paquete>[] => [
    { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/paquetes/${r.id}`) },
    { label: 'Editar', icon: Pencil, onClick: () => navigate(`/paquetes/${r.id}/edit`) },
    { label: 'Eliminar', icon: Trash2, onClick: () => setDeleteId(r.id), destructive: true },
  ];

  const paqueteToDelete = deleteId != null ? allRows?.find((p) => p.id === deleteId) : null;

  const selectedPaquetes = useMemo(
    () => filteredRows.filter((r) => selectedIds.has(r.id)),
    [filteredRows, selectedIds],
  );
  const selectedCount = selectedPaquetes.length;
  const allFilteredSelected = filteredRows.length > 0 && selectedCount === filteredRows.length;

  const tabCounts = useMemo(() => ({
    todos: baseFilteredRows.length,
    sinShipper: baseFilteredRows.filter((r) => !r.shipper).length,
    sinConsolidado: baseFilteredRows.filter((r) => !r.consolidado).length,
    consolidados: baseFilteredRows.filter((r) => Boolean(r.consolidado)).length,
  }), [baseFilteredRows]);

  const resumen = useMemo(() => {
    const total = filteredRows.length;
    const conShipper = filteredRows.filter((r) => Boolean(r.shipper)).length;
    const conConsolidado = filteredRows.filter((r) => Boolean(r.consolidado)).length;
    const totalLbs = filteredRows.reduce((acc, r) => acc + (r.pesoLbs ?? 0), 0);
    const totalKgs = filteredRows.reduce((acc, r) => acc + (r.pesoKgs ?? 0), 0);
    return {
      total,
      conShipper,
      conConsolidado,
      sinShipper: total - conShipper,
      sinConsolidado: total - conConsolidado,
      totalLbs,
      totalKgs,
      pctConShipper: total > 0 ? Math.round((conShipper / total) * 100) : 0,
      pctConConsolidado: total > 0 ? Math.round((conConsolidado / total) * 100) : 0,
    };
  }, [filteredRows]);

  const paquetesPorRangoFecha = useMemo(() => {
    if (!allRows?.length || (!exportFechaDesde && !exportFechaHasta)) return [];
    return allRows.filter((r) => inDateRange(r, exportFechaDesde, exportFechaHasta));
  }, [allRows, exportFechaDesde, exportFechaHasta]);

  const exportSourceList = useMemo<Paquete[]>(() => {
    if (exportQue === 'lista') return filteredRows;
    if (exportQue === 'seleccion') return selectedPaquetes;
    return paquetesPorRangoFecha;
  }, [exportQue, filteredRows, selectedPaquetes, paquetesPorRangoFecha]);

  const exportCount = exportSourceList.length;

  const exportFilenameSugerido = useMemo(() => {
    const fecha = new Date().toISOString().slice(0, 10);
    const scope =
      exportQue === 'lista' ? 'lista' :
      exportQue === 'fecha' ? `fecha_${exportFechaDesde || 'inicio'}_${exportFechaHasta || 'hoy'}` :
      'seleccion';
    return `paquetes_${scope}_${fecha}`;
  }, [exportQue, exportFechaDesde, exportFechaHasta]);

  useEffect(() => {
    if (!exportDialogOpen) return;
    setExportFilename(exportFilenameSugerido);
  }, [exportDialogOpen, exportFilenameSugerido]);

  const aplicarRangoRapido = (rango: 'hoy' | '7d' | '30d' | 'mes') => {
    const hoy = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    let desde = new Date(hoy);
    const hasta = new Date(hoy);
    if (rango === 'hoy') {
      // mismo día
    } else if (rango === '7d') {
      desde.setDate(hoy.getDate() - 6);
    } else if (rango === '30d') {
      desde.setDate(hoy.getDate() - 29);
    } else if (rango === 'mes') {
      desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    }
    setExportFechaDesde(fmt(desde));
    setExportFechaHasta(fmt(hasta));
    setExportQue('fecha');
  };

  const handleExportarDesdeDialogo = () => {
    if (exportQue === 'fecha' && !exportFechaDesde && !exportFechaHasta) {
      toast.info('Elija al menos una fecha (Desde y/o Hasta).');
      return;
    }
    if (exportSourceList.length === 0) {
      toast.info('No hay paquetes para exportar con la opción seleccionada.');
      return;
    }
    const baseName = (exportFilename.trim() || exportFilenameSugerido).replace(/\.(xlsx|pdf)$/i, '');
    const ext = exportFormato === 'excel' ? 'xlsx' : 'pdf';
    const fullName = `${baseName}.${ext}`;
    if (exportFormato === 'excel') exportPaquetesExcel(exportSourceList, fullName);
    else exportPaquetesPdf(exportSourceList, fullName);
    toast.success(`Se exportaron ${exportSourceList.length} paquete${exportSourceList.length !== 1 ? 's' : ''} (${exportFormato.toUpperCase()}).`);
    setExportDialogOpen(false);
    setExportQue('lista');
    setExportFechaDesde('');
    setExportFechaHasta('');
  };

  const puedeExportar = exportCount > 0 && (exportQue !== 'fecha' || Boolean(exportFechaDesde || exportFechaHasta));

  const limpiarFiltros = () => {
    setSearchQuery('');
    setFechaDesde('');
    setFechaHasta('');
    setFilterShipperId('');
    setEstadoTab('todos');
    setPage(0);
  };

  const toggleSelectFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredRows.map((r) => r.id)));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        (target?.isContentEditable ?? false);
      if (e.key === '/' && !isEditable && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>('input[data-paquetes-search]');
        el?.focus();
        el?.select();
        return;
      }
      if (isEditable) return;
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        refresh();
      } else if (e.key.toLowerCase() === 'r' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        limpiarFiltros();
        toast.success('Filtros restablecidos.');
      } else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        navigate('/paquetes/new');
      } else if (e.key.toLowerCase() === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const main = document.scrollingElement || document.documentElement;
        main.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [refresh, navigate, selectedIds.size]);

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Paquetes"
        icon={<Package className="h-4 w-4" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="h-3.5 w-3.5" />
              Descargar
            </Button>
            <Button size="sm" onClick={() => navigate('/paquetes/new')} className="gap-1.5 h-8 shadow-sm text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nuevo Paquete
            </Button>
          </div>
        }
      >
        <Dialog open={exportDialogOpen} onOpenChange={(open) => { setExportDialogOpen(open); if (!open) setExportQue('lista'); }}>
          <DialogContent className="rounded-2xl border-border/50 max-w-lg p-0 overflow-hidden">
            <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-4 space-y-1">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Download className="h-4 w-4 text-primary" />
                Descargar paquetes
              </DialogTitle>
              <DialogDescription className="text-xs">
                Elija el alcance, el formato y opcionalmente un nombre de archivo.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Alcance</p>
                </div>
                <div className="grid gap-2">
                  {[
                    {
                      id: 'lista' as const,
                      icon: <ListChecks className="h-4 w-4" />,
                      title: 'Lista actual',
                      desc: 'Respeta los filtros de búsqueda, shipper y fechas que tenga aplicados.',
                      count: filteredRows.length,
                    },
                    {
                      id: 'fecha' as const,
                      icon: <CalendarDays className="h-4 w-4" />,
                      title: 'Por rango de fecha',
                      desc: 'Elija el rango sobre la fecha de registro del paquete.',
                      count: paquetesPorRangoFecha.length,
                    },
                    {
                      id: 'seleccion' as const,
                      icon: <Boxes className="h-4 w-4" />,
                      title: 'Solo los marcados',
                      desc: 'Las filas con la casilla marcada en la tabla.',
                      count: selectedIds.size,
                    },
                  ].map((opt) => {
                    const active = exportQue === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setExportQue(opt.id)}
                        className={`group relative flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition-all ${
                          active
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/40 hover:bg-muted/40'
                        }`}
                      >
                        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {opt.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium flex items-center gap-1.5">
                              {opt.title}
                              {active && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                            </span>
                            <Badge variant={active ? 'default' : 'secondary'} className="font-normal tabular-nums shrink-0">
                              {opt.count}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {exportQue === 'fecha' && (
                  <div className="mt-2 space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mr-1">
                        Rangos rápidos:
                      </span>
                      {[
                        { id: 'hoy' as const, label: 'Hoy' },
                        { id: '7d' as const, label: '7 días' },
                        { id: '30d' as const, label: '30 días' },
                        { id: 'mes' as const, label: 'Este mes' },
                      ].map((r) => (
                        <Button
                          key={r.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => aplicarRangoRapido(r.id)}
                        >
                          {r.label}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="export-desde" className="text-xs">Desde</Label>
                        <Input
                          id="export-desde"
                          type="date"
                          value={exportFechaDesde}
                          onChange={(e) => setExportFechaDesde(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="export-hasta" className="text-xs">Hasta</Label>
                        <Input
                          id="export-hasta"
                          type="date"
                          value={exportFechaHasta}
                          onChange={(e) => setExportFechaHasta(e.target.value)}
                          className="h-9"
                        />
                      </div>
                    </div>
                    {(exportFechaDesde || exportFechaHasta) && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          Mostrando paquetes registrados {exportFechaDesde ? `desde ${exportFechaDesde}` : 'sin fecha inicial'} {exportFechaHasta ? `hasta ${exportFechaHasta}` : ''}.
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => { setExportFechaDesde(''); setExportFechaHasta(''); }}
                        >
                          Limpiar fechas
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Vista previa de columnas que se van a exportar */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Columnas incluidas</p>
                  <span className="text-[11px] text-muted-foreground">8 columnas</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['Guía', 'Destinatario', 'Ref', 'Contenido', 'Peso (lb)', 'Peso (kg)', 'Shipper', 'Consolidado', 'Fecha registro'].map((c) => (
                    <Badge key={c} variant="secondary" className="font-normal text-[10px] py-0 h-5">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-border/60 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Formato</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormato('excel')}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all ${
                      exportFormato === 'excel'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40'
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      exportFormato === 'excel' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      <FileSpreadsheet className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-medium">Excel</div>
                      <div className="text-[11px] text-muted-foreground">.xlsx editable</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormato('pdf')}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all ${
                      exportFormato === 'pdf'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40'
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      exportFormato === 'pdf' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      <FileText className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-[11px] text-muted-foreground">Reporte imprimible</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/60 pt-4">
                <Label htmlFor="export-filename" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Nombre del archivo
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="export-filename"
                    type="text"
                    value={exportFilename}
                    onChange={(e) => setExportFilename(e.target.value)}
                    placeholder={exportFilenameSugerido}
                    className="h-9 text-sm"
                  />
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    .{exportFormato === 'excel' ? 'xlsx' : 'pdf'}
                  </span>
                </div>
              </div>

              <div className={`rounded-xl border px-3 py-2.5 text-xs flex items-start gap-2 ${
                puedeExportar
                  ? 'border-primary/20 bg-primary/5 text-foreground'
                  : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300'
              }`}>
                {puedeExportar ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  {puedeExportar ? (
                    <>
                      Se exportarán <span className="font-semibold tabular-nums">{exportCount}</span> paquete{exportCount !== 1 ? 's' : ''} en formato <span className="font-semibold uppercase">{exportFormato}</span>.
                    </>
                  ) : exportQue === 'fecha' && !exportFechaDesde && !exportFechaHasta ? (
                    'Elija al menos una fecha (Desde y/o Hasta) o use un rango rápido.'
                  ) : (
                    'No hay paquetes para exportar con esta opción. Pruebe otro alcance o ajuste los filtros.'
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t border-border/60 bg-muted/20 px-6 py-3">
              <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleExportarDesdeDialogo} disabled={!puedeExportar} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Descargar {exportFormato === 'excel' ? 'Excel' : 'PDF'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDeleteDialog
          open={deleteId != null}
          onOpenChange={(open) => !deleting && !open && setDeleteId(null)}
          entityLabel="paquete"
          entityName={paqueteToDelete?.numeroGuia ?? null}
          loading={deleting}
          onConfirm={async () => {
            if (deleteId == null) return;
            setDeleting(true);
            try {
              await deletePaquete(deleteId);
              setDeleteId(null);
              refresh();
            } catch (e) {
              console.error('Error eliminando paquete', e);
              alert('Error al eliminar el paquete');
            } finally {
              setDeleting(false);
            }
          }}
        />

        <PageContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={<Package className="h-4 w-4" />}
              label="Total visibles"
              value={resumen.total}
              accent="primary"
              hint={resumen.total === (allRows?.length ?? 0)
                ? 'Todos los paquetes'
                : `${allRows?.length ?? 0} en total`}
            />
            <KpiCard
              icon={<Weight className="h-4 w-4" />}
              label="Peso total"
              value={`${resumen.totalLbs.toFixed(1)} lb`}
              accent="muted"
              hint={`${resumen.totalKgs.toFixed(1)} kg`}
            />
            <KpiCard
              icon={<UserRound className="h-4 w-4" />}
              label="Con shipper"
              value={`${resumen.conShipper}`}
              accent={resumen.sinShipper > 0 ? 'warning' : 'success'}
              hint={`${resumen.pctConShipper}% asignado`}
              progress={resumen.pctConShipper}
            />
            <KpiCard
              icon={<Layers className="h-4 w-4" />}
              label="Consolidado"
              value={`${resumen.conConsolidado}`}
              accent={resumen.sinConsolidado > 0 ? 'warning' : 'success'}
              hint={`${resumen.pctConConsolidado}% consolidado`}
              progress={resumen.pctConConsolidado}
            />
          </div>

          {/* Tabs por estado */}
          <div className="flex flex-wrap items-center gap-1 border-b border-border/60 -mb-px">
            {([
              { id: 'todos' as const, label: 'Todos', count: tabCounts.todos, icon: <Boxes className="h-3.5 w-3.5" /> },
              { id: 'sin-shipper' as const, label: 'Sin shipper', count: tabCounts.sinShipper, icon: <UserRound className="h-3.5 w-3.5" />, accent: 'amber' as const },
              { id: 'sin-consolidado' as const, label: 'Sin consolidar', count: tabCounts.sinConsolidado, icon: <Layers className="h-3.5 w-3.5" />, accent: 'amber' as const },
              { id: 'consolidados' as const, label: 'Consolidados', count: tabCounts.consolidados, icon: <CheckCircle2 className="h-3.5 w-3.5" />, accent: 'emerald' as const },
            ]).map((t) => {
              const active = estadoTab === t.id;
              const accentText =
                t.accent === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                t.accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                'text-muted-foreground';
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setEstadoTab(t.id); setPage(0); }}
                  className={
                    'group inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ' +
                    (active
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border')
                  }
                  aria-pressed={active}
                >
                  <span className={active ? 'text-primary' : accentText}>{t.icon}</span>
                  <span>{t.label}</span>
                  <Badge
                    variant={active ? 'default' : 'secondary'}
                    className="font-normal tabular-nums h-4 px-1.5 text-[10px]"
                  >
                    {t.count}
                  </Badge>
                </button>
              );
            })}
          </div>

          <ListToolbar
            search={searchQuery}
            onSearchChange={(v) => {
              setSearchQuery(v);
              setPage(0);
            }}
            searchPlaceholder="Buscar por guía, destinatario, ref, contenido o shipper…  ( / )"
            searchInputProps={{ 'data-paquetes-search': '' } as React.InputHTMLAttributes<HTMLInputElement>}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                {showShipperFilter && (
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-medium uppercase text-muted-foreground whitespace-nowrap">
                      Shipper
                    </label>
                    <div className="min-w-[200px]">
                      <ShipperCombobox
                        shippers={shippers}
                        value={filterShipperId}
                        onChange={(id) => {
                          setFilterShipperId(id);
                          setPage(0);
                        }}
                        placeholder="Todos los shippers"
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="filtro-desde" className="text-[11px] font-medium uppercase text-muted-foreground whitespace-nowrap">
                    Desde
                  </label>
                  <input
                    id="filtro-desde"
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => { setFechaDesde(e.target.value); setPage(0); }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="filtro-hasta" className="text-[11px] font-medium uppercase text-muted-foreground whitespace-nowrap">
                    Hasta
                  </label>
                  <input
                    id="filtro-hasta"
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => { setFechaHasta(e.target.value); setPage(0); }}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>
                {(fechaDesde || fechaHasta || filterShipperId !== '' || searchQuery) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs gap-1"
                    onClick={limpiarFiltros}
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    Limpiar
                  </Button>
                )}
              </div>
            }
            actions={
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center rounded-md border border-input p-0.5">
                  <button
                    type="button"
                    onClick={() => setDensity('comfortable')}
                    aria-pressed={density === 'comfortable'}
                    title="Densidad cómoda"
                    className={`h-8 w-8 flex items-center justify-center rounded-sm transition-colors ${
                      density === 'comfortable' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Rows3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensity('compact')}
                    aria-pressed={density === 'compact'}
                    title="Densidad compacta"
                    className={`h-8 w-8 flex items-center justify-center rounded-sm transition-colors ${
                      density === 'compact' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Rows2 className="h-4 w-4" />
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  onClick={refresh}
                  title="Refrescar (R)"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Refrescar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  onClick={toggleSelectFiltered}
                  disabled={filteredRows.length === 0}
                >
                  {allFilteredSelected ? <FilterX className="h-3.5 w-3.5" /> : <ListChecks className="h-3.5 w-3.5" />}
                  {allFilteredSelected ? 'Quitar selección' : 'Seleccionar visibles'}
                </Button>
              </div>
            }
          />

          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <div className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span><span className="font-semibold tabular-nums">{selectedCount}</span> paquete{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => {
                    setExportQue('seleccion');
                    setExportDialogOpen(true);
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar selección
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
                  Limpiar
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <LoadingState label="Cargando paquetes..." />
          ) : error ? (
            <ErrorState
              title="Error al cargar paquetes"
              description={error}
              action={<Button variant="outline" size="sm" onClick={refresh}>Reintentar</Button>}
            />
          ) : allRows.length === 0 ? (
            <EmptyState
              title="Sin paquetes"
              description="Crea tu primer paquete con número de guía, peso, destinatario y contenido."
              action={<Button onClick={() => navigate('/paquetes/new')}>Crear paquete</Button>}
            />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="No encontramos paquetes con los filtros actuales. Ajusta búsqueda, rango de fechas o shipper."
              action={
                <Button variant="outline" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              <NotionTable<Paquete>
                rows={paginatedRows}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/paquetes/${r.id}`)}
                showCheckbox
                selectedIds={selectedIds}
                onSelectionChange={(ids) => setSelectedIds(new Set(ids as number[]))}
                rowActions={rowActions}
                density={density}
                sort={sort}
                onSortChange={setSort}
                columns={[
                  {
                    header: 'GUÍA',
                    sortKey: 'numeroGuia',
                    className: 'font-medium',
                    cell: (r) => (
                      <div className="group/copy inline-flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[13px] text-foreground truncate">
                          {r.numeroGuia ?? '—'}
                        </span>
                        {r.numeroGuia && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copiarTexto(r.numeroGuia, 'Guía', 'Este paquete no tiene número de guía.');
                            }}
                            className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                            title="Copiar guía al portapapeles"
                            aria-label="Copiar guía"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ),
                  },
                  { header: 'DESTINATARIO', sortKey: 'destinatario', cell: (r) => r.destinatario ?? '—' },
                  {
                    header: 'REF',
                    sortKey: 'ref',
                    cell: (r) => r.ref
                      ? <span className="text-xs text-muted-foreground font-mono">{r.ref}</span>
                      : <span className="text-muted-foreground">—</span>,
                  },
                  { header: 'CONTENIDO', sortKey: 'contenido', cell: (r) => r.contenido ?? '—' },
                  {
                    header: 'PESO',
                    sortKey: 'pesoLbs',
                    className: 'w-[140px] tabular-nums',
                    cell: (r) => {
                      if (r.pesoLbs == null) return <span className="text-muted-foreground">—</span>;
                      return (
                        <div className="flex flex-col leading-tight">
                          {r.pesoLbs != null && (
                            <span className="text-foreground">{r.pesoLbs.toFixed(2)} lb</span>
                          )}
                          {r.pesoKgs != null && (
                            <span className="text-[11px] text-muted-foreground">{r.pesoKgs.toFixed(2)} kg</span>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    header: 'SHIPPER',
                    sortKey: 'shipper',
                    cell: (r) => r.shipper?.nombre
                      ? <Badge variant="secondary" className="font-normal">{r.shipper.nombre}</Badge>
                      : <span className="text-xs text-amber-600 dark:text-amber-400">Sin asignar</span>,
                  },
                  {
                    header: 'CONSOLIDADO',
                    sortKey: 'consolidado',
                    cell: (r) => {
                      if (!r.consolidado) return <span className="text-xs text-muted-foreground">—</span>;
                      const numero = r.consolidado.numeroGuia ?? `#${r.consolidado.id}`;
                      return (
                        <div className="group/copy inline-flex items-center gap-1.5 min-w-0">
                          <Badge variant="outline" className="font-normal font-mono text-[11px]">
                            {numero}
                          </Badge>
                          {r.posicionEnConsolidado != null && (
                            <span
                              title="Posición dentro del consolidado (calculada automáticamente)"
                              className="inline-flex items-center justify-center min-w-[24px] h-5 px-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-semibold tabular-nums"
                            >
                              #{r.posicionEnConsolidado}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copiarTexto(numero, 'Consolidado');
                            }}
                            className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                            title="Copiar número de consolidado al portapapeles"
                            aria-label="Copiar consolidado"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    },
                  },
                  {
                    header: 'ESTADO',
                    className: 'w-[120px]',
                    cell: (r) => {
                      if (r.consolidado) {
                        return (
                          <Badge className="font-normal bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Consolidado
                          </Badge>
                        );
                      }
                      if (r.shipper) {
                        return (
                          <Badge className="font-normal bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 border border-blue-500/20">
                            <UserRound className="h-3 w-3 mr-1" />
                            Con shipper
                          </Badge>
                        );
                      }
                      return (
                        <Badge variant="outline" className="font-normal text-amber-700 dark:text-amber-300 border-amber-500/30 bg-amber-500/5">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      );
                    },
                  },
                  {
                    header: 'FECHA REG.',
                    sortKey: 'fechaRegistro',
                    className: 'w-[110px] tabular-nums',
                    cell: (r) =>
                      r.fechaRegistro
                        ? <span className="text-xs">{new Date(r.fechaRegistro).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        : <span className="text-muted-foreground">—</span>,
                  },
                ]}
              />
              <ListPagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                size={pageSize}
                onPageChange={setPage}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
              />
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="hidden sm:inline">Atajos:</span>
                  <Kbd>/</Kbd> buscar
                  <span className="opacity-40">·</span>
                  <Kbd>R</Kbd> refrescar
                  <span className="opacity-40">·</span>
                  <Kbd>N</Kbd> nuevo
                  <span className="opacity-40">·</span>
                  <Kbd>T</Kbd> volver al inicio
                  <span className="opacity-40">·</span>
                  <Kbd>⇧R</Kbd> limpiar
                  <span className="opacity-40">·</span>
                  <Kbd>Esc</Kbd> deseleccionar
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const main = document.scrollingElement || document.documentElement;
                    main.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hidden md:inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  title="Volver arriba (T)"
                >
                  <ArrowUp className="h-3 w-3" />
                  Inicio
                </button>
              </div>
            </>
          )}
        </PageContent>
      </StandardPageLayout>
    </DashboardLayout>
  );
}

