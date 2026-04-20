import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Package, Info, Globe, RotateCcw, AlertCircle, CheckCircle2, Weight, Loader2, Sparkles, ClipboardPaste, Wand2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  createPaqueteRegistroMinimo,
  getPaqueteByNumeroGuia,
} from '@/services/paquetes.service';
import { listShippers, type Shipper } from '@/services/shippers.service';
import { ShipperCombobox } from '@/components/shipper/ShipperCombobox';
import { useMe } from '@/hooks/useMe';
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

const EMPTY_FORM: FormState = {
  numeroGuia: '',
  pesoLbs: '',
  destinatario: '',
  ref: '',
  contenido: '',
};

const LAST_SHIPPER_KEY = 'paquetes:new:lastShipperId:v1';

function generarGuiaSugerida(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `MV-${yyyy}${mm}${dd}-${rand}`;
}


export default function PaqueteNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { me } = useMe();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [shipperId, setShipperId] = useState<string>('');
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [touched, setTouched] = useState<Record<keyof FormState, boolean>>({
    numeroGuia: false,
    pesoLbs: false,
    destinatario: false,
    ref: false,
    contenido: false,
  });
  const [createAnother, setCreateAnother] = useState(false);
  const [duplicate, setDuplicate] = useState<{ checking: boolean; existing: { id: number; numeroGuia: string } | null }>({
    checking: false,
    existing: null,
  });
  const guiaInputRef = useRef<HTMLInputElement | null>(null);

  // SHIPPER no puede elegir shipper (siempre es el suyo). Operario/Admin con permiso sí.
  const canPickShipper = me?.rol !== 'SHIPPER' && (me?.permisos?.includes('paquetes.update') ?? false);

  useEffect(() => {
    if (!canPickShipper) return;
    (async () => {
      try {
        const list = await listShippers();
        setShippers(list);
        if (typeof window !== 'undefined' && !shipperId) {
          const last = window.localStorage.getItem(LAST_SHIPPER_KEY);
          if (last && list.some((s) => String(s.id) === last)) {
            setShipperId(last);
          }
        }
      } catch {
        setShippers([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canPickShipper]);

  useEffect(() => {
    guiaInputRef.current?.focus();
  }, []);

  // Prefill desde query params (?destinatario=...&contenido=...&shipperId=...) al duplicar
  useEffect(() => {
    const dest = searchParams.get('destinatario');
    const cont = searchParams.get('contenido');
    const sid = searchParams.get('shipperId');
    if (dest || cont) {
      setForm((f) => ({
        ...f,
        destinatario: dest ?? f.destinatario,
        contenido: cont ?? f.contenido,
      }));
      toast.info('Datos copiados del paquete original. Ajusta lo que necesites.');
    }
    if (sid) setShipperId(sid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Verificar duplicado de guía con debounce
  useEffect(() => {
    const numero = form.numeroGuia.trim();
    if (numero.length < 3) {
      setDuplicate({ checking: false, existing: null });
      return;
    }
    let cancelled = false;
    setDuplicate((d) => ({ ...d, checking: true }));
    const t = window.setTimeout(async () => {
      try {
        const existing = await getPaqueteByNumeroGuia(numero);
        if (cancelled) return;
        setDuplicate({
          checking: false,
          existing: existing ? { id: existing.id, numeroGuia: existing.numeroGuia } : null,
        });
      } catch {
        if (!cancelled) setDuplicate({ checking: false, existing: null });
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [form.numeroGuia]);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.numeroGuia.trim()) e.numeroGuia = 'Requerido';
    else if (form.numeroGuia.trim().length < 3) e.numeroGuia = 'Mínimo 3 caracteres';
    if (!form.destinatario.trim()) e.destinatario = 'Requerido';
    if (!form.contenido.trim()) e.contenido = 'Requerido';
    if (!form.pesoLbs.trim()) e.pesoLbs = 'Requerido';
    else if (!Number.isFinite(parseFloat(form.pesoLbs)) || parseFloat(form.pesoLbs) <= 0) {
      e.pesoLbs = 'Debe ser mayor a 0';
    }
    return e;
  }, [form]);

  const isDirty = useMemo(() => {
    return (
      form.numeroGuia !== '' ||
      form.pesoLbs !== '' ||
      form.destinatario !== '' ||
      form.ref !== '' ||
      form.contenido !== '' ||
      shipperId !== ''
    );
  }, [form, shipperId]);

  const isValid = Object.keys(errors).length === 0 && !duplicate.existing;
  const requiredFilled = (['numeroGuia', 'destinatario', 'contenido', 'pesoLbs'] as const)
    .filter((k) => form[k].trim() !== '').length;
  const progress = Math.round((requiredFilled / 4) * 100);

  // Aviso de cambios sin guardar
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

  const resetForm = (keepShipper = true) => {
    setForm(EMPTY_FORM);
    if (!keepShipper) setShipperId('');
    setTouched({
      numeroGuia: false,
      pesoLbs: false,
      destinatario: false,
      ref: false,
      contenido: false,
    });
    setDuplicate({ checking: false, existing: null });
    guiaInputRef.current?.focus();
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setAllTouched();
    if (!isValid) {
      toast.error('Revisa los campos marcados antes de continuar.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPaqueteRegistroMinimo({
        numeroGuia: form.numeroGuia.trim(),
        pesoLbs: form.pesoLbs ? parseFloat(form.pesoLbs) : undefined,
        destinatario: form.destinatario.trim(),
        ref: form.ref.trim() || undefined,
        contenido: form.contenido.trim(),
        shipperId: shipperId ? Number(shipperId) : undefined,
      });
      if (typeof window !== 'undefined' && shipperId) {
        try { window.localStorage.setItem(LAST_SHIPPER_KEY, shipperId); } catch { /* ignore */ }
      }
      toast.success(`Paquete ${created.numeroGuia} creado correctamente.`, {
        action: {
          label: 'Ver',
          onClick: () => navigate(`/paquetes/${created.id}`),
        },
      });
      if (createAnother) {
        resetForm();
      } else {
        navigate('/paquetes');
      }
    } catch (err: unknown) {
      console.error('Error creando paquete', err);
      let msg = 'No se pudo crear el paquete.';
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

  // Atajos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!submitting) submit();
      } else if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        const isEditable =
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA' ||
          target?.tagName === 'SELECT' ||
          (target?.isContentEditable ?? false);
        if (!isEditable) handleVolver();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitting, isValid, form, shipperId, createAnother]);

  const handleVolver = () => {
    if (isDirty && !window.confirm('Tienes cambios sin guardar. ¿Salir de todos modos?')) return;
    navigate('/paquetes');
  };

  const showError = (key: keyof FormState) => touched[key] && errors[key];
  const fieldClass = (key: keyof FormState) =>
    cn('h-9', showError(key) && 'border-destructive focus-visible:ring-destructive');

  const pegarGuia = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const clean = text.trim();
      if (!clean) {
        toast.info('El portapapeles está vacío.');
        return;
      }
      setForm((f) => ({ ...f, numeroGuia: clean }));
      setTouched((t) => ({ ...t, numeroGuia: true }));
      toast.success('Guía pegada desde el portapapeles.');
    } catch {
      toast.error('No se pudo leer el portapapeles. Permite el acceso o pega manualmente.');
    }
  };

  const usarGuiaSugerida = () => {
    const sug = generarGuiaSugerida();
    setForm((f) => ({ ...f, numeroGuia: sug }));
    setTouched((t) => ({ ...t, numeroGuia: true }));
    toast.success(`Guía sugerida: ${sug}`);
  };

  const handleEnterAvanzar = (e: React.KeyboardEvent<HTMLInputElement>, nextId: string) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const next = document.getElementById(nextId) as HTMLInputElement | HTMLSelectElement | null;
    next?.focus();
    if (next instanceof HTMLInputElement) next.select?.();
  };

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Nuevo Paquete"
        icon={<Package className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleVolver} className="gap-1.5 h-8">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetForm(false)}
              disabled={!isDirty || submitting}
              className="gap-1.5 h-8 text-xs"
              title="Limpiar formulario"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar
            </Button>
            <Button
              size="sm"
              onClick={() => submit()}
              disabled={!isValid}
              loading={submitting}
              loadingText="Guardando…"
              className="gap-1.5 h-8 shadow-soft"
              title="Guardar (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
              Crear paquete
            </Button>
          </div>
        }
      >
        <form id="paquete-new-form" onSubmit={submit} className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-32">
          {/* Barra de progreso */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">Registro mínimo</span>
                <span className="text-xs text-muted-foreground">
                  {requiredFilled}/4 campos requeridos
                </span>
              </div>
              <Badge variant={isValid ? 'default' : 'secondary'} className="font-normal">
                {isValid ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                {isValid ? 'Listo para crear' : 'Faltan datos'}
              </Badge>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all ease-claude',
                  progress === 100 ? 'bg-success' : 'bg-accent',
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <SectionCard
            icon={Info}
            iconColor="blue"
            title="Información general"
            description="Identifica el paquete con guía, destinatario y contenido."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="numeroGuia" variant="form" className="flex items-center gap-1">
                    Número de guía <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={pegarGuia}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                      title="Pegar desde portapapeles"
                    >
                      <ClipboardPaste className="h-3 w-3" />
                      Pegar
                    </button>
                    <span className="text-border">·</span>
                    <button
                      type="button"
                      onClick={usarGuiaSugerida}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                      title="Generar guía con formato MV-YYYYMMDD-XXXX"
                    >
                      <Wand2 className="h-3 w-3" />
                      Sugerir
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Input
                    id="numeroGuia"
                    ref={guiaInputRef}
                    className={cn(fieldClass('numeroGuia'), 'font-mono pr-9')}
                    value={form.numeroGuia}
                    onChange={(e) => setForm({ ...form, numeroGuia: e.target.value })}
                    onBlur={() => setTouched((t) => ({ ...t, numeroGuia: true }))}
                    onKeyDown={(e) => handleEnterAvanzar(e, 'destinatario')}
                    placeholder="Ej. MV-2025-000123"
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                    {duplicate.checking
                      ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                      : duplicate.existing
                        ? <AlertCircle className="h-4 w-4 text-destructive" />
                        : form.numeroGuia.trim().length >= 3
                          ? <CheckCircle2 className="h-4 w-4 text-success" />
                          : null}
                  </span>
                </div>
                {showError('numeroGuia') && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.numeroGuia}
                  </p>
                )}
                {duplicate.existing && (
                  <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs">
                    <span className="text-destructive">
                      Ya existe un paquete con esta guía.
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => navigate(`/paquetes/${duplicate.existing!.id}`)}
                    >
                      Ver existente
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="destinatario" variant="form" className="flex items-center gap-1">
                  Destinatario <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="destinatario"
                  className={fieldClass('destinatario')}
                  value={form.destinatario}
                  onChange={(e) => setForm({ ...form, destinatario: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, destinatario: true }))}
                  onKeyDown={(e) => handleEnterAvanzar(e, 'ref')}
                  placeholder="Nombre completo"
                  required
                />
                {showError('destinatario') && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.destinatario}
                  </p>
                )}
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
                  onKeyDown={(e) => handleEnterAvanzar(e, 'contenido')}
                  placeholder="Referencia interna"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="contenido" variant="form" className="flex items-center gap-1">
                  Contenido <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contenido"
                  className={fieldClass('contenido')}
                  value={form.contenido}
                  onChange={(e) => setForm({ ...form, contenido: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, contenido: true }))}
                  onKeyDown={(e) => handleEnterAvanzar(e, 'pesoLbs')}
                  placeholder="Descripción breve (ej. Documentos, Ropa, Repuestos)"
                  required
                />
                {showError('contenido') && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.contenido}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={Weight}
            iconColor="amber"
            title="Peso del paquete"
            description="Ingresa el peso en libras (lb). La equivalencia en kilogramos se calcula automáticamente."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="pesoLbs" variant="form">
                  Peso (lbs) <span className="text-destructive">*</span>
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
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" /> El sistema sólo almacena el peso en libras.
                </p>
              </div>
            </div>
          </SectionCard>

          {canPickShipper && (
            <SectionCard
              icon={Globe}
              iconColor="green"
              title="Shipper"
              description="Asocia el paquete a un shipper desde el registro mínimo."
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
                    const lastSaved = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_SHIPPER_KEY) : null;
                    const isRemembered = lastSaved === shipperId;
                    return (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[11px] text-muted-foreground">
                          Encargado: {s.nombreEncargado || '—'}
                        </p>
                        {isRemembered && (
                          <Badge variant="secondary" className="font-normal text-[10px] gap-1 h-5">
                            <Sparkles className="h-2.5 w-2.5" /> Recordado del último uso
                          </Badge>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </SectionCard>
          )}
        </form>

        {/* Footer sticky con resumen y acciones */}
        <div className="sticky bottom-0 left-0 right-0 z-10 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createAnother}
                  onChange={(e) => setCreateAnother(e.target.checked)}
                  className="rounded border-input"
                />
                <span>Crear otro después de guardar</span>
              </label>
              <span className="hidden sm:inline text-border">|</span>
              <span className="hidden sm:inline">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">Ctrl</kbd>
                {' + '}
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">S</kbd>
                {' guardar · '}
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">Enter</kbd>
                {' siguiente campo · '}
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">Esc</kbd>
                {' volver'}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={handleVolver} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => submit()}
                disabled={!isValid}
                loading={submitting}
                loadingText="Guardando…"
                className="gap-1.5 shadow-soft"
              >
                <Save className="h-3.5 w-3.5" />
                {createAnother ? 'Crear y otro' : 'Crear paquete'}
              </Button>
            </div>
          </div>
        </div>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
