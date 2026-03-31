import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Package, Info, Globe } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getPaquete, updatePaquete, type Paquete, type PaqueteUpdateInput } from '@/services/paquetes.service';
import { listShippers, type Shipper } from '@/services/shippers.service';
import { useMe } from '@/hooks/useMe';

export default function PaqueteEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me } = useMe();
  const [row, setRow] = useState<Paquete | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [shipperId, setShipperId] = useState<string>('');
  const [form, setForm] = useState({
    numeroGuia: '',
    pesoLbs: '',
    pesoKgs: '',
    destinatario: '',
    ref: '',
    contenido: '',
  });

  const canPickShipper = me?.rol === 'ADMIN' || me?.rol === 'MV_ADMIN' || (me?.permisos?.includes('paquetes.update') ?? false);

  useEffect(() => {
    (async () => {
      try {
        const p: Paquete = await getPaquete(String(id));
        setRow(p);
        setShipperId(p.shipper?.id != null ? String(p.shipper.id) : '');
        setForm({
          numeroGuia: p.numeroGuia || '',
          pesoLbs: p.pesoLbs != null ? String(p.pesoLbs) : '',
          pesoKgs: p.pesoKgs != null ? String(p.pesoKgs) : '',
          destinatario: p.destinatario || '',
          ref: p.ref || '',
          contenido: p.contenido || '',
        });
      } catch (e) {
        console.error('Error cargando paquete', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!canPickShipper) return;
    (async () => {
      try {
        setShippers(await listShippers());
      } catch {
        setShippers([]);
      }
    })();
  }, [canPickShipper]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: PaqueteUpdateInput = {
        numeroGuia: form.numeroGuia,
        contenido: form.contenido || null,
        destinatario: form.destinatario || null,
        ref: form.ref.trim() || null,
      };
      if (form.pesoLbs) payload.pesoLbs = parseFloat(form.pesoLbs);
      if (form.pesoKgs) payload.pesoKgs = parseFloat(form.pesoKgs);
      if (canPickShipper && shipperId) payload.shipper = { id: Number(shipperId) };
      await updatePaquete(String(id), payload);
      navigate(`/paquetes/${id}`);
    } catch (e) {
      console.error('Error actualizando paquete', e);
      alert('Error al actualizar el paquete');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <StandardPageLayout
        title={row ? `Editar ${row.numeroGuia}` : 'Editar Paquete'}
        icon={<Package className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/paquetes/${id}`)} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button size="sm" onClick={() => document.getElementById('paquete-edit-form')?.requestSubmit()} disabled={submitting} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {submitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="text-sm text-muted-foreground p-6">Cargando…</div>
        ) : !row ? (
          <div className="text-sm text-muted-foreground p-6">No se encontró el paquete.</div>
        ) : (
          <form id="paquete-edit-form" onSubmit={submit} className="max-w-4xl mx-auto p-6 space-y-8">
            <SectionCard icon={Info} iconColor="blue" title="Información general">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Número de guía</Label>
                  <Input className="h-9" value={form.numeroGuia} onChange={(e) => setForm({ ...form, numeroGuia: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Peso (lbs)</Label>
                  <Input className="h-9" type="number" step="0.01" value={form.pesoLbs} onChange={(e) => setForm({ ...form, pesoLbs: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Peso (kgs)</Label>
                  <Input className="h-9" type="number" step="0.01" value={form.pesoKgs} onChange={(e) => setForm({ ...form, pesoKgs: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Destinatario</Label>
                  <Input className="h-9" value={form.destinatario} onChange={(e) => setForm({ ...form, destinatario: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ref (opcional)</Label>
                  <Input className="h-9" value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Contenido</Label>
                  <Input className="h-9" value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} />
                </div>
              </div>
            </SectionCard>

            {canPickShipper && (
              <SectionCard icon={Globe} iconColor="green" title="Shipper" description="Solo roles operativos pueden reasignar shipper.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Shipper (opcional)</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={shipperId}
                      onChange={(e) => setShipperId(e.target.value)}
                      disabled={submitting || shippers.length === 0}
                    >
                      <option value="">{shippers.length ? '— Sin shipper —' : 'No disponible'}</option>
                      {shippers.map((s) => (
                        <option key={s.id} value={String(s.id)}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </SectionCard>
            )}
          </form>
        )}
      </StandardPageLayout>
    </DashboardLayout>
  );
}
