import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Save, Plus, Info, Phone, MapPin } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { addShipperDireccion, addShipperTelefono, createShipper } from '@/services/shippers.service';

type TelefonoDraft = { numero: string; etiqueta?: string };
type DireccionDraft = { pais?: string; ciudad?: string; canton?: string; direccion: string; referencia?: string };

export default function ShipperNewPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ nombre: '', codigoInterno: '', nombreEncargado: '' });
  const [telefonoPrincipal, setTelefonoPrincipal] = useState('');
  const [telefonos, setTelefonos] = useState<TelefonoDraft[]>([]);
  const [direcciones, setDirecciones] = useState<DireccionDraft[]>([]);
  const [nuevoTelefono, setNuevoTelefono] = useState<TelefonoDraft>({ numero: '', etiqueta: '' });
  const [nuevaDireccion, setNuevaDireccion] = useState<DireccionDraft>({
    pais: '',
    ciudad: '',
    canton: '',
    direccion: '',
    referencia: '',
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const shipper = await createShipper({
        nombre: form.nombre,
        codigoInterno: form.codigoInterno || null,
        nombreEncargado: form.nombreEncargado || null,
      });

      const principalTrim = telefonoPrincipal.trim();
      if (principalTrim) {
        await addShipperTelefono(shipper.id, { numero: principalTrim, esPrincipal: true });
      }

      for (const t of telefonos) {
        const numero = (t.numero || '').trim();
        if (!numero) continue;
        await addShipperTelefono(shipper.id, { numero, etiqueta: t.etiqueta?.trim() || null, esPrincipal: false });
      }

      for (const d of direcciones) {
        const direccion = (d.direccion || '').trim();
        if (!direccion) continue;
        await addShipperDireccion(shipper.id, {
          pais: d.pais?.trim() || null,
          ciudad: d.ciudad?.trim() || null,
          canton: d.canton?.trim() || null,
          direccion,
          referencia: d.referencia?.trim() || null,
        });
      }

      navigate('/shippers');
    } catch (err) {
      console.error('Error creando shipper', err);
      alert('Error al crear el shipper');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Nuevo Shipper"
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/shippers')} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button size="sm" onClick={() => document.getElementById('shipper-new-form')?.requestSubmit()} disabled={submitting} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {submitting ? 'Guardando…' : 'Crear'}
            </Button>
          </div>
        }
      >
        <form id="shipper-new-form" onSubmit={submit} className="max-w-4xl mx-auto p-6 space-y-8">
          <SectionCard icon={Info} iconColor="blue" title="Datos del shipper">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre *</Label>
                <Input className="h-9" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required placeholder="Nombre del shipper" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Código interno</Label>
                <Input className="h-9" value={form.codigoInterno} onChange={(e) => setForm({ ...form, codigoInterno: e.target.value })} placeholder="Opcional" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre del encargado</Label>
                <Input className="h-9" value={form.nombreEncargado} onChange={(e) => setForm({ ...form, nombreEncargado: e.target.value })} placeholder="Opcional" />
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Phone} iconColor="green" title="Teléfonos">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Teléfono principal</Label>
                <Input className="h-9" value={telefonoPrincipal} onChange={(e) => setTelefonoPrincipal(e.target.value)} placeholder="Número principal del shipper" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Otros teléfonos (opcional)</Label>
                <div className="flex flex-wrap gap-2">
                  <Input className="h-9 min-w-[140px]" placeholder="Número" value={nuevoTelefono.numero} onChange={(e) => setNuevoTelefono({ ...nuevoTelefono, numero: e.target.value })} />
                  <Input className="h-9 min-w-[120px]" placeholder="Etiqueta (opcional)" value={nuevoTelefono.etiqueta || ''} onChange={(e) => setNuevoTelefono({ ...nuevoTelefono, etiqueta: e.target.value })} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!nuevoTelefono.numero.trim()) return;
                      setTelefonos((prev) => [...prev, { numero: nuevoTelefono.numero, etiqueta: nuevoTelefono.etiqueta }]);
                      setNuevoTelefono({ numero: '', etiqueta: '' });
                    }}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </Button>
                </div>
                {telefonos.length > 0 ? (
                  <ul className="text-sm space-y-1 mt-2">
                    {telefonos.map((t, idx) => (
                      <li key={idx} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                        <span>
                          <span className="font-medium text-foreground">{t.numero}</span>
                          {t.etiqueta ? <span className="text-muted-foreground"> · {t.etiqueta}</span> : null}
                        </span>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => setTelefonos((p) => p.filter((_, i) => i !== idx))}>
                          Quitar
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground py-1">—</p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={MapPin} iconColor="orange" title="Direcciones">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">País</Label>
                <Input className="h-9" placeholder="País" value={nuevaDireccion.pais || ''} onChange={(e) => setNuevaDireccion({ ...nuevaDireccion, pais: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ciudad</Label>
                <Input className="h-9" placeholder="Ciudad" value={nuevaDireccion.ciudad || ''} onChange={(e) => setNuevaDireccion({ ...nuevaDireccion, ciudad: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cantón</Label>
                <Input className="h-9" placeholder="Cantón" value={nuevaDireccion.canton || ''} onChange={(e) => setNuevaDireccion({ ...nuevaDireccion, canton: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Referencia</Label>
                <Input className="h-9" placeholder="Referencia" value={nuevaDireccion.referencia || ''} onChange={(e) => setNuevaDireccion({ ...nuevaDireccion, referencia: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Dirección</Label>
                <Input className="h-9" value={nuevaDireccion.direccion} onChange={(e) => setNuevaDireccion({ ...nuevaDireccion, direccion: e.target.value })} placeholder="Calle, número, etc." />
              </div>
            </div>
            <div className="mt-4 flex items-start justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!nuevaDireccion.direccion.trim()) return;
                  setDirecciones((prev) => [...prev, { ...nuevaDireccion }]);
                  setNuevaDireccion({ pais: '', ciudad: '', canton: '', direccion: '', referencia: '' });
                }}
                disabled={!nuevaDireccion.direccion.trim()}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar dirección
              </Button>
            </div>
            {direcciones.length > 0 ? (
              <ul className="space-y-2 pt-4 mt-4 border-t border-border/50">
                {direcciones.map((d, idx) => (
                  <li key={idx} className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
                    <div>
                      <div className="font-medium text-foreground text-sm">{d.direccion}</div>
                      <div className="text-xs text-muted-foreground">
                        {[d.ciudad, d.canton, d.pais].filter(Boolean).join(', ') || '—'}
                      </div>
                      {d.referencia ? <div className="text-xs italic text-muted-foreground">{d.referencia}</div> : null}
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground shrink-0" onClick={() => setDirecciones((p) => p.filter((_, i) => i !== idx))}>
                      Quitar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground py-1 mt-2">—</p>
            )}
          </SectionCard>
        </form>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
