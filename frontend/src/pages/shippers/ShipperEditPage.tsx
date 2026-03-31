import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Building2, Info, Phone, MapPin, Pencil, Trash2, Star, Plus, X } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  getShipper,
  updateShipper,
  addShipperTelefono,
  updateShipperTelefono,
  deleteShipperTelefono,
  addShipperDireccion,
  updateShipperDireccion,
  deleteShipperDireccion,
  type Shipper,
  type Telefono,
  type DireccionShipper,
} from '@/services/shippers.service';

type TelefonoEditForm = { numero: string; etiqueta: string; esPrincipal: boolean };
type DireccionEditForm = { pais: string; ciudad: string; canton: string; direccion: string; referencia: string };

const emptyTelefono: TelefonoEditForm = { numero: '', etiqueta: '', esPrincipal: false };
const emptyDireccion: DireccionEditForm = { pais: '', ciudad: '', canton: '', direccion: '', referencia: '' };

function telefonoToForm(t: Telefono): TelefonoEditForm {
  return { numero: t.numero || '', etiqueta: t.etiqueta || '', esPrincipal: !!t.esPrincipal };
}

function direccionToForm(d: DireccionShipper): DireccionEditForm {
  return { pais: d.pais || '', ciudad: d.ciudad || '', canton: d.canton || '', direccion: d.direccion || '', referencia: d.referencia || '' };
}

