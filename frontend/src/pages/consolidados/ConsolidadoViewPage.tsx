import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Info, Trash2, Lock, LockOpen, PackagePlus, Printer,
  Boxes, Package, Weight, CheckCircle2, AlertCircle, Copy, RefreshCcw,
  Search, FilterX, Eye,
} from 'lucide-react';
import { printPackageLabels } from '@/lib/printLabels';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { KpiCard, Kbd } from '@/components/layout/KpiCard';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import NotionTable from '@/components/notion/NotionTable';
import type { SortState } from '@/components/notion/NotionTable';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ShipperCombobox } from '@/components/shipper/ShipperCombobox';
import { PaqueteSearchCombobox } from '@/components/paquete/PaqueteSearchCombobox';
import {
  getConsolidado,
  addPaqueteToConsolidado,
  removePaqueteFromConsolidado,
  cerrarConsolidado,
  abrirConsolidado,
  deleteConsolidado,
  type Consolidado,
} from '@/services/consolidados.service';
import {
  getPaqueteByNumeroGuia,
  createPaqueteSoloGuia,
  createPaqueteRegistroMinimo,
  updatePaquete,
  type Paquete,
  type PaqueteRegistroMinimoInput,
  type PaqueteUpdateInput,
} from '@/services/paquetes.service';
import { usePaquetesList } from '@/hooks/usePaquetes';
import { listShippers, type Shipper } from '@/services/shippers.service';
import { useMe } from '@/hooks/useMe';
import { LBS_TO_KGS, formatNumber as formatPesoNumber } from '@/lib/peso';

function normalizeCodigo(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ');
}

function paqueteConInfo(p: Paquete): boolean {
  return !!(p.destinatario || p.contenido || (p.pesoLbs != null && p.pesoLbs > 0));
}

