import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Boxes, Plus, Eye, Trash2, RefreshCcw, FilterX, Copy,
  Lock, LockOpen, Package, Weight, ListChecks, CheckCircle2,
  AlertCircle, Rows3, Rows2, ArrowUp, Printer, Pencil,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import NotionTable from '@/components/notion/NotionTable';
import type { NotionTableAction, SortState } from '@/components/notion/NotionTable';
import EmptyState from '@/components/notion/EmptyState';
import { ListToolbar } from '@/components/list/ListToolbar';
import { ListPagination } from '@/components/list/ListPagination';
import { TableSkeleton, PaginationSkeleton } from '@/components/skeletons';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KpiCard, Kbd } from '@/components/layout/KpiCard';
import { PageContent } from '@/components/layout/PageContent';
import { useConsolidadosList } from '@/hooks/useConsolidados';
import {
  abrirConsolidado,
  cerrarConsolidado,
  deleteConsolidado,
  type Consolidado,
} from '@/services/consolidados.service';
import { listPaquetes, type Paquete } from '@/services/paquetes.service';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { useMe } from '@/hooks/useMe';
import { printPackageLabels } from '@/lib/printLabels';
import { processPool } from '@/lib/concurrency';
import { hasActiveConsolidadoDraft } from '@/lib/consolidadoDraftStorage';

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const STORAGE_KEY = 'consolidados:list:prefs:v1';

type EstadoTab = 'todos' | 'abiertos' | 'cerrados' | 'sin-guia';

