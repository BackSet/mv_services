import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Info, Phone, MapPin, Pencil, Trash2, User } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShipper } from '@/hooks/useShippers';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { deleteShipper } from '@/services/shippers.service';
import { getUsuarioByShipperId, type Usuario } from '@/services/usuarios.service';

export default function ShipperViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: row, loading, error } = useShipper(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkedUser, setLinkedUser] = useState<Usuario | null>(null);

  useEffect(() => {
    if (row?.id) {
      getUsuarioByShipperId(row.id).then(setLinkedUser);
    }
  }, [row?.id]);

  return (
    <DashboardLayout>
      <DetailPageLayout
        title={row ? row.nombre : 'Shipper'}
        subtitle="Detalle del shipper"
        backUrl="/shippers"
        actions={
          row ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/shippers/${row.id}/edit`)} className="gap-1.5">
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
          entityLabel="shipper"
          entityName={row?.nombre}
          loading={deleting}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deleteShipper(String(id));
              navigate('/shippers', { replace: true });
            } catch (e) {
              console.error('Error eliminando shipper', e);
              alert('Error al eliminar el shipper');
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
            }
          }}
        />

        {loading ? (
          <LoadingState label="Cargando shipper..." />
        ) : error ? (
          <ErrorState title="Error al cargar shipper" description={error} />
        ) : !row ? (
          <ErrorState title="No se encontró el shipper" />
        ) : (
          <div className="space-y-8">
            <SectionCard icon={Info} iconColor="blue" title="Datos generales">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Código interno</span>
                  <p className="text-sm font-medium mt-1">{row.codigoInterno || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Encargado</span>
                  <p className="text-sm font-medium mt-1">{row.nombreEncargado || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">ID</span>
                  <p className="text-sm font-medium mt-1">{row.id}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Phone} iconColor="green" title="Teléfonos">
              {row.telefonos?.length ? (
                <div className="flex flex-wrap gap-2 items-center">
                  {row.telefonos.map((t, idx) => (
                    <span key={t.id ?? idx} className="flex items-center gap-1.5">
                      <Badge variant={t.esPrincipal ? 'default' : 'secondary'}>
                        {t.numero}
                        {t.etiqueta && !t.esPrincipal ? ` (${t.etiqueta})` : ''}
                      </Badge>
                      {t.esPrincipal ? <Badge variant="outline" className="text-xs">Principal</Badge> : null}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </SectionCard>

            <SectionCard icon={User} iconColor="violet" title="Usuario asociado">
              {linkedUser ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Username</span>
                    <p className="text-sm font-medium mt-1">{linkedUser.username}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
                    <p className="text-sm font-medium mt-1">{linkedUser.email}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Estado</span>
                    <div className="mt-1">
                      <Badge variant="outline" className={linkedUser.activo ? 'bg-success/10 text-success border-success/20' : 'bg-muted/40 text-muted-foreground border-border/50'}>
                        {linkedUser.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/usuarios/${linkedUser.id}`)}>
                      <User className="h-3.5 w-3.5" />
                      Ver usuario
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Este shipper no tiene usuario asociado.</p>
              )}
            </SectionCard>

            <SectionCard icon={MapPin} iconColor="orange" title="Direcciones">
              {row.direcciones?.length ? (
                <div className="space-y-3">
                  {row.direcciones.map((d, idx) => (
                    <div key={d.id || idx} className="rounded-xl border border-border/30 bg-background/40 p-4">
                      <p className="font-medium text-sm">{d.direccion || '—'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {[d.ciudad, d.canton, d.pais].filter(Boolean).join(', ') || '—'}
                      </p>
                      {d.referencia ? <p className="text-xs text-muted-foreground italic mt-1">{d.referencia}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </SectionCard>
          </div>
        )}
      </DetailPageLayout>
    </DashboardLayout>
  );
}
