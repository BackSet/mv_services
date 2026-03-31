import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Info, KeyRound, Pencil, Trash2, Users } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRol } from '@/hooks/useRoles';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { deleteRol } from '@/services/roles.service';
import { listUsuarios, type Usuario } from '@/services/usuarios.service';

export default function RolViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: row, loading, error } = useRol(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [roleUsers, setRoleUsers] = useState<Usuario[]>([]);

  useEffect(() => {
    if (row?.id) {
      listUsuarios()
        .then((users) => setRoleUsers(users.filter((u) => u.rol?.id === row.id)))
        .catch(() => setRoleUsers([]));
    }
  }, [row?.id]);

  return (
    <DashboardLayout>
      <DetailPageLayout
        title={row ? row.nombre : 'Rol'}
        subtitle="Detalle del rol"
        backUrl="/roles"
        actions={
          row ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/roles/${row.id}/edit`)} className="gap-1.5">
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
          entityLabel="rol"
          entityName={row?.nombre}
          loading={deleting}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deleteRol(String(id));
              navigate('/roles', { replace: true });
            } catch (e) {
              console.error('Error eliminando rol', e);
              alert('Error al eliminar el rol');
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
            }
          }}
        />

        {loading ? (
          <LoadingState label="Cargando rol..." />
        ) : error ? (
          <ErrorState title="Error al cargar rol" description={error} />
        ) : !row ? (
          <ErrorState title="No se encontró el rol" />
        ) : (
          <div className="space-y-8">
            <SectionCard icon={Info} iconColor="blue" title="Información general">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ID</span>
                  <p className="text-sm font-medium mt-1">{row.id}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre</span>
                  <p className="text-sm font-medium mt-1">{row.nombre}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={KeyRound} iconColor="violet" title="Permisos">
              {row.permisos?.length ? (
                <div className="flex flex-wrap gap-2">
                  {row.permisos.map((p) => (
                    <Badge key={p.id} variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => navigate(`/permisos/${p.id}`)}>{p.nombre}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin permisos asignados</p>
              )}
            </SectionCard>

            <SectionCard icon={Users} iconColor="amber" title="Usuarios con este rol">
              {roleUsers.length ? (
                <div className="flex flex-wrap gap-2">
                  {roleUsers.map((u) => (
                    <Badge key={u.id} variant="secondary" className="cursor-pointer hover:bg-secondary/80" onClick={() => navigate(`/usuarios/${u.id}`)}>
                      {u.username}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay usuarios con este rol</p>
              )}
            </SectionCard>
          </div>
        )}
      </DetailPageLayout>
    </DashboardLayout>
  );
}
