import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  KeyRound,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Shield,
  Layers,
  Copy,
  RefreshCcw,
  FilterX,
  Rows3,
  AlignJustify,
  Hash,
  AlertCircle,
  PlusCircle,
  ChevronDown,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { KpiCard, Kbd } from '@/components/layout/KpiCard';
import { PageContent } from '@/components/layout/PageContent';
import NotionTable from '@/components/notion/NotionTable';
import type { NotionTableAction, SortState } from '@/components/notion/NotionTable';
import EmptyState from '@/components/notion/EmptyState';
import { ListToolbar } from '@/components/list/ListToolbar';
import { ListPagination } from '@/components/list/ListPagination';
import { TableSkeleton, PaginationSkeleton } from '@/components/skeletons';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Permiso } from '@/services/permisos.service';
import { listPermisos, deletePermiso } from '@/services/permisos.service';
import { listRoles, type Rol } from '@/services/roles.service';
import {
  accionBadgeClass,
  agruparPermisos,
  getAccionInfo,
  getModuloKey,
  getModuloLabel,
} from '@/lib/permisosAgrupados';

// =============================================================================
// Helpers
// =============================================================================

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const STORAGE_KEY = 'mv_permisos_list_prefs';

type Density = 'comfortable' | 'compact';
type Tab = 'all' | 'sin_uso' | 'sin_descripcion';

type Prefs = {
  pageSize: number;
  density: Density;
  tab: Tab;
};

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pageSize: 20, density: 'comfortable', tab: 'all' };
    const parsed = JSON.parse(raw);
    return {
      pageSize: PAGE_SIZE_OPTIONS.includes(parsed.pageSize) ? parsed.pageSize : 20,
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      tab: ['all', 'sin_uso', 'sin_descripcion'].includes(parsed.tab) ? parsed.tab : 'all',
    };
  } catch {
    return { pageSize: 20, density: 'comfortable', tab: 'all' };
  }
}

// =============================================================================
// Componente
// =============================================================================

