import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  KeyRound,
  Info,
  Layers,
  Wand2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Copy,
  X,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/layout/KpiCard';
import { createPermiso, listPermisos, type Permiso } from '@/services/permisos.service';
import {
  accionBadgeClass,
  getAccionInfo,
  getModuloKey,
  getModuloLabel,
} from '@/lib/permisosAgrupados';

// =============================================================================
// Constantes de sugerencias
// =============================================================================

const MODULOS_SUGERIDOS = [
  'PAQUETE',
  'CONSOLIDADO',
  'SHIPPER',
  'USUARIO',
  'ROL',
  'PERMISO',
  'REPORTE',
  'ESTADO',
  'CONFIG',
  'AUDITORIA',
];

const ACCIONES_SUGERIDAS: Array<{ value: string; label: string; tone: 'create' | 'read' | 'update' | 'delete' | 'manage' | 'other' }> = [
  { value: 'CREAR', label: 'Crear', tone: 'create' },
  { value: 'LEER', label: 'Leer / Listar', tone: 'read' },
  { value: 'ACTUALIZAR', label: 'Actualizar', tone: 'update' },
  { value: 'ELIMINAR', label: 'Eliminar', tone: 'delete' },
  { value: 'ADMINISTRAR', label: 'Administrar', tone: 'manage' },
  { value: 'EXPORTAR', label: 'Exportar', tone: 'other' },
  { value: 'IMPRIMIR', label: 'Imprimir', tone: 'other' },
];

const NOMBRE_REGEX = /^[A-Z0-9_]+$/;
const NOMBRE_MIN = 3;
const NOMBRE_MAX = 60;
const DESC_MAX = 200;

// =============================================================================
// Componente
// =============================================================================

