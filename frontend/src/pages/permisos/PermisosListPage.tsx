import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
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
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import type { Permiso } from '@/services/permisos.service';
import { listPermisos, deletePermiso } from '@/services/permisos.service';

const PAGE_SIZE = 20;

export default function PermisosListPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Permiso[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      setRows(await listPermisos());
    } catch (e) {
      console.error('Error cargando permisos', e);
      setFetchError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nombre?.toLowerCase().includes(q) ||
        (r.descripcion?.toLowerCase().includes(q) ?? false)
    );
  }, [rows, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const rowActions = (r: Permiso): NotionTableAction<Permiso>[] => [
    { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/permisos/${r.id}`) },
    { label: 'Editar', icon: Pencil, onClick: () => navigate(`/permisos/${r.id}/edit`) },
    { label: 'Eliminar', icon: Trash2, onClick: () => setDeleteId(r.id), destructive: true },
  ];

  const permisoToDelete = deleteId != null ? rows.find((p) => p.id === deleteId) : null;

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Permisos"
        icon={<Key className="h-4 w-4" />}
        actions={
          <Button size="sm" onClick={() => navigate('/permisos/new')} className="gap-1.5 h-8 shadow-sm text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nuevo Permiso
          </Button>
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
              load();
            } catch (e) {
              console.error('Error eliminando permiso', e);
              alert('Error al eliminar el permiso');
            } finally {
              setDeleting(false);
            }
          }}
        />

        <div className="space-y-4 py-4">
          <ListToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            searchPlaceholder="Buscar por nombre, descripción..."
          />

          {loading ? (
            <LoadingState label="Cargando permisos..." />
          ) : fetchError ? (
            <ErrorState
              title="Error al cargar permisos"
              description={fetchError}
              action={<Button variant="outline" size="sm" onClick={load}>Reintentar</Button>}
            />
          ) : filtered.length === 0 && !search ? (
            <EmptyState
              title="Sin permisos"
              description="Crea el primer permiso para asignarlo a roles."
              action={<Button onClick={() => navigate('/permisos/new')}>Crear permiso</Button>}
            />
          ) : (
            <>
              <NotionTable
                rows={paginatedRows}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/permisos/${r.id}`)}
                rowActions={rowActions}
                columns={[
                  { header: 'NOMBRE', className: 'font-medium', cell: (r) => r.nombre },
                  {
                    header: 'DESCRIPCIÓN',
                    cell: (r) => <span className="text-muted-foreground">{r.descripcion || '—'}</span>,
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
