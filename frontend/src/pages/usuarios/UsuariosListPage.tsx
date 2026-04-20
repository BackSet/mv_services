import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Mail,
  Shield,
  Truck,
  Copy,
  RefreshCcw,
  FilterX,
  Rows3,
  AlignJustify,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AtSign,
  UserPlus,
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
import { useUsuariosList } from '@/hooks/useUsuarios';
import { useMe } from '@/hooks/useMe';
import { deleteUsuario, type Usuario } from '@/services/usuarios.service';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';

// =============================================================================
// Helpers
// =============================================================================

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const STORAGE_KEY = 'mv_usuarios_list_prefs';

type Density = 'comfortable' | 'compact';
type Tab = 'all' | 'activos' | 'inactivos' | 'con_shipper' | 'sin_shipper';

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
      tab: ['all', 'activos', 'inactivos', 'con_shipper', 'sin_shipper'].includes(parsed.tab)
        ? parsed.tab
        : 'all',
    };
  } catch {
    return { pageSize: 20, density: 'comfortable', tab: 'all' };
  }
}

function rolBadgeClass(rol: string | null | undefined): string {
  const r = (rol ?? '').toUpperCase();
  if (r.includes('ADMIN')) return 'bg-accent-soft text-accent-soft-foreground border-accent/30';
  if (r.includes('OPERA')) return 'bg-info/15 text-info border-info/30';
  if (r.includes('SHIPPER')) return 'bg-accent-soft text-accent-soft-foreground border-accent/30';
  return 'bg-muted/40 text-muted-foreground border-border/50';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// =============================================================================
// Componente
// =============================================================================

export default function UsuariosListPage() {
  const navigate = useNavigate();
  const { data: rows, loading, error, refresh } = useUsuariosList();
  const { me } = useMe();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const initialPrefs = readPrefs();
  const [pageSize, setPageSize] = useState<number>(initialPrefs.pageSize);
  const [density, setDensity] = useState<Density>(initialPrefs.density);
  const [tab, setTab] = useState<Tab>(initialPrefs.tab);
  const [rolFilter, setRolFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortState>(null);

  // Persist prefs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pageSize, density, tab }));
    } catch { /* quota */ }
  }, [pageSize, density, tab]);

  const myUsername = me?.username?.toLowerCase() ?? null;

  // Roles únicos para filtro
  const rolesUnicos = useMemo(() => {
    const set = new Set<string>();
    (rows ?? []).forEach((u) => {
      if (u.rol?.nombre) set.add(u.rol.nombre);
    });
    return Array.from(set).sort();
  }, [rows]);

  const baseFiltered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (tab === 'activos' && !r.activo) return false;
      if (tab === 'inactivos' && r.activo) return false;
      if (tab === 'con_shipper' && !r.shipper) return false;
      if (tab === 'sin_shipper' && !!r.shipper) return false;
      if (rolFilter !== 'all' && r.rol?.nombre !== rolFilter) return false;
      return true;
    });
  }, [rows, tab, rolFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseFiltered;
    return baseFiltered.filter(
      (r) =>
        r.username?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.rol?.nombre?.toLowerCase().includes(q) ||
        r.shipper?.nombre?.toLowerCase().includes(q) ||
        r.shipper?.codigoInterno?.toLowerCase().includes(q),
    );
  }, [baseFiltered, search]);

  const sortedRows = useMemo(() => {
    if (!sort) return filtered;
    const arr = [...filtered];
    const factor = sort.dir === 'asc' ? 1 : -1;
    const get = (r: Usuario): string | number => {
      switch (sort.key) {
        case 'username': return (r.username ?? '').toLowerCase();
        case 'email': return (r.email ?? '').toLowerCase();
        case 'rol': return (r.rol?.nombre ?? '').toLowerCase();
        case 'shipper': return (r.shipper?.nombre ?? '').toLowerCase();
        case 'estado': return r.activo ? 1 : 0;
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
      activos: list.filter((r) => r.activo).length,
      inactivos: list.filter((r) => !r.activo).length,
      con_shipper: list.filter((r) => !!r.shipper).length,
      sin_shipper: list.filter((r) => !r.shipper).length,
    };
  }, [rows]);

  const resumen = useMemo(() => {
    const list = rows ?? [];
    const total = list.length;
    const activos = list.filter((r) => r.activo).length;
    const conShipper = list.filter((r) => !!r.shipper).length;
    const admins = list.filter((r) => (r.rol?.nombre ?? '').toUpperCase().includes('ADMIN')).length;
    return {
      total,
      activos,
      inactivos: total - activos,
      conShipper,
      admins,
      pctActivos: total > 0 ? Math.round((activos / total) * 100) : 0,
      pctShipper: total > 0 ? Math.round((conShipper / total) * 100) : 0,
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
    setRolFilter('all');
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

  const isSelf = useCallback(
    (u: Usuario) => myUsername != null && u.username?.toLowerCase() === myUsername,
    [myUsername],
  );

  const requestDelete = useCallback(
    (u: Usuario) => {
      if (isSelf(u)) {
        toast.error('No puedes eliminar tu propio usuario');
        return;
      }
      setDeleteId(u.id);
    },
    [isSelf],
  );

  const rowActions = (r: Usuario): NotionTableAction<Usuario>[] => {
    const actions: NotionTableAction<Usuario>[] = [
      { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/usuarios/${r.id}`) },
      { label: 'Editar', icon: Pencil, onClick: () => navigate(`/usuarios/${r.id}/edit`) },
    ];
    if (r.shipper?.id) {
      actions.push({
        label: 'Ir al shipper',
        icon: Truck,
        onClick: () => navigate(`/shippers/${r.shipper!.id}`),
      });
    } else {
      actions.push({
        label: 'Asignar shipper',
        icon: UserPlus,
        onClick: () => navigate(`/usuarios/${r.id}/edit#shipper`),
      });
    }
    actions.push({
      label: isSelf(r) ? 'No puedes eliminarte' : 'Eliminar',
      icon: Trash2,
      onClick: () => requestDelete(r),
      destructive: true,
    });
    return actions;
  };

  const usuarioToDelete = deleteId != null ? rows?.find((u) => u.id === deleteId) : null;

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
        navigate('/usuarios/new');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, handleRefresh]);

  const filtersActive = !!search || tab !== 'all' || rolFilter !== 'all' || !!sort;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Usuarios"
        icon={<Users className="h-4 w-4" />}
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
              onClick={() => navigate('/usuarios/new')}
              className="gap-1.5 h-8 shadow-sm text-xs"
              title="Nuevo usuario (N)"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Nuevo Usuario
            </Button>
          </div>
        }
      >
        <ConfirmDeleteDialog
          open={deleteId != null}
          onOpenChange={(open) => !deleting && !open && setDeleteId(null)}
          entityLabel="usuario"
          entityName={
            usuarioToDelete ? `${usuarioToDelete.username} (${usuarioToDelete.email})` : null
          }
          loading={deleting}
          onConfirm={async () => {
            if (deleteId == null) return;
            setDeleting(true);
            try {
              await deleteUsuario(deleteId);
              setDeleteId(null);
              await refresh();
              toast.success('Usuario eliminado');
            } catch (e) {
              console.error('Error eliminando usuario', e);
              toast.error('No se pudo eliminar el usuario');
            } finally {
              setDeleting(false);
            }
          }}
        />

        <PageContent>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={<Users className="h-4 w-4" />}
              label="Total"
              value={resumen.total}
              accent="primary"
              hint={resumen.total === 1 ? '1 usuario' : `${resumen.total} usuarios`}
            />
            <KpiCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Activos"
              value={resumen.activos}
              accent="success"
              hint={`${resumen.pctActivos}% del total`}
              progress={resumen.pctActivos}
            />
            <KpiCard
              icon={<Truck className="h-4 w-4" />}
              label="Con shipper"
              value={resumen.conShipper}
              accent="info"
              hint={`${resumen.pctShipper}% del total`}
              progress={resumen.pctShipper}
            />
            <KpiCard
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Administradores"
              value={resumen.admins}
              accent={resumen.admins === 0 ? 'warning' : 'muted'}
              hint={resumen.admins === 0 ? 'Sin admins activos' : `${resumen.admins} con rol admin`}
            />
          </div>

          {/* Tabs de estado */}
          <div className="flex items-center gap-1 border-b border-border/50 overflow-x-auto -mx-4 px-4">
            {([
              { key: 'all', label: 'Todos', count: tabCounts.all },
              { key: 'activos', label: 'Activos', count: tabCounts.activos },
              { key: 'inactivos', label: 'Inactivos', count: tabCounts.inactivos },
              { key: 'con_shipper', label: 'Con shipper', count: tabCounts.con_shipper },
              { key: 'sin_shipper', label: 'Sin shipper', count: tabCounts.sin_shipper },
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
            searchPlaceholder="Buscar por usuario, email, rol, shipper o código…"
            filters={
              rolesUnicos.length > 0 ? (
                <label className="flex items-center gap-1.5 text-xs">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={rolFilter}
                    onChange={(e) => { setRolFilter(e.target.value); setPage(0); }}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="all">Todos los roles</option>
                    {rolesUnicos.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
              ) : null
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
          ) : error ? (
            <ErrorState
              title="Error al cargar usuarios"
              description={error}
              action={<Button variant="outline" size="sm" onClick={refresh}>Reintentar</Button>}
            />
          ) : (rows ?? []).length === 0 ? (
            <EmptyState
              title="Sin usuarios"
              description="Crea el primer usuario para acceder al sistema."
              action={<Button onClick={() => navigate('/usuarios/new')}>Crear usuario</Button>}
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
                onRowClick={(r) => navigate(`/usuarios/${r.id}`)}
                rowActions={rowActions}
                density={density}
                sort={sort}
                onSortChange={setSort}
                columns={[
                  {
                    header: 'USUARIO',
                    sortKey: 'username',
                    className: 'font-medium',
                    cell: (r) => {
                      const self = isSelf(r);
                      return (
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                              self
                                ? 'bg-accent-soft text-accent-soft-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                            aria-hidden
                          >
                            {getInitials(r.username || r.email || '?')}
                          </span>
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="group/copy flex items-center gap-1.5 min-w-0">
                              <span className="truncate">{r.username}</span>
                              {self && (
                                <Badge
                                  variant="brand"
                                  className="h-4 px-1.5 text-[9px] shrink-0"
                                >
                                  Tú
                                </Badge>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copiarTexto(r.username, 'Usuario');
                                }}
                                className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                                title="Copiar nombre de usuario"
                                aria-label="Copiar usuario"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                              <AtSign className="h-2.5 w-2.5" />
                              {r.email}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    header: 'EMAIL',
                    sortKey: 'email',
                    cell: (r) => (
                      <div className="group/copy inline-flex items-center gap-1.5 min-w-0">
                        <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs truncate">{r.email}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copiarTexto(r.email, 'Email');
                          }}
                          className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                          title="Copiar email"
                          aria-label="Copiar email"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    ),
                  },
                  {
                    header: 'ROL',
                    sortKey: 'rol',
                    className: 'w-[140px]',
                    cell: (r) =>
                      r.rol?.nombre ? (
                        <Badge variant="outline" className={`text-[10px] ${rolBadgeClass(r.rol.nombre)}`}>
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          {r.rol.nombre}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      ),
                  },
                  {
                    header: 'ESTADO',
                    sortKey: 'estado',
                    className: 'w-[110px]',
                    cell: (r) =>
                      r.activo ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-2.5 w-2.5" />
                          Inactivo
                        </Badge>
                      ),
                  },
                  {
                    header: 'SHIPPER',
                    sortKey: 'shipper',
                    cell: (r) => {
                      if (!r.shipper?.nombre) {
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/usuarios/${r.id}/edit#shipper`);
                            }}
                            className="text-xs text-muted-foreground hover:text-accent hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 rounded inline-flex items-center gap-1"
                            title="Asignar shipper a este usuario"
                          >
                            <UserPlus className="h-3 w-3" />
                            Asignar
                          </button>
                        );
                      }
                      return (
                        <div className="group/copy flex items-center gap-1.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/shippers/${r.shipper!.id}`);
                            }}
                            className="inline-flex items-center gap-1.5 min-w-0 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 hover:text-accent transition-colors"
                            title={`Ver ${r.shipper.nombre}`}
                          >
                            <Truck className="h-3 w-3 text-accent shrink-0" />
                            <span className="text-xs truncate">{r.shipper.nombre}</span>
                          </button>
                          {r.shipper.codigoInterno && (
                            <>
                              <Badge
                                variant="outline"
                                className="h-4 px-1.5 text-[9px] font-mono shrink-0"
                              >
                                {r.shipper.codigoInterno}
                              </Badge>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copiarTexto(r.shipper!.codigoInterno!, 'Código de shipper');
                                }}
                                className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                                title="Copiar código de shipper"
                                aria-label="Copiar código"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </>
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
          </div>
        </PageContent>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
