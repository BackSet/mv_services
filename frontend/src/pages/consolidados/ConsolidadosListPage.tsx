import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Plus, Eye, Trash2 } from 'lucide-react';
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
import { useConsolidadosList } from '@/hooks/useConsolidados';
import { deleteConsolidado } from '@/services/consolidados.service';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import type { Consolidado } from '@/services/consolidados.service';
import { useMe } from '@/hooks/useMe';

const PAGE_SIZE = 20;

export default function ConsolidadosListPage() {
  const navigate = useNavigate();
  const { data: rows, loading, error, refresh } = useConsolidadosList();
  const { me } = useMe();
  const role = me?.rol ?? null;
  const canEdit = role === 'ADMIN' || role === 'MV_ADMIN' || (me?.permisos?.includes('consolidados.create') ?? false);
  const canDeleteConsolidado = role === 'ADMIN' || role === 'MV_ADMIN' || (me?.permisos?.includes('consolidados.delete') ?? false);

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
        r.numeroGuia?.toLowerCase().includes(q) ||
        String(r.id).includes(q)
    );
  }, [rows, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const rowActions = (r: Consolidado): NotionTableAction<Consolidado>[] => {
    const actions: NotionTableAction<Consolidado>[] = [
      { label: 'Ver detalles', icon: Eye, onClick: () => navigate(`/consolidados/${r.id}`) },
    ];
    if (canDeleteConsolidado) {
      actions.push({ label: 'Eliminar', icon: Trash2, onClick: () => setDeleteId(r.id), destructive: true });
    }
    return actions;
  };

  const consolidadoToDelete = deleteId != null ? rows?.find((c) => c.id === deleteId) : null;

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Consolidados"
        icon={<Boxes className="h-4 w-4" />}
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => navigate('/consolidados/new')} className="gap-1.5 h-8 shadow-sm text-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nuevo Consolidado
            </Button>
          ) : undefined
        }
      >
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
                setDeleteId(null);
                refresh();
              } catch (e) {
                console.error('Error eliminando consolidado', e);
                alert('Error al eliminar el consolidado');
              } finally {
                setDeleting(false);
              }
            }}
          />
        )}

        <div className="space-y-4 py-4">
          <ListToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            searchPlaceholder="Buscar por guía, ID..."
          />

          {loading ? (
            <LoadingState label="Cargando consolidados..." />
          ) : error ? (
            <ErrorState
              title="Error al cargar consolidados"
              description={error}
              action={<Button variant="outline" size="sm" onClick={refresh}>Reintentar</Button>}
            />
          ) : filtered.length === 0 && !search ? (
            <EmptyState
              title="Sin consolidados"
              description={canEdit ? 'Cree un consolidado desde el apartado Nuevo Consolidado.' : 'No tiene consolidados con paquetes asociados.'}
              action={canEdit ? <Button onClick={() => navigate('/consolidados/new')}>Nuevo consolidado</Button> : undefined}
            />
          ) : (
            <>
              <NotionTable
                rows={paginatedRows}
                rowKey={(r) => r.id}
                onRowClick={(r) => navigate(`/consolidados/${r.id}`)}
                rowActions={rowActions}
                columns={[
                  { header: 'ID', className: 'w-[80px] text-muted-foreground', cell: (r) => r.id },
                  { header: 'GUÍA ENVÍO', className: 'font-medium', cell: (r) => r.numeroGuia || <span className="text-muted-foreground">—</span> },
                  {
                    header: 'ESTADO',
                    className: 'w-[140px]',
                    cell: (r) => (r.estado ? <Badge variant="outline">{r.estado}</Badge> : <span className="text-muted-foreground">—</span>),
                  },
                  {
                    header: 'PAQUETES',
                    className: 'w-[100px]',
                    cell: (r) => (
                      <Badge variant="secondary">{r.paquetes?.length ?? 0}</Badge>
                    ),
                  },
                  {
                    header: 'LBS',
                    className: 'w-[90px]',
                    cell: (r) => (typeof r.pesoTotalLbs === 'number' ? r.pesoTotalLbs.toFixed(2) : <span className="text-muted-foreground">—</span>),
                  },
                  {
                    header: 'KGS',
                    className: 'w-[90px]',
                    cell: (r) => (typeof r.pesoTotalKgs === 'number' ? r.pesoTotalKgs.toFixed(2) : <span className="text-muted-foreground">—</span>),
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