type StoredPrefs = {
  search?: string;
  estadoTab?: EstadoTab;
  density?: 'comfortable' | 'compact';
  pageSize?: number;
  sort?: SortState;
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

function isAbierto(c: Consolidado): boolean {
  return (c.estado ?? '').toUpperCase() === 'ABIERTO';
}
function isCerrado(c: Consolidado): boolean {
  return (c.estado ?? '').toUpperCase() === 'CERRADO';
}

export default function ConsolidadosListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: rows, loading, error, refresh } = useConsolidadosList();
  const { me } = useMe();
  const permisos = me?.permisos ?? [];
  const canEdit = permisos.includes('consolidados.create');
  const canDeleteConsolidado = permisos.includes('consolidados.delete');

  const initialPrefs = useMemo(() => readPrefs(), []);
  const [search, setSearch] = useState(initialPrefs.search ?? '');
  const [estadoTab, setEstadoTab] = useState<EstadoTab>(initialPrefs.estadoTab ?? 'todos');
  const [density, setDensity] = useState<'comfortable' | 'compact'>(initialPrefs.density ?? 'comfortable');
  const [pageSize, setPageSize] = useState<number>(initialPrefs.pageSize ?? 20);
  const [sort, setSort] = useState<SortState>(initialPrefs.sort ?? { key: 'id', dir: 'desc' });
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [hasConsolidadoDraft, setHasConsolidadoDraft] = useState(hasActiveConsolidadoDraft);

  useEffect(() => {
    setHasConsolidadoDraft(hasActiveConsolidadoDraft());
  }, [location.pathname, location.key]);

  useEffect(() => {
    const sync = () => setHasConsolidadoDraft(hasActiveConsolidadoDraft());
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Persistencia
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ search, estadoTab, density, pageSize, sort }),
      );
    } catch { /* ignore */ }
  }, [search, estadoTab, density, pageSize, sort]);

  // Filas filtradas (por búsqueda) — base para tabs y para la lista
  const baseFilteredRows = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      if (r.numeroGuia?.toLowerCase().includes(q)) return true;
      if (String(r.id).includes(q)) return true;
      if (r.estado?.toLowerCase().includes(q)) return true;
      // Buscar en paquetes asociados
      if (r.paquetes?.some((p) => p.numeroGuia?.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [rows, search]);

  const filteredRows = useMemo(() => {
    if (estadoTab === 'abiertos') return baseFilteredRows.filter(isAbierto);
    if (estadoTab === 'cerrados') return baseFilteredRows.filter(isCerrado);
    if (estadoTab === 'sin-guia') return baseFilteredRows.filter((r) => !r.numeroGuia?.trim());
    return baseFilteredRows;
  }, [baseFilteredRows, estadoTab]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const getValue = (r: Consolidado): string | number | null => {
      switch (sort.key) {
        case 'id': return r.id;
        case 'numeroGuia': return (r.numeroGuia ?? '').toLowerCase();
        case 'estado': return (r.estado ?? '').toLowerCase();
        case 'paquetes': return r.paquetes?.length ?? 0;
        case 'pesoLbs': return r.pesoTotalLbs ?? -Infinity;
        case 'pesoKgs': return r.pesoTotalKgs ?? -Infinity;
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

  // KPIs (sobre los filtrados, no la lista entera)
  const tabCounts = useMemo(() => ({
    todos: baseFilteredRows.length,
    abiertos: baseFilteredRows.filter(isAbierto).length,
    cerrados: baseFilteredRows.filter(isCerrado).length,
    sinGuia: baseFilteredRows.filter((r) => !r.numeroGuia?.trim()).length,
  }), [baseFilteredRows]);

  const resumen = useMemo(() => {
    const totalLbs = filteredRows.reduce((acc, r) => acc + (r.pesoTotalLbs ?? 0), 0);
    const totalKgs = filteredRows.reduce((acc, r) => acc + (r.pesoTotalKgs ?? 0), 0);
    const totalPaquetes = filteredRows.reduce((acc, r) => acc + (r.paquetes?.length ?? 0), 0);
    const cerrados = filteredRows.filter(isCerrado).length;
    const abiertos = filteredRows.filter(isAbierto).length;
    const total = filteredRows.length;
    return {
      total,
      cerrados,
      abiertos,
      totalLbs,
      totalKgs,
      totalPaquetes,
      pctCerrados: total > 0 ? Math.round((cerrados / total) * 100) : 0,
    };
  }, [filteredRows]);

  // Selección
  const selectedConsolidados = useMemo(
    () => filteredRows.filter((r) => selectedIds.has(r.id)),
    [filteredRows, selectedIds],
  );
  const selectedCount = selectedConsolidados.length;
  const allFilteredSelected = filteredRows.length > 0 && selectedCount === filteredRows.length;

  const toggleSelectFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredRows.map((r) => r.id)));
  };

  // Helpers
  const copiarTexto = async (texto: string | null | undefined, etiqueta: string, vacioMsg = 'No hay nada para copiar.') => {
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

  const limpiarFiltros = () => {
    setSearch('');
    setEstadoTab('todos');
    setPage(0);
  };

  // Atajos
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
        const el = document.querySelector<HTMLInputElement>('input[data-consolidados-search]');
        el?.focus();
        el?.select();
        return;
      }
      if (isEditable) return;

      if (e.key.toLowerCase() === 'r' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        refresh();
      } else if (e.key.toLowerCase() === 'r' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        limpiarFiltros();
        toast.success('Filtros restablecidos.');
      } else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey && canEdit) {
        e.preventDefault();
        navigate('/consolidados/new');
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
  }, [refresh, navigate, selectedIds.size, canEdit]);

  const consolidadoToDelete = deleteId != null ? rows?.find((c) => c.id === deleteId) : null;

  // Cache liviano de paquetes (sólo se llena al imprimir)
  const cachePaquetesRef = useMemo<{ list: Paquete[] | null }>(() => ({ list: null }), []);
  const obtenerPaquetes = async (forceRefresh = false): Promise<Paquete[]> => {
    if (!forceRefresh && cachePaquetesRef.list) return cachePaquetesRef.list;
    const data = await listPaquetes();
    cachePaquetesRef.list = data;
    return data;
  };

  const buildLabelsForConsolidado = (c: Consolidado, allPaquetes: Paquete[]) => {
    const paquetes = allPaquetes
      .filter((p) => p.consolidado?.id === c.id)
      .sort((a, b) => {
        const pa = a.posicionEnConsolidado ?? Number.MAX_SAFE_INTEGER;
        const pb = b.posicionEnConsolidado ?? Number.MAX_SAFE_INTEGER;
        if (pa !== pb) return pa - pb;
        return a.id - b.id;
      });
    const consolidadoGuia = c.numeroGuia ?? `#${c.id}`;
    const total = paquetes.length;
    return paquetes.map((p) => ({
      numeroGuia: p.numeroGuia,
      shipperNombre: p.shipper?.nombre ?? null,
      shipperEncargado: p.shipper?.nombreEncargado ?? null,
      destinatarioNombre: p.destinatario ?? null,
      ref: p.ref ?? null,
      pesoLbs: p.pesoLbs ?? null,
      pesoKgs: p.pesoKgs ?? null,
      contenido: p.contenido ?? null,
      consolidadoGuia,
      posicionEnConsolidado: p.posicionEnConsolidado ?? null,
      totalEnConsolidado: total,
    }));
  };

  const imprimirEtiquetasDelConsolidado = async (c: Consolidado) => {
    const tid = toast.loading(`Cargando paquetes de ${c.numeroGuia ?? `#${c.id}`}…`);
    try {
      const all = await obtenerPaquetes();
      const labels = buildLabelsForConsolidado(c, all);
      if (labels.length === 0) {
        toast.dismiss(tid);
        toast.info('Este consolidado no tiene paquetes para imprimir.');
        return;
      }
      toast.dismiss(tid);
      await printPackageLabels(labels, {
        title: `Etiquetas · Consolidado ${c.numeroGuia ?? `#${c.id}`}`,
        pageSize: '4x6',
        mode: 'thermal',
        withQR: true,
      });
    } catch (e) {
      toast.dismiss(tid);
      console.error('Error imprimiendo etiquetas del consolidado', e);
      toast.error('No se pudieron cargar los paquetes para imprimir.');
    }
  };

  const imprimirEtiquetasSeleccion = async () => {
    if (selectedConsolidados.length === 0) return;
    const tid = toast.loading(
      `Cargando paquetes de ${selectedConsolidados.length} consolidado${selectedConsolidados.length !== 1 ? 's' : ''}…`,
    );
    try {
      const all = await obtenerPaquetes(true);
      const grupos = await processPool(selectedConsolidados, 4, async (c) => buildLabelsForConsolidado(c, all));
      const labels = grupos.flat();
      if (labels.length === 0) {
        toast.dismiss(tid);
        toast.info('Los consolidados seleccionados no tienen paquetes para imprimir.');
        return;
      }
      toast.dismiss(tid);
      await printPackageLabels(labels, {
        title: `Etiquetas · ${selectedConsolidados.length} consolidado${selectedConsolidados.length !== 1 ? 's' : ''}`,
        pageSize: '4x6',
        mode: 'thermal',
        withQR: true,
      });
    } catch (e) {
      toast.dismiss(tid);
      console.error('Error imprimiendo etiquetas de seleccion', e);
      toast.error('No se pudieron cargar los paquetes para imprimir.');
    }
  };

  const cerrarConsolidadoQuick = async (c: Consolidado) => {
    if (!c.numeroGuia?.trim()) {
      toast.info('Este consolidado no tiene número de guía. Asignele uno desde el detalle antes de cerrar.');
      navigate(`/consolidados/${c.id}`);
      return;
    }
    const ok = window.confirm(
      `¿Cerrar el consolidado ${c.numeroGuia}? No podrás agregar ni quitar paquetes una vez cerrado.`,
    );
    if (!ok) return;
    const tid = toast.loading('Cerrando consolidado…');
    try {
      await cerrarConsolidado(c.id, { numeroGuia: c.numeroGuia });
      toast.dismiss(tid);
      toast.success('Consolidado cerrado.');
      refresh();
    } catch (e) {
      toast.dismiss(tid);
      console.error('Error cerrando consolidado', e);
      toast.error('No se pudo cerrar el consolidado.');
    }
  };

  const reabrirConsolidadoQuick = async (c: Consolidado) => {
    const ok = window.confirm(`¿Reabrir el consolidado ${c.numeroGuia ?? `#${c.id}`}?`);
    if (!ok) return;
    const tid = toast.loading('Reabriendo consolidado…');
    try {
      await abrirConsolidado(c.id);
      toast.dismiss(tid);
      toast.success('Consolidado reabierto.');
      refresh();
    } catch (e) {
      toast.dismiss(tid);
      console.error('Error reabriendo consolidado', e);
      toast.error('No se pudo reabrir el consolidado.');
    }
  };

  const rowActions = (r: Consolidado): NotionTableAction<Consolidado>[] => {
    const actions: NotionTableAction<Consolidado>[] = [
      { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/consolidados/${r.id}`) },
      {
        label: 'Imprimir etiquetas',
        icon: Printer,
        onClick: () => { void imprimirEtiquetasDelConsolidado(r); },
      },
    ];
    if (canEdit) {
      if (isAbierto(r)) {
        actions.push({
          label: 'Cerrar consolidado',
          icon: Lock,
          onClick: () => { void cerrarConsolidadoQuick(r); },
        });
      } else if (isCerrado(r)) {
        actions.push({
          label: 'Reabrir consolidado',
          icon: LockOpen,
          onClick: () => { void reabrirConsolidadoQuick(r); },
        });
      }
    }
    if (canDeleteConsolidado) {
      actions.push({ label: 'Eliminar', icon: Trash2, onClick: () => setDeleteId(r.id), destructive: true });
    }
    return actions;
  };

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Consolidados"
        icon={<Boxes className="h-4 w-4" />}
        actions={
          canEdit ? (
            <Button
              size="sm"
              onClick={() => navigate('/consolidados/new')}
              className="gap-1.5 h-8 shadow-sm text-xs shrink-0"
              title={hasConsolidadoDraft ? 'Retomar el borrador de nuevo consolidado' : 'Crear un nuevo consolidado'}
            >
              {hasConsolidadoDraft ? (
                <>
                  <Pencil className="h-3.5 w-3.5 shrink-0" />
                  Seguir editando
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  Nuevo consolidado
                </>
              )}
            </Button>
          ) : undefined
        }
      >
        {/* Diálogo eliminar individual */}
        {canDeleteConsolidado && (
          <ConfirmDeleteDialog
            open={deleteId != null}
            onOpenChange={(open) => !deleting && !open && setDeleteId(null)}
            entityLabel="consolidado"
            entityName={consolidadoToDelete ? (consolidadoToDelete.numeroGuia || `#${consolidadoToDelete.id}`) : null}
            loading={deleting}
            onConfirm={async () => {
              if (deleteId == null) return;
              setDeleting(true);
              try {
                await deleteConsolidado(deleteId);
                toast.success('Consolidado eliminado.');
                setDeleteId(null);
                refresh();
              } catch (e) {
                console.error('Error eliminando consolidado', e);
                toast.error('No se pudo eliminar el consolidado.');
              } finally {
                setDeleting(false);
              }
            }}
          />
        )}

        {/* Diálogo eliminar masivo */}
        {canDeleteConsolidado && (
          <ConfirmDeleteDialog
            open={bulkDeleteOpen}
            onOpenChange={(open) => !bulkDeleting && setBulkDeleteOpen(open)}
            entityLabel={`${selectedCount} consolidado${selectedCount !== 1 ? 's' : ''}`}
            entityName={null}
            loading={bulkDeleting}
            onConfirm={async () => {
              setBulkDeleting(true);
              let ok = 0;
              let ko = 0;
              for (const c of selectedConsolidados) {
                try {
                  await deleteConsolidado(c.id);
                  ok++;
                } catch {
                  ko++;
                }
              }
              setBulkDeleting(false);
              setBulkDeleteOpen(false);
              setSelectedIds(new Set());
              if (ok > 0) toast.success(`${ok} consolidado${ok !== 1 ? 's' : ''} eliminado${ok !== 1 ? 's' : ''}.`);
              if (ko > 0) toast.error(`${ko} no pudieron eliminarse.`);
              refresh();
            }}
          />
        )}

        <PageContent>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard
              icon={<Boxes className="h-4 w-4" />}
              label="Consolidados"
              value={resumen.total.toLocaleString('es')}
              accent="primary"
              hint={`${tabCounts.todos.toLocaleString('es')} total filtrado`}
            />
            <KpiCard
              icon={<LockOpen className="h-4 w-4" />}
              label="Abiertos"
              value={resumen.abiertos.toLocaleString('es')}
              accent="warning"
              hint="En proceso de carga"
            />
            <KpiCard
              icon={<Lock className="h-4 w-4" />}
              label="Cerrados"
              value={resumen.cerrados.toLocaleString('es')}
              accent="success"
              hint={`${resumen.pctCerrados}% del total`}
              progress={resumen.pctCerrados}
            />
            <KpiCard
              icon={<Package className="h-4 w-4" />}
              label="Paquetes consolidados"
              value={resumen.totalPaquetes.toLocaleString('es')}
              accent="info"
              hint={`promedio ${resumen.total > 0 ? (resumen.totalPaquetes / resumen.total).toFixed(1) : '0'} por consol.`}
            />
            <KpiCard
              icon={<Weight className="h-4 w-4" />}
              label="Peso total"
              value={`${resumen.totalLbs.toFixed(1)} lb`}
              accent="muted"
              hint={`${resumen.totalKgs.toFixed(1)} kg`}
            />
          </div>

          {/* Tabs por estado */}
          <div className="flex flex-wrap items-center gap-1 border-b border-border/60 -mb-px">
            {([
              { id: 'todos' as const, label: 'Todos', count: tabCounts.todos, icon: <Boxes className="h-3.5 w-3.5" /> },
              { id: 'abiertos' as const, label: 'Abiertos', count: tabCounts.abiertos, icon: <LockOpen className="h-3.5 w-3.5" />, accent: 'warning' as const },
              { id: 'cerrados' as const, label: 'Cerrados', count: tabCounts.cerrados, icon: <Lock className="h-3.5 w-3.5" />, accent: 'success' as const },
              { id: 'sin-guia' as const, label: 'Sin guía', count: tabCounts.sinGuia, icon: <AlertCircle className="h-3.5 w-3.5" />, accent: 'warning' as const },
            ]).map((t) => {
              const active = estadoTab === t.id;
              const accentText =
                t.accent === 'warning' ? 'text-warning' :
                t.accent === 'success' ? 'text-success' :
                'text-muted-foreground';
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setEstadoTab(t.id); setPage(0); }}
                  className={
                    'group inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ease-claude border-b-2 -mb-px ' +
                    (active
                      ? 'border-accent text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border')
                  }
                  aria-pressed={active}
                >
                  <span className={active ? 'text-accent' : accentText}>{t.icon}</span>
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
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            searchPlaceholder="Buscar por guía, ID, estado o guía de paquete…  ( / )"
            searchInputProps={{ 'data-consolidados-search': '' } as React.InputHTMLAttributes<HTMLInputElement>}
            filters={
              search ? (
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
              ) : null
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

          {/* Acciones masivas */}
          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent-soft/60 px-3 py-2 shadow-soft">
              <div className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <span><span className="font-semibold tabular-nums">{selectedCount}</span> consolidado{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => { void imprimirEtiquetasSeleccion(); }}
                  title="Imprimir todas las etiquetas de los consolidados seleccionados"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir etiquetas
                </Button>
                {canDeleteConsolidado && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5"
                    onClick={() => setBulkDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar selección
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedIds(new Set())}>
                  Limpiar
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <>
              <TableSkeleton rows={pageSize} columns={6} showCheckbox density={density} />
              <PaginationSkeleton />
            </>
          ) : error ? (
            <ErrorState
              title="Error al cargar consolidados"
              description={error}
              action={<Button variant="outline" size="sm" onClick={refresh}>Reintentar</Button>}
            />
          ) : filteredRows.length === 0 && !search && estadoTab === 'todos' ? (
            <EmptyState
              title="Sin consolidados"
              description={
                canEdit
                  ? hasConsolidadoDraft
                    ? 'Tiene un borrador sin guardar. Puede retomarlo para seguir cargando paquetes.'
                    : 'Cree un consolidado desde el apartado Nuevo consolidado.'
                  : 'No tiene consolidados con paquetes asociados.'
              }
              action={
                canEdit ? (
                  <Button onClick={() => navigate('/consolidados/new')} className="gap-2">
                    {hasConsolidadoDraft ? (
                      <>
                        <Pencil className="h-4 w-4" />
                        Seguir editando borrador
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Nuevo consolidado
                      </>
                    )}
                  </Button>
                ) : undefined
              }
            />
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="Sin coincidencias"
              description={search ? `Ningún consolidado coincide con "${search}".` : 'No hay consolidados que coincidan con el filtro actual.'}
              action={
                <Button variant="outline" onClick={limpiarFiltros}>
                  <FilterX className="h-4 w-4 mr-2" />
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              <NotionTable
                rows={paginatedRows}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/consolidados/${r.id}`)}
                rowActions={rowActions}
                density={density}
                sort={sort}
                onSortChange={setSort}
                showCheckbox
                selectedIds={selectedIds as Set<string | number>}
                onSelectionChange={(ids) => setSelectedIds(new Set(ids.map((x) => Number(x))))}
                columns={[
                  {
                    header: 'GUÍA ENVÍO',
                    sortKey: 'numeroGuia',
                    className: 'font-medium',
                    cell: (r) => (
                      <div className="group/copy inline-flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[13px] text-foreground truncate">
                          {r.numeroGuia || <span className="text-muted-foreground italic font-sans">Sin guía</span>}
                        </span>
                        {r.numeroGuia && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copiarTexto(r.numeroGuia, 'Guía');
                            }}
                            className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                            title="Copiar guía al portapapeles"
                            aria-label="Copiar guía"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ),
                  },
                  {
                    header: 'ESTADO',
                    sortKey: 'estado',
                    className: 'w-[140px]',
                    cell: (r) => {
                      if (isCerrado(r)) {
                        return (
                          <Badge variant="outline" className="gap-1 border-success/40 bg-success/15 text-success font-normal">
                            <Lock className="h-3 w-3" />
                            Cerrado
                          </Badge>
                        );
                      }
                      if (isAbierto(r)) {
                        return (
                          <Badge variant="outline" className="gap-1 border-warning/40 bg-warning/15 text-warning font-normal">
                            <LockOpen className="h-3 w-3" />
                            Abierto
                          </Badge>
                        );
                      }
                      return <span className="text-muted-foreground">—</span>;
                    },
                  },
                  {
                    header: 'PAQUETES',
                    sortKey: 'paquetes',
                    className: 'w-[110px]',
                    cell: (r) => {
                      const n = r.paquetes?.length ?? 0;
                      return (
                        <Badge
                          variant={n === 0 ? 'outline' : 'secondary'}
                          className={`font-normal tabular-nums ${n === 0 ? 'text-muted-foreground' : ''}`}
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {n}
                        </Badge>
                      );
                    },
                  },
                  {
                    header: 'LBS',
                    sortKey: 'pesoLbs',
                    className: 'w-[100px] text-right tabular-nums',
                    cell: (r) => (
                      typeof r.pesoTotalLbs === 'number'
                        ? <span className="text-foreground">{r.pesoTotalLbs.toFixed(2)}</span>
                        : <span className="text-muted-foreground">—</span>
                    ),
                  },
                  {
                    header: 'KGS',
                    sortKey: 'pesoKgs',
                    className: 'w-[100px] text-right tabular-nums',
                    cell: (r) => (
                      typeof r.pesoTotalKgs === 'number'
                        ? <span className="text-foreground">{r.pesoTotalKgs.toFixed(2)}</span>
                        : <span className="text-muted-foreground">—</span>
                    ),
                  },
                  {
                    header: 'ID',
                    sortKey: 'id',
                    className: 'w-[80px] text-muted-foreground',
                    cell: (r) => <span className="font-mono text-[12px]">#{r.id}</span>,
                  },
                ]}
              />

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Mostrar</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span>por página</span>
                </div>
                <ListPagination
                  page={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  size={pageSize}
                  onPageChange={setPage}
                />
              </div>

              {/* Atajos */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-muted-foreground">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1"><Kbd>/</Kbd> buscar</span>
                  <span className="inline-flex items-center gap-1"><Kbd>R</Kbd> refrescar</span>
                  <span className="inline-flex items-center gap-1"><Kbd>⇧R</Kbd> limpiar filtros</span>
                  {canEdit && <span className="inline-flex items-center gap-1"><Kbd>N</Kbd> nuevo</span>}
                  <span className="inline-flex items-center gap-1"><Kbd>T</Kbd> arriba</span>
                  <span className="inline-flex items-center gap-1"><Kbd>Esc</Kbd> quitar selección</span>
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
