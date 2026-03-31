import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMe } from '@/hooks/useMe';
import { listShippers, type Shipper } from '@/services/shippers.service';
import { Package, Plus, Eye, Pencil, Trash2, Download } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import NotionTable from '@/components/notion/NotionTable';
import type { NotionTableAction } from '@/components/notion/NotionTable';
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

const PAGE_SIZE = 20;

export default function PaquetesListPage() {
  const navigate = useNavigate();
  const { me } = useMe();
  const { data: allRows, loading, error, refresh } = usePaquetesList();
  const [searchQuery, setSearchQuery] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filterShipperId, setFilterShipperId] = useState<number | ''>('');
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [page, setPage] = useState(0);

  const showShipperFilter = me?.rol === 'OPERARIO' || me?.rol === 'ADMIN' || me?.rol === 'MV_ADMIN';

  useEffect(() => {
    if (!showShipperFilter) return;
    listShippers().then(setShippers).catch(() => setShippers([]));
  }, [showShipperFilter]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportQue, setExportQue] = useState<'lista' | 'fecha' | 'seleccion'>('lista');
  const [exportFechaDesde, setExportFechaDesde] = useState('');
  const [exportFechaHasta, setExportFechaHasta] = useState('');
  const [exportFormato, setExportFormato] = useState<'excel' | 'pdf'>('excel');

  const filteredRows = useMemo(() => {
    if (!allRows) return [];
    const q = searchQuery.trim().toLowerCase();
    let rows = allRows;
    if (q) {
      rows = rows.filter(
        (r) =>
          r.numeroGuia?.toLowerCase().includes(q) ||
          r.destinatario?.toLowerCase().includes(q) ||
          r.ref?.toLowerCase().includes(q) ||
          r.contenido?.toLowerCase().includes(q) ||
          r.shipper?.nombre?.toLowerCase().includes(q),
      );
    }
    if (filterShipperId !== '') {
      rows = rows.filter((r) => r.shipper?.id === filterShipperId);
    }
    if (fechaDesde || fechaHasta) {
      rows = rows.filter((r) => {
        const fecha = r.fechaRegistro ? new Date(r.fechaRegistro) : null;
        if (!fecha) return false;
        const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const dayEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
        const t = fecha.getTime();
        if (fechaDesde) {
          const desde = new Date(fechaDesde + 'T00:00:00');
          if (t < dayStart(desde)) return false;
        }
        if (fechaHasta) {
          const hasta = new Date(fechaHasta + 'T23:59:59');
          if (t > dayEnd(hasta)) return false;
        }
        return true;
      });
    }
    return rows;
  }, [allRows, searchQuery, filterShipperId, fechaDesde, fechaHasta]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

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

  const paquetesPorRangoFecha = useMemo(() => {
    if (!allRows?.length || (!exportFechaDesde && !exportFechaHasta)) return [];
    return allRows.filter((r) => {
      const fecha = r.fechaRegistro ? new Date(r.fechaRegistro) : null;
      if (!fecha) return false;
      const t = fecha.getTime();
      const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
      if (exportFechaDesde && t < dayStart(new Date(exportFechaDesde + 'T00:00:00'))) return false;
      if (exportFechaHasta && t > dayEnd(new Date(exportFechaHasta + 'T23:59:59'))) return false;
      return true;
    });
  }, [allRows, exportFechaDesde, exportFechaHasta]);

  const handleExportarDesdeDialogo = () => {
    let list: Paquete[] = [];
    if (exportQue === 'lista') {
      list = filteredRows;
      if (list.length === 0) {
        toast.info('No hay paquetes en la lista actual. Ajuste los filtros si hace falta.');
        return;
      }
    } else if (exportQue === 'fecha') {
      if (!exportFechaDesde && !exportFechaHasta) {
        toast.info('Elija al menos una fecha (Desde y/o Hasta).');
        return;
      }
      list = paquetesPorRangoFecha;
      if (list.length === 0) {
        toast.info('No hay paquetes en las fechas elegidas.');
        return;
      }
    } else {
      list = selectedPaquetes;
      if (list.length === 0) {
        toast.info('Marque al menos un paquete en la tabla para exportar.');
        return;
      }
    }
    if (exportFormato === 'excel') exportPaquetesExcel(list);
    else exportPaquetesPdf(list);
    setExportDialogOpen(false);
    setExportQue('lista');
    setExportFechaDesde('');
    setExportFechaHasta('');
  };

  const puedeExportar =
    exportQue === 'lista' ? filteredRows.length > 0 :
    exportQue === 'fecha' ? Boolean(exportFechaDesde || exportFechaHasta) :
    selectedPaquetes.length > 0;

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
          <DialogContent className="rounded-2xl border-border/50 max-w-md">
            <DialogHeader>
              <DialogTitle>Descargar paquetes</DialogTitle>
              <DialogDescription>
                Elija qué paquetes exportar y en qué formato.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">¿Qué exportar?</p>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setExportQue('lista')}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                      exportQue === 'lista' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-current">
                      {exportQue === 'lista' ? <span className="text-[10px]">●</span> : null}
                    </span>
                    <div>
                      <span className="font-medium">La lista actual</span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Lo que ve en la tabla (con filtros de búsqueda y fecha aplicados). Total: {filteredRows.length} paquete{filteredRows.length !== 1 ? 's' : ''}.
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportQue('fecha')}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                      exportQue === 'fecha' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-current">
                      {exportQue === 'fecha' ? <span className="text-[10px]">●</span> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">Por fecha de registro</span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Elija desde qué fecha hasta qué fecha.
                      </p>
                      {exportQue === 'fecha' && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
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
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportQue('seleccion')}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                      exportQue === 'seleccion' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-current">
                      {exportQue === 'seleccion' ? <span className="text-[10px]">●</span> : null}
                    </span>
                    <div>
                      <span className="font-medium">Solo los que marqué</span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Los paquetes con la casilla marcada en la tabla. {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
              <div className="space-y-2 border-t pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Formato</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={exportFormato === 'excel' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setExportFormato('excel')}
                  >
                    Excel
                  </Button>
                  <Button
                    type="button"
                    variant={exportFormato === 'pdf' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setExportFormato('pdf')}
                  >
                    PDF
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
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

        <div className="space-y-4 py-4">
          <ListToolbar
            search={searchQuery}
            onSearchChange={(v) => {
              setSearchQuery(v);
              setPage(0);
            }}
            searchPlaceholder="Buscar por guía, destinatario, ref, contenido o shipper…"
            filters={
              <div className="flex flex-wrap items-center gap-2">
                {showShipperFilter && (
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="filtro-shipper" className="text-[11px] font-medium uppercase text-muted-foreground whitespace-nowrap">
                      Shipper
                    </label>
                    <select
                      id="filtro-shipper"
                      value={filterShipperId === '' ? '' : String(filterShipperId)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFilterShipperId(v === '' ? '' : Number(v));
                        setPage(0);
                      }}
                      className="h-9 min-w-[140px] rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Todos</option>
                      {shippers.map((s) => (
                        <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                      ))}
                    </select>
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
                {(fechaDesde || fechaHasta || filterShipperId !== '') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => { setFechaDesde(''); setFechaHasta(''); setFilterShipperId(''); setPage(0); }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            }
          />

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
                columns={[
                  { header: 'GUÍA', className: 'font-medium', cell: (r) => r.numeroGuia ?? '—' },
                  { header: 'DESTINATARIO', cell: (r) => r.destinatario ?? '—' },
                  { header: 'REF', cell: (r) => r.ref ?? '—' },
                  { header: 'CONTENIDO', cell: (r) => r.contenido ?? '—' },
                  {
                    header: 'PESO',
                    className: 'w-[120px]',
                    cell: (r) => {
                      const parts: string[] = [];
                      if (r.pesoLbs != null) parts.push(`${r.pesoLbs.toFixed(2)} lb`);
                      if (r.pesoKgs != null) parts.push(`${r.pesoKgs.toFixed(2)} kg`);
                      return parts.length > 0 ? parts.join(' / ') : '—';
                    },
                  },
                  {
                    header: 'SHIPPER',
                    cell: (r) => r.shipper?.nombre ?? '—',
                  },
                  {
                    header: 'CONSOLIDADO',
                    cell: (r) =>
                      r.consolidado?.numeroGuia ?? (r.consolidado ? `#${r.consolidado.id}` : '—'),
                  },
                  {
                    header: 'FECHA REG.',
                    className: 'w-[100px]',
                    cell: (r) =>
                      r.fechaRegistro
                        ? new Date(r.fechaRegistro).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '—',
                  },
                ]}
              />
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="text-xs text-muted-foreground tabular-nums">
                  Total: {totalItems} paquetes
                </div>
              </div>
              <ListPagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                size={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
