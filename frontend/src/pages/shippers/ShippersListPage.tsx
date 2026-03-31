import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
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
import { useShippersList } from '@/hooks/useShippers';
import { deleteShipper } from '@/services/shippers.service';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import type { Shipper } from '@/services/shippers.service';

const PAGE_SIZE = 20;

export default function ShippersListPage() {
  const navigate = useNavigate();
  const { data: rows, loading, error, refresh } = useShippersList();
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
        r.nombre?.toLowerCase().includes(q) ||
        r.nombreEncargado?.toLowerCase().includes(q) ||
        r.codigoInterno?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const rowActions = (r: Shipper): NotionTableAction<Shipper>[] => [
    { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/shippers/${r.id}`) },
    { label: 'Editar', icon: Pencil, onClick: () => navigate(`/shippers/${r.id}/edit`) },
    { label: 'Eliminar', icon: Trash2, onClick: () => setDeleteId(r.id), destructive: true },
  ];

  const shipperToDelete = deleteId != null ? rows?.find((s) => s.id === deleteId) : null;

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Shippers"
        icon={<Globe className="h-4 w-4" />}
        actions={
          <Button size="sm" onClick={() => navigate('/shippers/new')} className="gap-1.5 h-8 shadow-sm text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nuevo Shipper
          </Button>
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
              refresh();
            } catch (e) {
              console.error('Error eliminando shipper', e);
              alert('Error al eliminar el shipper');
            } finally {
              setDeleting(false);
            }
          }}
        />

        <div className="space-y-4 py-4">
          <ListToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            searchPlaceholder="Buscar por nombre, encargado..."
          />

          {loading ? (
            <LoadingState label="Cargando shippers..." />
          ) : error ? (
            <ErrorState
              title="Error al cargar shippers"
              description={error}
              action={<Button variant="outline" size="sm" onClick={refresh}>Reintentar</Button>}
            />
          ) : filtered.length === 0 && !search ? (
            <EmptyState
              title="Sin shippers"
              description="Crea tu primer shipper para empezar a registrar paquetes."
              action={<Button onClick={() => navigate('/shippers/new')}>Crear shipper</Button>}
            />
          ) : (
            <>
              <NotionTable
                rows={paginatedRows}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/shippers/${r.id}`)}
                rowActions={rowActions}
                columns={[
                  { header: 'NOMBRE', className: 'font-medium', cell: (r) => r.nombre },
                  { header: 'CÓDIGO', cell: (r) => r.codigoInterno || <span className="text-muted-foreground">—</span> },
                  { header: 'ENCARGADO', cell: (r) => r.nombreEncargado || <span className="text-muted-foreground">—</span> },
                  { header: 'TELÉFONOS', className: 'w-[100px]', cell: (r) => r.telefonos?.length ?? 0 },
                  { header: 'DIRECCIONES', className: 'w-[100px]', cell: (r) => r.direcciones?.length ?? 0 },
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