export default function PermisoNewPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [touched, setTouched] = useState<{ nombre: boolean; descripcion: boolean }>({ nombre: false, descripcion: false });
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loadingPermisos, setLoadingPermisos] = useState(true);
  const initialRef = useRef({ nombre: '', descripcion: '' });

  // Builder
  const [builderOpen, setBuilderOpen] = useState(true);
  const [moduloSel, setModuloSel] = useState('');
  const [accionSel, setAccionSel] = useState('');

  useEffect(() => {
    listPermisos()
      .then(setPermisos)
      .catch(() => setPermisos([]))
      .finally(() => setLoadingPermisos(false));
  }, []);

  const nombresExistentes = useMemo(
    () => new Set(permisos.map((p) => (p.nombre ?? '').trim().toUpperCase())),
    [permisos],
  );

  // ---------------------------------------------------------------------------
  // Validación
  // ---------------------------------------------------------------------------

  const nombreNorm = nombre.trim().toUpperCase();

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
      e.nombre = 'Ya existe un permiso con este nombre';
    }
    if (descripcion.length > DESC_MAX) {
      e.descripcion = `Máximo ${DESC_MAX} caracteres`;
    }
    return e;
  }, [nombreNorm, descripcion, nombresExistentes]);

  const isValid = Object.keys(errors).length === 0 && !!nombreNorm;
  const dirty = nombre !== initialRef.current.nombre || descripcion !== initialRef.current.descripcion;

  const moduloPreview = useMemo(() => getModuloKey(nombreNorm), [nombreNorm]);
  const accionPreview = useMemo(() => getAccionInfo(nombreNorm), [nombreNorm]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const aplicarBuilder = useCallback(() => {
    const m = moduloSel.trim().toUpperCase();
    const a = accionSel.trim().toUpperCase();
    if (!m || !a) return;
    const next = `${m}_${a}`;
    setNombre(next);
    setTouched((t) => ({ ...t, nombre: true }));
    toast.success(`Nombre generado: ${next}`);
  }, [moduloSel, accionSel]);

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
      setTouched({ nombre: true, descripcion: true });
      if (!isValid) {
        toast.error('Revisa los errores antes de continuar');
        return;
      }
      setSubmitting(true);
      try {
        const created = await createPermiso({
          nombre: nombreNorm,
          descripcion: descripcion.trim() ? descripcion.trim() : null,
        });
        toast.success(`Permiso "${created.nombre}" creado`);
        initialRef.current = { nombre, descripcion };
        navigate(`/permisos/${created.id}`);
      } catch (err) {
        console.error('Error creando permiso', err);
        toast.error('No se pudo crear el permiso');
      } finally {
        setSubmitting(false);
      }
    },
    [isValid, nombreNorm, descripcion, nombre, navigate],
  );

  const cancelar = useCallback(() => {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Salir igualmente?')) return;
    navigate('/permisos');
  }, [dirty, navigate]);

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

  const previewValido = nombreNorm && NOMBRE_REGEX.test(nombreNorm) && !nombresExistentes.has(nombreNorm);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Nuevo Permiso"
        icon={<KeyRound className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelar} className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </Button>
            <Button
              size="sm"
              onClick={() => submit()}
              disabled={submitting || !isValid}
              className="gap-1.5"
              title="Guardar (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
              {submitting ? 'Guardando…' : 'Crear permiso'}
            </Button>
          </div>
        }
      >
        <form id="permiso-new-form" onSubmit={submit} className="max-w-4xl mx-auto p-6 space-y-6 pb-32">
          {/* Banner de progreso */}
          <div
            className={`rounded-xl border p-3 flex items-start gap-3 transition-colors ${
              isValid
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
            }`}
          >
            {isValid ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            )}
            <div className="text-xs space-y-0.5 min-w-0">
              <p className={`font-medium ${isValid ? 'text-emerald-900 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-200'}`}>
                {isValid ? 'Listo para guardar' : 'Completa la información'}
              </p>
              <p className={isValid ? 'text-emerald-800 dark:text-emerald-300/90' : 'text-amber-800 dark:text-amber-300/90'}>
                {isValid
                  ? `Se creará el permiso "${nombreNorm}" en el módulo "${getModuloLabel(moduloPreview)}".`
                  : 'Define el nombre del permiso usando el constructor o escríbelo manualmente.'}
              </p>
            </div>
          </div>

          {/* Constructor */}
          <SectionCard
            icon={Wand2}
            iconColor="violet"
            title="Constructor de permisos"
            description="Combina un módulo y una acción para generar el nombre"
            right={
              <button
                type="button"
                onClick={() => setBuilderOpen((v) => !v)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                {builderOpen ? 'Ocultar' : 'Mostrar'}
              </button>
            }
          >
            {builderOpen && (
              <div className="space-y-4">
                {/* Módulos sugeridos */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                    <Layers className="h-3 w-3" />
                    Módulo
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {MODULOS_SUGERIDOS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModuloSel(m)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                          moduloSel === m
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-accent'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                    <input
                      type="text"
                      value={moduloSel && !MODULOS_SUGERIDOS.includes(moduloSel) ? moduloSel : ''}
                      onChange={(e) => setModuloSel(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                      placeholder="O escribe uno…"
                      className="h-7 px-2 rounded-md text-[11px] font-mono border border-dashed border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      maxLength={30}
                    />
                  </div>
                </div>

                {/* Acciones sugeridas */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                    <KeyRound className="h-3 w-3" />
                    Acción
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ACCIONES_SUGERIDAS.map((a) => (
                      <button
                        key={a.value}
                        type="button"
                        onClick={() => setAccionSel(a.value)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors inline-flex items-center gap-1.5 ${
                          accionSel === a.value
                            ? `${accionBadgeClass(a.tone)} ring-1 ring-current`
                            : 'border-border bg-background hover:border-primary/40 hover:bg-accent'
                        }`}
                      >
                        {a.value}
                        <span className="text-[10px] opacity-70 normal-case">({a.label})</span>
                      </button>
                    ))}
                    <input
                      type="text"
                      value={accionSel && !ACCIONES_SUGERIDAS.find((s) => s.value === accionSel) ? accionSel : ''}
                      onChange={(e) => setAccionSel(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                      placeholder="O escribe una…"
                      className="h-7 px-2 rounded-md text-[11px] font-mono border border-dashed border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      maxLength={30}
                    />
                  </div>
                </div>

                {/* Vista previa builder */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Resultado:</span>
                  <Badge
                    variant="outline"
                    className={`font-mono text-[11px] ${moduloSel && accionSel ? 'border-primary/40' : 'opacity-50'}`}
                  >
                    {moduloSel || 'MODULO'}_{accionSel || 'ACCION'}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 gap-1.5 ml-auto"
                    onClick={aplicarBuilder}
                    disabled={!moduloSel || !accionSel}
                  >
                    <Sparkles className="h-3 w-3" />
                    Usar este nombre
                  </Button>
                </div>
              </div>
            )}
          </SectionCard>

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
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  Nombre técnico *
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal">
                    {nombre.length}/{NOMBRE_MAX}
                  </span>
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      className={`h-9 font-mono uppercase pr-8 ${
                        touched.nombre && errors.nombre ? 'border-destructive focus-visible:ring-destructive/40' : ''
                      }`}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value.toUpperCase())}
                      onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
                      maxLength={NOMBRE_MAX}
                      placeholder="Ej. PAQUETE_CREAR"
                      required
                      autoFocus
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
                {nombreNorm && previewValido && (
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
                      {getModuloLabel(moduloPreview)}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${accionBadgeClass(accionPreview.tone)}`}>
                      {accionPreview.label}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  Descripción
                  <span className="text-muted-foreground/60 normal-case font-normal">(opcional)</span>
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal">
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
                  placeholder="Explica qué autoriza este permiso. Ej: Permite crear paquetes nuevos en el sistema."
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

          {/* Atajos */}
          <div className="text-[11px] text-muted-foreground text-center pt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Atajos:</span>
            <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd>
            <span>guardar</span>
            <span className="opacity-40">·</span>
            <Kbd>Esc</Kbd>
            <span>volver</span>
            {loadingPermisos && (
              <>
                <span className="opacity-40">·</span>
                <span>Validando duplicados…</span>
              </>
            )}
          </div>
        </form>

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-40">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 text-xs">
              {isValid ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-muted-foreground truncate">
                    Listo: <span className="font-mono text-foreground">{nombreNorm}</span>
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-muted-foreground truncate">
                    {errors.nombre ?? errors.descripcion ?? 'Completa los datos requeridos'}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={cancelar} className="h-8">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => submit()}
                disabled={submitting || !isValid}
                className="h-8 gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {submitting ? 'Guardando…' : 'Crear permiso'}
              </Button>
            </div>
          </div>
        </div>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
