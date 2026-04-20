import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2,
  ArrowLeft,
  Save,
  Plus,
  Info,
  Phone,
  MapPin,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Copy,
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
  addShipperDireccion,
  addShipperTelefono,
  createShipper,
  listShippers,
} from '@/services/shippers.service';
import { generarCodigoInternoShipper } from '@/lib/codigoShipper';

// =============================================================================
// Tipos
// =============================================================================

type TelefonoDraft = { numero: string; etiqueta: string };
type DireccionDraft = {
  pais: string;
  ciudad: string;
  canton: string;
  direccion: string;
  referencia: string;
};

const emptyTelefono: TelefonoDraft = { numero: '', etiqueta: '' };
const emptyDireccion: DireccionDraft = {
  pais: '',
  ciudad: '',
  canton: '',
  direccion: '',
  referencia: '',
};

// =============================================================================
// Componente
// =============================================================================

export default function ShipperNewPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    codigoInterno: '',
    nombreEncargado: '',
  });
  const [telefonoPrincipal, setTelefonoPrincipal] = useState('');
  const [telefonos, setTelefonos] = useState<TelefonoDraft[]>([]);
  const [direcciones, setDirecciones] = useState<DireccionDraft[]>([]);
  const [nuevoTelefono, setNuevoTelefono] = useState<TelefonoDraft>({ ...emptyTelefono });
  const [nuevaDireccion, setNuevaDireccion] = useState<DireccionDraft>({ ...emptyDireccion });

  // Códigos existentes (para evitar colisiones al generar el código interno)
  const [codigosExistentes, setCodigosExistentes] = useState<string[]>([]);
  const [generandoCodigo, setGenerandoCodigo] = useState(false);
  const [codigosLoading, setCodigosLoading] = useState(false);

  // Cargamos los códigos en uso una sola vez al montar.
  useEffect(() => {
    let cancelled = false;
    setCodigosLoading(true);
    listShippers()
      .then((all) => {
        if (cancelled) return;
        setCodigosExistentes(all.map((s) => s.codigoInterno ?? '').filter(Boolean));
      })
      .catch(() => { /* no bloqueamos la página si falla */ })
      .finally(() => { if (!cancelled) setCodigosLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const generarCodigo = useCallback(async () => {
    setGenerandoCodigo(true);
    try {
      // Refrescamos los códigos por si se crearon shippers en otra pestaña.
      let codes = codigosExistentes;
      try {
        const all = await listShippers();
        codes = all.map((s) => s.codigoInterno ?? '').filter(Boolean);
        setCodigosExistentes(codes);
      } catch { /* usamos los que ya teníamos */ }

      const nuevo = generarCodigoInternoShipper(codes);
      setForm((f) => ({ ...f, codigoInterno: nuevo }));
      toast.success(`Código generado: ${nuevo}`);
    } finally {
      setGenerandoCodigo(false);
    }
  }, [codigosExistentes]);

  const copiarCodigo = useCallback(async () => {
    const v = form.codigoInterno.trim();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      toast.success('Código copiado');
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  }, [form.codigoInterno]);

  // ---------------------------------------------------------------------------
  // Validación
  // ---------------------------------------------------------------------------

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const nombre = form.nombre.trim();
    if (!nombre) e.nombre = 'El nombre es obligatorio';
    else if (nombre.length < 2) e.nombre = 'Mínimo 2 caracteres';
    return e;
  }, [form.nombre]);

  const isValid = Object.keys(errors).length === 0;

  // Dirty tracking simple (cualquier cambio cuenta como dirty)
  const isDirty = useMemo(() => {
    return (
      !!form.nombre ||
      !!form.codigoInterno ||
      !!form.nombreEncargado ||
      !!telefonoPrincipal.trim() ||
      telefonos.length > 0 ||
      direcciones.length > 0 ||
      !!nuevoTelefono.numero.trim() ||
      !!nuevaDireccion.direccion.trim()
    );
  }, [form, telefonoPrincipal, telefonos, direcciones, nuevoTelefono, nuevaDireccion]);

  // Resumen de progreso (para barra superior)
  const progreso = useMemo(() => {
    const pasos = [
      !!form.nombre.trim(),
      !!telefonoPrincipal.trim() || telefonos.length > 0,
      direcciones.length > 0 || !!nuevaDireccion.direccion.trim(),
    ];
    const ok = pasos.filter(Boolean).length;
    return Math.round((ok / pasos.length) * 100);
  }, [form.nombre, telefonoPrincipal, telefonos, direcciones, nuevaDireccion]);

  // ---------------------------------------------------------------------------
  // Aviso de cambios sin guardar al cerrar pestaña
  // ---------------------------------------------------------------------------

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
    (target: string | -1) => {
      if (isDirty && !submitting) {
        if (!confirm('Hay cambios sin guardar. ¿Salir igualmente?')) return;
      }
      if (typeof target === 'number') navigate(target);
      else navigate(target);
    },
    [isDirty, submitting, navigate],
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const agregarTelefono = useCallback(() => {
    const num = nuevoTelefono.numero.trim();
    if (!num) {
      toast.error('Ingresa un número antes de agregar');
      return;
    }
    setTelefonos((prev) => [...prev, { numero: num, etiqueta: nuevoTelefono.etiqueta.trim() }]);
    setNuevoTelefono({ ...emptyTelefono });
  }, [nuevoTelefono]);

  const agregarDireccion = useCallback(() => {
    const dir = nuevaDireccion.direccion.trim();
    if (!dir) {
      toast.error('La dirección es obligatoria');
      return;
    }
    setDirecciones((prev) => [
      ...prev,
      {
        pais: nuevaDireccion.pais.trim(),
        ciudad: nuevaDireccion.ciudad.trim(),
        canton: nuevaDireccion.canton.trim(),
        direccion: dir,
        referencia: nuevaDireccion.referencia.trim(),
      },
    ]);
    setNuevaDireccion({ ...emptyDireccion });
  }, [nuevaDireccion]);

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setTouched(true);
      if (!isValid) {
        toast.error('Revisa los campos obligatorios');
        return;
      }
      setSubmitting(true);
      try {
        const shipper = await createShipper({
          nombre: form.nombre.trim(),
          codigoInterno: form.codigoInterno.trim() || null,
          nombreEncargado: form.nombreEncargado.trim() || null,
        });

        const principalTrim = telefonoPrincipal.trim();
        if (principalTrim) {
          await addShipperTelefono(shipper.id, { numero: principalTrim, esPrincipal: true });
        }

        for (const t of telefonos) {
          const numero = (t.numero || '').trim();
          if (!numero) continue;
          await addShipperTelefono(shipper.id, {
            numero,
            etiqueta: t.etiqueta?.trim() || null,
            esPrincipal: false,
          });
        }

        for (const d of direcciones) {
          const direccion = (d.direccion || '').trim();
          if (!direccion) continue;
          await addShipperDireccion(shipper.id, {
            pais: d.pais?.trim() || null,
            ciudad: d.ciudad?.trim() || null,
            canton: d.canton?.trim() || null,
            direccion,
            referencia: d.referencia?.trim() || null,
          });
        }

        toast.success(`Shipper "${shipper.nombre}" creado`);
        navigate(`/shippers/${shipper.id}`);
      } catch (err) {
        console.error('Error creando shipper', err);
        toast.error('No se pudo crear el shipper');
      } finally {
        setSubmitting(false);
      }
    },
    [isValid, form, telefonoPrincipal, telefonos, direcciones, navigate],
  );

  // ---------------------------------------------------------------------------
  // Atajos: Ctrl+S / Ctrl+Enter para guardar, Esc para volver
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (ctrlOrMeta && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        submit();
      } else if (ctrlOrMeta && e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          tryNavigateAway('/shippers');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, tryNavigateAway]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const showError = (key: string) => touched && !!errors[key];

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Nuevo Shipper"
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tryNavigateAway('/shippers')}
              className="gap-1.5"
              title="Volver (Esc)"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            <Button
              size="sm"
              onClick={() => submit()}
              disabled={!isValid}
              loading={submitting}
              loadingText="Guardando…"
              className="gap-1.5"
              title="Guardar (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
              Crear shipper
            </Button>
          </div>
        }
      >
        <form
          id="shipper-new-form"
          onSubmit={submit}
          className="max-w-4xl mx-auto p-6 space-y-6 pb-32"
        >
          {/* Banner de progreso */}
          <div className="rounded-xl border border-border bg-card/50 p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Building2 className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">Crear nuevo shipper</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Completa al menos el nombre. Teléfonos y direcciones son opcionales pero recomendados.
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  progreso === 100
                    ? 'bg-success/15 text-success border-success/30'
                    : progreso >= 33
                    ? 'bg-warning/15 text-warning border-warning/30'
                    : ''
                }
              >
                {progreso === 100 ? 'Listo para guardar' : `${progreso}% completo`}
              </Badge>
            </div>
            <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full transition-all ease-claude ${
                  progreso === 100 ? 'bg-success' : 'bg-accent'
                }`}
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>

          {/* Datos generales */}
          <SectionCard icon={Info} iconColor="blue" title="Datos del shipper">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label variant="caption" className="flex items-center gap-1">
                  Nombre <span className="text-destructive">*</span>
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal">
                    {form.nombre.length}/100
                  </span>
                </Label>
                <Input
                  className={`h-9 ${showError('nombre') ? 'border-destructive focus-visible:ring-destructive/20' : ''}`}
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  onBlur={() => setTouched(true)}
                  required
                  maxLength={100}
                  placeholder="Ej. Importadora Fénix"
                  autoFocus
                />
                {showError('nombre') && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.nombre}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label variant="caption" className="flex items-center gap-1">
                  Código interno
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal">
                    {form.codigoInterno.length}/30
                  </span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    className="h-9 font-mono uppercase"
                    value={form.codigoInterno}
                    onChange={(e) => setForm({ ...form, codigoInterno: e.target.value })}
                    maxLength={30}
                    placeholder="Opcional · ej. SHP-7K2P"
                  />
                  {form.codigoInterno.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-2 shrink-0"
                      onClick={copiarCodigo}
                      title="Copiar código"
                      aria-label="Copiar código"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 shrink-0 gap-1.5"
                    onClick={generarCodigo}
                    disabled={generandoCodigo || codigosLoading}
                    title="Generar código único automáticamente"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${generandoCodigo ? 'animate-pulse' : ''}`} />
                    <span className="hidden sm:inline">
                      {form.codigoInterno.trim() ? 'Regenerar' : 'Generar'}
                    </span>
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Puedes escribirlo manualmente o pulsar <span className="font-medium text-foreground">Generar</span> para obtener un código único (formato <span className="font-mono">SHP-XXXX</span>).
                </p>
              </div>
              <div className="space-y-2">
                <Label variant="caption" className="flex items-center gap-1">
                  Nombre del encargado
                  <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal">
                    {form.nombreEncargado.length}/80
                  </span>
                </Label>
                <Input
                  className="h-9"
                  value={form.nombreEncargado}
                  onChange={(e) => setForm({ ...form, nombreEncargado: e.target.value })}
                  maxLength={80}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </SectionCard>

          {/* Teléfonos */}
          <SectionCard
            icon={Phone}
            iconColor="green"
            title="Teléfonos"
            right={
              <span className="text-xs text-muted-foreground tabular-nums">
                {(telefonoPrincipal.trim() ? 1 : 0) + telefonos.length} agregado
                {(telefonoPrincipal.trim() ? 1 : 0) + telefonos.length === 1 ? '' : 's'}
              </span>
            }
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <Label variant="caption" className="flex items-center gap-1.5">
                  <Star className="h-3 w-3 text-warning" />
                  Teléfono principal
                </Label>
                <Input
                  className="h-9 font-mono"
                  value={telefonoPrincipal}
                  onChange={(e) => setTelefonoPrincipal(e.target.value)}
                  placeholder="Número principal del shipper"
                />
                <p className="text-[11px] text-muted-foreground">
                  Este teléfono se mostrará destacado en la lista y ficha del shipper.
                </p>
              </div>

              <div className="space-y-2">
                <Label variant="caption">
                  Otros teléfonos (opcional)
                </Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    className="h-9 min-w-[160px] flex-1 font-mono"
                    placeholder="Número"
                    value={nuevoTelefono.numero}
                    onChange={(e) => setNuevoTelefono({ ...nuevoTelefono, numero: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        agregarTelefono();
                      }
                    }}
                  />
                  <Input
                    className="h-9 min-w-[140px] flex-1"
                    placeholder="Etiqueta (ej. WhatsApp)"
                    value={nuevoTelefono.etiqueta}
                    onChange={(e) => setNuevoTelefono({ ...nuevoTelefono, etiqueta: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        agregarTelefono();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={agregarTelefono}
                    disabled={!nuevoTelefono.numero.trim()}
                    className="gap-1 h-9"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </Button>
                </div>

                {telefonos.length > 0 && (
                  <ul className="space-y-1.5 mt-3">
                    {telefonos.map((t, idx) => (
                      <li
                        key={idx}
                        className="group flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-sm truncate">{t.numero}</span>
                          {t.etiqueta && (
                            <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                              {t.etiqueta}
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setTelefonos((p) => p.filter((_, i) => i !== idx))}
                          title="Quitar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Direcciones */}
          <SectionCard
            icon={MapPin}
            iconColor="orange"
            title="Direcciones"
            right={
              <span className="text-xs text-muted-foreground tabular-nums">
                {direcciones.length} agregada{direcciones.length === 1 ? '' : 's'}
              </span>
            }
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label variant="caption">
                    País
                  </Label>
                  <Input
                    className="h-9"
                    placeholder="Ej. Ecuador"
                    value={nuevaDireccion.pais}
                    onChange={(e) => setNuevaDireccion({ ...nuevaDireccion, pais: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label variant="caption">
                    Ciudad
                  </Label>
                  <Input
                    className="h-9"
                    placeholder="Ej. Quito"
                    value={nuevaDireccion.ciudad}
                    onChange={(e) => setNuevaDireccion({ ...nuevaDireccion, ciudad: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label variant="caption">
                    Cantón
                  </Label>
                  <Input
                    className="h-9"
                    placeholder="Ej. Pichincha"
                    value={nuevaDireccion.canton}
                    onChange={(e) => setNuevaDireccion({ ...nuevaDireccion, canton: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label variant="caption">
                    Referencia
                  </Label>
                  <Input
                    className="h-9"
                    placeholder="Punto cercano, color de casa…"
                    value={nuevaDireccion.referencia}
                    onChange={(e) => setNuevaDireccion({ ...nuevaDireccion, referencia: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label variant="caption" className="flex items-center gap-1">
                    Dirección <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="h-9"
                    value={nuevaDireccion.direccion}
                    onChange={(e) => setNuevaDireccion({ ...nuevaDireccion, direccion: e.target.value })}
                    placeholder="Calle, número, sector…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        agregarDireccion();
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={agregarDireccion}
                  disabled={!nuevaDireccion.direccion.trim()}
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar dirección
                </Button>
              </div>

              {direcciones.length > 0 && (
                <ul className="space-y-2 pt-2 border-t border-border/40">
                  {direcciones.map((d, idx) => (
                    <li
                      key={idx}
                      className="group rounded-lg border border-border/40 bg-background/40 p-3 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{d.direccion}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[d.ciudad, d.canton, d.pais].filter(Boolean).join(', ') || '—'}
                        </p>
                        {d.referencia && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">"{d.referencia}"</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => setDirecciones((p) => p.filter((_, i) => i !== idx))}
                        title="Quitar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
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
          </div>
        </form>

        {/* Footer sticky con CTA */}
        <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-6 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
              {isValid ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="truncate">Listo para crear el shipper</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-warning">
                  <AlertCircle className="h-4 w-4" />
                  <span className="truncate">Falta el nombre del shipper</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => tryNavigateAway('/shippers')}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => submit()}
                disabled={!isValid}
                loading={submitting}
                loadingText="Guardando…"
                className="gap-1.5 min-w-[120px]"
              >
                <Save className="h-3.5 w-3.5" />
                Crear shipper
              </Button>
            </div>
          </div>
        </div>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
