import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, KeyRound, Info } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createPermiso } from '@/services/permisos.service';

export default function PermisoNewPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createPermiso({ nombre, descripcion: descripcion.trim() ? descripcion : null });
      navigate('/permisos');
    } catch (e) {
      console.error('Error creando permiso', e);
      alert('Error al crear el permiso');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Nuevo Permiso"
        icon={<KeyRound className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/permisos')} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button size="sm" onClick={() => document.getElementById('permiso-new-form')?.requestSubmit()} disabled={submitting || !nombre.trim()} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {submitting ? 'Guardando…' : 'Crear'}
            </Button>
          </div>
        }
      >
        <form id="permiso-new-form" onSubmit={submit} className="max-w-4xl mx-auto p-6 space-y-8">
          <SectionCard icon={Info} iconColor="blue" title="Información general" description="Ej: paquetes.read, usuarios.write">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre *</Label>
                <Input className="h-9" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Descripción (opcional)</Label>
                <Input className="h-9" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
              </div>
            </div>
          </SectionCard>
        </form>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