export default function ConsolidadoViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const consolidadoId = id ? Number(id) : null;
  const { me } = useMe();
  const role = me?.rol ?? null;
  const canEdit = role === 'ADMIN' || role === 'MV_ADMIN' || (me?.permisos?.includes('consolidados.add_paquete') ?? false);
  const canDelete = role === 'ADMIN' || role === 'MV_ADMIN' || (me?.permisos?.includes('consolidados.delete') ?? false);

  const [row, setRow] = useState<Consolidado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [numeroGuiaEnvio, setNumeroGuiaEnvio] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [removePaqueteId, setRemovePaqueteId] = useState<number | null>(null);
  const [removingPaquete, setRemovingPaquete] = useState(false);

  const [addInput, setAddInput] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [showSearchExisting, setShowSearchExisting] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [editPaquete, setEditPaquete] = useState<Paquete | null>(null);
  const [editNumeroGuia, setEditNumeroGuia] = useState('');
  const [form, setForm] = useState({
    destinatario: '',
    ref: '',
    pesoLbs: '',
    contenido: '',
    shipperId: '' as number | '',
  });
  const [initialForm, setInitialForm] = useState(form);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showFormErrors, setShowFormErrors] = useState(false);

  // Filtros y orden de la tabla interna
  const [tableSearch, setTableSearch] = useState('');
  const [tableSort, setTableSort] = useState<SortState>(null);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const { data: allPaquetes, loading: loadingPaquetes, refresh: refreshPaquetes } = usePaquetesList();

  const paquetesDelConsolidado = useMemo(() => {
    if (!consolidadoId) return [];
    return allPaquetes
      .filter((p) => p.consolidado?.id === consolidadoId)
      .sort((a, b) => {
        const pa = a.posicionEnConsolidado ?? Number.MAX_SAFE_INTEGER;
        const pb = b.posicionEnConsolidado ?? Number.MAX_SAFE_INTEGER;
        if (pa !== pb) return pa - pb;
        return a.id - b.id;
      });
  }, [allPaquetes, consolidadoId]);

  const paquetesDelConsolidadoIds = useMemo(
    () => new Set(paquetesDelConsolidado.map((p) => p.id)),
    [paquetesDelConsolidado],
  );

  const filteredPaquetes = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    let rows = paquetesDelConsolidado;
    if (q) {
      rows = rows.filter((p) =>
        p.numeroGuia?.toLowerCase().includes(q) ||
        p.destinatario?.toLowerCase().includes(q) ||
        p.ref?.toLowerCase().includes(q) ||
        p.contenido?.toLowerCase().includes(q) ||
        p.shipper?.nombre?.toLowerCase().includes(q)
      );
    }
    if (!tableSort) return rows;
    const dir = tableSort.dir === 'asc' ? 1 : -1;
    const get = (p: Paquete): string | number | null => {
      switch (tableSort.key) {
        case 'posicion': return p.posicionEnConsolidado ?? Number.MAX_SAFE_INTEGER;
        case 'numeroGuia': return (p.numeroGuia ?? '').toLowerCase();
        case 'destinatario': return (p.destinatario ?? '').toLowerCase();
        case 'ref': return (p.ref ?? '').toLowerCase();
        case 'contenido': return (p.contenido ?? '').toLowerCase();
        case 'shipper': return (p.shipper?.nombre ?? '').toLowerCase();
        case 'pesoLbs': return p.pesoLbs ?? -Infinity;
        case 'pesoKgs': return p.pesoKgs ?? -Infinity;
        case 'estado': return paqueteConInfo(p) ? 1 : 0;
        default: return null;
      }
    };
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va === vb) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return va < vb ? -1 * dir : 1 * dir;
    });
  }, [paquetesDelConsolidado, tableSearch, tableSort]);

  const pesoCalculadoLbs = useMemo(() =>
    paquetesDelConsolidado.reduce((sum, p) => sum + (p.pesoLbs ?? 0), 0),
    [paquetesDelConsolidado]
  );
  const pesoCalculadoKgs = pesoCalculadoLbs * LBS_TO_KGS;

  const totalPaq = paquetesDelConsolidado.length;
  const completos = useMemo(
    () => paquetesDelConsolidado.filter(paqueteConInfo).length,
    [paquetesDelConsolidado],
  );
  const pendientes = totalPaq - completos;
  const pctCompletos = totalPaq > 0 ? Math.round((completos / totalPaq) * 100) : 0;

  const estado = (row?.estado || '—').toUpperCase();
  const isAbierto = estado === 'ABIERTO';
  const isCerrado = estado === 'CERRADO';

  const todosConInfo = totalPaq > 0 && completos === totalPaq;
  const paquetesSinInfo = useMemo(
    () => paquetesDelConsolidado.filter((p) => !paqueteConInfo(p)),
    [paquetesDelConsolidado],
  );

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const c = await getConsolidado(String(id));
      setRow(c);
      setNumeroGuiaEnvio(c.numeroGuia || '');
    } catch (e) {
      console.error('Error cargando consolidado', e);
      setError('No se pudo cargar el consolidado.');
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { listShippers().then(setShippers).catch(console.error); }, []);

  const copiarTexto = async (texto: string | null | undefined, etiqueta: string) => {
    if (!texto) {
      toast.info('No hay nada para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${etiqueta} copiado al portapapeles.`);
    } catch {
      toast.error('No se pudo copiar al portapapeles.');
    }
  };

  const refreshAll = useCallback(async () => {
    await Promise.all([reload(), refreshPaquetes()]);
    toast.success('Datos actualizados.');
  }, [reload, refreshPaquetes]);

  const addPaqueteAlConsolidado = useCallback(async () => {
    if (!id || !consolidadoId || !isAbierto) return;
    const codigo = normalizeCodigo(addInput);
    if (!codigo) return;

    const yaEnConsolidado = paquetesDelConsolidado.some(
      (p) => normalizeCodigo(p.numeroGuia) === codigo
    );
    if (yaEnConsolidado) {
      toast.warning(`La guía "${codigo}" ya está en este consolidado.`);
      setAddInput('');
      addInputRef.current?.focus();
      return;
    }

    setAddLoading(true);
    try {
      let paquete = await getPaqueteByNumeroGuia(codigo);
      if (!paquete) {
        paquete = await createPaqueteSoloGuia(codigo);
        toast.info(`Paquete "${codigo}" creado y agregado.`);
      } else {
        toast.success(`Paquete "${codigo}" agregado.`);
      }
      if (paquete.consolidado?.id && paquete.consolidado.id !== consolidadoId) {
        toast.error(`El paquete ya pertenece al consolidado #${paquete.consolidado.id}.`);
        return;
      }
      await addPaqueteToConsolidado(String(id), paquete.id);
      await refreshPaquetes();
      await reload();
      setAddInput('');
    } catch (e) {
      console.error('Error agregando paquete', e);
      toast.error('No se pudo agregar el paquete al consolidado.');
    } finally {
      setAddLoading(false);
      addInputRef.current?.focus();
    }
  }, [id, consolidadoId, isAbierto, addInput, paquetesDelConsolidado, refreshPaquetes, reload]);

  const openEditDialog = useCallback((paq: Paquete) => {
    const next = {
      destinatario: paq.destinatario ?? '',
      ref: paq.ref ?? '',
      pesoLbs: paq.pesoLbs != null ? String(paq.pesoLbs) : '',
      contenido: paq.contenido ?? '',
      shipperId: (paq.shipper?.id ?? '') as number | '',
    };
    setEditPaquete(paq);
    setEditNumeroGuia(paq.numeroGuia);
    setForm(next);
    setInitialForm(next);
    setTouched({});
    setShowFormErrors(false);
  }, []);

  const closeEditDialog = useCallback(() => {
    const empty = { destinatario: '', ref: '', pesoLbs: '', contenido: '', shipperId: '' as number | '' };
    setEditPaquete(null);
    setEditNumeroGuia('');
    setForm(empty);
    setInitialForm(empty);
    setTouched({});
    setShowFormErrors(false);
  }, []);

  // Cálculos derivados del form de edición
  const formIsDirty = useMemo(() => {
    return (
      form.destinatario !== initialForm.destinatario ||
      form.ref !== initialForm.ref ||
      form.pesoLbs !== initialForm.pesoLbs ||
      form.contenido !== initialForm.contenido ||
      form.shipperId !== initialForm.shipperId
    );
  }, [form, initialForm]);

  const formErrors = useMemo(() => {
    const errs: Partial<Record<'destinatario' | 'peso' | 'contenido', string>> = {};
    if (!form.destinatario.trim()) errs.destinatario = 'Destinatario obligatorio';
    const pesoLbsN = form.pesoLbs.trim() ? Number(form.pesoLbs) : NaN;
    if (!pesoLbsN || pesoLbsN <= 0) {
      errs.peso = 'Indique un peso mayor a 0';
    }
    if (!form.contenido.trim()) errs.contenido = 'Contenido obligatorio';
    return errs;
  }, [form]);

  const formIsValid = Object.keys(formErrors).length === 0;
  const camposCompletos = (['destinatario', 'peso', 'contenido'] as const).filter((k) => !formErrors[k]).length;

  const tryCloseEditDialog = useCallback(() => {
    if (formIsDirty) {
      const ok = window.confirm('Hay cambios sin guardar. ¿Cerrar de todas formas?');
      if (!ok) return;
    }
    closeEditDialog();
  }, [formIsDirty, closeEditDialog]);

  const saveEditDialog = useCallback(async () => {
    if (!editPaquete) return;
    setShowFormErrors(true);
    if (!formIsValid) {
      toast.error('Revise los campos marcados.');
      return;
    }
    const pesoLbsNum = form.pesoLbs.trim() ? Number(form.pesoLbs) : undefined;
    const shipperIdNum =
      form.shipperId === '' ? undefined : Number(form.shipperId);

    const hasBasicInfo = editPaquete.destinatario || editPaquete.contenido || editPaquete.pesoLbs;

    setSaving(true);
    try {
      if (hasBasicInfo || editPaquete.id) {
        const input: PaqueteUpdateInput = {
          destinatario: form.destinatario.trim() || null,
          ref: form.ref.trim() || null,
          contenido: form.contenido.trim() || null,
          pesoLbs: pesoLbsNum,
          shipper: shipperIdNum != null ? { id: shipperIdNum } : null,
        };
        await updatePaquete(editPaquete.id, input);
      } else {
        const numeroGuia = editNumeroGuia.trim();
        const pesoFinal = pesoLbsNum;
        if (!numeroGuia || pesoFinal == null || pesoFinal <= 0) {
          toast.error('Datos insuficientes.');
          setSaving(false);
          return;
        }
        const input: PaqueteRegistroMinimoInput = {
          numeroGuia,
          destinatario: form.destinatario.trim(),
          ref: form.ref.trim() || undefined,
          pesoLbs: pesoFinal,
          contenido: form.contenido.trim(),
          ...(shipperIdNum != null && shipperIdNum > 0 ? { shipperId: shipperIdNum } : {}),
        };
        await createPaqueteRegistroMinimo(input);
      }
      toast.success('Información guardada.');
      await refreshPaquetes();
      await reload();
      closeEditDialog();
    } catch (e) {
      console.error('Error guardando paquete', e);
      toast.error('No se pudo guardar la información del paquete.');
    } finally {
      setSaving(false);
    }
  }, [editPaquete, editNumeroGuia, form, formIsValid, refreshPaquetes, reload, closeEditDialog]);

  const handleAbrir = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await abrirConsolidado(String(id));
      setRow(updated);
      await refreshPaquetes();
      toast.success('Consolidado reabierto.');
    } catch (e) {
      console.error('Error abriendo consolidado', e);
      toast.error('No se pudo abrir el consolidado.');
    } finally {
      setSaving(false);
    }
  }, [id, refreshPaquetes]);

  const handleQuitarPaquete = useCallback(async (paqueteId: number) => {
    if (!id || !consolidadoId) return;
    setRemovingPaquete(true);
    try {
      const updated = await removePaqueteFromConsolidado(String(id), paqueteId);
      setRow(updated);
      await refreshPaquetes();
      toast.success('Paquete quitado del consolidado.');
    } catch (e) {
      console.error('Error quitando paquete', e);
      toast.error('No se pudo quitar el paquete.');
    } finally {
      setRemovingPaquete(false);
      setRemovePaqueteId(null);
    }
  }, [id, consolidadoId, refreshPaquetes]);

  const handleCerrar = useCallback(async () => {
    if (!id || !isAbierto) return;
    setSaving(true);
    try {
      const updated = await cerrarConsolidado(String(id), {
        numeroGuia: numeroGuiaEnvio.trim() || null,
      });
      setRow(updated);
      await refreshPaquetes();
      toast.success('Consolidado cerrado.');
    } catch (e) {
      console.error('Error cerrando consolidado', e);
      toast.error('No se pudo cerrar el consolidado.');
    } finally {
      setSaving(false);
    }
  }, [id, isAbierto, numeroGuiaEnvio, refreshPaquetes]);

  const imprimirTodas = () => {
    if (paquetesDelConsolidado.length === 0) return;
    const consolidadoGuia = row?.numeroGuia ?? (id ? `#${id}` : null);
    const labels = paquetesDelConsolidado.map((p) => ({
      numeroGuia: p.numeroGuia,
      shipperNombre: p.shipper?.nombre ?? null,
      shipperEncargado: p.shipper?.nombreEncargado ?? null,
      destinatarioNombre: p.destinatario ?? null,
      ref: p.ref ?? null,
      pesoLbs: p.pesoLbs ?? null,
      pesoKgs: p.pesoKgs ?? null,
      contenido: p.contenido ?? null,
      consolidadoGuia,
    }));
    printPackageLabels(labels, { title: `Etiquetas · Consolidado ${consolidadoGuia ?? id}` });
  };

  // Atajos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        (target?.isContentEditable ?? false);
      if (isEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.toLowerCase() === 'r' && !e.shiftKey) {
        e.preventDefault();
        refreshAll();
      } else if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        navigate('/consolidados');
      } else if (e.key.toLowerCase() === 'p' && paquetesDelConsolidado.length > 0) {
        e.preventDefault();
        imprimirTodas();
      } else if (e.key === '/' && isAbierto && canEdit) {
        e.preventDefault();
        addInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshAll, navigate, paquetesDelConsolidado.length, isAbierto, canEdit]);

  const removePaquete = removePaqueteId != null ? paquetesDelConsolidado.find((p) => p.id === removePaqueteId) : null;

  return (
    <DashboardLayout>
      <StandardPageLayout
        title={row ? `Consolidado #${row.id}` : 'Consolidado'}
        icon={<PackagePlus className="h-4 w-4" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/consolidados')} className="gap-1.5 h-8" title="Volver (B)">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </Button>
            <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1.5 h-8" title="Refrescar (R)">
              <RefreshCcw className="h-3.5 w-3.5" />
              Refrescar
            </Button>
            {paquetesDelConsolidado.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
                onClick={imprimirTodas}
                title="Imprimir todas (P)"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir todas
              </Button>
            )}
            {row && canDelete && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="h-8 gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </Button>
            )}
          </div>
        }
      >
        {/* --- Diálogo eliminar consolidado --- */}
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={(open) => { if (!deleting) setDeleteOpen(open); }}
          entityLabel="consolidado"
          entityName={row ? (row.numeroGuia || `#${row.id}`) : undefined}
          loading={deleting}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deleteConsolidado(String(id));
              toast.success('Consolidado eliminado.');
              navigate('/consolidados', { replace: true });
            } catch (e) {
              console.error('Error eliminando consolidado', e);
              toast.error('No se pudo eliminar el consolidado.');
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
            }
          }}
        />

        {/* --- Diálogo quitar paquete --- */}
        <ConfirmDeleteDialog
          open={removePaqueteId != null}
          onOpenChange={(open) => { if (!removingPaquete && !open) setRemovePaqueteId(null); }}
          entityLabel="paquete del consolidado"
          entityName={removePaquete ? (removePaquete.numeroGuia || `#${removePaquete.id}`) : undefined}
          loading={removingPaquete}
          onConfirm={async () => {
            if (removePaqueteId != null) await handleQuitarPaquete(removePaqueteId);
          }}
        />

        {loading ? (
          <div className="py-8"><LoadingState label="Cargando consolidado..." /></div>
        ) : error ? (
          <div className="py-8"><ErrorState title="Error" description={error} /></div>
        ) : !row ? (
          <div className="py-8"><ErrorState title="No se encontró el consolidado" /></div>
        ) : (
          <div className="space-y-5 py-4">
            {/* --- Banner de estado contextual --- */}
            <div
              className={
                'rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ' +
                (isCerrado
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-amber-500/30 bg-amber-500/5')
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={
                    'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ' +
                    (isCerrado
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400')
                  }
                >
                  {isCerrado ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    Consolidado {isCerrado ? 'cerrado' : 'abierto'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isCerrado
                      ? 'No se pueden agregar más paquetes ni modificar la guía. Si fue por error, vuelva a abrirlo.'
                      : todosConInfo
                        ? 'Listo para cerrar: todos los paquetes tienen información completa.'
                        : `Faltan ${pendientes} paquete${pendientes !== 1 ? 's' : ''} por completar antes de cerrar.`}
                  </div>
                </div>
              </div>
              {row.numeroGuia && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="font-mono text-[12px] gap-1">
                    Guía: {row.numeroGuia}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => copiarTexto(row.numeroGuia, 'Guía')}
                    className="h-6 w-6 rounded border border-transparent hover:border-border hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center"
                    title="Copiar guía"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* --- KPIs --- */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard
                icon={<Package className="h-4 w-4" />}
                label="Paquetes"
                value={totalPaq.toLocaleString('es')}
                accent="primary"
                hint={totalPaq === 0 ? 'Sin paquetes' : `${completos} completos`}
              />
              <KpiCard
                icon={<Weight className="h-4 w-4" />}
                label="Peso (lbs)"
                value={pesoCalculadoLbs.toFixed(2)}
                accent="muted"
                hint={`${pesoCalculadoKgs.toFixed(2)} kg`}
              />
              <KpiCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Completitud"
                value={`${pctCompletos}%`}
                accent={todosConInfo ? 'success' : 'warning'}
                hint={`${completos} de ${totalPaq}`}
                progress={pctCompletos}
              />
              <KpiCard
                icon={isCerrado ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                label="Estado"
                value={isCerrado ? 'Cerrado' : isAbierto ? 'Abierto' : '—'}
                accent={isCerrado ? 'success' : 'warning'}
                hint={isCerrado ? 'Listo para envío' : 'En carga'}
              />
            </div>

            {/* --- Guía y acciones de cierre/apertura --- */}
            {(canEdit || row.numeroGuia) && (
              <SectionCard
                icon={Lock}
                iconColor={isCerrado ? 'green' : 'amber'}
                title="Guía de envío"
                description={canEdit
                  ? 'Identificador del envío del consolidado para tracking.'
                  : undefined}
              >
                {canEdit ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor="guia-envio" className="text-xs text-muted-foreground">Número de guía del consolidado</Label>
                        <Input
                          id="guia-envio"
                          value={numeroGuiaEnvio}
                          onChange={(e) => setNumeroGuiaEnvio(e.target.value)}
                          disabled={saving || !isAbierto}
                          placeholder="Ej: TRACK-123456"
                          className="font-mono"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        {isAbierto ? (
                          <Button
                            onClick={handleCerrar}
                            disabled={saving || !todosConInfo}
                            className="gap-1.5 h-10"
                            title={!todosConInfo ? 'Todos los paquetes deben tener información completa para cerrar' : undefined}
                          >
                            <Lock className="h-3.5 w-3.5" />
                            Cerrar consolidado
                          </Button>
                        ) : (
                          <Button
                            onClick={handleAbrir}
                            disabled={saving}
                            variant="default"
                            className="gap-1.5 h-10"
                          >
                            <LockOpen className="h-3.5 w-3.5" />
                            Reabrir consolidado
                          </Button>
                        )}
                      </div>
                    </div>
                    {isAbierto && !todosConInfo && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {paquetesSinInfo.length} paquete{paquetesSinInfo.length !== 1 ? 's' : ''} sin información completa. Complete su información para poder cerrar el consolidado.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-muted-foreground">Guía de envío</div>
                    <div className="text-sm font-medium font-mono">{row.numeroGuia}</div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* --- Agregar paquete --- */}
            {isAbierto && canEdit && (
              <SectionCard
                icon={PackagePlus}
                iconColor="blue"
                title="Agregar paquete"
                description="Escanee o tipee la guía. Si no existe, se crea automáticamente."
              >
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={addInputRef}
                        placeholder="Tipee o escanee código de paquete…  ( / )"
                        value={addInput}
                        onChange={(e) => setAddInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addPaqueteAlConsolidado()}
                        className="pl-9 font-mono"
                        disabled={addLoading}
                      />
                    </div>
                    <Button
                      onClick={addPaqueteAlConsolidado}
                      disabled={addLoading || !normalizeCodigo(addInput)}
                      className="gap-1.5 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      {addLoading ? 'Agregando…' : 'Agregar'}
                    </Button>
                  </div>

                  {!showSearchExisting ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground w-fit gap-1.5"
                      onClick={() => setShowSearchExisting(true)}
                    >
                      <Search className="h-3.5 w-3.5" />
                      Buscar paquete ya creado
                    </Button>
                  ) : (
                    <>
                      <div className="relative flex items-center gap-3">
                        <div className="flex-1 border-t border-border/50" />
                        <span className="text-[11px] uppercase text-muted-foreground tracking-wider">o buscar existente</span>
                        <div className="flex-1 border-t border-border/50" />
                      </div>
                      <PaqueteSearchCombobox
                        paquetes={allPaquetes}
                        excludeIds={paquetesDelConsolidadoIds}
                        disabled={addLoading}
                        onSelect={async (paq) => {
                          if (!id || !consolidadoId) return;
                          if (paquetesDelConsolidado.some((p) => p.id === paq.id)) {
                            toast.warning(`El paquete "${paq.numeroGuia}" ya está en este consolidado.`);
                            return;
                          }
                          if (paq.consolidado?.id && paq.consolidado.id !== consolidadoId) {
                            toast.error(`El paquete ya pertenece al consolidado #${paq.consolidado.id}.`);
                            return;
                          }
                          setAddLoading(true);
                          try {
                            await addPaqueteToConsolidado(String(id), paq.id);
                            await refreshPaquetes();
                            await reload();
                            toast.success(`Paquete "${paq.numeroGuia}" agregado.`);
                          } catch (e) {
                            console.error('Error agregando paquete', e);
                            toast.error('No se pudo agregar el paquete al consolidado.');
                          } finally {
                            setAddLoading(false);
                            addInputRef.current?.focus();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground w-fit"
                        onClick={() => setShowSearchExisting(false)}
                      >
                        Ocultar
                      </Button>
                    </>
                  )}
                </div>
              </SectionCard>
            )}

            {/* --- Tabla de paquetes --- */}
            <SectionCard
              icon={Boxes}
              iconColor="violet"
              title={`Paquetes del consolidado (${totalPaq})`}
              description={tableSearch && filteredPaquetes.length !== totalPaq
                ? `Mostrando ${filteredPaquetes.length} de ${totalPaq}`
                : undefined}
              noPadding
            >
              {/* Toolbar interno */}
              {totalPaq > 0 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 px-6 py-3 border-b border-border/30 bg-muted/10">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Filtrar paquetes…"
                      className="pl-8 h-8 text-xs"
                    />
                    {tableSearch && (
                      <button
                        type="button"
                        onClick={() => setTableSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded hover:bg-accent flex items-center justify-center text-muted-foreground"
                        aria-label="Limpiar búsqueda"
                      >
                        <FilterX className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="hidden sm:inline">Densidad:</span>
                    <div className="flex items-center rounded-md border border-input p-0.5">
                      <button
                        type="button"
                        onClick={() => setDensity('comfortable')}
                        className={`h-7 px-2 rounded-sm text-xs ${density === 'comfortable' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Cómodo
                      </button>
                      <button
                        type="button"
                        onClick={() => setDensity('compact')}
                        className={`h-7 px-2 rounded-sm text-xs ${density === 'compact' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Compacto
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 pt-4">
                {loadingPaquetes ? (
                  <LoadingState variant="inline" label="Cargando paquetes..." />
                ) : totalPaq === 0 ? (
                  <div className="py-10 text-center">
                    <Boxes className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium">No hay paquetes en este consolidado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isAbierto && canEdit
                        ? 'Use el campo de arriba para agregar paquetes por escaneo.'
                        : isCerrado
                          ? 'El consolidado está cerrado.'
                          : 'No tiene permisos para agregar paquetes.'}
                    </p>
                  </div>
                ) : filteredPaquetes.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-muted-foreground">No hay paquetes que coincidan con "{tableSearch}".</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setTableSearch('')}>
                      <FilterX className="h-3.5 w-3.5 mr-1.5" />
                      Limpiar búsqueda
                    </Button>
                  </div>
                ) : (
                  <NotionTable
                    rows={filteredPaquetes}
                    rowKey={(r) => r.id}
                    onRowClick={(r) => navigate(`/paquetes/${r.id}`)}
                    density={density}
                    sort={tableSort}
                    onSortChange={setTableSort}
                    columns={[
                      {
                        header: '#',
                        sortKey: 'posicion',
                        className: 'w-[52px] text-center tabular-nums',
                        cell: (r) => (
                          r.posicionEnConsolidado != null ? (
                            <span
                              title="Posición dentro del consolidado (calculada automáticamente)"
                              className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold tabular-nums"
                            >
                              {r.posicionEnConsolidado}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ),
                      },
                      {
                        header: 'GUÍA',
                        sortKey: 'numeroGuia',
                        className: 'font-medium',
                        cell: (r) => (
                          <div className="group/copy inline-flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[12px]">{r.numeroGuia}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); copiarTexto(r.numeroGuia, 'Guía'); }}
                              className="h-5 w-5 shrink-0 rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent flex items-center justify-center opacity-0 group-hover/copy:opacity-100 focus:opacity-100 transition-all"
                              title="Copiar guía"
                              aria-label="Copiar guía"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        ),
                      },
                      {
                        header: 'SHIPPER',
                        sortKey: 'shipper',
                        cell: (r) => r.shipper?.nombre ?? <span className="text-muted-foreground">—</span>,
                      },
                      {
                        header: 'DESTINATARIO',
                        sortKey: 'destinatario',
                        cell: (r) => r.destinatario || <span className="text-muted-foreground">—</span>,
                      },
                      {
                        header: 'REF',
                        sortKey: 'ref',
                        cell: (r) => r.ref || <span className="text-muted-foreground">—</span>,
                      },
                      {
                        header: 'CONTENIDO',
                        sortKey: 'contenido',
                        cell: (r) => r.contenido || <span className="text-muted-foreground">—</span>,
                      },
                      {
                        header: 'LBS',
                        sortKey: 'pesoLbs',
                        className: 'w-[90px] text-right tabular-nums',
                        cell: (r) => r.pesoLbs != null ? r.pesoLbs.toFixed(2) : <span className="text-muted-foreground">—</span>,
                      },
                      {
                        header: 'KGS',
                        sortKey: 'pesoKgs',
                        className: 'w-[90px] text-right tabular-nums',
                        cell: (r) => r.pesoKgs != null ? r.pesoKgs.toFixed(2) : <span className="text-muted-foreground">—</span>,
                      },
                      {
                        header: 'ESTADO',
                        sortKey: 'estado',
                        className: 'w-[120px]',
                        cell: (r) => paqueteConInfo(r)
                          ? (
                            <Badge variant="outline" className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-normal">
                              <CheckCircle2 className="h-3 w-3" />
                              Completo
                            </Badge>
                          )
                          : (
                            <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-normal">
                              <AlertCircle className="h-3 w-3" />
                              Pendiente
                            </Badge>
                          ),
                      },
                      {
                        header: '',
                        className: 'w-[180px]',
                        cell: (r: Paquete) => (
                          <div className="flex gap-0.5 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => { e.stopPropagation(); navigate(`/paquetes/${r.id}`); }}
                              title="Ver detalle"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {isAbierto && canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={(e) => { e.stopPropagation(); openEditDialog(r); }}
                                title={paqueteConInfo(r) ? 'Editar info' : 'Completar info'}
                              >
                                <Info className="h-3 w-3" />
                                {paqueteConInfo(r) ? 'Editar' : 'Completar'}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                printPackageLabels([{
                                  numeroGuia: r.numeroGuia,
                                  shipperNombre: r.shipper?.nombre ?? null,
                                  shipperEncargado: r.shipper?.nombreEncargado ?? null,
                                  destinatarioNombre: r.destinatario ?? null,
                                  ref: r.ref ?? null,
                                  pesoLbs: r.pesoLbs ?? null,
                                  pesoKgs: r.pesoKgs ?? null,
                                  contenido: r.contenido ?? null,
                                  consolidadoGuia: row?.numeroGuia ?? (id ? `#${id}` : null),
                                }], { title: `Etiqueta · ${r.numeroGuia}` });
                              }}
                              title="Imprimir etiqueta"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            {isAbierto && canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={removingPaquete}
                                onClick={(e) => { e.stopPropagation(); setRemovePaqueteId(r.id); }}
                                title="Quitar del consolidado"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ),
                      },
                    ]}
                  />
                )}
              </div>
            </SectionCard>

            {/* Atajos */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Kbd>R</Kbd> refrescar</span>
              <span className="inline-flex items-center gap-1"><Kbd>B</Kbd> volver</span>
              {paquetesDelConsolidado.length > 0 && (
                <span className="inline-flex items-center gap-1"><Kbd>P</Kbd> imprimir todas</span>
              )}
              {isAbierto && canEdit && (
                <span className="inline-flex items-center gap-1"><Kbd>/</Kbd> agregar paquete</span>
              )}
            </div>
          </div>
        )}

        {/* --- Dialog Completar / editar información --- */}
        <Dialog open={editPaquete != null} onOpenChange={(open) => { if (!open) tryCloseEditDialog(); }}>
          <DialogContent className="rounded-2xl border-border/50 max-w-xl p-0 overflow-hidden">
            {editPaquete && (() => {
              const wasComplete = paqueteConInfo(editPaquete);
              const showError = (k: 'destinatario' | 'peso' | 'contenido') =>
                (touched[k] || showFormErrors) && !!formErrors[k];

              const handleCtrlEnter = (e: ReactKeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  saveEditDialog();
                }
              };

              const limpiar = () => {
                setForm({ destinatario: '', ref: '', pesoLbs: '', contenido: '', shipperId: '' });
                setTouched({});
                setShowFormErrors(false);
              };

              const pesoConvertidoLabel = form.pesoLbs && Number(form.pesoLbs) > 0
                ? `≈ ${formatPesoNumber(Number(form.pesoLbs) * LBS_TO_KGS)} kg`
                : null;

              return (
                <>
                  {/* Header */}
                  <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/30 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={
                        'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ' +
                        (wasComplete ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400')
                      }>
                        {wasComplete ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <DialogTitle className="text-base">
                          {wasComplete ? 'Editar información' : 'Completar información'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          {wasComplete
                            ? 'Actualice los datos del paquete.'
                            : 'Complete destinatario, peso y contenido para poder cerrar el consolidado.'}
                        </DialogDescription>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Guía</span>
                        <span className="font-mono text-[12px] font-medium">{editPaquete.numeroGuia ?? editNumeroGuia}</span>
                        <button
                          type="button"
                          onClick={() => copiarTexto(editPaquete.numeroGuia ?? editNumeroGuia, 'Guía')}
                          className="h-5 w-5 rounded hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center"
                          title="Copiar guía"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      {/* Indicador de progreso de obligatorios */}
                      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Obligatorios</span>
                        <div className="flex items-center gap-0.5">
                          {(['destinatario', 'peso', 'contenido'] as const).map((k) => (
                            <span
                              key={k}
                              title={k}
                              className={
                                'h-1.5 w-5 rounded-full ' +
                                (!formErrors[k]
                                  ? 'bg-emerald-500'
                                  : 'bg-muted-foreground/30')
                              }
                            />
                          ))}
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{camposCompletos}/3</span>
                      </div>
                    </div>
                  </DialogHeader>

                  {/* Body */}
                  <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
                    {/* Destinatario */}
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Destinatario
                      </h3>
                      <div className="grid gap-2">
                        <Label htmlFor="ed-dest" className="flex items-center justify-between">
                          <span>
                            Nombre <span className="text-destructive">*</span>
                          </span>
                          {showError('destinatario') && (
                            <span className="text-[11px] text-destructive font-normal">{formErrors.destinatario}</span>
                          )}
                        </Label>
                        <Input
                          id="ed-dest"
                          value={form.destinatario}
                          onChange={(e) => setForm((f) => ({ ...f, destinatario: e.target.value }))}
                          onBlur={() => setTouched((t) => ({ ...t, destinatario: true }))}
                          onKeyDown={handleCtrlEnter}
                          placeholder="Nombre completo del destinatario"
                          autoFocus
                          className={showError('destinatario') ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ed-ref" className="text-muted-foreground">Ref / cédula <span className="text-[10px]">(opcional)</span></Label>
                        <Input
                          id="ed-ref"
                          value={form.ref}
                          onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))}
                          onKeyDown={handleCtrlEnter}
                          placeholder="Identificador del destinatario"
                        />
                      </div>
                    </div>

                    <div className="border-t border-border/50" />

                    {/* Detalles del paquete */}
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Detalles del paquete
                      </h3>

                      {/* Peso con tabs de unidad */}
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="ed-peso" className="flex items-center gap-2">
                            <span>
                              Peso (lbs) <span className="text-destructive">*</span>
                            </span>
                            {pesoConvertidoLabel && (
                              <span className="text-[11px] text-muted-foreground tabular-nums font-normal">{pesoConvertidoLabel}</span>
                            )}
                          </Label>
                          <span className="text-[10px] text-muted-foreground">
                            sólo se almacena en libras
                          </span>
                        </div>
                        <div className="relative">
                          <Input
                            id="ed-peso"
                            type="number"
                            min={0}
                            step={0.01}
                            value={form.pesoLbs}
                            onChange={(e) => setForm((f) => ({ ...f, pesoLbs: e.target.value }))}
                            onBlur={() => setTouched((t) => ({ ...t, peso: true }))}
                            onKeyDown={handleCtrlEnter}
                            placeholder="0.00"
                            className={`pr-12 tabular-nums ${showError('peso') ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium uppercase text-muted-foreground pointer-events-none">
                            LB
                          </span>
                        </div>
                        {showError('peso') && (
                          <span className="text-[11px] text-destructive">{formErrors.peso}</span>
                        )}
                      </div>

                      {/* Contenido */}
                      <div className="grid gap-2">
                        <Label htmlFor="ed-cont" className="flex items-center justify-between">
                          <span>
                            Contenido <span className="text-destructive">*</span>
                          </span>
                          {showError('contenido') && (
                            <span className="text-[11px] text-destructive font-normal">{formErrors.contenido}</span>
                          )}
                        </Label>
                        <Input
                          id="ed-cont"
                          value={form.contenido}
                          onChange={(e) => setForm((f) => ({ ...f, contenido: e.target.value }))}
                          onBlur={() => setTouched((t) => ({ ...t, contenido: true }))}
                          onKeyDown={handleCtrlEnter}
                          placeholder="Ej: Ropa, electrónicos, documentos…"
                          className={showError('contenido') ? 'border-destructive focus-visible:ring-destructive/30' : ''}
                        />
                      </div>

                      {/* Shipper */}
                      <div className="grid gap-2">
                        <Label className="text-muted-foreground">Shipper <span className="text-[10px]">(opcional)</span></Label>
                        <ShipperCombobox
                          shippers={shippers}
                          value={form.shipperId}
                          onChange={(v) => setForm((f) => ({ ...f, shipperId: v }))}
                          placeholder="Sin shipper asignado"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <DialogFooter className="px-6 py-3 border-t border-border/60 bg-muted/20 sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={limpiar}
                        disabled={saving}
                        className="text-xs gap-1"
                        title="Limpiar todos los campos"
                      >
                        <FilterX className="h-3.5 w-3.5" />
                        Limpiar
                      </Button>
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Kbd>Ctrl</Kbd>+<Kbd>↵</Kbd> guardar
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={tryCloseEditDialog} disabled={saving}>
                        Cancelar
                      </Button>
                      <Button onClick={saveEditDialog} disabled={saving || !formIsDirty} className="gap-1.5 min-w-[120px]">
                        {saving ? (
                          'Guardando...'
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Guardar
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
