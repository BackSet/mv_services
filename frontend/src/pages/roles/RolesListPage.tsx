import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Shield,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Users,
  KeyRound,
  RefreshCcw,
  FilterX,
  Rows3,
  AlignJustify,
  Copy,
  ShieldCheck,
  ShieldAlert,
  Hash,
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
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRolesList } from '@/hooks/useRoles';
import { deleteRol, type Rol } from '@/services/roles.service';
import { listUsuarios } from '@/services/usuarios.service';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { agruparPermisos } from '@/lib/permisosAgrupados';

// =============================================================================
// Helpers
// =============================================================================

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const STORAGE_KEY = 'mv_roles_list_prefs';

type Density = 'comfortable' | 'compact';
type Tab = 'all' | 'con_permisos' | 'sin_permisos' | 'en_uso' | 'sin_uso';

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
      tab: ['all', 'con_permisos', 'sin_permisos', 'en_uso', 'sin_uso'].includes(parsed.tab)
        ? parsed.tab
        : 'all',
    };
  } catch {
    return { pageSize: 20, density: 'comfortable', tab: 'all' };
  }
}

function rolBadgeClass(nombre: string | null | undefined): string {
  const r = (nombre ?? '').toUpperCase();
  if (r.includes('ADMIN')) return 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30';
  if (r.includes('OPERA')) return 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30';
  if (r.includes('SHIPPER')) return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30';
  return 'bg-muted/40 text-muted-foreground border-border/50';
}

// =============================================================================
// Componente
// =============================================================================

