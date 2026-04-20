import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Shield,
  Info,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Users,
  AlertTriangle,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Kbd } from '@/components/layout/KpiCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  deleteRol,
  getRol,
  listPermisos,
  listRoles,
  type Permiso,
  type Rol,
  updateRol,
} from '@/services/roles.service';
import { listUsuarios } from '@/services/usuarios.service';
import { FormPageSkeleton } from '@/components/skeletons';
import { ErrorState } from '@/components/states/ErrorState';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { PermisosSelector } from '@/components/roles/PermisosSelector';
import { cn } from '@/lib/utils';

// =============================================================================
// Componente
// =============================================================================

export default function RolEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [original, setOriginal] = useState<Rol | null>(null);
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [nombresExistentes, setNombresExistentes] = useState<string[]>([]);
  const [usuariosCount, setUsuariosCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [nombre, setNombre] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [initialNombre, setInitialNombre] = useState('');
  const [initialIds, setInitialIds] = useState<string[]>([]);

  const enUso = usuariosCount > 0;

  // ---------------------------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [rol, allPermisos, allRoles, allUsers] = await Promise.all([
          getRol(String(id)),
          listPermisos(),
          listRoles(),
          listUsuarios().catch(() => []),
        ]);
        if (cancelled) return;

        setOriginal(rol);
        setPermisos(allPermisos);

        const baseNombre = (rol.nombre ?? '').trim().toUpperCase();
        setNombresExistentes(
          allRoles
            .map((r) => (r.nombre ?? '').trim().toUpperCase())
            .filter((n) => n && n !== baseNombre),
        );

        setUsuariosCount(allUsers.filter((u) => u.rol?.id === rol.id).length);

        const ids = (rol.permisos ?? []).map((p) => String(p.id));
        const nom = rol.nombre ?? '';
        setNombre(nom);
        setSelectedIds(ids);
        setInitialNombre(nom);
        setInitialIds(ids);
      } catch (e: unknown) {
        if (cancelled) return;
        console.error('Error cargando rol', e);
        setLoadError(e instanceof Error ? e.message : 'No se pudo cargar el rol');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // ---------------------------------------------------------------------------
  // Validación
  // ---------------------------------------------------------------------------

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const v = nombre.trim();
    if (!v) e.nombre = 'El nombre es obligatorio';
    else if (v.length < 2) e.nombre = 'Mínimo 2 caracteres';
    else if (v.length > 50) e.nombre = 'Máximo 50 caracteres';
    else if (!/^[A-Za-z0-9_\- ]+$/.test(v))
      e.nombre = 'Solo letras, números, guion, guion bajo y espacios';
    else if (nombresExistentes.includes(v.toUpperCase()))
      e.nombre = 'Ya existe un rol con este nombre';
    return e;
  }, [nombre, nombresExistentes]);

  const isValid = Object.keys(errors).length === 0;
  const showError = (k: string) => touched && !!errors[k];

  // ---------------------------------------------------------------------------
  // Dirty tracking real
  // ---------------------------------------------------------------------------

  const isDirty = useMemo(() => {
    if (nombre !== initialNombre) return true;
    if (selectedIds.length !== initialIds.length) return true;
    const a = new Set(selectedIds);
    for (const id of initialIds) {
      if (!a.has(id)) return true;
    }
    return false;
  }, [nombre, selectedIds, initialNombre, initialIds]);

  useEffect(() => {
    if (!isDirty || submitting) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, submitting]);

  const tryNavigateAway = useCallback(
    (target: string) => {
      if (isDirty && !submitting && !confirm('Hay cambios sin guardar. ¿Salir igualmente?')) {
        return;
      }
      navigate(target);
    },
    [isDirty, submitting, navigate],
  );

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const selectedPermisos = useMemo(
    () => permisos.filter((p) => selectedIds.includes(String(p.id))),
    [permisos, selectedIds],
  );

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setTouched(true);
      if (!isValid) {
        toast.error('Revisa los campos marcados');
        return;
      }
      if (enUso && selectedIds.length === 0) {
        if (!confirm(
          `Este rol está asignado a ${usuariosCount} usuario${usuariosCount === 1 ? '' : 's'} y lo dejarás sin permisos. ¿Continuar?`,
        )) {
          return;
        }
      }
      setSubmitting(true);
      try {
        await updateRol(String(id), { nombre: nombre.trim(), permisos: selectedPermisos });
        toast.success('Rol actualizado');
        navigate(`/roles/${id}`);
      } catch (err) {
        console.error('Error actualizando rol', err);
        toast.error('No se pudo actualizar el rol');
      } finally {
        setSubmitting(false);
      }
    },
    [isValid, nombre, selectedPermisos, selectedIds.length, enUso, usuariosCount, id, navigate],
  );

  // ---------------------------------------------------------------------------
  // Eliminar
  // ---------------------------------------------------------------------------

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (enUso) {
      toast.error(`No se puede eliminar: hay ${usuariosCount} usuario${usuariosCount === 1 ? '' : 's'} con este rol`);
      setDeleteOpen(false);
      return;
    }
    setDeleting(true);
    try {
      await deleteRol(String(id));
      toast.success('Rol eliminado');
      navigate('/roles', { replace: true });
    } catch (e) {
      console.error('Error eliminando rol', e);
      toast.error('No se pudo eliminar el rol');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }, [id, enUso, usuariosCount, navigate]);

  // ---------------------------------------------------------------------------
  // Atajos
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (ctrlOrMeta && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          tryNavigateAway(`/roles/${id}`);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, tryNavigateAway, id]);

  // ---------------------------------------------------------------------------
  // Cambios resumen
  // ---------------------------------------------------------------------------

  const cambios = useMemo(() => {
    const initialSet = new Set(initialIds);
    const currentSet = new Set(selectedIds);
    const agregados = selectedIds.filter((x) => !initialSet.has(x)).length;
    const quitados = initialIds.filter((x) => !currentSet.has(x)).length;
    return { agregados, quitados, nombreCambio: nombre !== initialNombre };
  }, [selectedIds, initialIds, nombre, initialNombre]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Editar Rol"
        subtitle={original?.nombre ? `Modificando: ${original.nombre}` : undefined}
        icon={<Shield className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tryNavigateAway(`/roles/${id}`)}
              className="gap-1.5"
              title="Volver (Esc)"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (enUso) {
                  toast.error(`No se puede eliminar: hay ${usuariosCount} usuario${usuariosCount === 1 ? '' : 's'} con este rol`);
                  return;
                }
                setDeleteOpen(true);
              }}
              disabled={loading || enUso}
              className="gap-1.5"
              title={
                enUso
                  ? `En uso por ${usuariosCount} usuario${usuariosCount === 1 ? '' : 's'}`
                  : 'Eliminar rol'
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Eliminar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => submit()}
              disabled={submitting || loading || !isValid || !isDirty}
              className="gap-1.5"
              title="Guardar (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
              {submitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (deleting) return;
            setDeleteOpen(open);
          }}
          entityLabel="rol"
          entityName={original?.nombre}
          loading={deleting}
          onConfirm={handleDelete}
        />

        {loading ? (
          <FormPageSkeleton sections={[3, 4]} />
        ) : loadError || !original ? (
          <ErrorState
            title="No se pudo cargar el rol"
            description={loadError ?? undefined}
            action={<Button variant="outline" onClick={() => navigate('/roles')}>Volver al listado</Button>}
          />
        ) : (
          <>
            <form
              id="rol-edit-form"
              onSubmit={submit}
              className="max-w-4xl mx-auto p-6 space-y-6 pb-32"
            >
              {/* Banner identificativo */}
              <div className="rounded-xl border border-border bg-card/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-foreground">
                    <Shield className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold leading-tight truncate">
                        {original.nombre}
                      </p>
                      <Badge variant="outline" className="text-[10px] font-mono">#{original.id}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <KeyRound className="h-3 w-3" />
                        {(original.permisos ?? []).length} permiso{(original.permisos ?? []).length === 1 ? '' : 's'}
                      </span>
                      <span className="opacity-40">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {usuariosCount} usuario{usuariosCount === 1 ? '' : 's'}
                      </span>
                    </p>
                  </div>
                </div>
                {isDirty && (
                  <Badge variant="warning" className="gap-1 shrink-0">
                    <AlertCircle className="h-3 w-3" />
                    Cambios sin guardar
                  </Badge>
                )}
              </div>

              {/* Avisos contextuales */}
              {enUso && (
                <div className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-xs text-info flex items-start gap-2">
                  <Users className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      Este rol está asignado a {usuariosCount} usuario{usuariosCount === 1 ? '' : 's'}.
                    </p>
                    <p className="mt-0.5 opacity-90">
                      Cualquier cambio afectará inmediatamente a esos usuarios. No es posible eliminarlo mientras esté en uso.
                    </p>
                  </div>
                </div>
              )}

              {enUso && selectedIds.length === 0 && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Vas a guardar este rol sin permisos.</p>
                    <p className="mt-0.5 opacity-90">
                      Los {usuariosCount} usuario{usuariosCount === 1 ? '' : 's'} con este rol no podrán realizar ninguna acción.
                    </p>
                  </div>
                </div>
              )}

              {/* Información general */}
              <SectionCard icon={Info} iconColor="blue" title="Información general">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label variant="caption" className="flex items-center gap-1">
                      Nombre <span className="text-destructive">*</span>
                      <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal normal-case tracking-normal">
                        {nombre.length}/50
                      </span>
                    </Label>
                    <Input
                      className={cn(
                        'h-9 uppercase font-medium tracking-wide',
                        showError('nombre') && 'border-destructive focus-visible:ring-destructive/20',
                      )}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      onBlur={() => setTouched(true)}
                      maxLength={50}
                      autoComplete="off"
                    />
                    {showError('nombre') && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.nombre}
                      </p>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Permisos */}
              <SectionCard
                icon={KeyRound}
                iconColor="violet"
                title="Permisos del rol"
                description="Marca o desmarca los permisos. Los cambios surten efecto al guardar."
                right={
                  <div className="flex items-center gap-1.5">
                    {(cambios.agregados > 0 || cambios.quitados > 0) && (
                      <>
                        {cambios.agregados > 0 && (
                          <Badge variant="success" className="text-[10px] gap-1 tabular-nums">
                            +{cambios.agregados}
                          </Badge>
                        )}
                        {cambios.quitados > 0 && (
                          <Badge variant="destructive" className="text-[10px] gap-1 tabular-nums">
                            −{cambios.quitados}
                          </Badge>
                        )}
                      </>
                    )}
                    <Badge variant="brand" className="text-[10px] gap-1 tabular-nums">
                      <KeyRound className="h-2.5 w-2.5" />
                      {selectedIds.length}
                    </Badge>
                  </div>
                }
              >
                <PermisosSelector
                  permisos={permisos}
                  selectedIds={selectedIds}
                  onChange={setSelectedIds}
                />
              </SectionCard>

              {/* Atajos */}
              <div className="text-[11px] text-muted-foreground text-center pt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <span>Atajos:</span>
                <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd>
                <span>guardar</span>
                <span className="opacity-40">·</span>
                <Kbd>Esc</Kbd>
                <span>volver</span>
              </div>
            </form>

            {/* Footer sticky */}
            <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-6 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                  {!isDirty ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground/50" />
                      <span className="truncate">Sin cambios pendientes</span>
                    </span>
                  ) : isValid ? (
                    <span className="inline-flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="truncate">
                        Listo para guardar
                        {(cambios.agregados > 0 || cambios.quitados > 0 || cambios.nombreCambio) && (
                          <span className="ml-1 opacity-80">
                            ·{cambios.nombreCambio && ' nombre'}
                            {cambios.agregados > 0 && ` +${cambios.agregados}`}
                            {cambios.quitados > 0 && ` −${cambios.quitados}`}
                          </span>
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-warning">
                      <AlertCircle className="h-4 w-4" />
                      <span className="truncate">
                        {Object.keys(errors).length} campo{Object.keys(errors).length === 1 ? '' : 's'} por revisar
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => tryNavigateAway(`/roles/${id}`)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => submit()}
                    disabled={submitting || !isValid || !isDirty}
                    className="gap-1.5 min-w-[120px]"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {submitting ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </StandardPageLayout>
    </DashboardLayout>
  );
}
