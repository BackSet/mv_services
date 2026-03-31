import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { User, Shield, Pencil, Trash2, Truck } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { useUsuario } from '@/hooks/useUsuarios';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { deleteUsuario } from '@/services/usuarios.service';

export default function UsuarioViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: row, loading, error } = useUsuario(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <DashboardLayout>
      <DetailPageLayout
        title={row ? row.username : 'Usuario'}
        subtitle={row ? `ID: #${row.id}` : undefined}
        backUrl="/usuarios"
        status={row ? { label: row.activo ? 'Activo' : 'Inactivo', variant: row.activo ? 'active' : 'inactive' } : undefined}
        actions={
          row ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/usuarios/${row.id}/edit`)} className="gap-1.5">
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
          entityLabel="usuario"
          entityName={row ? `${row.username} (${row.email})` : null}
          loading={deleting}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deleteUsuario(String(id));
              navigate('/usuarios', { replace: true });
            } catch (e) {
              console.error('Error eliminando usuario', e);
              alert('Error al eliminar el usuario');
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
            }
          }}
        />

        {loading ? (
          <LoadingState label="Cargando usuario..." />
        ) : error ? (
          <ErrorState title="Error al cargar usuario" description={error} />
        ) : !row ? (
          <ErrorState title="No se encontró el usuario" />
        ) : (
          <div className="space-y-8">
            <SectionCard icon={User} iconColor="blue" title="Información personal">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Usuario</span>
                  <p className="text-sm font-medium mt-1">{row.username}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
                  <p className="text-sm font-medium mt-1">{row.email}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rol</span>
                  <p className="text-sm font-medium mt-1">{row.rol?.nombre ?? '—'}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Shield} iconColor="green" title="Estado de cuenta">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Estado</span>
                <p className={`text-sm font-medium mt-1 ${row.activo ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {row.activo ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            </SectionCard>

            <SectionCard icon={Truck} iconColor="orange" title="Shipper asociado">
              {row.shipper ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre</span>
                    <p className="text-sm font-medium mt-1">{row.shipper.nombre}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Código interno</span>
                    <p className="text-sm font-medium mt-1">{row.shipper.codigoInterno || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Encargado</span>
                    <p className="text-sm font-medium mt-1">{row.shipper.nombreEncargado || '—'}</p>
                  </div>
                  <div className="md:col-span-3">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/shippers/${row.shipper!.id}`)}>
                      <Truck className="h-3.5 w-3.5" />
                      Ver shipper
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Este usuario no tiene shipper asociado.</p>
              )}
            </SectionCard>
          </div>
        )}
      </DetailPageLayout>
    </DashboardLayout>
  );
}
