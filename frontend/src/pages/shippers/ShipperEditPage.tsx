import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Building2,
  Info,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  Star,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Copy,
  Sparkles,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Kbd } from '@/components/layout/KpiCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import {
  getShipper,
  updateShipper,
  listShippers,
  addShipperTelefono,
  updateShipperTelefono,
  deleteShipperTelefono,
  addShipperDireccion,
  updateShipperDireccion,
  deleteShipperDireccion,
  type Shipper,
  type Telefono,
  type DireccionShipper,
} from '@/services/shippers.service';
import { generarCodigoInternoShipper } from '@/lib/codigoShipper';

// =============================================================================
// Tipos
// =============================================================================

type TelefonoEditForm = { numero: string; etiqueta: string; esPrincipal: boolean };
type DireccionEditForm = {
  pais: string;
  ciudad: string;
  canton: string;
  direccion: string;
  referencia: string;
};

const emptyTelefono: TelefonoEditForm = { numero: '', etiqueta: '', esPrincipal: false };
const emptyDireccion: DireccionEditForm = {
  pais: '',
  ciudad: '',
  canton: '',
  direccion: '',
  referencia: '',
};

function telefonoToForm(t: Telefono): TelefonoEditForm {
  return {
    numero: t.numero || '',
    etiqueta: t.etiqueta || '',
    esPrincipal: !!t.esPrincipal,
  };
}

function direccionToForm(d: DireccionShipper): DireccionEditForm {
  return {
    pais: d.pais || '',
    ciudad: d.ciudad || '',
    canton: d.canton || '',
    direccion: d.direccion || '',
    referencia: d.referencia || '',
  };
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  } catch {
    toast.error('No se pudo copiar al portapapeles');
  }
}

// =============================================================================
// Componente
// =============================================================================

