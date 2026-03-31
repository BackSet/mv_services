import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Info, Pencil, Trash2, Shield } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import type { Permiso } from '@/services/permisos.service';
import { deletePermiso, getPermiso } from '@/services/permisos.service';
import { listRoles, type Rol } from '@/services/roles.service';

export default function PermisoViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Permiso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [relatedRoles, setRelatedRoles] = useState<Rol[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        setRow(await getPermiso(String(id)));
      } catch (e) {
        console.error('Error cargando permiso', e);
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (row?.id) {
      listRoles()
        .then((roles) => setRelatedRoles(roles.filter((r) => r.permisos?.some((p) => p.id === row.id))))
        .catch(() => setRelatedRoles([]));
    }
  }, [row?.id]);

  return (
    <DashboardLayout>
      <DetailPageLayout
        title={row ? row.nombre : 'Permiso'}
        subtitle="Detalle del permiso"
        backUrl="/permisos"
        actions={
          row ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/permisos/${row.id}/edit`)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </Button>
            </div>
          ) : undefined
        }
      >
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (deleting) return;
            setDeleteOpen(open);
          }}
          entityLabel="permiso"
          entityName={row?.nombre}
          loading={deleting}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deletePermiso(String(id));
              navigate('/permisos', { replace: true });
            } catch (e) {
              console.error('Error eliminando permiso', e);
              alert('Error al eliminar el permiso');
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
            }
          }}
        />

        {loading ? (
          <LoadingState label="Cargando permiso..." />
        ) : error ? (
          <ErrorState title="Error al cargar permiso" description={error} />
        ) : !row ? (
          <ErrorState title="No se encontró el permiso" />
        ) : (
          <div className="space-y-8">
            <SectionCard icon={Info} iconColor="blue" title="Información del permiso">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ID</span>
                  <p className="text-sm font-medium mt-1">{row.id}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre</span>
                  <p className="text-sm font-medium mt-1">{row.nombre}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Descripción</span>
                  <p className="text-sm font-medium mt-1">{row.descripcion || '—'}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Shield} iconColor="green" title="Roles que incluyen este permiso">
              {relatedRoles.length ? (
                <div className="flex flex-wrap gap-2">
                  {relatedRoles.map((r) => (
                    <Badge key={r.id} variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => navigate(`/roles/${r.id}`)}>
                      {r.nombre}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay roles con este permiso</p>
              )}
            </SectionCard>
          </div>
        )}
      </DetailPageLayout>
    </DashboardLayout>
  );
}
