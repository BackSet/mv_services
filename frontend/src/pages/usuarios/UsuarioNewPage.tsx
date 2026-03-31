import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Info, Truck } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createUsuario } from '@/services/usuarios.service';
import { listRoles, type Rol } from '@/services/roles.service';
import { listShippers, type Shipper } from '@/services/shippers.service';
import { cn } from '@/lib/utils';

const SHIPPER_NONE = '__none__';

export default function UsuarioNewPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', rolId: '', shipperId: '', activo: true });

  useEffect(() => {
    (async () => {
      try {
        const [rs, ss] = await Promise.all([listRoles(), listShippers()]);
        setRoles(rs);
        setShippers(ss);
      } catch (e) {
        console.error('Error cargando datos', e);
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const rol = roles.find((r) => String(r.id) === form.rolId);
      await createUsuario({
        username: form.username,
        email: form.email,
        password: form.password,
        rol,
        shipper: form.shipperId && form.shipperId !== SHIPPER_NONE ? { id: Number(form.shipperId) } : null,
        activo: form.activo,
      });
      navigate('/usuarios');
    } catch (e) {
      console.error('Error creando usuario', e);
      alert('Error al crear el usuario');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Nuevo Usuario"
        icon={<User className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/usuarios')} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button size="sm" type="submit" form="usuario-new-form" disabled={submitting} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {submitting ? 'Guardando…' : 'Crear'}
            </Button>
          </div>
        }
      >
        <form id="usuario-new-form" onSubmit={submit} className="max-w-4xl mx-auto p-6 space-y-8">
          <SectionCard icon={Info} iconColor="blue" title="Información general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Usuario *</Label>
                <Input className="h-9" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email *</Label>
                <Input className="h-9" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Contraseña *</Label>
                <Input className="h-9" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rol *</Label>
                <Select value={form.rolId} onValueChange={(v) => setForm({ ...form, rolId: v })} required>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activo-new"
                    checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    className={cn('h-4 w-4 rounded border-border bg-muted/30 focus:ring-primary/40', 'accent-primary')}
                  />
                  <Label htmlFor="activo-new" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">
                    Usuario activo
                  </Label>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Truck} iconColor="orange" title="Shipper asociado">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Shipper</Label>
                <Select value={form.shipperId || SHIPPER_NONE} onValueChange={(v) => setForm({ ...form, shipperId: v === SHIPPER_NONE ? '' : v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar shipper" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SHIPPER_NONE}>Ninguno</SelectItem>
                    {shippers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>
        </form>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
