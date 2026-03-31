import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { useRolesList } from '@/hooks/useRoles';
import { deleteRol } from '@/services/roles.service';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import type { Rol } from '@/services/roles.service';

const PAGE_SIZE = 20;

export default function RolesListPage() {
  const navigate = useNavigate();
  const { data: rows, loading, error, refresh } = useRolesList();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.nombre?.toLowerCase().includes(q));
  }, [rows, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const rowActions = (r: Rol): NotionTableAction<Rol>[] => [
    { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/roles/${r.id}`) },
    { label: 'Editar', icon: Pencil, onClick: () => navigate(`/roles/${r.id}/edit`) },
    { label: 'Eliminar', icon: Trash2, onClick: () => setDeleteId(r.id), destructive: true },
  ];

  const rolToDelete = deleteId != null ? rows?.find((x) => x.id === deleteId) : null;

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Roles"
        icon={<Shield className="h-4 w-4" />}
        actions={
          <Button size="sm" onClick={() => navigate('/roles/new')} className="gap-1.5 h-8 shadow-sm text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nuevo Rol
          </Button>
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
              refresh();
            } catch (e) {
              console.error('Error eliminando rol', e);
              alert('Error al eliminar el rol');
            } finally {
              setDeleting(false);
            }
          }}
        />

        <div className="space-y-4 py-4">
          <ListToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            searchPlaceholder="Buscar por nombre..."
          />

          {loading ? (
            <LoadingState label="Cargando roles..." />
          ) : error ? (
            <ErrorState
              title="Error al cargar roles"
              description={error}
              action={<Button variant="outline" size="sm" onClick={refresh}>Reintentar</Button>}
            />
          ) : filtered.length === 0 && !search ? (
            <EmptyState
              title="Sin roles"
              description="Crea el primer rol para gestionar permisos."
              action={<Button onClick={() => navigate('/roles/new')}>Crear rol</Button>}
            />
          ) : (
            <>
              <NotionTable
                rows={paginatedRows}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/roles/${r.id}`)}
                rowActions={rowActions}
                columns={[
                  { header: 'NOMBRE', className: 'font-medium', cell: (r) => r.nombre },
                  {
                    header: 'PERMISOS',
                    cell: (r) => (
                      <div className="flex flex-wrap gap-1">
                        {r.permisos?.length ? (
                          r.permisos.slice(0, 3).map((p) => (
                            <Badge key={p.id} variant="secondary">{p.nombre}</Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        {(r.permisos?.length || 0) > 3 ? <span className="text-xs text-muted-foreground">+{(r.permisos?.length || 0) - 3}</span> : null}
                      </div>
                    ),
                  },
                ]}
              />
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