export default function PermisosListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialModulo = searchParams.get('modulo')?.toUpperCase() ?? 'all';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Permiso[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [moduloFilter, setModuloFilter] = useState<string>(initialModulo || 'all');
  const [accionFilter, setAccionFilter] = useState<string>('all');
  const [usageMap, setUsageMap] = useState<Record<number, number>>({});
  const [rolesByPermiso, setRolesByPermiso] = useState<Record<number, Rol[]>>({});

  const initialPrefs = readPrefs();
  const [pageSize, setPageSize] = useState<number>(initialPrefs.pageSize);
  const [density, setDensity] = useState<Density>(initialPrefs.density);
  const [tab, setTab] = useState<Tab>(initialPrefs.tab);
  const [sort, setSort] = useState<SortState>(null);

  // Persist prefs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pageSize, density, tab }));
    } catch { /* quota */ }
  }, [pageSize, density, tab]);

  // ---------------------------------------------------------------------------
  // Carga
  // ---------------------------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await listPermisos();
      setRows(data);
    } catch (e) {
      console.error('Error cargando permisos', e);
      setFetchError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar conteo de roles por permiso (no bloqueante) + nombres
  const loadUsage = useCallback(async () => {
    try {
      const allRoles = await listRoles();
      const map: Record<number, number> = {};
      const byPermiso: Record<number, Rol[]> = {};
      for (const r of allRoles) {
        for (const p of r.permisos ?? []) {
          map[p.id] = (map[p.id] ?? 0) + 1;
          if (!byPermiso[p.id]) byPermiso[p.id] = [];
          byPermiso[p.id].push(r);
        }
      }
      setUsageMap(map);
      setRolesByPermiso(byPermiso);
    } catch { /* sin conteo */ }
  }, []);

  useEffect(() => {
    load();
    loadUsage();
  }, [load, loadUsage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
      await loadUsage();
    } finally {
      setRefreshing(false);
    }
  }, [load, loadUsage]);

  // ---------------------------------------------------------------------------
  // Datos derivados
  // ---------------------------------------------------------------------------

  const grupos = useMemo(() => agruparPermisos(rows), [rows]);

  const modulosUnicos = useMemo(
    () => grupos.map((g) => ({ key: g.moduloKey, label: g.modulo, count: g.permisos.length })),
    [grupos],
  );

  const accionesUnicas = useMemo(() => {
    const set = new Map<string, { label: string; tone: ReturnType<typeof getAccionInfo>['tone'] }>();
    for (const r of rows) {
      const info = getAccionInfo(r.nombre);
      if (!info.raw) continue;
      if (!set.has(info.raw)) set.set(info.raw, { label: info.label, tone: info.tone });
    }
    return Array.from(set.entries()).map(([raw, v]) => ({ raw, ...v }));
  }, [rows]);

  const baseFiltered = useMemo(() => {
    return rows.filter((r) => {
      const moduloKey = getModuloKey(r.nombre);
      const accion = getAccionInfo(r.nombre);
      const usage = usageMap[r.id] ?? 0;

      if (tab === 'sin_uso' && usage > 0) return false;
      if (tab === 'sin_descripcion' && r.descripcion?.trim()) return false;
      if (moduloFilter !== 'all' && moduloKey !== moduloFilter) return false;
      if (accionFilter !== 'all' && accion.raw !== accionFilter) return false;
      return true;
    });
  }, [rows, tab, moduloFilter, accionFilter, usageMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseFiltered;
    return baseFiltered.filter(
      (r) =>
        r.nombre?.toLowerCase().includes(q) ||
        (r.descripcion?.toLowerCase().includes(q) ?? false) ||
        getModuloLabel(getModuloKey(r.nombre)).toLowerCase().includes(q),
    );
  }, [baseFiltered, search]);

  const sortedRows = useMemo(() => {
    if (!sort) {
      // Orden por defecto: módulo asc, luego nombre asc.
      return [...filtered].sort((a, b) => {
        const ma = getModuloLabel(getModuloKey(a.nombre));
        const mb = getModuloLabel(getModuloKey(b.nombre));
        if (ma !== mb) return ma.localeCompare(mb);
        return (a.nombre ?? '').localeCompare(b.nombre ?? '');
      });
    }
    const arr = [...filtered];
    const factor = sort.dir === 'asc' ? 1 : -1;
    const get = (r: Permiso): string | number => {
      switch (sort.key) {
        case 'nombre': return (r.nombre ?? '').toLowerCase();
        case 'modulo': return getModuloLabel(getModuloKey(r.nombre)).toLowerCase();
        case 'descripcion': return (r.descripcion ?? '').toLowerCase();
        case 'roles': return usageMap[r.id] ?? 0;
        case 'id': return r.id;
        default: return 0;
      }
    };
    arr.sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      if (av === bv) return 0;
      return av > bv ? factor : -factor;
    });
    return arr;
  }, [filtered, sort, usageMap]);

  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const tabCounts = useMemo(() => {
    return {
      all: rows.length,
      sin_uso: rows.filter((r) => (usageMap[r.id] ?? 0) === 0).length,
      sin_descripcion: rows.filter((r) => !r.descripcion?.trim()).length,
    };
  }, [rows, usageMap]);

  const resumen = useMemo(() => {
    const total = rows.length;
    const sinUso = rows.filter((r) => (usageMap[r.id] ?? 0) === 0).length;
    const sinDescripcion = rows.filter((r) => !r.descripcion?.trim()).length;
    return {
      total,
      modulos: modulosUnicos.length,
      sinUso,
      sinDescripcion,
      pctEnUso: total > 0 ? Math.round(((total - sinUso) / total) * 100) : 0,
    };
  }, [rows, usageMap, modulosUnicos.length]);

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  const copiarTexto = useCallback(async (texto: string, label: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${label} copiado`);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  }, []);

  // Mantener `?modulo=` sincronizado en la URL para enlaces compartibles.
  useEffect(() => {
    const current = searchParams.get('modulo');
    if (moduloFilter === 'all') {
      if (current) {
        const next = new URLSearchParams(searchParams);
        next.delete('modulo');
        setSearchParams(next, { replace: true });
      }
    } else if (current !== moduloFilter) {
      const next = new URLSearchParams(searchParams);
      next.set('modulo', moduloFilter);
      setSearchParams(next, { replace: true });
    }
  }, [moduloFilter, searchParams, setSearchParams]);

  const limpiarFiltros = useCallback(() => {
    setSearch('');
    setTab('all');
    setModuloFilter('all');
    setAccionFilter('all');
    setSort(null);
    setPage(0);
  }, []);

  const requestDelete = useCallback(
    (r: Permiso) => {
      const usos = usageMap[r.id] ?? 0;
      if (usos > 0) {
        toast.error(`No se puede eliminar: ${usos} rol${usos === 1 ? '' : 'es'} usa${usos === 1 ? '' : 'n'} este permiso`);
        return;
      }
      setDeleteId(r.id);
    },
    [usageMap],
  );

  const rowActions = (r: Permiso): NotionTableAction<Permiso>[] => {
    const usos = usageMap[r.id] ?? 0;
    const sinDescripcion = !r.descripcion?.trim();
    const actions: NotionTableAction<Permiso>[] = [
      { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/permisos/${r.id}`) },
      { label: 'Editar', icon: Pencil, onClick: () => navigate(`/permisos/${r.id}/edit`) },
      {
        label: 'Copiar ID',
        icon: Hash,
        onClick: () => copiarTexto(String(r.id), 'ID'),
      },
    ];
    if (sinDescripcion) {
      actions.push({
        label: 'Agregar descripción',
        icon: PlusCircle,
        onClick: () => navigate(`/permisos/${r.id}/edit`),
      });
    }
    actions.push({
      label: usos > 0 ? `En uso por ${usos} rol${usos === 1 ? '' : 'es'}` : 'Eliminar',
      icon: Trash2,
      onClick: () => requestDelete(r),
      destructive: true,
    });
    return actions;
  };

  const permisoToDelete = deleteId != null ? rows.find((p) => p.id === deleteId) : null;

  // ---------------------------------------------------------------------------
  // Atajos
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRefresh();
        return;
      }
      if (isTyping) return;
      if (e.key === 'n') {
        e.preventDefault();
        navigate('/permisos/new');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, handleRefresh]);

  const filtersActive =
    !!search || tab !== 'all' || moduloFilter !== 'all' || accionFilter !== 'all' || !!sort;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Permisos"
        icon={<KeyRound className="h-4 w-4" />}
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="gap-1.5 h-8"
              title="Refrescar (Ctrl+R)"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/permisos/new')}
              className="gap-1.5 h-8 shadow-sm text-xs"
              title="Nuevo permiso (N)"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nuevo Permiso
            </Button>
          </div>
        }
      >
        <ConfirmDeleteDialog
          open={deleteId != null}
          onOpenChange={(open) => !deleting && !open && setDeleteId(null)}
          entityLabel="permiso"
          entityName={permisoToDelete?.nombre ?? null}
          loading={deleting}
          onConfirm={async () => {
            if (deleteId == null) return;
            setDeleting(true);
            try {
              await deletePermiso(deleteId);
              setDeleteId(null);
              await load();
              await loadUsage();
              toast.success('Permiso eliminado');
            } catch (e) {
              console.error('Error eliminando permiso', e);
              toast.error('No se pudo eliminar el permiso');
            } finally {
              setDeleting(false);
            }
          }}
        />

        <PageContent>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={<KeyRound className="h-4 w-4" />}
              label="Permisos"
              value={resumen.total}
              accent="primary"
              hint={resumen.total === 1 ? '1 permiso' : `${resumen.total} permisos`}
            />
            <KpiCard
              icon={<Layers className="h-4 w-4" />}
              label="Módulos"
              value={resumen.modulos}
              accent="info"
              hint={resumen.modulos === 1 ? '1 módulo' : `${resumen.modulos} módulos`}
            />
            <KpiCard
              icon={<Shield className="h-4 w-4" />}
              label="En uso"
              value={`${resumen.pctEnUso}%`}
              accent={resumen.sinUso === 0 ? 'success' : 'warning'}
              hint={
                resumen.sinUso === 0
                  ? 'Todos asignados a roles'
                  : `${resumen.sinUso} sin usar`
              }
              progress={resumen.pctEnUso}
            />
            <KpiCard
              icon={<AlertCircle className="h-4 w-4" />}
              label="Sin descripción"
              value={resumen.sinDescripcion}
              accent={resumen.sinDescripcion === 0 ? 'success' : 'warning'}
              hint={
                resumen.sinDescripcion === 0
                  ? 'Documentación completa'
                  : 'Recomendado documentar'
              }
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border/50 overflow-x-auto -mx-4 px-4">
            {([
              { key: 'all', label: 'Todos', count: tabCounts.all },
              { key: 'sin_uso', label: 'Sin uso', count: tabCounts.sin_uso },
              { key: 'sin_descripcion', label: 'Sin descripción', count: tabCounts.sin_descripcion },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setTab(t.key); setPage(0); }}
                className={`relative px-3 py-2 text-xs font-medium transition-colors ease-claude -mb-px border-b-2 whitespace-nowrap ${
                  tab === t.key
                    ? 'text-foreground border-accent'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-[10px] tabular-nums opacity-70">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <ListToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            searchPlaceholder="Buscar por nombre, descripción o módulo…"
            filters={
              <div className="flex items-center gap-1.5">
                {modulosUnicos.length > 0 && (
                  <label className="flex items-center gap-1.5 text-xs">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      value={moduloFilter}
                      onChange={(e) => { setModuloFilter(e.target.value); setPage(0); }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="all">Todos los módulos</option>
                      {modulosUnicos.map((m) => (
                        <option key={m.key} value={m.key}>{m.label} ({m.count})</option>
                      ))}
                    </select>
                  </label>
                )}
                {accionesUnicas.length > 0 && (
                  <label className="flex items-center gap-1.5 text-xs">
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    <select
                      value={accionFilter}
                      onChange={(e) => { setAccionFilter(e.target.value); setPage(0); }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="all">Todas las acciones</option>
                      {accionesUnicas.map((a) => (
                        <option key={a.raw} value={a.raw}>{a.label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            }
            actions={
              <div className="flex items-center gap-1.5">
                {filtersActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={limpiarFiltros}
                    className="gap-1 h-8 text-muted-foreground"
                    title="Limpiar filtros"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">Limpiar</span>
                  </Button>
                )}
                <div className="inline-flex items-center rounded-md border border-input p-0.5">
                  <button
                    type="button"
                    onClick={() => setDensity('comfortable')}
                    className={`h-6 px-2 text-[11px] rounded-sm transition-colors flex items-center gap-1 ${
                      density === 'comfortable'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Densidad cómoda"
                  >
                    <Rows3 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensity('compact')}
                    className={`h-6 px-2 text-[11px] rounded-sm transition-colors flex items-center gap-1 ${
                      density === 'compact'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Densidad compacta"
                  >
                    <AlignJustify className="h-3 w-3" />
                  </button>
                </div>
              </div>
            }
          />

          {loading ? (
            <>
              <TableSkeleton rows={pageSize} columns={6} density={density} />
              <PaginationSkeleton />
            </>
          ) : fetchError ? (
            <ErrorState
              title="Error al cargar permisos"
              description={fetchError}
              action={<Button variant="outline" size="sm" onClick={load}>Reintentar</Button>}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Sin permisos"
              description="Crea el primer permiso para asignarlo a roles."
              action={<Button onClick={() => navigate('/permisos/new')}>Crear permiso</Button>}
            />
          ) : sortedRows.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="Intenta con otra búsqueda o ajusta los filtros."
              action={<Button variant="outline" onClick={limpiarFiltros}>Limpiar filtros</Button>}
            />
          ) : (
            <>
              <NotionTable
                rows={paginatedRows}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/permisos/${r.id}`)}
                rowActions={rowActions}
                density={density}
                sort={sort}
                onSortChange={setSort}
                columns={[
                  {
                    header: 'NOMBRE',
                    sortKey: 'nombre',
                    className: 'font-medium',
                    cell: (r) => {
                      const accion = getAccionInfo(r.nombre);
                      return (
                        <div className="group/copy flex items-center gap-2 min-w-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${accionBadgeClass(accion.tone)} shrink-0`}
                            title={accion.label}
                          >
                            <KeyRound className="h-2.5 w-2.5 mr-1" />
                            {r.nombre}
                          </Badge>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copiarTexto(r.nombre, 'Permiso');
                            }}
                            className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                            title="Copiar nombre"
                            aria-label="Copiar nombre"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    },
                  },
                  {
                    header: 'MÓDULO',
                    sortKey: 'modulo',
                    className: 'w-[160px]',
                    cell: (r) => {
                      const moduloKey = getModuloKey(r.nombre);
                      const moduloLabel = getModuloLabel(moduloKey);
                      return (
                        <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                          <Layers className="h-2.5 w-2.5" />
                          {moduloLabel}
                        </Badge>
                      );
                    },
                  },
                  {
                    header: 'ACCIÓN',
                    className: 'w-[120px]',
                    cell: (r) => {
                      const accion = getAccionInfo(r.nombre);
                      return (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${accionBadgeClass(accion.tone)}`}
                        >
                          {accion.label}
                        </Badge>
                      );
                    },
                  },
                  {
                    header: 'ROLES',
                    sortKey: 'roles',
                    className: 'w-[120px]',
                    cell: (r) => {
                      const usos = usageMap[r.id] ?? 0;
                      if (usos === 0) {
                        return <span className="text-muted-foreground text-xs">—</span>;
                      }
                      const roles = rolesByPermiso[r.id] ?? [];
                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                              title={`Ver roles que usan ${r.nombre}`}
                            >
                              <Badge variant="brand" className="text-[10px] gap-1 tabular-nums hover:bg-accent/85 cursor-pointer">
                                <Shield className="h-2.5 w-2.5" />
                                {usos}
                                <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                              </Badge>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            sideOffset={6}
                            className="w-64 p-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Roles ({usos})
                              </div>
                              {roles.length === 0 ? (
                                <div className="text-xs text-muted-foreground italic">
                                  Sin información detallada.
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                                  {roles.map((rol) => (
                                    <button
                                      key={rol.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/roles/${rol.id}`);
                                      }}
                                      className="inline-flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                                    >
                                      <span className="inline-flex items-center gap-1.5 min-w-0">
                                        <Shield className="h-3 w-3 text-accent shrink-0" />
                                        <span className="truncate">{rol.nombre}</span>
                                      </span>
                                      <span className="text-[10px] text-muted-foreground shrink-0">
                                        {rol.permisos?.length ?? 0} permisos
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    },
                  },
                  {
                    header: 'DESCRIPCIÓN',
                    sortKey: 'descripcion',
                    cell: (r) =>
                      r.descripcion?.trim() ? (
                        <span className="text-xs text-muted-foreground line-clamp-1" title={r.descripcion}>
                          {r.descripcion}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/permisos/${r.id}/edit`);
                          }}
                          className="text-[11px] text-warning italic inline-flex items-center gap-1 hover:text-warning/80 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-warning/40 rounded"
                          title="Agregar descripción a este permiso"
                        >
                          <AlertCircle className="h-3 w-3" />
                          Agregar descripción
                        </button>
                      ),
                  },
                  {
                    header: 'ID',
                    sortKey: 'id',
                    className: 'w-[80px] text-xs text-muted-foreground tabular-nums',
                    cell: (r) => (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copiarTexto(String(r.id), 'ID');
                        }}
                        className="inline-flex items-center gap-1 rounded border border-transparent px-1 py-0.5 hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
                        title={`Copiar ID interno: ${r.id}`}
                      >
                        <Hash className="h-2.5 w-2.5 opacity-60" />
                        {r.id}
                      </button>
                    ),
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
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(0);
                }}
              />
            </>
          )}

          <div className="text-[11px] text-muted-foreground text-center pt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Atajos:</span>
            <Kbd>N</Kbd>
            <span>nuevo</span>
            <span className="opacity-40">·</span>
            <Kbd>Ctrl</Kbd> + <Kbd>R</Kbd>
            <span>refrescar</span>
          </div>
        </PageContent>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
