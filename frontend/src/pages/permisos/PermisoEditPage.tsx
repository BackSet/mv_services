import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  KeyRound,
  Info,
  Shield,
  Users,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  X,
  Layers,
  Eye,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/layout/KpiCard';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { FormPageSkeleton } from '@/components/skeletons';
import { ErrorState } from '@/components/states/ErrorState';
import {
  deletePermiso,
  getPermiso,
  listPermisos,
  updatePermiso,
  type Permiso,
} from '@/services/permisos.service';
import { listRoles, type Rol } from '@/services/roles.service';
import { listUsuarios, type Usuario } from '@/services/usuarios.service';
import {
  accionBadgeClass,
  getAccionInfo,
  getModuloKey,
  getModuloLabel,
} from '@/lib/permisosAgrupados';

const NOMBRE_REGEX = /^[A-Z0-9_]+$/;
const NOMBRE_MIN = 3;
const NOMBRE_MAX = 60;
const DESC_MAX = 200;

export default function PermisoEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [original, setOriginal] = useState<Permiso | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [touched, setTouched] = useState<{ nombre: boolean; descripcion: boolean }>({
    nombre: false,
    descripcion: false,
  });

  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initialRef = useRef({ nombre: '', descripcion: '' });

  // ---------------------------------------------------------------------------
  // Carga
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const p = await getPermiso(String(id));
        setOriginal(p);
        const nm = p.nombre || '';
        const ds = p.descripcion || '';
        setNombre(nm);
        setDescripcion(ds);
        initialRef.current = { nombre: nm, descripcion: ds };
      } catch (e) {
        console.error('Error cargando permiso', e);
        setLoadError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    listPermisos().then(setPermisos).catch(() => setPermisos([]));
    listRoles().then(setRoles).catch(() => setRoles([]));
    listUsuarios().then(setUsuarios).catch(() => setUsuarios([]));
  }, []);

  // ---------------------------------------------------------------------------
  // Datos derivados
  // ---------------------------------------------------------------------------

  const nombreNorm = nombre.trim().toUpperCase();
  const originalNombreNorm = (initialRef.current.nombre ?? '').trim().toUpperCase();

  const nombresExistentes = useMemo(() => {
    return new Set(
      permisos
        .filter((p) => p.id !== original?.id)
        .map((p) => (p.nombre ?? '').trim().toUpperCase()),
    );
  }, [permisos, original?.id]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!nombreNorm) {
      e.nombre = 'El nombre es obligatorio';
    } else if (nombreNorm.length < NOMBRE_MIN) {
      e.nombre = `Mínimo ${NOMBRE_MIN} caracteres`;
    } else if (nombreNorm.length > NOMBRE_MAX) {
      e.nombre = `Máximo ${NOMBRE_MAX} caracteres`;
    } else if (!NOMBRE_REGEX.test(nombreNorm)) {
      e.nombre = 'Solo letras mayúsculas, números y guion bajo (_)';
    } else if (nombresExistentes.has(nombreNorm)) {
      e.nombre = 'Ya existe otro permiso con este nombre';
    }
    if (descripcion.length > DESC_MAX) {
      e.descripcion = `Máximo ${DESC_MAX} caracteres`;
    }
    return e;
  }, [nombreNorm, descripcion, nombresExistentes]);

  const isValid = Object.keys(errors).length === 0 && !!nombreNorm;
  const dirty =
    nombre !== initialRef.current.nombre || descripcion !== initialRef.current.descripcion;

  const moduloOriginalKey = useMemo(() => getModuloKey(originalNombreNorm), [originalNombreNorm]);
  const moduloNuevoKey = useMemo(() => getModuloKey(nombreNorm), [nombreNorm]);
  const moduloChange = moduloOriginalKey !== moduloNuevoKey;

  const accionPreview = useMemo(() => getAccionInfo(nombreNorm), [nombreNorm]);

  const relatedRoles = useMemo(
    () => (original ? roles.filter((r) => r.permisos?.some((p) => p.id === original.id)) : []),
    [roles, original],
  );
  const relatedUsuarios = useMemo(() => {
    if (!original) return [];
    const ids = new Set(relatedRoles.map((r) => r.id));
    return usuarios.filter((u) => u.rol?.id && ids.has(u.rol.id));
  }, [original, relatedRoles, usuarios]);

  const enUso = relatedRoles.length > 0;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const copiarNombre = useCallback(async () => {
    if (!nombreNorm) return;
    try {
      await navigator.clipboard.writeText(nombreNorm);
      toast.success('Nombre copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  }, [nombreNorm]);

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!id) return;
      setTouched({ nombre: true, descripcion: true });
      if (!isValid) {
        toast.error('Revisa los errores antes de continuar');
        return;
      }
      if (!dirty) {
        toast.info('No hay cambios para guardar');
        return;
      }
      // Cambio de módulo: confirmar si está en uso
      if (moduloChange && enUso) {
        const ok = confirm(
          `Estás cambiando el módulo del permiso (de "${getModuloLabel(moduloOriginalKey)}" a "${getModuloLabel(moduloNuevoKey)}"). Esto afecta a ${relatedRoles.length} rol${relatedRoles.length === 1 ? '' : 'es'} y ${relatedUsuarios.length} usuario${relatedUsuarios.length === 1 ? '' : 's'}. ¿Continuar?`,
        );
        if (!ok) return;
      }
      setSubmitting(true);
      try {
        await updatePermiso(String(id), {
          nombre: nombreNorm,
          descripcion: descripcion.trim() ? descripcion.trim() : null,
        });
        toast.success('Permiso actualizado');
        initialRef.current = { nombre, descripcion };
        navigate(`/permisos/${id}`);
      } catch (err) {
        console.error('Error actualizando permiso', err);
        toast.error('No se pudo actualizar el permiso');
      } finally {
        setSubmitting(false);
      }
    },
    [
      id,
      isValid,
      dirty,
      moduloChange,
      enUso,
      moduloOriginalKey,
      moduloNuevoKey,
      relatedRoles.length,
      relatedUsuarios.length,
      nombreNorm,
      descripcion,
      nombre,
      navigate,
    ],
  );

  const cancelar = useCallback(() => {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Salir igualmente?')) return;
    navigate(`/permisos/${id}`);
  }, [dirty, navigate, id]);

  const revertir = useCallback(() => {
    setNombre(initialRef.current.nombre);
    setDescripcion(initialRef.current.descripcion);
    setTouched({ nombre: false, descripcion: false });
    toast.info('Cambios revertidos');
  }, []);

  const requestDelete = useCallback(() => {
    if (enUso) {
      toast.error(
        `No se puede eliminar: ${relatedRoles.length} rol${relatedRoles.length === 1 ? '' : 'es'} usa${relatedRoles.length === 1 ? '' : 'n'} este permiso`,
      );
      return;
    }
    setDeleteOpen(true);
  }, [enUso, relatedRoles.length]);

  // Atajos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        submit();
      }
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        cancelar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, cancelar]);

  // beforeunload
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <DashboardLayout>
        <StandardPageLayout title="Editar Permiso" icon={<KeyRound className="h-5 w-5" />}>
          <FormPageSkeleton sections={[3]} />
        </StandardPageLayout>
      </DashboardLayout>
    );
  }

  if (loadError || !original) {
    return (
      <DashboardLayout>
        <StandardPageLayout title="Editar Permiso" icon={<KeyRound className="h-5 w-5" />}>
          <ErrorState
            title="No se pudo cargar el permiso"
            description={loadError ?? 'Permiso no encontrado'}
            action={
              <Button variant="outline" onClick={() => navigate('/permisos')}>
                Volver a la lista
              </Button>
            }
          />
        </StandardPageLayout>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Editar Permiso"
        icon={<KeyRound className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelar} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/permisos/${id}`)}
              className="gap-1.5"
              title="Ver detalles"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={requestDelete}
              className="gap-1.5"
              title={enUso ? 'No se puede eliminar (en uso)' : 'Eliminar'}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Eliminar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => submit()}
              disabled={submitting || !isValid || !dirty}
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
          entityLabel="permiso"
          entityName={original.nombre}
          loading={deleting}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deletePermiso(String(id));
              toast.success('Permiso eliminado');
              navigate('/permisos', { replace: true });
            } catch (e) {
              console.error('Error eliminando permiso', e);
              toast.error('No se pudo eliminar el permiso');
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
            }
          }}
        />

        <form id="permiso-edit-form" onSubmit={submit} className="max-w-4xl mx-auto p-6 space-y-6 pb-32">
          {/* Banner */}
          <div
            className={`rounded-xl border p-3 flex items-start gap-3 transition-colors ease-claude shadow-soft ${
              !dirty
                ? 'border-border/50 bg-muted/30'
                : isValid
                ? 'border-warning/30 bg-warning/5'
                : 'border-destructive/30 bg-destructive/5'
            }`}
          >
            {!dirty ? (
              <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            ) : isValid ? (
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            )}
            <div className="text-xs space-y-0.5 min-w-0 flex-1">
              <p
                className={`font-medium flex items-center gap-2 flex-wrap ${
                  !dirty
                    ? 'text-muted-foreground'
                    : isValid
                    ? 'text-warning'
                    : 'text-destructive'
                }`}
              >
                {!dirty
                  ? 'Sin cambios'
                  : isValid
                  ? 'Cambios sin guardar'
                  : 'Errores en el formulario'}
                {dirty && (
                  <Badge variant="outline" className="text-[10px] gap-1 ml-2">
                    Editando
                  </Badge>
                )}
              </p>
              <p
                className={
                  !dirty
                    ? 'text-muted-foreground'
                    : isValid
                    ? 'text-warning/90'
                    : 'text-destructive/90'
                }
              >
                {!dirty
                  ? 'No has modificado nada todavía. Realiza cambios y guárdalos con Ctrl+S.'
                  : isValid
                  ? `Guarda con Ctrl+S o haz clic en "Guardar". También puedes revertir.`
                  : (errors.nombre ?? errors.descripcion ?? 'Revisa los datos.')}
              </p>
            </div>
            {dirty && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] shrink-0"
                onClick={revertir}
              >
                Revertir
              </Button>
            )}
          </div>

          {/* Aviso si está en uso */}
          {enUso && (
            <div className="rounded-xl border border-info/30 bg-info/5 p-3 flex items-start gap-3">
              <Shield className="h-4 w-4 text-info mt-0.5 shrink-0" />
              <div className="text-xs space-y-1.5 flex-1 min-w-0">
                <p className="font-medium text-info">
                  Permiso en uso
                </p>
                <p className="text-info/90">
                  Está asignado a {relatedRoles.length} rol{relatedRoles.length === 1 ? '' : 'es'} y afecta a {relatedUsuarios.length} usuario{relatedUsuarios.length === 1 ? '' : 's'}. Los cambios se aplicarán a todos.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {relatedRoles.slice(0, 5).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => navigate(`/roles/${r.id}`)}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-background border border-info/30 hover:bg-info/10 inline-flex items-center gap-1 transition-colors ease-claude"
                    >
                      <Shield className="h-2.5 w-2.5" />
                      {r.nombre}
                    </button>
                  ))}
                  {relatedRoles.length > 5 && (
                    <span className="text-[10px] text-info px-1">
                      +{relatedRoles.length - 5} más
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Aviso de cambio de módulo */}
          {dirty && moduloChange && originalNombreNorm && nombreNorm && (
            <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div className="text-xs space-y-0.5 min-w-0">
                <p className="font-medium text-warning">
                  Estás cambiando el módulo del permiso
                </p>
                <p className="text-warning/90">
                  De <span className="font-mono font-medium">{getModuloLabel(moduloOriginalKey)}</span> a{' '}
                  <span className="font-mono font-medium">{getModuloLabel(moduloNuevoKey)}</span>. Asegúrate de que esto sea intencional.
                </p>
              </div>
            </div>
          )}

          {/* Información general */}
          <SectionCard
            icon={Info}
            iconColor="blue"
            title="Información general"
            description="Nombre técnico y descripción del permiso"
          >
            <div className="space-y-5">
              {/* Nombre */}
              <div className="space-y-2">
                <Label variant="caption" className="flex items-center gap-1">
                  Nombre técnico *
                  {nombre !== initialRef.current.nombre && (
                    <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1 h-4">
                      Modificado
                    </Badge>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal normal-case tracking-normal">
                    {nombre.length}/{NOMBRE_MAX}
                  </span>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      className={`h-9 font-mono uppercase pr-8 ${
                        touched.nombre && errors.nombre
                          ? 'border-destructive focus-visible:ring-destructive/40'
                          : ''
                      }`}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value.toUpperCase())}
                      onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
                      maxLength={NOMBRE_MAX}
                      placeholder="Ej. PAQUETE_CREAR"
                      required
                    />
                    {nombre && (
                      <button
                        type="button"
                        onClick={() => setNombre('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Limpiar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {nombreNorm && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-2 shrink-0"
                      onClick={copiarNombre}
                      title="Copiar nombre"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {touched.nombre && errors.nombre ? (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {errors.nombre}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Convención: <span className="font-mono">MODULO_ACCION</span>. Solo MAYÚSCULAS, números y guion bajo (_).
                  </p>
                )}

                {/* Vista previa */}
                {nombreNorm && NOMBRE_REGEX.test(nombreNorm) && !nombresExistentes.has(nombreNorm) && (
                  <div className="mt-2 rounded-lg border border-border/50 bg-muted/30 p-3 flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Vista previa:
                    </span>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[11px] ${accionBadgeClass(accionPreview.tone)}`}
                    >
                      <KeyRound className="h-2.5 w-2.5 mr-1" />
                      {nombreNorm}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Layers className="h-2.5 w-2.5" />
                      {getModuloLabel(moduloNuevoKey)}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${accionBadgeClass(accionPreview.tone)}`}>
                      {accionPreview.label}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label variant="caption" className="flex items-center gap-1">
                  Descripción
                  <span className="text-muted-foreground/60 normal-case font-normal tracking-normal">(opcional)</span>
                  {descripcion !== initialRef.current.descripcion && (
                    <Badge variant="outline" className="ml-1 text-[9px] py-0 px-1 h-4">
                      Modificado
                    </Badge>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal normal-case tracking-normal">
                    {descripcion.length}/{DESC_MAX}
                  </span>
                </Label>
                <textarea
                  className={`flex min-h-[72px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none ${
                    touched.descripcion && errors.descripcion
                      ? 'border-destructive focus-visible:ring-destructive/40'
                      : 'border-input'
                  }`}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, descripcion: true }))}
                  maxLength={DESC_MAX + 50}
                  placeholder="Explica qué autoriza este permiso."
                  rows={3}
                />
                {touched.descripcion && errors.descripcion ? (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    {errors.descripcion}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Una buena descripción ayuda a otros administradores a entender el alcance del permiso.
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Resumen de impacto */}
          {(relatedRoles.length > 0 || relatedUsuarios.length > 0) && (
            <SectionCard
              icon={Users}
              iconColor="violet"
              title="Impacto de los cambios"
              description="Roles y usuarios afectados por este permiso"
              right={
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground tabular-nums">
                  <Badge variant="secondary">{relatedRoles.length} roles</Badge>
                  <Badge variant="secondary">{relatedUsuarios.length} usuarios</Badge>
                </div>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/50 bg-background p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                    <Shield className="h-3 w-3" />
                    Roles
                  </div>
                  {relatedRoles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {relatedRoles.slice(0, 8).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => navigate(`/roles/${r.id}`)}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-muted hover:bg-muted/70 border border-transparent hover:border-border inline-flex items-center gap-1"
                        >
                          <Shield className="h-2.5 w-2.5" />
                          {r.nombre}
                        </button>
                      ))}
                      {relatedRoles.length > 8 && (
                        <span className="text-[10px] text-muted-foreground px-1 self-center">
                          +{relatedRoles.length - 8}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Ninguno</p>
                  )}
                </div>
                <div className="rounded-lg border border-border/50 bg-background p-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Usuarios
                  </div>
                  {relatedUsuarios.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {relatedUsuarios.slice(0, 8).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => navigate(`/usuarios/${u.id}`)}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-muted hover:bg-muted/70 border border-transparent hover:border-border inline-flex items-center gap-1"
                        >
                          <Users className="h-2.5 w-2.5" />
                          {u.username}
                        </button>
                      ))}
                      {relatedUsuarios.length > 8 && (
                        <span className="text-[10px] text-muted-foreground px-1 self-center">
                          +{relatedUsuarios.length - 8}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Ninguno</p>
                  )}
                </div>
              </div>
            </SectionCard>
          )}

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

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-40">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 text-xs">
              {!dirty ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate">Sin cambios</span>
                </>
              ) : isValid ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                  <span className="text-muted-foreground truncate">
                    Cambios pendientes de guardar
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span className="text-destructive truncate">
                    {errors.nombre ?? errors.descripcion ?? 'Revisa los datos'}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {dirty && (
                <Button variant="ghost" size="sm" onClick={revertir} className="h-8">
                  Revertir
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={cancelar} className="h-8">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => submit()}
                disabled={submitting || !isValid || !dirty}
                className="h-8 gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {submitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
