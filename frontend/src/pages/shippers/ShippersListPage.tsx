import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Globe,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Phone,
  MapPin,
  UserRound,
  Copy,
  Star,
  Building2,
  Hash,
  RefreshCcw,
  FilterX,
  Rows3,
  AlignJustify,
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
import { useShippersList } from '@/hooks/useShippers';
import { deleteShipper, type Shipper } from '@/services/shippers.service';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';

// =============================================================================
// Helpers
// =============================================================================

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const STORAGE_KEY = 'mv_shippers_list_prefs';

type Density = 'comfortable' | 'compact';
type Tab = 'all' | 'con_encargado' | 'sin_encargado' | 'sin_telefono' | 'sin_direccion';

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
      tab: ['all', 'con_encargado', 'sin_encargado', 'sin_telefono', 'sin_direccion'].includes(parsed.tab)
        ? parsed.tab
        : 'all',
    };
  } catch {
    return { pageSize: 20, density: 'comfortable', tab: 'all' };
  }
}

function getPrincipalTelefono(s: Shipper): string | null {
  const tels = s.telefonos ?? [];
  return tels.find((t) => t.esPrincipal)?.numero ?? tels[0]?.numero ?? null;
}

function getPrincipalDireccion(s: Shipper): string | null {
  const dirs = s.direcciones ?? [];
  if (dirs.length === 0) return null;
  const d = dirs[0];
  return [d.canton, d.ciudad, d.pais].filter(Boolean).join(', ') || null;
}

function getCantonesUnique(s: Shipper): string[] {
  const cs = (s.direcciones ?? [])
    .map((d) => d.canton)
    .filter((c): c is string => !!c);
  return [...new Set(cs)];
}

// =============================================================================
// Componente
// =============================================================================