export default function ShipperEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<Shipper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ nombre: '', codigoInterno: '', nombreEncargado: '' });

  const [editingTelId, setEditingTelId] = useState<number | 'new' | null>(null);
  const [telForm, setTelForm] = useState<TelefonoEditForm>({ ...emptyTelefono });

  const [editingDirId, setEditingDirId] = useState<number | 'new' | null>(null);
  const [dirForm, setDirForm] = useState<DireccionEditForm>({ ...emptyDireccion });

  const refresh = useCallback(async () => {
    if (!id) { setRow(null); setError('ID inválido.'); return; }
    const s = await getShipper(id);
    setRow(s);
    setError(null);
    setForm({ nombre: s.nombre || '', codigoInterno: s.codigoInterno || '', nombreEncargado: s.nombreEncargado || '' });
  }, [id]);

  useEffect(() => {
    (async () => {
      try { await refresh(); }
      catch { setError('No fue posible cargar los datos del shipper.'); }
      finally { setLoading(false); }
    })();
  }, [refresh]);

  const submitDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateShipper(String(id), { nombre: form.nombre, codigoInterno: form.codigoInterno || null, nombreEncargado: form.nombreEncargado || null });
      await refresh();
    } catch { alert('Error al actualizar el shipper'); }
    finally { setSubmitting(false); }
  };

  // ─── Teléfonos ───
  const startEditTel = (t: Telefono) => { if (!t.id) return; setEditingTelId(t.id); setTelForm(telefonoToForm(t)); };
  const startNewTel = () => { setEditingTelId('new'); setTelForm({ ...emptyTelefono }); };
  const cancelTel = () => { setEditingTelId(null); setTelForm({ ...emptyTelefono }); };

  const saveTel = async () => {
    if (!id || !telForm.numero.trim()) return;
    try {
      if (editingTelId === 'new') {
        await addShipperTelefono(id, { numero: telForm.numero.trim(), etiqueta: telForm.etiqueta.trim() || null, esPrincipal: telForm.esPrincipal });
      } else if (editingTelId) {
        await updateShipperTelefono(id, editingTelId, { numero: telForm.numero.trim(), etiqueta: telForm.etiqueta.trim() || null, esPrincipal: telForm.esPrincipal });
      }
      cancelTel();
      await refresh();
    } catch { alert('Error al guardar teléfono'); }
  };

  const deleteTel = async (telId: number) => {
    if (!id || !confirm('¿Eliminar este teléfono?')) return;
    try { await deleteShipperTelefono(id, telId); await refresh(); }
    catch { alert('Error al eliminar teléfono'); }
  };

  const markPrincipal = async (tel: Telefono) => {
    if (!id || !tel.id) return;
    try { await updateShipperTelefono(id, tel.id, { esPrincipal: true }); await refresh(); }
    catch { alert('Error al marcar como principal'); }
  };

  // ─── Direcciones ───
  const startEditDir = (d: DireccionShipper) => { if (!d.id) return; setEditingDirId(d.id); setDirForm(direccionToForm(d)); };
  const startNewDir = () => { setEditingDirId('new'); setDirForm({ ...emptyDireccion }); };
  const cancelDir = () => { setEditingDirId(null); setDirForm({ ...emptyDireccion }); };

  const saveDir = async () => {
    if (!id || !dirForm.direccion.trim()) { alert('La dirección es obligatoria'); return; }
    const payload = { pais: dirForm.pais.trim() || null, ciudad: dirForm.ciudad.trim() || null, canton: dirForm.canton.trim() || null, direccion: dirForm.direccion.trim(), referencia: dirForm.referencia.trim() || null };
    try {
      if (editingDirId === 'new') { await addShipperDireccion(id, payload); }
      else if (editingDirId) { await updateShipperDireccion(id, editingDirId, payload); }
      cancelDir();
      await refresh();
    } catch { alert('Error al guardar dirección'); }
  };

  const deleteDir = async (dirId: number) => {
    if (!id || !confirm('¿Eliminar esta dirección?')) return;
    try { await deleteShipperDireccion(id, dirId); await refresh(); }
    catch { alert('Error al eliminar dirección'); }
  };

  // ─── Render helpers ───
  const renderTelForm = () => (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {editingTelId === 'new' ? 'Nuevo teléfono' : 'Editar teléfono'}
        </span>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={cancelTel}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Número *</Label>
          <Input className="h-9" value={telForm.numero} onChange={(e) => setTelForm({ ...telForm, numero: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Etiqueta</Label>
          <Input className="h-9" placeholder="ej. Casa, Oficina" value={telForm.etiqueta} onChange={(e) => setTelForm({ ...telForm, etiqueta: e.target.value })} />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" className="accent-primary h-4 w-4" checked={telForm.esPrincipal} onChange={(e) => setTelForm({ ...telForm, esPrincipal: e.target.checked })} />
            Principal
          </label>
        </div>
      </div>
      <Button type="button" size="sm" onClick={saveTel} disabled={!telForm.numero.trim()} className="gap-1.5">
        <Save className="h-3.5 w-3.5" /> Guardar
      </Button>
    </div>
  );

  const renderDirForm = () => (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {editingDirId === 'new' ? 'Nueva dirección' : 'Editar dirección'}
        </span>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={cancelDir}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">País</Label>
          <Input className="h-9" value={dirForm.pais} onChange={(e) => setDirForm({ ...dirForm, pais: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ciudad</Label>
          <Input className="h-9" value={dirForm.ciudad} onChange={(e) => setDirForm({ ...dirForm, ciudad: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cantón</Label>
          <Input className="h-9" value={dirForm.canton} onChange={(e) => setDirForm({ ...dirForm, canton: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Referencia</Label>
          <Input className="h-9" value={dirForm.referencia} onChange={(e) => setDirForm({ ...dirForm, referencia: e.target.value })} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Dirección *</Label>
          <Input className="h-9" value={dirForm.direccion} onChange={(e) => setDirForm({ ...dirForm, direccion: e.target.value })} />
        </div>
      </div>
      <Button type="button" size="sm" onClick={saveDir} disabled={!dirForm.direccion.trim()} className="gap-1.5">
        <Save className="h-3.5 w-3.5" /> Guardar
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <StandardPageLayout
        title={row ? `Editar ${row.nombre}` : 'Editar Shipper'}
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/shippers/${id}`)} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button size="sm" onClick={() => document.getElementById('shipper-edit-form')?.requestSubmit()} disabled={submitting} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {submitting ? 'Guardando…' : 'Guardar datos'}
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="text-sm text-muted-foreground p-6">Cargando…</div>
        ) : error ? (
          <div className="text-sm text-destructive p-6">{error}</div>
        ) : !row ? (
          <div className="text-sm text-muted-foreground p-6">No se encontró el shipper.</div>
        ) : (
          <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* ─── Datos generales ─── */}
            <form id="shipper-edit-form" onSubmit={submitDatos}>
              <SectionCard icon={Info} iconColor="blue" title="Datos del shipper">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre *</Label>
                    <Input className="h-9" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Código interno</Label>
                    <Input className="h-9" value={form.codigoInterno} onChange={(e) => setForm({ ...form, codigoInterno: e.target.value })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre del encargado</Label>
                    <Input className="h-9" value={form.nombreEncargado} onChange={(e) => setForm({ ...form, nombreEncargado: e.target.value })} />
                  </div>
                </div>
              </SectionCard>
            </form>

            {/* ─── Teléfonos ─── */}
            <SectionCard icon={Phone} iconColor="green" title="Teléfonos">
              {row.telefonos?.length ? (
                <div className="space-y-2 mb-4">
                  {row.telefonos.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/30 bg-background/40 px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm truncate">{t.numero}</span>
                        {t.etiqueta ? <Badge variant="secondary" className="text-xs shrink-0">{t.etiqueta}</Badge> : null}
                        {t.esPrincipal ? <Badge variant="default" className="text-xs shrink-0">Principal</Badge> : null}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {!t.esPrincipal && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Marcar como principal" onClick={() => markPrincipal(t)}>
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditTel(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => t.id && deleteTel(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Sin teléfonos registrados.</p>
              )}

              {editingTelId !== null ? renderTelForm() : (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={startNewTel}>
                  <Plus className="h-3.5 w-3.5" /> Agregar teléfono
                </Button>
              )}
            </SectionCard>

            {/* ─── Direcciones ─── */}
            <SectionCard icon={MapPin} iconColor="orange" title="Direcciones">
              {row.direcciones?.length ? (
                <div className="space-y-2 mb-4">
                  {row.direcciones.map((d) => (
                    <div key={d.id} className="flex items-start justify-between rounded-lg border border-border/30 bg-background/40 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{d.direccion || '—'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[d.ciudad, d.canton, d.pais].filter(Boolean).join(', ') || '—'}
                        </p>
                        {d.referencia ? <p className="text-xs text-muted-foreground italic mt-0.5">{d.referencia}</p> : null}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditDir(d)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => d.id && deleteDir(d.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Sin direcciones registradas.</p>
              )}

              {editingDirId !== null ? renderDirForm() : (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={startNewDir}>
                  <Plus className="h-3.5 w-3.5" /> Agregar dirección
                </Button>
              )}
            </SectionCard>
          </div>
        )}
      </StandardPageLayout>
    </DashboardLayout>
  );
}
