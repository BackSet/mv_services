import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Package,
  Info,
  Globe,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Weight,
  Eye,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  getPaquete,
  updatePaquete,
  type Paquete,
  type PaqueteUpdateInput,
} from '@/services/paquetes.service';
import { listShippers, type Shipper } from '@/services/shippers.service';
import { ShipperCombobox } from '@/components/shipper/ShipperCombobox';
import { useMe } from '@/hooks/useMe';
import { FormPageSkeleton } from '@/components/skeletons';
import { ErrorState } from '@/components/states/ErrorState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LBS_TO_KGS, formatNumber as formatPesoNumber } from '@/lib/peso';

type FormState = {
  numeroGuia: string;
  pesoLbs: string;
  destinatario: string;
  ref: string;
  contenido: string;
};

function paqueteToForm(p: Paquete): FormState {
  return {
    numeroGuia: p.numeroGuia || '',
    pesoLbs: p.pesoLbs != null ? String(p.pesoLbs) : '',
    destinatario: p.destinatario || '',
    ref: p.ref || '',
    contenido: p.contenido || '',
  };
}

function formsEqual(a: FormState, b: FormState): boolean {
  return (
    a.numeroGuia === b.numeroGuia &&
    a.pesoLbs === b.pesoLbs &&
    a.destinatario === b.destinatario &&
    a.ref === b.ref &&
    a.contenido === b.contenido
  );
}