export default function ShippersListPage() {
  const navigate = useNavigate();
  const { data: rows, loading, error, refresh } = useShippersList();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const initialPrefs = readPrefs();
  const [pageSize, setPageSize] = useState<number>(initialPrefs.pageSize);
  const [density, setDensity] = useState<Density>(initialPrefs.density);
  const [tab, setTab] = useState<Tab>(initialPrefs.tab);
  const [sort, setSort] = useState<SortState>(null);

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ pageSize, density, tab }),
      );
    } catch { /* quota */ }
  }, [pageSize, density, tab]);

  // Filter por tab + búsqueda
  const baseFiltered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (tab === 'con_encargado') return !!r.nombreEncargado?.trim();
      if (tab === 'sin_encargado') return !r.nombreEncargado?.trim();
      if (tab === 'sin_telefono') return !(r.telefonos && r.telefonos.length > 0);
      if (tab === 'sin_direccion') return !(r.direcciones && r.direcciones.length > 0);
      return true;
    });
  }, [rows, tab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseFiltered;
    return baseFiltered.filter((r) => {
      const tels = (r.telefonos ?? []).map((t) => t.numero).join(' ').toLowerCase();
      const dirs = (r.direcciones ?? [])
        .flatMap((d) => [d.ciudad, d.canton, d.pais, d.direccion])
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (
        r.nombre?.toLowerCase().includes(q) ||
        (r.nombreEncargado ?? '').toLowerCase().includes(q) ||
        (r.codigoInterno ?? '').toLowerCase().includes(q) ||
        tels.includes(q) ||
        dirs.includes(q)
      );
    });
  }, [baseFiltered, search]);

  const sortedRows = useMemo(() => {
    if (!sort) return filtered;
    const arr = [...filtered];
    const factor = sort.dir === 'asc' ? 1 : -1;
    const get = (r: Shipper): string | number => {
      switch (sort.key) {
        case 'nombre': return (r.nombre ?? '').toLowerCase();
        case 'codigo': return (r.codigoInterno ?? '').toLowerCase();
        case 'encargado': return (r.nombreEncargado ?? '').toLowerCase();
        case 'telefonos': return r.telefonos?.length ?? 0;
        case 'direcciones': return r.direcciones?.length ?? 0;
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
  }, [filtered, sort]);

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
      con_encargado: list.filter((r) => !!r.nombreEncargado?.trim()).length,
      sin_encargado: list.filter((r) => !r.nombreEncargado?.trim()).length,
      sin_telefono: list.filter((r) => !(r.telefonos && r.telefonos.length > 0)).length,
      sin_direccion: list.filter((r) => !(r.direcciones && r.direcciones.length > 0)).length,
    };
  }, [rows]);

  const resumen = useMemo(() => {
    const list = rows ?? [];
    const total = list.length;
    const conEncargado = list.filter((r) => !!r.nombreEncargado?.trim()).length;
    const conTel = list.filter((r) => (r.telefonos?.length ?? 0) > 0).length;
    const conDir = list.filter((r) => (r.direcciones?.length ?? 0) > 0).length;
    return {
      total,
      conEncargado,
      conTel,
      conDir,
      pctEncargado: total > 0 ? Math.round((conEncargado / total) * 100) : 0,
      pctTel: total > 0 ? Math.round((conTel / total) * 100) : 0,
      pctDir: total > 0 ? Math.round((conDir / total) * 100) : 0,
    };
  }, [rows]);

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
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const rowActions = (r: Shipper): NotionTableAction<Shipper>[] => [
    { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/shippers/${r.id}`) },
    { label: 'Editar', icon: Pencil, onClick: () => navigate(`/shippers/${r.id}/edit`) },
    { label: 'Eliminar', icon: Trash2, onClick: () => setDeleteId(r.id), destructive: true },
  ];

  const shipperToDelete = deleteId != null ? rows?.find((s) => s.id === deleteId) : null;

  // ---------------------------------------------------------------------------
  // Atajos de teclado
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' || tag === 'textarea' || target?.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleRefresh();
        return;
      }
      if (isTyping) return;
      if (e.key === 'n') {
        e.preventDefault();
        navigate('/shippers/new');
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
        title="Shippers"
        icon={<Globe className="h-4 w-4" />}
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
              onClick={() => navigate('/shippers/new')}
              className="gap-1.5 h-8 shadow-sm text-xs"
              title="Nuevo shipper (N)"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nuevo Shipper
            </Button>
          </div>
        }
      >
        <ConfirmDeleteDialog
          open={deleteId != null}
          onOpenChange={(open) => !deleting && !open && setDeleteId(null)}
          entityLabel="shipper"
          entityName={shipperToDelete?.nombre ?? null}
          loading={deleting}
          onConfirm={async () => {
            if (deleteId == null) return;
            setDeleting(true);
            try {
              await deleteShipper(deleteId);
              setDeleteId(null);
              await refresh();
              toast.success('Shipper eliminado');
            } catch (e) {
              console.error('Error eliminando shipper', e);
              toast.error('No se pudo eliminar el shipper');
            } finally {
              setDeleting(false);
            }
          }}
        />

        <PageContent>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={<Building2 className="h-4 w-4" />}
              label="Total"
              value={resumen.total}
              accent="primary"
              hint={resumen.total === 1 ? '1 shipper' : `${resumen.total} shippers`}
            />
            <KpiCard
              icon={<UserRound className="h-4 w-4" />}
              label="Con encargado"
              value={resumen.conEncargado}
              accent="success"
              hint={`${resumen.pctEncargado}% del total`}
              progress={resumen.pctEncargado}
            />
            <KpiCard
              icon={<Phone className="h-4 w-4" />}
              label="Con teléfono"
              value={resumen.conTel}
              accent="info"
              hint={`${resumen.pctTel}% del total`}
              progress={resumen.pctTel}
            />
            <KpiCard
              icon={<MapPin className="h-4 w-4" />}
              label="Con dirección"
              value={resumen.conDir}
              accent={resumen.pctDir === 100 ? 'success' : 'warning'}
              hint={`${resumen.pctDir}% del total`}
              progress={resumen.pctDir}
            />
          </div>

          {/* Tabs de estado */}
          <div className="flex items-center gap-1 border-b border-border/50 overflow-x-auto -mx-4 px-4">
            {([
              { key: 'all', label: 'Todos', count: tabCounts.all },
              { key: 'con_encargado', label: 'Con encargado', count: tabCounts.con_encargado },
              { key: 'sin_encargado', label: 'Sin encargado', count: tabCounts.sin_encargado },
              { key: 'sin_telefono', label: 'Sin teléfono', count: tabCounts.sin_telefono },
              { key: 'sin_direccion', label: 'Sin dirección', count: tabCounts.sin_direccion },
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
            searchPlaceholder="Buscar por nombre, encargado, código, teléfono o ciudad…"
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
            <LoadingState label="Cargando shippers..." />
          ) : error ? (
            <ErrorState
              title="Error al cargar shippers"
              description={error}
              action={<Button variant="outline" size="sm" onClick={refresh}>Reintentar</Button>}
            />
          ) : (rows ?? []).length === 0 ? (
            <EmptyState
              title="Sin shippers"
              description="Crea tu primer shipper para empezar a registrar paquetes."
              action={<Button onClick={() => navigate('/shippers/new')}>Crear shipper</Button>}
            />
          ) : sortedRows.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="Intenta con otra búsqueda o ajusta los filtros."
              action={
                <Button variant="outline" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              }
            />
          ) : (
            <>
              <NotionTable
                rows={paginatedRows}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/shippers/${r.id}`)}
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
                      <div className="flex flex-col leading-tight">
                        <span>{r.nombre}</span>
                        {r.nombreEncargado && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {r.nombreEncargado}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  {
                    header: 'CÓDIGO',
                    sortKey: 'codigo',
                    className: 'w-[140px]',
                    cell: (r) => {
                      if (!r.codigoInterno) return <span className="text-muted-foreground">—</span>;
                      return (
                        <div className="group/copy inline-flex items-center gap-1.5 min-w-0">
                          <span className="font-mono text-[12px] truncate">{r.codigoInterno}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copiarTexto(r.codigoInterno!, 'Código');
                            }}
                            className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                            title="Copiar código"
                            aria-label="Copiar código"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    },
                  },
                  {
                    header: 'TELÉFONOS',
                    sortKey: 'telefonos',
                    className: 'w-[200px]',
                    cell: (r) => {
                      const principal = getPrincipalTelefono(r);
                      const count = r.telefonos?.length ?? 0;
                      if (!principal) return <span className="text-xs text-muted-foreground">—</span>;
                      return (
                        <div className="group/copy flex items-center gap-1.5 min-w-0">
                          <Star className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="font-mono text-[12px] truncate">{principal}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copiarTexto(principal, 'Teléfono');
                            }}
                            className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                            title="Copiar teléfono"
                            aria-label="Copiar teléfono"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          {count > 1 && (
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 text-[10px] font-normal shrink-0"
                              title={`${count} teléfonos`}
                            >
                              +{count - 1}
                            </Badge>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    header: 'DIRECCIÓN',
                    sortKey: 'direcciones',
                    cell: (r) => {
                      const principal = getPrincipalDireccion(r);
                      const cantones = getCantonesUnique(r);
                      const count = r.direcciones?.length ?? 0;
                      if (!principal) return <span className="text-xs text-muted-foreground">—</span>;
                      return (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="h-3 w-3 text-orange-500 shrink-0" />
                          <span className="text-xs truncate">{principal}</span>
                          {count > 1 && (
                            <Badge
                              variant="outline"
                              className="h-5 px-1.5 text-[10px] font-normal shrink-0"
                              title={
                                cantones.length > 0
                                  ? `Cantones: ${cantones.join(', ')}`
                                  : `${count} direcciones`
                              }
                            >
                              +{count - 1}
                            </Badge>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    header: 'ID',
                    className: 'w-[60px] text-xs text-muted-foreground tabular-nums',
                    cell: (r) => <span title={`ID interno: ${r.id}`}>#{r.id}</span>,
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

          {/* Atajos */}
          <div className="text-[11px] text-muted-foreground text-center pt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Atajos:</span>
            <Kbd>N</Kbd>
            <span>nuevo</span>
            <span className="opacity-40">·</span>
            <Kbd>Ctrl</Kbd> + <Kbd>R</Kbd>
            <span>refrescar</span>
            <span className="opacity-40">·</span>
            <Kbd>
              <Hash className="h-2.5 w-2.5" />
            </Kbd>
            <span>copiar (al pasar el mouse)</span>
          </div>
        </PageContent>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