export default function ShipperEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [row, setRow] = useState<Shipper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    codigoInterno: '',
    nombreEncargado: '',
  });

  const [editingTelId, setEditingTelId] = useState<number | 'new' | null>(null);
  const [telForm, setTelForm] = useState<TelefonoEditForm>({ ...emptyTelefono });

  const [editingDirId, setEditingDirId] = useState<number | 'new' | null>(null);
  const [dirForm, setDirForm] = useState<DireccionEditForm>({ ...emptyDireccion });

  // Confirm delete subentidades
  const [confirmDel, setConfirmDel] = useState<
    | { type: 'tel'; id: number; label: string }
    | { type: 'dir'; id: number; label: string }
    | null
  >(null);
  const [deletingSub, setDeletingSub] = useState(false);

  // Generación de código interno único (excluye el código actual)
  const [generandoCodigo, setGenerandoCodigo] = useState(false);

  const generarCodigo = useCallback(async () => {
    setGenerandoCodigo(true);
    try {
      let codes: string[] = [];
      try {
        const all = await listShippers();
        codes = all.map((s) => s.codigoInterno ?? '').filter(Boolean);
      } catch {
        // Si falla, generamos sin verificar duplicados (extremadamente improbable colisionar)
      }
      const nuevo = generarCodigoInternoShipper(codes, row?.codigoInterno ?? '');
      setForm((f) => ({ ...f, codigoInterno: nuevo }));
      toast.success(`Código generado: ${nuevo}`);
    } finally {
      setGenerandoCodigo(false);
    }
  }, [row?.codigoInterno]);

  const refresh = useCallback(async () => {
    if (!id) {
      setRow(null);
      setError('ID inválido.');
      return;
    }
    const s = await getShipper(id);
    setRow(s);
    setError(null);
    setForm({
      nombre: s.nombre || '',
      codigoInterno: s.codigoInterno || '',
      nombreEncargado: s.nombreEncargado || '',
    });
  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch {
        setError('No fue posible cargar los datos del shipper.');
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

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

  // Dirty tracking sólo de los datos generales
  const isDatosDirty = useMemo(() => {
    if (!row) return false;
    return (
      form.nombre !== (row.nombre || '') ||
      form.codigoInterno !== (row.codigoInterno || '') ||
      form.nombreEncargado !== (row.nombreEncargado || '')
    );
  }, [row, form]);

  const isAnyEditing = editingTelId !== null || editingDirId !== null;
  const isDirty = isDatosDirty || isAnyEditing;

  // Aviso al cerrar pestaña
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
  // Submit datos generales
  // ---------------------------------------------------------------------------

  const submitDatos = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setTouched(true);
      if (!id) return;
      if (!isValid) {
        toast.error('Revisa los campos obligatorios');
        return;
      }
      if (!isDatosDirty) {
        toast.info('No hay cambios que guardar');
        return;
      }
      setSubmitting(true);
      try {
        await updateShipper(String(id), {
          nombre: form.nombre.trim(),
          codigoInterno: form.codigoInterno.trim() || null,
          nombreEncargado: form.nombreEncargado.trim() || null,
        });
        await refresh();
        toast.success('Datos del shipper actualizados');
      } catch {
        toast.error('No se pudo actualizar el shipper');
      } finally {
        setSubmitting(false);
      }
    },
    [id, isValid, isDatosDirty, form, refresh],
  );

  // ---------------------------------------------------------------------------
  // Teléfonos
  // ---------------------------------------------------------------------------

  const startEditTel = (t: Telefono) => {
    if (!t.id) return;
    setEditingTelId(t.id);
    setTelForm(telefonoToForm(t));
  };
  const startNewTel = () => {
    setEditingTelId('new');
    setTelForm({ ...emptyTelefono, esPrincipal: !(row?.telefonos?.length) });
  };
  const cancelTel = () => {
    setEditingTelId(null);
    setTelForm({ ...emptyTelefono });
  };

  const saveTel = async () => {
    if (!id) return;
    const numero = telForm.numero.trim();
    if (!numero) {
      toast.error('El número es obligatorio');
      return;
    }
    try {
      if (editingTelId === 'new') {
        await addShipperTelefono(id, {
          numero,
          etiqueta: telForm.etiqueta.trim() || null,
          esPrincipal: telForm.esPrincipal,
        });
        toast.success('Teléfono agregado');
      } else if (editingTelId) {
        await updateShipperTelefono(id, editingTelId, {
          numero,
          etiqueta: telForm.etiqueta.trim() || null,
          esPrincipal: telForm.esPrincipal,
        });
        toast.success('Teléfono actualizado');
      }
      cancelTel();
      await refresh();
    } catch {
      toast.error('No se pudo guardar el teléfono');
    }
  };

  const requestDeleteTel = (t: Telefono) => {
    if (!t.id) return;
    setConfirmDel({ type: 'tel', id: t.id, label: t.numero });
  };

  const markPrincipal = async (tel: Telefono) => {
    if (!id || !tel.id) return;
    try {
      await updateShipperTelefono(id, tel.id, { esPrincipal: true });
      await refresh();
      toast.success('Marcado como principal');
    } catch {
      toast.error('No se pudo marcar como principal');
    }
  };

  // ---------------------------------------------------------------------------
  // Direcciones
  // ---------------------------------------------------------------------------

  const startEditDir = (d: DireccionShipper) => {
    if (!d.id) return;
    setEditingDirId(d.id);
    setDirForm(direccionToForm(d));
  };
  const startNewDir = () => {
    setEditingDirId('new');
    setDirForm({ ...emptyDireccion });
  };
  const cancelDir = () => {
    setEditingDirId(null);
    setDirForm({ ...emptyDireccion });
  };

  const saveDir = async () => {
    if (!id) return;
    if (!dirForm.direccion.trim()) {
      toast.error('La dirección es obligatoria');
      return;
    }
    const payload = {
      pais: dirForm.pais.trim() || null,
      ciudad: dirForm.ciudad.trim() || null,
      canton: dirForm.canton.trim() || null,
      direccion: dirForm.direccion.trim(),
      referencia: dirForm.referencia.trim() || null,
    };
    try {
      if (editingDirId === 'new') {
        await addShipperDireccion(id, payload);
        toast.success('Dirección agregada');
      } else if (editingDirId) {
        await updateShipperDireccion(id, editingDirId, payload);
        toast.success('Dirección actualizada');
      }
      cancelDir();
      await refresh();
    } catch {
      toast.error('No se pudo guardar la dirección');
    }
  };

  const requestDeleteDir = (d: DireccionShipper) => {
    if (!d.id) return;
    const label =
      d.direccion ||
      [d.ciudad, d.canton, d.pais].filter(Boolean).join(', ') ||
      `Dirección #${d.id}`;
    setConfirmDel({ type: 'dir', id: d.id, label });
  };

  const confirmDeleteSub = async () => {
    if (!id || !confirmDel) return;
    setDeletingSub(true);
    try {
      if (confirmDel.type === 'tel') {
        await deleteShipperTelefono(id, confirmDel.id);
        toast.success('Teléfono eliminado');
      } else {
        await deleteShipperDireccion(id, confirmDel.id);
        toast.success('Dirección eliminada');
      }
      await refresh();
      setConfirmDel(null);
    } catch {
      toast.error('No se pudo eliminar');
    } finally {
      setDeletingSub(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Atajos
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (ctrlOrMeta && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        submitDatos();
      } else if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea') return;
        if (editingTelId !== null) {
          cancelTel();
          return;
        }
        if (editingDirId !== null) {
          cancelDir();
          return;
        }
        tryNavigateAway(`/shippers/${id ?? ''}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitDatos, tryNavigateAway, id, editingTelId, editingDirId]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const showError = (key: string) => touched && !!errors[key];

  const renderTelForm = () => (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {editingTelId === 'new' ? 'Nuevo teléfono' : 'Editar teléfono'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={cancelTel}
          title="Cancelar (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Número *
          </Label>
          <Input
            className="h-9 font-mono"
            value={telForm.numero}
            onChange={(e) => setTelForm({ ...telForm, numero: e.target.value })}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveTel();
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Etiqueta
          </Label>
          <Input
            className="h-9"
            placeholder="Ej. WhatsApp, Casa…"
            value={telForm.etiqueta}
            onChange={(e) => setTelForm({ ...telForm, etiqueta: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveTel();
              }
            }}
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              className="accent-primary h-4 w-4"
              checked={telForm.esPrincipal}
              onChange={(e) => setTelForm({ ...telForm, esPrincipal: e.target.checked })}
            />
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500" />
              Principal
            </span>
          </label>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={cancelTel}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={saveTel}
          disabled={!telForm.numero.trim()}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" /> Guardar
        </Button>
      </div>
    </div>
  );

  const renderDirForm = () => (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {editingDirId === 'new' ? 'Nueva dirección' : 'Editar dirección'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={cancelDir}
          title="Cancelar (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            País
          </Label>
          <Input
            className="h-9"
            value={dirForm.pais}
            onChange={(e) => setDirForm({ ...dirForm, pais: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Ciudad
          </Label>
          <Input
            className="h-9"
            value={dirForm.ciudad}
            onChange={(e) => setDirForm({ ...dirForm, ciudad: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Cantón
          </Label>
          <Input
            className="h-9"
            value={dirForm.canton}
            onChange={(e) => setDirForm({ ...dirForm, canton: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Referencia
          </Label>
          <Input
            className="h-9"
            value={dirForm.referencia}
            onChange={(e) => setDirForm({ ...dirForm, referencia: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Dirección *
          </Label>
          <Input
            className="h-9"
            value={dirForm.direccion}
            onChange={(e) => setDirForm({ ...dirForm, direccion: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={cancelDir}>
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={saveDir}
          disabled={!dirForm.direccion.trim()}
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" /> Guardar
        </Button>
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <StandardPageLayout
        title={row ? `Editar: ${row.nombre}` : 'Editar Shipper'}
        icon={<Building2 className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tryNavigateAway(`/shippers/${id}`)}
              className="gap-1.5"
              title="Volver (Esc)"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
            </Button>
            {row && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/shippers/${row.id}`)}
                className="gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" /> Ver
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => submitDatos()}
              disabled={submitting || !isValid || !isDatosDirty}
              className="gap-1.5"
              title="Guardar (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" /> {submitting ? 'Guardando…' : 'Guardar datos'}
            </Button>
          </div>
        }
      >
        <ConfirmDeleteDialog
          open={confirmDel != null}
          onOpenChange={(open) => !deletingSub && !open && setConfirmDel(null)}
          entityLabel={confirmDel?.type === 'tel' ? 'teléfono' : 'dirección'}
          entityName={confirmDel?.label}
          loading={deletingSub}
          onConfirm={confirmDeleteSub}
        />

        {loading ? (
          <LoadingState label="Cargando shipper..." />
        ) : error ? (
          <ErrorState title="Error" description={error} />
        ) : !row ? (
          <ErrorState title="No se encontró el shipper" />
        ) : (
          <>
            <div className="max-w-4xl mx-auto p-6 space-y-6 pb-32">
              {/* Banner identificativo */}
              <div className="rounded-xl border border-border bg-card/50 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Pencil className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      Editando shipper #{row.id}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.codigoInterno
                        ? `Código: ${row.codigoInterno}`
                        : 'Sin código interno'}
                    </p>
                  </div>
                </div>
                {isDirty ? (
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Cambios sin guardar
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Sin cambios pendientes
                  </Badge>
                )}
              </div>

              {/* Datos generales */}
              <form id="shipper-edit-form" onSubmit={submitDatos}>
                <SectionCard
                  icon={Info}
                  iconColor="blue"
                  title="Datos del shipper"
                  right={
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      ID #{row.id}
                      <button
                        type="button"
                        onClick={() => copyText(String(row.id), 'ID')}
                        className="h-6 w-6 inline-flex items-center justify-center rounded border border-transparent hover:border-border hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Copiar ID"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </span>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        Nombre <span className="text-destructive">*</span>
                        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal">
                          {form.nombre.length}/100
                        </span>
                      </Label>
                      <Input
                        className={`h-9 ${
                          showError('nombre') ? 'border-destructive focus-visible:ring-destructive/20' : ''
                        }`}
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        onBlur={() => setTouched(true)}
                        maxLength={100}
                        required
                      />
                      {showError('nombre') && (
                        <p className="text-[11px] text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.nombre}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
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
                            onClick={() => copyText(form.codigoInterno.trim(), 'Código')}
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
                          disabled={generandoCodigo}
                          title={form.codigoInterno.trim() ? 'Regenerar código único' : 'Generar código único automáticamente'}
                        >
                          <Sparkles className={`h-3.5 w-3.5 ${generandoCodigo ? 'animate-pulse' : ''}`} />
                          <span className="hidden sm:inline">
                            {form.codigoInterno.trim() ? 'Regenerar' : 'Generar'}
                          </span>
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Puedes editarlo manualmente o pulsar <span className="font-medium text-foreground">{form.codigoInterno.trim() ? 'Regenerar' : 'Generar'}</span> para obtener un código único (formato <span className="font-mono">SHP-XXXX</span>).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
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
                      />
                    </div>
                  </div>
                </SectionCard>
              </form>

              {/* Teléfonos */}
              <SectionCard
                icon={Phone}
                iconColor="green"
                title="Teléfonos"
                right={
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {row.telefonos?.length ?? 0} {row.telefonos?.length === 1 ? 'registrado' : 'registrados'}
                  </span>
                }
              >
                {row.telefonos?.length ? (
                  <div className="space-y-2 mb-4">
                    {row.telefonos.map((t) => (
                      <div
                        key={t.id}
                        className={`group flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                          t.esPrincipal
                            ? 'border-amber-500/40 bg-amber-500/5'
                            : 'border-border/40 bg-background/40 hover:bg-accent/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {t.esPrincipal && (
                            <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                          <span className="font-mono text-sm truncate">{t.numero}</span>
                          {t.etiqueta && (
                            <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                              {t.etiqueta}
                            </Badge>
                          )}
                          {t.esPrincipal && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400 shrink-0"
                            >
                              Principal
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {!t.esPrincipal && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Marcar como principal"
                              onClick={() => markPrincipal(t)}
                            >
                              <Star className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditTel(t)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => requestDeleteTel(t)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4 italic">
                    Sin teléfonos registrados.
                  </p>
                )}

                {editingTelId !== null ? (
                  renderTelForm()
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={startNewTel}
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar teléfono
                  </Button>
                )}
              </SectionCard>

              {/* Direcciones */}
              <SectionCard
                icon={MapPin}
                iconColor="orange"
                title="Direcciones"
                right={
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {row.direcciones?.length ?? 0} {row.direcciones?.length === 1 ? 'registrada' : 'registradas'}
                  </span>
                }
              >
                {row.direcciones?.length ? (
                  <div className="space-y-2 mb-4">
                    {row.direcciones.map((d) => (
                      <div
                        key={d.id}
                        className="group flex items-start justify-between rounded-lg border border-border/40 bg-background/40 p-3 hover:border-primary/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{d.direccion || '—'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[d.ciudad, d.canton, d.pais].filter(Boolean).join(', ') || '—'}
                          </p>
                          {d.referencia && (
                            <p className="text-xs text-muted-foreground italic mt-0.5">
                              "{d.referencia}"
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => startEditDir(d)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => requestDeleteDir(d)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-4 italic">
                    Sin direcciones registradas.
                  </p>
                )}

                {editingDirId !== null ? (
                  renderDirForm()
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={startNewDir}
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar dirección
                  </Button>
                )}
              </SectionCard>

              {/* Atajos */}
              <div className="text-[11px] text-muted-foreground text-center pt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <span>Atajos:</span>
                <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd>
                <span>guardar datos</span>
                <span className="opacity-40">·</span>
                <Kbd>Esc</Kbd>
                <span>cancelar / volver</span>
              </div>
            </div>

            {/* Footer sticky */}
            <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-6 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                  {!isValid ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="truncate">Falta el nombre del shipper</span>
                    </span>
                  ) : isDatosDirty ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="truncate">Cambios sin guardar en datos generales</span>
                    </span>
                  ) : isAnyEditing ? (
                    <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="truncate">Edición de subentidad en progreso</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="truncate">Sin cambios pendientes</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => tryNavigateAway(`/shippers/${id}`)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => submitDatos()}
                    disabled={submitting || !isValid || !isDatosDirty}
                    className="gap-1.5 min-w-[140px]"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {submitting ? 'Guardando…' : 'Guardar datos'}
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
