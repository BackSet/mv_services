import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Shield, Info, KeyRound } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getRol, listPermisos, type Permiso, updateRol } from '@/services/roles.service';

export default function RolEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nombre, setNombre] = useState('');
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [rol, allPermisos] = await Promise.all([getRol(String(id)), listPermisos()]);
        setNombre(rol.nombre || '');
        setSelectedIds((rol.permisos || []).map((p) => String(p.id)));
        setPermisos(allPermisos);
      } catch (e) {
        console.error('Error cargando rol', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const selectedPermisos = useMemo(
    () => permisos.filter((p) => selectedIds.includes(String(p.id))),
    [permisos, selectedIds]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateRol(String(id), { nombre, permisos: selectedPermisos });
      navigate(`/roles/${id}`);
    } catch (e) {
      console.error('Error actualizando rol', e);
      alert('Error al actualizar el rol');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Editar Rol"
        icon={<Shield className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/roles/${id}`)} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button size="sm" onClick={() => document.getElementById('rol-edit-form')?.requestSubmit()} disabled={submitting || !nombre.trim()} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {submitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="text-sm text-muted-foreground p-6">Cargando…</div>
        ) : (
          <form id="rol-edit-form" onSubmit={submit} className="max-w-4xl mx-auto p-6 space-y-8">
            <SectionCard icon={Info} iconColor="blue" title="Información general">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre *</Label>
                  <Input className="h-9" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={KeyRound} iconColor="violet" title="Permisos" description="Selecciona los permisos que tendrá este rol.">
              {permisos.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay permisos disponibles.</div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-auto pr-2">
                  {permisos.map((p) => {
                    const checked = selectedIds.includes(String(p.id));
                    return (
                      <label key={p.id} className="flex items-start gap-3 rounded-md border border-border/50 bg-background/40 p-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedIds((prev) =>
                              prev.includes(String(p.id)) ? prev.filter((x) => x !== String(p.id)) : [...prev, String(p.id)]
                            )
                          }
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{p.nombre}</div>
                          {p.descripcion ? <div className="text-xs text-muted-foreground">{p.descripcion}</div> : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </form>
        )}
      </StandardPageLayout>
    </DashboardLayout>
  );
}