export default function RolesListPage() {
  const navigate = useNavigate();
  const { data: rows, loading, error, refresh } = useRolesList();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [usageMap, setUsageMap] = useState<Record<number, number>>({});

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

  // Cargar conteo de usuarios por rol (no bloqueante)
  useEffect(() => {
    let cancelled = false;
    listUsuarios()
      .then((users) => {
        if (cancelled) return;
        const map: Record<number, number> = {};
        for (const u of users) {
          if (u.rol?.id != null) {
            map[u.rol.id] = (map[u.rol.id] ?? 0) + 1;
          }
        }
        setUsageMap(map);
      })
      .catch(() => { /* sin conteo, no bloqueamos */ });
    return () => { cancelled = true; };
  }, []);

  const baseFiltered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      const cnt = r.permisos?.length ?? 0;
      const usage = usageMap[r.id] ?? 0;
      if (tab === 'con_permisos' && cnt === 0) return false;
      if (tab === 'sin_permisos' && cnt > 0) return false;
      if (tab === 'en_uso' && usage === 0) return false;
      if (tab === 'sin_uso' && usage > 0) return false;
      return true;
    });
  }, [rows, tab, usageMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseFiltered;
    return baseFiltered.filter(
      (r) =>
        r.nombre?.toLowerCase().includes(q) ||
        r.permisos?.some((p) => p.nombre?.toLowerCase().includes(q)),
    );
  }, [baseFiltered, search]);

  const sortedRows = useMemo(() => {
    if (!sort) return filtered;
    const arr = [...filtered];
    const factor = sort.dir === 'asc' ? 1 : -1;
    const get = (r: Rol): string | number => {
      switch (sort.key) {
        case 'nombre': return (r.nombre ?? '').toLowerCase();
        case 'permisos': return r.permisos?.length ?? 0;
        case 'usuarios': return usageMap[r.id] ?? 0;
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
    const list = rows ?? [];
    return {
      all: list.length,
      con_permisos: list.filter((r) => (r.permisos?.length ?? 0) > 0).length,
      sin_permisos: list.filter((r) => (r.permisos?.length ?? 0) === 0).length,
      en_uso: list.filter((r) => (usageMap[r.id] ?? 0) > 0).length,
      sin_uso: list.filter((r) => (usageMap[r.id] ?? 0) === 0).length,
    };
  }, [rows, usageMap]);

  const resumen = useMemo(() => {
    const list = rows ?? [];
    const total = list.length;
    const totalUsuarios = Object.values(usageMap).reduce((a, b) => a + b, 0);
    const totalPermisos = list.reduce((acc, r) => acc + (r.permisos?.length ?? 0), 0);
    const sinPermisos = list.filter((r) => (r.permisos?.length ?? 0) === 0).length;
    const promedioPermisos = total > 0 ? Math.round((totalPermisos / total) * 10) / 10 : 0;
    return {
      total,
      totalUsuarios,
      promedioPermisos,
      sinPermisos,
      pctConfigurados:
        total > 0 ? Math.round(((total - sinPermisos) / total) * 100) : 0,
    };
  }, [rows, usageMap]);

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

  const limpiarFiltros = useCallback(() => {
    setSearch('');
    setTab('all');
    setSort(null);
    setPage(0);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      const users = await listUsuarios().catch(() => []);
      const map: Record<number, number> = {};
      for (const u of users) {
        if (u.rol?.id != null) {
          map[u.rol.id] = (map[u.rol.id] ?? 0) + 1;
        }
      }
      setUsageMap(map);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const requestDelete = useCallback(
    (r: Rol) => {
      const usuarios = usageMap[r.id] ?? 0;
      if (usuarios > 0) {
        toast.error(
          `No se puede eliminar: hay ${usuarios} usuario${usuarios === 1 ? '' : 's'} con este rol`,
        );
        return;
      }
      setDeleteId(r.id);
    },
    [usageMap],
  );

  const rowActions = (r: Rol): NotionTableAction<Rol>[] => {
    const usuarios = usageMap[r.id] ?? 0;
    return [
      { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/roles/${r.id}`) },
      { label: 'Editar', icon: Pencil, onClick: () => navigate(`/roles/${r.id}/edit`) },
      {
        label: usuarios > 0 ? `En uso por ${usuarios} usuario${usuarios === 1 ? '' : 's'}` : 'Eliminar',
        icon: Trash2,
        onClick: () => requestDelete(r),
        destructive: true,
      },
    ];
  };

  const rolToDelete = deleteId != null ? rows?.find((x) => x.id === deleteId) : null;

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
        navigate('/roles/new');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, handleRefresh]);

  const filtersActive = !!search || tab !== 'all' || !!sort;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Roles"
        icon={<Shield className="h-4 w-4" />}
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
              onClick={() => navigate('/roles/new')}
              className="gap-1.5 h-8 shadow-sm text-xs"
              title="Nuevo rol (N)"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nuevo Rol
            </Button>
          </div>
        }
      >
        <ConfirmDeleteDialog
          open={deleteId != null}
          onOpenChange={(open) => !deleting && !open && setDeleteId(null)}
          entityLabel="rol"
          entityName={rolToDelete?.nombre ?? null}
          loading={deleting}
          onConfirm={async () => {
            if (deleteId == null) return;
            setDeleting(true);
            try {
              await deleteRol(deleteId);
              setDeleteId(null);
              await refresh();
              toast.success('Rol eliminado');
            } catch (e) {
              console.error('Error eliminando rol', e);
              toast.error('No se pudo eliminar el rol');
            } finally {
              setDeleting(false);
            }
          }}
        />

        <PageContent>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={<Shield className="h-4 w-4" />}
              label="Roles"
              value={resumen.total}
              accent="primary"
              hint={resumen.total === 1 ? '1 rol' : `${resumen.total} roles`}
            />
            <KpiCard
              icon={<Users className="h-4 w-4" />}
              label="Usuarios cubiertos"
              value={resumen.totalUsuarios}
              accent="info"
              hint={`Asignados a roles`}
            />
            <KpiCard
              icon={<KeyRound className="h-4 w-4" />}
              label="Permisos / rol"
              value={resumen.promedioPermisos}
              accent="success"
              hint="Promedio por rol"
            />
            <KpiCard
              icon={resumen.sinPermisos === 0 ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              label="Configurados"
              value={`${resumen.pctConfigurados}%`}
              accent={resumen.sinPermisos === 0 ? 'success' : 'warning'}
              hint={
                resumen.sinPermisos === 0
                  ? 'Todos con permisos'
                  : `${resumen.sinPermisos} sin permisos`
              }
              progress={resumen.pctConfigurados}
            />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border/50 overflow-x-auto -mx-4 px-4">
            {([
              { key: 'all', label: 'Todos', count: tabCounts.all },
              { key: 'con_permisos', label: 'Con permisos', count: tabCounts.con_permisos },
              { key: 'sin_permisos', label: 'Sin permisos', count: tabCounts.sin_permisos },
              { key: 'en_uso', label: 'En uso', count: tabCounts.en_uso },
              { key: 'sin_uso', label: 'Sin uso', count: tabCounts.sin_uso },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setTab(t.key); setPage(0); }}
                className={`relative px-3 py-2 text-xs font-medium transition-colors -mb-px border-b-2 whitespace-nowrap ${
                  tab === t.key
                    ? 'text-foreground border-primary'
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
            searchPlaceholder="Buscar por rol o por nombre de permiso…"
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
            <LoadingState label="Cargando roles..." />
          ) : error ? (
            <ErrorState
              title="Error al cargar roles"
              description={error}
              action={<Button variant="outline" size="sm" onClick={refresh}>Reintentar</Button>}
            />
          ) : (rows ?? []).length === 0 ? (
            <EmptyState
              title="Sin roles"
              description="Crea el primer rol para gestionar permisos."
              action={<Button onClick={() => navigate('/roles/new')}>Crear rol</Button>}
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
                onRowClick={(r) => navigate(`/roles/${r.id}`)}
                rowActions={rowActions}
                density={density}
                sort={sort}
                onSortChange={setSort}
                columns={[
                  {
                    header: 'NOMBRE',
                    sortKey: 'nombre',
                    className: 'font-medium',
                    cell: (r) => (
                      <div className="group/copy flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className={`text-[10px] ${rolBadgeClass(r.nombre)} shrink-0`}>
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          {r.nombre}
                        </Badge>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copiarTexto(r.nombre, 'Rol');
                          }}
                          className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                          title="Copiar nombre"
                          aria-label="Copiar nombre"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    ),
                  },
                  {
                    header: 'PERMISOS',
                    sortKey: 'permisos',
                    cell: (r) => {
                      const total = r.permisos?.length ?? 0;
                      if (total === 0) {
                        return (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                            <ShieldAlert className="h-3 w-3" />
                            Sin permisos
                          </span>
                        );
                      }
                      const grupos = agruparPermisos(r.permisos ?? []);
                      const visibles = grupos.slice(0, 4);
                      const restantes = grupos.length - visibles.length;
                      return (
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 bg-violet-500/5 border-violet-500/30 text-violet-700 dark:text-violet-400 tabular-nums shrink-0"
                          >
                            <KeyRound className="h-2.5 w-2.5" />
                            {total}
                          </Badge>
                          {visibles.map((g) => (
                            <Badge
                              key={g.moduloKey}
                              variant="secondary"
                              className="text-[10px] font-normal shrink-0"
                            >
                              {g.modulo}
                              <span className="ml-1 opacity-60 tabular-nums">{g.permisos.length}</span>
                            </Badge>
                          ))}
                          {restantes > 0 && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              +{restantes} módulo{restantes === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    header: 'USUARIOS',
                    sortKey: 'usuarios',
                    className: 'w-[110px]',
                    cell: (r) => {
                      const cnt = usageMap[r.id] ?? 0;
                      return cnt > 0 ? (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 tabular-nums">
                          <Users className="h-2.5 w-2.5" />
                          {cnt}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      );
                    },
                  },
                  {
                    header: 'ID',
                    sortKey: 'id',
                    className: 'w-[80px] text-xs text-muted-foreground tabular-nums',
                    cell: (r) => (
                      <span className="inline-flex items-center gap-1" title={`ID interno: ${r.id}`}>
                        <Hash className="h-2.5 w-2.5 opacity-60" />
                        {r.id}
                      </span>
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
