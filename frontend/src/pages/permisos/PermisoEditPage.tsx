import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, KeyRound, Info } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getPermiso, updatePermiso } from '@/services/permisos.service';

export default function PermisoEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const p = await getPermiso(String(id));
        setNombre(p.nombre || '');
        setDescripcion(p.descripcion || '');
      } catch (e) {
        console.error('Error cargando permiso', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updatePermiso(String(id), { nombre, descripcion: descripcion.trim() ? descripcion : null });
      navigate(`/permisos/${id}`);
    } catch (e) {
      console.error('Error actualizando permiso', e);
      alert('Error al actualizar el permiso');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Editar Permiso"
        icon={<KeyRound className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/permisos/${id}`)} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button size="sm" onClick={() => document.getElementById('permiso-edit-form')?.requestSubmit()} disabled={submitting || !nombre.trim()} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {submitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="text-sm text-muted-foreground p-6">Cargando…</div>
        ) : (
          <form id="permiso-edit-form" onSubmit={submit} className="max-w-4xl mx-auto p-6 space-y-8">
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
        )}
      </StandardPageLayout>
    </DashboardLayout>
  );
}