export default function PaqueteEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me } = useMe();
  const [row, setRow] = useState<Paquete | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [shipperId, setShipperId] = useState<string>('');
  const [originalShipperId, setOriginalShipperId] = useState<string>('');
  const [form, setForm] = useState<FormState>({
    numeroGuia: '',
    pesoLbs: '',
    destinatario: '',
    ref: '',
    contenido: '',
  });
  const [originalForm, setOriginalForm] = useState<FormState>(form);
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    numeroGuia: false,
    pesoLbs: false,
    destinatario: false,
    ref: false,
    contenido: false,
  });
  const guiaInputRef = useRef<HTMLInputElement | null>(null);

  const canPickShipper = me?.rol === 'ADMIN' || me?.rol === 'MV_ADMIN' || (me?.permisos?.includes('paquetes.update') ?? false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const p: Paquete = await getPaquete(String(id));
      setRow(p);
      const f = paqueteToForm(p);
      setForm(f);
      setOriginalForm(f);
      const sid = p.shipper?.id != null ? String(p.shipper.id) : '';
      setShipperId(sid);
      setOriginalShipperId(sid);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error cargando paquete';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!canPickShipper) return;
    (async () => {
      try {
        setShippers(await listShippers());
      } catch {
        setShippers([]);
      }
    })();
  }, [canPickShipper]);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.numeroGuia.trim()) e.numeroGuia = 'Requerido';
    else if (form.numeroGuia.trim().length < 3) e.numeroGuia = 'Mínimo 3 caracteres';
    if (form.pesoLbs && (!Number.isFinite(parseFloat(form.pesoLbs)) || parseFloat(form.pesoLbs) <= 0)) {
      e.pesoLbs = 'Debe ser mayor a 0';
    }
    return e;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;
  const isDirty = useMemo(
    () => !formsEqual(form, originalForm) || shipperId !== originalShipperId,
    [form, originalForm, shipperId, originalShipperId],
  );

  const changedFields = useMemo(() => {
    const changes: string[] = [];
    if (form.numeroGuia !== originalForm.numeroGuia) changes.push('Guía');
    if (form.destinatario !== originalForm.destinatario) changes.push('Destinatario');
    if (form.ref !== originalForm.ref) changes.push('Ref');
    if (form.contenido !== originalForm.contenido) changes.push('Contenido');
    if (form.pesoLbs !== originalForm.pesoLbs) changes.push('Peso');
    if (shipperId !== originalShipperId) changes.push('Shipper');
    return changes;
  }, [form, originalForm, shipperId, originalShipperId]);

  // Aviso cambios sin guardar
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const setAllTouched = () => {
    setTouched({
      numeroGuia: true,
      pesoLbs: true,
      destinatario: true,
      ref: true,
      contenido: true,
    });
  };

  const handleVolver = (target: string) => {
    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Salir de todos modos?')) return;
    navigate(target);
  };

  const submit = async (e?: React.FormEvent, opts?: { stay?: boolean }) => {
    e?.preventDefault();
    setAllTouched();
    if (!isValid) {
      toast.error('Revisa los campos marcados antes de continuar.');
      return;
    }
    if (!isDirty) {
      toast.info('No hay cambios para guardar.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: PaqueteUpdateInput = {
        numeroGuia: form.numeroGuia.trim(),
        contenido: form.contenido.trim() || null,
        destinatario: form.destinatario.trim() || null,
        ref: form.ref.trim() || null,
      };
      if (form.pesoLbs) payload.pesoLbs = parseFloat(form.pesoLbs);
      if (canPickShipper) {
        payload.shipper = shipperId ? { id: Number(shipperId) } : null;
      }
      const updated = await updatePaquete(String(id), payload);
      toast.success(`Paquete ${updated.numeroGuia} actualizado.`);
      setRow(updated);
      const f = paqueteToForm(updated);
      setForm(f);
      setOriginalForm(f);
      const sid = updated.shipper?.id != null ? String(updated.shipper.id) : '';
      setShipperId(sid);
      setOriginalShipperId(sid);
      if (!opts?.stay) {
        navigate(`/paquetes/${id}`);
      }
    } catch (err: unknown) {
      console.error('Error actualizando paquete', err);
      let msg = 'No se pudo actualizar el paquete.';
      if (err && typeof err === 'object' && 'response' in err) {
        const ax = err as { response?: { data?: { message?: string }; status?: number } };
        if (ax.response?.status === 409) msg = 'Ya existe un paquete con ese número de guía.';
        else if (ax.response?.data?.message) msg = ax.response.data.message;
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    if (!window.confirm('¿Descartar los cambios y restaurar los valores originales?')) return;
    setForm(originalForm);
    setShipperId(originalShipperId);
    setTouched({
      numeroGuia: false,
      pesoLbs: false,
      destinatario: false,
      ref: false,
      contenido: false,
    });
    toast.info('Cambios descartados.');
  };

  // Atajos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!submitting) submit(undefined, { stay: e.shiftKey });
      } else if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        const isEditable =
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA' ||
          target?.tagName === 'SELECT' ||
          (target?.isContentEditable ?? false);
        if (!isEditable) handleVolver(`/paquetes/${id}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting, isValid, isDirty, form, shipperId, id]);

  const showError = (key: keyof FormState) => touched[key] && errors[key];
  const fieldClass = (key: keyof FormState) =>
    cn('h-9', showError(key) && 'border-destructive focus-visible:ring-destructive');

  return (
    <DashboardLayout>
      <StandardPageLayout
        title={row ? `Editar ${row.numeroGuia}` : 'Editar Paquete'}
        icon={<Package className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVolver(`/paquetes/${id}`)}
              className="gap-1.5 h-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/paquetes/${id}`)}
              className="gap-1.5 h-8 text-xs"
              title="Ver detalle"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver detalle</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetForm}
              disabled={!isDirty || submitting}
              className="gap-1.5 h-8 text-xs"
              title="Descartar cambios"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Descartar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => submit()}
              disabled={!isValid || !isDirty}
              loading={submitting}
              loadingText="Guardando…"
              className="gap-1.5 h-8 shadow-soft"
              title="Guardar (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
              Guardar
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="p-6">
            <FormPageSkeleton sections={[4, 3]} />
          </div>
        ) : loadError ? (
          <div className="p-6">
            <ErrorState
              title="Error al cargar paquete"
              description={loadError}
              action={<Button variant="outline" size="sm" onClick={load}>Reintentar</Button>}
            />
          </div>
        ) : !row ? (
          <div className="p-6">
            <ErrorState title="No se encontró el paquete" />
          </div>
        ) : (
          <>
            <form id="paquete-edit-form" onSubmit={submit} className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-32">
              {/* Estado de cambios */}
              <div className={cn(
                'rounded-xl border p-3 flex items-center justify-between gap-3 flex-wrap',
                isDirty
                  ? 'border-accent/30 bg-accent-soft/60'
                  : 'border-border bg-card',
              )}>
                <div className="flex items-center gap-2 text-sm">
                  {isDirty ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-accent" />
                      <span className="font-medium">Cambios sin guardar</span>
                      <div className="flex flex-wrap gap-1">
                        {changedFields.map((c) => (
                          <Badge key={c} variant="secondary" className="font-normal text-[10px] h-5">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-muted-foreground">Sin cambios pendientes</span>
                    </>
                  )}
                </div>
                {isDirty && (
                  <span className="text-[11px] text-muted-foreground">
                    {changedFields.length} cambio{changedFields.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <SectionCard
                icon={Info}
                iconColor="blue"
                title="Información general"
                description="Datos identificadores del paquete."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="numeroGuia" variant="form" className="flex items-center gap-1">
                      Número de guía <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="numeroGuia"
                      ref={guiaInputRef}
                      className={cn(fieldClass('numeroGuia'), 'font-mono')}
                      value={form.numeroGuia}
                      onChange={(e) => setForm({ ...form, numeroGuia: e.target.value })}
                      onBlur={() => setTouched((t) => ({ ...t, numeroGuia: true }))}
                      placeholder="Ej. MV-2025-000123"
                      autoComplete="off"
                      spellCheck={false}
                      required
                    />
                    {showError('numeroGuia') && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.numeroGuia}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="destinatario" variant="form">
                      Destinatario
                    </Label>
                    <Input
                      id="destinatario"
                      className={fieldClass('destinatario')}
                      value={form.destinatario}
                      onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                      onBlur={() => setTouched((t) => ({ ...t, destinatario: true }))}
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="ref" variant="form">
                      Ref <span className="text-muted-foreground font-normal">(opcional)</span>
                    </Label>
                    <Input
                      id="ref"
                      className="h-9"
                      value={form.ref}
                      onChange={(e) => setForm({ ...form, ref: e.target.value })}
                      placeholder="Referencia interna"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="contenido" variant="form">
                      Contenido
                    </Label>
                    <Input
                      id="contenido"
                      className={fieldClass('contenido')}
                      value={form.contenido}
                      onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                      onBlur={() => setTouched((t) => ({ ...t, contenido: true }))}
                      placeholder="Descripción breve (ej. Documentos, Ropa, Repuestos)"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                icon={Weight}
                iconColor="amber"
                title="Peso del paquete"
                description="Conversión automática entre libras y kilogramos."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="pesoLbs" variant="form">
                      Peso (lbs)
                    </Label>
                    <div className="relative">
                      <Input
                        id="pesoLbs"
                        className={cn(fieldClass('pesoLbs'), 'pr-10 tabular-nums')}
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.pesoLbs}
                        onChange={(e) => setForm({ ...form, pesoLbs: e.target.value })}
                        onBlur={() => setTouched((t) => ({ ...t, pesoLbs: true }))}
                        placeholder="0.00"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium uppercase text-muted-foreground pointer-events-none">
                        lb
                      </span>
                    </div>
                    {showError('pesoLbs') && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.pesoLbs}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label variant="form">
                      Equivalencia (kgs) <span className="text-muted-foreground font-normal">(automática)</span>
                    </Label>
                    <div className="relative h-9 rounded-md border border-dashed border-border bg-muted/30 flex items-center justify-between px-3">
                      <span className="tabular-nums text-sm">
                        {form.pesoLbs && Number(form.pesoLbs) > 0
                          ? formatPesoNumber(parseFloat(form.pesoLbs) * LBS_TO_KGS)
                          : <span className="text-muted-foreground">—</span>}
                      </span>
                      <span className="text-xs font-medium uppercase text-muted-foreground">kg</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      El sistema sólo almacena el peso en libras.
                    </p>
                  </div>
                </div>
              </SectionCard>

              {canPickShipper && (
                <SectionCard
                  icon={Globe}
                  iconColor="green"
                  title="Shipper"
                  description="Solo roles operativos pueden reasignar shipper."
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="shipper" variant="form">
                        Shipper <span className="text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <ShipperCombobox
                        shippers={shippers}
                        value={shipperId === '' ? '' : Number(shipperId)}
                        onChange={(id) => setShipperId(id === '' ? '' : String(id))}
                        placeholder={shippers.length ? 'Buscar shipper…' : 'No hay shippers disponibles'}
                        disabled={submitting || shippers.length === 0}
                      />
                      {shipperId && (() => {
                        const s = shippers.find((x) => String(x.id) === shipperId);
                        if (!s) return null;
                        return (
                          <p className="text-[11px] text-muted-foreground">
                            Encargado: {s.nombreEncargado || '—'}
                          </p>
                        );
                      })()}
                      {!shipperId && originalShipperId && (
                        <p className="text-[11px] text-warning flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Vas a quitar el shipper actual.
                        </p>
                      )}
                    </div>
                  </div>
                </SectionCard>
              )}
            </form>

            {/* Footer sticky */}
            <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">Ctrl</kbd>
                  {' + '}
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">S</kbd>
                  {' guardar · '}
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">Ctrl</kbd>
                  {' + '}
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">Shift</kbd>
                  {' + '}
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">S</kbd>
                  {' guardar y seguir · '}
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">Esc</kbd>
                  {' volver'}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleVolver(`/paquetes/${id}`)} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => submit(undefined, { stay: true })}
                    disabled={submitting || !isValid || !isDirty}
                    className="gap-1.5"
                    title="Guardar y seguir editando (Ctrl+Shift+S)"
                  >
                    Guardar y seguir
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => submit()}
                    disabled={!isValid || !isDirty}
                    loading={submitting}
                    loadingText="Guardando…"
                    className="gap-1.5 shadow-soft"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Guardar y volver
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
