import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
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
import { useUsuariosList } from '@/hooks/useUsuarios';
import { deleteUsuario } from '@/services/usuarios.service';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import type { Usuario } from '@/services/usuarios.service';

const PAGE_SIZE = 20;

export default function UsuariosListPage() {
  const navigate = useNavigate();
  const { data: rows, loading, error, refresh } = useUsuariosList();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.username?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.rol?.nombre?.toLowerCase().includes(q) ||
        r.shipper?.nombre?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const rowActions = (r: Usuario): NotionTableAction<Usuario>[] => [
    { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/usuarios/${r.id}`) },
    { label: 'Editar', icon: Pencil, onClick: () => navigate(`/usuarios/${r.id}/edit`) },
    { label: 'Eliminar', icon: Trash2, onClick: () => setDeleteId(r.id), destructive: true },
  ];

  const usuarioToDelete = deleteId != null ? rows?.find((u) => u.id === deleteId) : null;

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Usuarios"
        icon={<Users className="h-4 w-4" />}
        actions={
          <Button size="sm" onClick={() => navigate('/usuarios/new')} className="gap-1.5 h-8 shadow-sm text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nuevo Usuario
          </Button>
        }
      >
        <ConfirmDeleteDialog
          open={deleteId != null}
          onOpenChange={(open) => !deleting && !open && setDeleteId(null)}
          entityLabel="usuario"
          entityName={usuarioToDelete ? `${usuarioToDelete.username} (${usuarioToDelete.email})` : null}
          loading={deleting}
          onConfirm={async () => {
            if (deleteId == null) return;
            setDeleting(true);
            try {
              await deleteUsuario(deleteId);
              setDeleteId(null);
              refresh();
            } catch (e) {
              console.error('Error eliminando usuario', e);
              alert('Error al eliminar el usuario');
            } finally {
              setDeleting(false);
            }
          }}
        />

        <div className="space-y-4 py-4">
          <ListToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            searchPlaceholder="Buscar por nombre, email, rol, shipper..."
          />

          {loading ? (
            <LoadingState label="Cargando usuarios..." />
          ) : error ? (
            <ErrorState
              title="Error al cargar usuarios"
              description={error}
              action={<Button variant="outline" size="sm" onClick={refresh}>Reintentar</Button>}
            />
          ) : filtered.length === 0 && !search ? (
            <EmptyState
              title="Sin usuarios"
              description="Crea el primer usuario para acceder al sistema."
              action={<Button onClick={() => navigate('/usuarios/new')}>Crear usuario</Button>}
            />
          ) : (
            <>
              <NotionTable
                rows={paginatedRows}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/usuarios/${r.id}`)}
                rowActions={rowActions}
                columns={[
                  { header: 'NOMBRE', className: 'font-medium', cell: (r) => r.username },
                  { header: 'EMAIL', cell: (r) => r.email },
                  { header: 'ROL', className: 'w-[140px]', cell: (r) => r.rol?.nombre ? <Badge variant="secondary">{r.rol.nombre}</Badge> : <span className="text-muted-foreground">—</span> },
                  { header: 'SHIPPER', cell: (r) => r.shipper?.nombre || <span className="text-muted-foreground">—</span> },
                  {
                    header: 'ESTADO',
                    className: 'w-[120px]',
                    cell: (r) => (
                      <Badge
                        variant="outline"
                        className={r.activo ? 'bg-success/10 text-success border-success/20' : 'bg-muted/40 text-muted-foreground border-border/50'}
                      >
                        {r.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
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
