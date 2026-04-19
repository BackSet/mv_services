import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Shield,
  Info,
  KeyRound,
  CheckCircle2,
  AlertCircle,
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
  createRol,
  listPermisos,
  listRoles,
  type Permiso,
} from '@/services/roles.service';
import { PermisosSelector } from '@/components/roles/PermisosSelector';
import { cn } from '@/lib/utils';

// =============================================================================
// Componente
// =============================================================================

export default function RolNewPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const [nombre, setNombre] = useState('');
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [nombresExistentes, setNombresExistentes] = useState<string[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);

  // ---------------------------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCatalogos(true);
      try {
        const [ps, rs] = await Promise.all([listPermisos(), listRoles()]);
        if (cancelled) return;
        setPermisos(ps);
        setNombresExistentes(rs.map((r) => (r.nombre ?? '').trim().toUpperCase()).filter(Boolean));
      } catch (e) {
        console.error('Error cargando catálogos', e);
        toast.error('No se pudieron cargar los permisos');
      } finally {
        if (!cancelled) setLoadingCatalogos(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
  // Dirty + beforeunload
  // ---------------------------------------------------------------------------

  const isDirty = useMemo(
    () => !!nombre.trim() || selectedIds.length > 0,
    [nombre, selectedIds],
  );

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
      setSubmitting(true);
      try {
        const creado = await createRol({ nombre: nombre.trim(), permisos: selectedPermisos });
        toast.success(`Rol "${creado.nombre}" creado`);
        navigate('/roles');
      } catch (err) {
        console.error('Error creando rol', err);
        toast.error('No se pudo crear el rol');
      } finally {
        setSubmitting(false);
      }
    },
    [isValid, nombre, selectedPermisos, navigate],
  );

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
          tryNavigateAway('/roles');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, tryNavigateAway]);

  // ---------------------------------------------------------------------------
  // Progreso
  // ---------------------------------------------------------------------------

  const progreso = useMemo(() => {
    const pasos = [
      nombre.trim().length >= 2 && !errors.nombre,
      selectedIds.length > 0,
    ];
    const ok = pasos.filter(Boolean).length;
    return Math.round((ok / pasos.length) * 100);
  }, [nombre, errors.nombre, selectedIds]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Nuevo Rol"
        icon={<Shield className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tryNavigateAway('/roles')}
              className="gap-1.5"
              title="Volver (Esc)"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button
              size="sm"
              onClick={() => submit()}
              disabled={submitting || !isValid}
              className="gap-1.5"
              title="Guardar (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
              {submitting ? 'Guardando…' : 'Crear'}
            </Button>
          </div>
        }
      >
        <form
          id="rol-new-form"
          onSubmit={submit}
          className="max-w-4xl mx-auto p-6 space-y-6 pb-32"
        >
          {/* Banner de progreso */}
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Shield className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">Crear nuevo rol</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define un nombre claro y selecciona los permisos que tendrá. Puedes ajustarlos después.
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  progreso === 100
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                    : progreso >= 50
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                    : ''
                }
              >
                {progreso === 100 ? 'Listo para guardar' : `${progreso}% completo`}
              </Badge>
            </div>
            <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ${progreso === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>

          {/* Información general */}
          <SectionCard icon={Info} iconColor="blue" title="Información general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  Nombre <span className="text-destructive">*</span>
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal">
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
                  placeholder="Ej. OPERARIO, ADMIN, SUPERVISOR"
                  autoFocus
                  autoComplete="off"
                />
                {showError('nombre') ? (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.nombre}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Convención sugerida: nombres cortos en mayúsculas (ej. <span className="font-mono">OPERARIO</span>).
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
            description="Selecciona qué acciones podrá realizar este rol en el sistema."
            right={
              <Badge
                variant="outline"
                className="text-[10px] gap-1 bg-violet-500/5 border-violet-500/30 text-violet-700 dark:text-violet-400 tabular-nums"
              >
                <KeyRound className="h-2.5 w-2.5" />
                {selectedIds.length}
              </Badge>
            }
          >
            {loadingCatalogos ? (
              <p className="text-sm text-muted-foreground">Cargando permisos…</p>
            ) : (
              <PermisosSelector
                permisos={permisos}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
              />
            )}
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
              {isValid ? (
                selectedIds.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="truncate">Sin permisos · el rol no podrá hacer nada en el sistema</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="truncate">
                      Listo · {selectedIds.length} permiso{selectedIds.length === 1 ? '' : 's'} seleccionado{selectedIds.length === 1 ? '' : 's'}
                    </span>
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="truncate">
                    {Object.keys(errors).length} campo{Object.keys(errors).length === 1 ? '' : 's'} por completar
                  </span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => tryNavigateAway('/roles')}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => submit()}
                disabled={submitting || !isValid}
                className="gap-1.5 min-w-[120px]"
              >
                <Save className="h-3.5 w-3.5" />
                {submitting ? 'Guardando…' : 'Crear rol'}
              </Button>
            </div>
          </div>
        </div>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
