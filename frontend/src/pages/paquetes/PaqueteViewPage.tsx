import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Pencil, Trash2, Printer, Layers, Truck } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePaquete } from '@/hooks/usePaquetes';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { deletePaquete } from '@/services/paquetes.service';
import { printPackageLabels } from '@/lib/printLabels';

export default function PaqueteViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: row, loading, error } = usePaquete(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <DashboardLayout>
      <DetailPageLayout
        title={row ? row.numeroGuia : 'Paquete'}
        subtitle="Detalle del paquete"
        backUrl="/paquetes"
        actions={
          row ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  printPackageLabels([
                    {
                      numeroGuia: row.numeroGuia,
                      shipperNombre: row.shipper?.nombre ?? null,
                      shipperEncargado: row.shipper?.nombreEncargado ?? null,
                      destinatarioNombre: row.destinatario ?? null,
                      ref: row.ref ?? null,
                      pesoLbs: row.pesoLbs,
                      pesoKgs: row.pesoKgs,
                      contenido: row.contenido,
                    },
                  ], { title: `Etiqueta ${row.numeroGuia}` });
                }}
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir etiqueta
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/paquetes/${row.id}/edit`)} className="gap-1.5">
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
          entityLabel="paquete"
          entityName={row?.numeroGuia}
          loading={deleting}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deletePaquete(String(id));
              navigate('/paquetes', { replace: true });
            } catch (e) {
              console.error('Error eliminando paquete', e);
              alert('Error al eliminar el paquete');
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
            }
          }}
        />

        {loading ? (
          <LoadingState label="Cargando paquete..." />
        ) : error ? (
          <ErrorState title="Error al cargar paquete" description={error} />
        ) : !row ? (
          <ErrorState title="No se encontró el paquete" />
        ) : (
          <div className="space-y-8">
            <SectionCard icon={Package} iconColor="blue" title="Información del paquete">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Número de guía</span>
                  <p className="text-sm font-medium mt-1">{row.numeroGuia}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Destinatario</span>
                  <p className="text-sm font-medium mt-1">{row.destinatario || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Contenido</span>
                  <p className="text-sm font-medium mt-1">{row.contenido || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ref</span>
                  <p className="text-sm font-medium mt-1">{row.ref || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Peso (lbs)</span>
                  <p className="text-sm font-medium mt-1">{row.pesoLbs != null ? row.pesoLbs.toFixed(2) : '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Peso (kgs)</span>
                  <p className="text-sm font-medium mt-1">{row.pesoKgs != null ? row.pesoKgs.toFixed(2) : '—'}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Truck} iconColor="green" title="Shipper">
              {row.shipper ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre</span>
                    <p className="text-sm font-medium mt-1">{row.shipper.nombre}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Encargado</span>
                    <p className="text-sm font-medium mt-1">{row.shipper.nombreEncargado || '—'}</p>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/shippers/${row.shipper!.id}`)}>
                      <Truck className="h-3.5 w-3.5" />
                      Ver shipper
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Este paquete no tiene shipper asociado.</p>
              )}
            </SectionCard>

            <SectionCard icon={Layers} iconColor="orange" title="Consolidado">
              {row.consolidado ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Consolidado ID</span>
                    <p className="text-sm font-medium mt-1">#{row.consolidado.id}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Guía del consolidado</span>
                    <p className="text-sm font-medium mt-1">{row.consolidado.numeroGuia || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Estado</span>
                    <div className="mt-1">
                      <Badge variant={row.consolidado.estado === 'CERRADO' ? 'default' : 'secondary'}>
                        {row.consolidado.estado ?? '—'}
                      </Badge>
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => navigate(`/consolidados/${row.consolidado!.id}`)}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Ver consolidado
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Este paquete no pertenece a ningún consolidado.</p>
              )}
            </SectionCard>
          </div>
        )}
      </DetailPageLayout>
    </DashboardLayout>
  );
}
