import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Package, Info, Globe } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createPaqueteRegistroMinimo } from '@/services/paquetes.service';
import { listShippers, type Shipper } from '@/services/shippers.service';
import { useMe } from '@/hooks/useMe';

export default function PaqueteNewPage() {
  const navigate = useNavigate();
  const { me } = useMe();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ numeroGuia: '', pesoLbs: '', pesoKgs: '', destinatario: '', ref: '', contenido: '' });
  const [shipperId, setShipperId] = useState<string>('');
  const [shippers, setShippers] = useState<Shipper[]>([]);

  const canPickShipper = me?.rol === 'ADMIN' || me?.rol === 'MV_ADMIN' || (me?.permisos?.includes('paquetes.update') ?? false);

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
    if (!form.pesoLbs && !form.pesoKgs) {
      alert('Ingresa el peso en lbs o kgs');
      return;
    }
    setSubmitting(true);
    try {
      await createPaqueteRegistroMinimo({
        numeroGuia: form.numeroGuia,
        pesoLbs: form.pesoLbs ? parseFloat(form.pesoLbs) : undefined,
        pesoKgs: form.pesoKgs ? parseFloat(form.pesoKgs) : undefined,
        destinatario: form.destinatario,
        ref: form.ref.trim() || undefined,
        contenido: form.contenido,
        shipperId: shipperId ? Number(shipperId) : undefined,
      });
      navigate('/paquetes');
    } catch (err) {
      console.error('Error creando paquete', err);
      alert('Error al crear el paquete');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Nuevo Paquete"
        icon={<Package className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/paquetes')} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button size="sm" onClick={() => document.getElementById('paquete-new-form')?.requestSubmit()} disabled={submitting} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {submitting ? 'Guardando…' : 'Crear'}
            </Button>
          </div>
        }
      >
        <form id="paquete-new-form" onSubmit={submit} className="max-w-4xl mx-auto p-6 space-y-8">
          <SectionCard icon={Info} iconColor="blue" title="Información general" description="Registro mínimo: guía, peso, destinatario y contenido.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Número de guía *</Label>
                <Input className="h-9" value={form.numeroGuia} onChange={(e) => setForm({ ...form, numeroGuia: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Peso (lbs)</Label>
                <Input
                  className="h-9"
                  type="number"
                  step="0.01"
                  value={form.pesoLbs}
                  onChange={(e) => {
                    const lbs = e.target.value;
                    const kgs = lbs ? (parseFloat(lbs) * 0.453592).toFixed(2) : '';
                    setForm({ ...form, pesoLbs: lbs, pesoKgs: kgs });
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Peso (kgs)</Label>
                <Input
                  className="h-9"
                  type="number"
                  step="0.01"
                  value={form.pesoKgs}
                  onChange={(e) => {
                    const kgs = e.target.value;
                    const lbs = kgs ? (parseFloat(kgs) / 0.453592).toFixed(2) : '';
                    setForm({ ...form, pesoKgs: kgs, pesoLbs: lbs });
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Destinatario *</Label>
                <Input className="h-9" value={form.destinatario} onChange={(e) => setForm({ ...form, destinatario: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ref (opcional)</Label>
                <Input className="h-9" value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Contenido *</Label>
                <Input className="h-9" value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} required />
              </div>
            </div>
          </SectionCard>

          {canPickShipper && (
            <SectionCard icon={Globe} iconColor="green" title="Shipper" description="Asocia el paquete a un shipper desde el registro mínimo.">
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
      </StandardPageLayout>
    </DashboardLayout>
  );
}
