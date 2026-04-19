import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Layers,
  ArrowLeft,
  Plus,
  Info,
  Trash2,
  PackagePlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Boxes,
  Package,
  Weight,
  Save,
  X,
  Eye,
  RefreshCcw,
  FilterX,
  Hash,
  ListPlus,
  Copy,
  User as UserIcon,
  FileText,
  Truck,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { KpiCard, Kbd } from '@/components/layout/KpiCard';
import { PageContent } from '@/components/layout/PageContent';
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
  createConsolidado,
  addPaqueteToConsolidado,
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
import { listShippers, type Shipper } from '@/services/shippers.service';
import { LBS_TO_KGS, formatNumber as formatPesoNumber } from '@/lib/peso';
import { usePaquetesList } from '@/hooks/usePaquetes';

// =============================================================================
// Tipos / helpers
// =============================================================================

type PaqueteEnLista = {
  paquete: Paquete | null;
  numeroGuia: string;
};

const DRAFT_KEY = 'mv_consolidado_draft';
const DRAFT_TIMESTAMP_KEY = 'mv_consolidado_draft_ts';

function normalizeCodigo(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ');
}

function paqueteEsCompleto(p: Paquete | null): boolean {
  if (!p) return false;
  return !!(p.destinatario && p.contenido && p.pesoLbs != null && p.pesoLbs > 0);
}

function saveDraft(guias: string[]) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(guias));
    localStorage.setItem(DRAFT_TIMESTAMP_KEY, new Date().toISOString());
  } catch {
    /* quota */
  }
}

function loadDraft(): { guias: string[]; ts: string | null } {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const ts = localStorage.getItem(DRAFT_TIMESTAMP_KEY);
    if (!raw) return { guias: [], ts: null };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((g: unknown) => typeof g === 'string')) {
      return { guias: parsed, ts };
    }
  } catch {
    /* corrupt */
  }
  return { guias: [], ts: null };
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem(DRAFT_TIMESTAMP_KEY);
}

function formatRelativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'hace unos segundos';
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.round(hrs / 24);
  return `hace ${days} d`;
}

// =============================================================================
// Componente
// =============================================================================

export default function ConsolidadoNewPage() {
  const navigate = useNavigate();
  const [paquetesParaConsolidado, setPaquetesParaConsolidado] = useState<PaqueteEnLista[]>([]);
  const [createCodigoInput, setCreateCodigoInput] = useState('');
  const [addToListLoading, setAddToListLoading] = useState(false);
  const [showSearchExisting, setShowSearchExisting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [editItemIndex, setEditItemIndex] = useState<number | null>(null);
  const [numeroGuiaConsolidado, setNumeroGuiaConsolidado] = useState('');
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completos' | 'pendientes'>('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  // Form del dialog
  const initialFormState = {
    destinatario: '',
    ref: '',
    pesoLbs: '',
    contenido: '',
    shipperId: '' as number | '',
  };
  const [form, setForm] = useState(initialFormState);
  const [initialForm, setInitialForm] = useState(initialFormState);
  const [touched, setTouched] = useState<{ destinatario?: boolean; peso?: boolean; contenido?: boolean }>({});
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [savingDialog, setSavingDialog] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const { data: allPaquetes } = usePaquetesList();

  const listaGuias = useMemo(
    () => new Set(paquetesParaConsolidado.map((p) => normalizeCodigo(p.numeroGuia))),
    [paquetesParaConsolidado],
  );

  const excludeIds = useMemo(
    () => new Set(paquetesParaConsolidado.filter((p) => p.paquete).map((p) => p.paquete!.id)),
    [paquetesParaConsolidado],
  );

  const resumen = useMemo(() => {
    let lbs = 0;
    let completos = 0;
    let conPeso = 0;
    for (const item of paquetesParaConsolidado) {
      if (item.paquete?.pesoLbs) {
        lbs += item.paquete.pesoLbs;
        conPeso++;
      }
      if (paqueteEsCompleto(item.paquete)) completos++;
    }
    const total = paquetesParaConsolidado.length;
    return {
      total,
      lbs,
      kgs: lbs * LBS_TO_KGS,
      completos,
      pendientes: total - completos,
      conPeso,
      pctCompletos: total > 0 ? Math.round((completos / total) * 100) : 0,
    };
  }, [paquetesParaConsolidado]);

  const filteredPaquetes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return paquetesParaConsolidado
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        if (filterStatus === 'completos' && !paqueteEsCompleto(item.paquete)) return false;
        if (filterStatus === 'pendientes' && paqueteEsCompleto(item.paquete)) return false;
        if (!q) return true;
        const haystack = [
          item.numeroGuia,
          item.paquete?.destinatario,
          item.paquete?.contenido,
          item.paquete?.ref,
          item.paquete?.shipper?.nombre,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
  }, [paquetesParaConsolidado, search, filterStatus]);

  const tabCounts = useMemo(() => {
    let c = 0;
    let p = 0;
    for (const item of paquetesParaConsolidado) {
      if (paqueteEsCompleto(item.paquete)) c++;
      else p++;
    }
    return { all: paquetesParaConsolidado.length, completos: c, pendientes: p };
  }, [paquetesParaConsolidado]);

  // ---------------------------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------------------------

  useEffect(() => {
    listShippers().then(setShippers).catch(console.error);
  }, []);

  useEffect(() => {
    const { guias, ts } = loadDraft();
    setDraftTimestamp(ts);
    if (guias.length === 0) {
      setHydrating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const items: PaqueteEnLista[] = [];
      for (const g of guias) {
        if (cancelled) return;
        try {
          const paquete = await getPaqueteByNumeroGuia(g);
          items.push({ paquete, numeroGuia: g });
        } catch {
          items.push({ paquete: null, numeroGuia: g });
        }
      }
      if (!cancelled) {
        setPaquetesParaConsolidado(items);
        setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrating) return;
    const guias = paquetesParaConsolidado.map((p) => p.numeroGuia);
    if (guias.length === 0) {
      clearDraft();
      setDraftTimestamp(null);
    } else {
      saveDraft(guias);
      setDraftTimestamp(new Date().toISOString());
    }
  }, [paquetesParaConsolidado, hydrating]);

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  const itemBeingEdited =
    editItemIndex != null && editItemIndex >= 0 && editItemIndex < paquetesParaConsolidado.length
      ? paquetesParaConsolidado[editItemIndex]
      : null;

  const addToList = useCallback(async () => {
    const codigo = normalizeCodigo(createCodigoInput);
    if (!codigo) return;
    if (paquetesParaConsolidado.some((p) => normalizeCodigo(p.numeroGuia) === codigo)) {
      toast.warning(`La guía "${codigo}" ya está en la lista.`);
      setCreateCodigoInput('');
      inputRef.current?.focus();
      return;
    }
    setAddToListLoading(true);
    try {
      const paquete = await getPaqueteByNumeroGuia(codigo);
      setPaquetesParaConsolidado((prev) => [...prev, { paquete, numeroGuia: codigo }]);
      toast.success(`Paquete agregado: ${codigo}`, {
        description: paquete ? 'Encontrado en el sistema' : undefined,
      });
    } catch {
      setPaquetesParaConsolidado((prev) => [...prev, { paquete: null, numeroGuia: codigo }]);
      toast.success(`Guía agregada: ${codigo}`, {
        description: 'Sin información — se completará después',
      });
    } finally {
      setCreateCodigoInput('');
      setAddToListLoading(false);
      inputRef.current?.focus();
    }
  }, [createCodigoInput, paquetesParaConsolidado]);

  const removeItem = useCallback(
    (index: number) => {
      const guia = paquetesParaConsolidado[index]?.numeroGuia;
      setPaquetesParaConsolidado((prev) => prev.filter((_, i) => i !== index));
      if (editItemIndex === index) setEditItemIndex(null);
      else if (editItemIndex != null && editItemIndex > index) setEditItemIndex(editItemIndex - 1);
      if (guia) toast.success(`Quitado de la lista: ${guia}`);
      setRemoveIndex(null);
    },
    [editItemIndex, paquetesParaConsolidado],
  );

  const openEditDialog = useCallback(
    (index: number) => {
      const item = paquetesParaConsolidado[index];
      if (!item) return;
      const next = {
        destinatario: item.paquete?.destinatario ?? '',
        ref: item.paquete?.ref ?? '',
        pesoLbs: item.paquete?.pesoLbs != null ? String(item.paquete.pesoLbs) : '',
        contenido: item.paquete?.contenido ?? '',
        shipperId: (item.paquete?.shipper?.id ?? '') as number | '',
      };
      setEditItemIndex(index);
      setForm(next);
      setInitialForm(next);
      setTouched({});
      setShowFormErrors(false);
    },
    [paquetesParaConsolidado],
  );

  const closeEditDialog = useCallback(() => {
    setEditItemIndex(null);
    setForm(initialFormState);
    setInitialForm(initialFormState);
    setTouched({});
    setShowFormErrors(false);
    setSavingDialog(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const errs: { destinatario?: string; peso?: string; contenido?: string } = {};
    const itemEs = itemBeingEdited;
    const requiereTodo = itemEs ? !itemEs.paquete : false;

    if (requiereTodo || form.destinatario.trim()) {
      if (requiereTodo && !form.destinatario.trim()) {
        errs.destinatario = 'El destinatario es obligatorio';
      } else if (form.destinatario.trim().length > 120) {
        errs.destinatario = 'Máximo 120 caracteres';
      }
    }

    const pesoN = form.pesoLbs.trim() ? Number(form.pesoLbs) : NaN;
    if (requiereTodo || form.pesoLbs.trim()) {
      if (requiereTodo && (!form.pesoLbs.trim() || !Number.isFinite(pesoN) || pesoN <= 0)) {
        errs.peso = 'El peso debe ser mayor a 0';
      } else if (form.pesoLbs.trim() && (!Number.isFinite(pesoN) || pesoN < 0)) {
        errs.peso = 'Ingrese un peso válido';
      }
    }

    if (requiereTodo || form.contenido.trim()) {
      if (requiereTodo && !form.contenido.trim()) {
        errs.contenido = 'El contenido es obligatorio';
      } else if (form.contenido.trim().length > 200) {
        errs.contenido = 'Máximo 200 caracteres';
      }
    }
    return errs;
  }, [form, itemBeingEdited]);

  const formIsValid = Object.keys(formErrors).length === 0;

  const showError = (key: 'destinatario' | 'peso' | 'contenido') =>
    (touched[key] || showFormErrors) && !!formErrors[key];

  const camposCompletos = useMemo(() => {
    let n = 0;
    if (form.destinatario.trim()) n++;
    const pesoN = form.pesoLbs.trim() ? Number(form.pesoLbs) : NaN;
    if (Number.isFinite(pesoN) && pesoN > 0) n++;
    if (form.contenido.trim()) n++;
    return n;
  }, [form]);

  const copiarTexto = useCallback(async (texto: string, label: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${label} copiado`);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  }, []);

  const limpiarForm = useCallback(() => {
    setForm(initialFormState);
    setTouched({});
    setShowFormErrors(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryCloseEditDialog = useCallback(() => {
    if (formIsDirty && !savingDialog) {
      const ok = window.confirm('Tiene cambios sin guardar. ¿Desea salir?');
      if (!ok) return;
    }
    closeEditDialog();
  }, [formIsDirty, savingDialog, closeEditDialog]);

  const saveEditDialog = useCallback(async () => {
    if (editItemIndex == null) return;
    const item = paquetesParaConsolidado[editItemIndex];
    if (!item) return;

    if (!formIsValid) {
      setShowFormErrors(true);
      toast.error('Revise los campos marcados');
      return;
    }

    const pesoLbsNum = form.pesoLbs.trim() ? Number(form.pesoLbs) : undefined;
    const shipperIdNum = form.shipperId === '' ? undefined : Number(form.shipperId);

    setSavingDialog(true);
    try {
      if (item.paquete) {
        const input: PaqueteUpdateInput = {
          destinatario: form.destinatario.trim() || null,
          ref: form.ref.trim() || null,
          contenido: form.contenido.trim() || null,
          pesoLbs: pesoLbsNum,
          shipper: shipperIdNum != null ? { id: shipperIdNum } : null,
        };
        const updated = await updatePaquete(item.paquete.id, input);
        setPaquetesParaConsolidado((prev) =>
          prev.map((p, i) => (i === editItemIndex ? { ...p, paquete: updated } : p)),
        );
        toast.success('Información actualizada');
      } else {
        const numeroGuia = item.numeroGuia.trim();
        const input: PaqueteRegistroMinimoInput = {
          numeroGuia,
          destinatario: form.destinatario.trim(),
          ref: form.ref.trim() || undefined,
          pesoLbs: pesoLbsNum!,
          contenido: form.contenido.trim(),
          ...(shipperIdNum != null && shipperIdNum > 0 ? { shipperId: shipperIdNum } : {}),
        };
        const created = await createPaqueteRegistroMinimo(input);
        setPaquetesParaConsolidado((prev) =>
          prev.map((p, i) => (i === editItemIndex ? { ...p, paquete: created } : p)),
        );
        toast.success('Paquete registrado');
      }
      closeEditDialog();
    } catch (e) {
      console.error(e);
      toast.error('No se pudo guardar la información');
    } finally {
      setSavingDialog(false);
    }
  }, [editItemIndex, paquetesParaConsolidado, form, formIsValid, closeEditDialog]);

  const canCreate = paquetesParaConsolidado.length >= 1;

  const handleAgregarAConsolidado = useCallback(async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const guiaTrimmed = numeroGuiaConsolidado.trim() || null;
      const c = await createConsolidado(guiaTrimmed ? { numeroGuia: guiaTrimmed } : undefined);
      for (const item of paquetesParaConsolidado) {
        let paqueteId: number;
        if (item.paquete) {
          paqueteId = item.paquete.id;
        } else {
          const created = await createPaqueteSoloGuia(item.numeroGuia);
          paqueteId = created.id;
        }
        await addPaqueteToConsolidado(c.id, paqueteId);
      }
      clearDraft();
      toast.success('Consolidado creado correctamente', {
        description: `${paquetesParaConsolidado.length} paquete(s) agregado(s)`,
      });
      navigate(`/consolidados/${c.id}`, { replace: true });
    } catch (e) {
      console.error('Error creando consolidado', e);
      toast.error('No se pudo crear el consolidado');
    } finally {
      setCreating(false);
    }
  }, [canCreate, paquetesParaConsolidado, navigate, numeroGuiaConsolidado]);

  const limpiarBorrador = useCallback(() => {
    setPaquetesParaConsolidado([]);
    setNumeroGuiaConsolidado('');
    setSearch('');
    setFilterStatus('all');
    clearDraft();
    setDraftTimestamp(null);
    setConfirmClearOpen(false);
    toast.success('Borrador descartado');
  }, []);

  const limpiarFiltros = useCallback(() => {
    setSearch('');
    setFilterStatus('all');
  }, []);

  // ---------------------------------------------------------------------------
  // Atajos de teclado
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' || tag === 'textarea' || target?.isContentEditable;

      // Ctrl/Cmd + S → crear consolidado
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (canCreate && !creating) handleAgregarAConsolidado();
        return;
      }

      // Ctrl/Cmd + L → limpiar borrador
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (paquetesParaConsolidado.length > 0) setConfirmClearOpen(true);
        return;
      }

      if (isTyping) return;

      // "/" → enfocar input de añadir
      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canCreate, creating, paquetesParaConsolidado.length, handleAgregarAConsolidado]);

  const handleCtrlEnter = (e: ReactKeyboardEvent<HTMLElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !savingDialog) {
      e.preventDefault();
      saveEditDialog();
    }
  };

  const pesoConvertidoLabel =
    form.pesoLbs && Number(form.pesoLbs) > 0
      ? `≈ ${formatPesoNumber(Number(form.pesoLbs) * LBS_TO_KGS)} kg`
      : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const draftAge = formatRelativeTime(draftTimestamp);

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Crear consolidado"
        icon={<Layers className="h-4 w-4" />}
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/consolidados')}
              className="gap-1.5 h-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </Button>
          </div>
        }
      >
        <PageContent className="pb-28">
          {/* Banner contextual */}
          <div
            className={`rounded-xl border p-4 ${
              resumen.total === 0
                ? 'border-dashed border-border bg-muted/20'
                : resumen.pendientes > 0
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-emerald-500/30 bg-emerald-500/5'
            }`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div
                  className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                    resumen.total === 0
                      ? 'bg-muted text-muted-foreground'
                      : resumen.pendientes > 0
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {resumen.total === 0 ? (
                    <ListPlus className="h-5 w-5" />
                  ) : resumen.pendientes > 0 ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="font-medium">
                    {resumen.total === 0
                      ? 'Aún no hay paquetes en la lista'
                      : resumen.pendientes > 0
                      ? `${resumen.pendientes} paquete(s) pendiente(s) de información`
                      : 'Todos los paquetes están completos'}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {resumen.total === 0
                      ? 'Tipee o escanee códigos de paquete para agregarlos al consolidado.'
                      : resumen.pendientes > 0
                      ? 'Puede crear el consolidado ahora y completar la información después, o usar “Info” para registrar los datos antes.'
                      : 'Listo para cerrar y enviar. Puede asignar la guía de envío y crear el consolidado.'}
                  </p>
                  {draftAge && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <RefreshCcw className="h-3 w-3" />
                      Borrador guardado {draftAge}
                    </p>
                  )}
                </div>
              </div>
              {resumen.total > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setConfirmClearOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Descartar borrador
                </Button>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={<Boxes className="h-4 w-4" />}
              label="Paquetes"
              value={resumen.total}
              accent="primary"
              hint={resumen.total === 0 ? 'Sin paquetes' : `${resumen.total} en la lista`}
            />
            <KpiCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Completos"
              value={resumen.completos}
              accent="success"
              hint={resumen.total > 0 ? `${resumen.pctCompletos}% del total` : '—'}
              progress={resumen.pctCompletos}
            />
            <KpiCard
              icon={<AlertCircle className="h-4 w-4" />}
              label="Pendientes"
              value={resumen.pendientes}
              accent={resumen.pendientes > 0 ? 'warning' : 'muted'}
              hint={resumen.pendientes > 0 ? 'Faltan datos' : 'Sin pendientes'}
            />
            <KpiCard
              icon={<Weight className="h-4 w-4" />}
              label="Peso total"
              value={`${formatPesoNumber(resumen.lbs)} lb`}
              accent="info"
              hint={`${formatPesoNumber(resumen.kgs)} kg derivados`}
            />
          </div>

          {/* Agregar paquete */}
          <SectionCard icon={PackagePlus} iconColor="orange" title="Agregar paquete a la lista">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={inputRef}
                    placeholder="Tipee o escanee el código de paquete…"
                    value={createCodigoInput}
                    onChange={(e) => setCreateCodigoInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addToList()}
                    className="pl-9 font-mono"
                    autoFocus
                    disabled={hydrating}
                  />
                  {createCodigoInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreateCodigoInput('');
                        inputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center"
                      aria-label="Limpiar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Button
                  onClick={addToList}
                  disabled={
                    addToListLoading || !normalizeCodigo(createCodigoInput) || hydrating
                  }
                  className="gap-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </div>

              {!showSearchExisting ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                  onClick={() => setShowSearchExisting(true)}
                >
                  <Search className="h-3.5 w-3.5" />
                  Buscar paquete ya registrado
                </Button>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase text-muted-foreground tracking-wider font-medium">
                      Buscar paquete existente
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => setShowSearchExisting(false)}
                    >
                      <X className="h-3 w-3" />
                      Ocultar
                    </Button>
                  </div>
                  <PaqueteSearchCombobox
                    paquetes={allPaquetes}
                    excludeIds={excludeIds}
                    disabled={hydrating}
                    onSelect={(paq) => {
                      const codigo = normalizeCodigo(paq.numeroGuia);
                      if (listaGuias.has(codigo)) {
                        toast.warning(`La guía "${codigo}" ya está en la lista.`);
                        return;
                      }
                      setPaquetesParaConsolidado((prev) => [
                        ...prev,
                        { paquete: paq, numeroGuia: paq.numeroGuia },
                      ]);
                      toast.success(`Paquete agregado: ${paq.numeroGuia}`);
                      inputRef.current?.focus();
                    }}
                  />
                </div>
              )}

              {hydrating && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <RefreshCcw className="h-3 w-3 animate-spin" />
                  Restaurando lista guardada…
                </p>
              )}
            </div>
          </SectionCard>

          {/* Guía del consolidado */}
          {paquetesParaConsolidado.length > 0 && (
            <SectionCard icon={Layers} iconColor="blue" title="Guía de envío del consolidado">
              <div className="grid gap-2">
                <Label htmlFor="guia-consolidado" className="text-xs text-muted-foreground">
                  Identificador externo (opcional)
                </Label>
                <Input
                  id="guia-consolidado"
                  value={numeroGuiaConsolidado}
                  onChange={(e) => setNumeroGuiaConsolidado(e.target.value)}
                  placeholder="Ej: TRACK-123456"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Puede asignar la guía ahora o después desde el detalle del consolidado.
                </p>
              </div>
            </SectionCard>
          )}

          {/* Lista de paquetes */}
          {paquetesParaConsolidado.length > 0 && (
            <SectionCard
              icon={Package}
              iconColor="green"
              title={`Paquetes en la lista (${paquetesParaConsolidado.length})`}
            >
              {/* Toolbar interna */}
              <div className="flex items-center justify-between gap-2 mb-3 -mt-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar guía, destinatario, contenido…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground flex items-center justify-center"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {(search || filterStatus !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={limpiarFiltros}
                    className="h-8 gap-1 text-muted-foreground"
                    title="Limpiar filtros"
                  >
                    <FilterX className="h-3.5 w-3.5" />
                    <span className="text-xs">Limpiar filtros</span>
                  </Button>
                )}
              </div>

              {/* Tabs de estado */}
              <div className="flex items-center gap-1 border-b border-border/50 -mx-6 px-6 mb-3">
                {([
                  { key: 'all', label: 'Todos', count: tabCounts.all },
                  { key: 'completos', label: 'Completos', count: tabCounts.completos },
                  { key: 'pendientes', label: 'Pendientes', count: tabCounts.pendientes },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFilterStatus(t.key)}
                    className={`relative px-3 py-2 text-xs font-medium transition-colors -mb-px border-b-2 ${
                      filterStatus === t.key
                        ? 'text-foreground border-primary'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 text-[10px] tabular-nums opacity-70">{t.count}</span>
                  </button>
                ))}
              </div>

              {filteredPaquetes.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Sin resultados con los filtros actuales.
                  <Button variant="link" size="sm" onClick={limpiarFiltros} className="ml-1 h-auto p-0">
                    Limpiar
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border/60 -mx-6 border-y border-border/40">
                  {filteredPaquetes.map(({ item, originalIndex }) => {
                    const completo = paqueteEsCompleto(item.paquete);
                    return (
                      <li
                        key={`${item.numeroGuia}-${originalIndex}`}
                        className="group flex items-center gap-3 px-6 py-2.5 hover:bg-accent/30 transition-colors"
                      >
                        {/* Posición temporal */}
                        <span
                          className="inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold tabular-nums shrink-0"
                          title="Posición provisional dentro del consolidado"
                        >
                          {originalIndex + 1}
                        </span>

                        {/* Info principal */}
                        <div className="min-w-0 flex-1 grid sm:grid-cols-[200px_1fr_auto] gap-x-3 gap-y-1 items-center">
                          <div className="min-w-0">
                            <div className="font-mono text-xs truncate">{item.numeroGuia}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.paquete ? (
                                completo ? (
                                  <Badge
                                    variant="outline"
                                    className="font-normal h-5 px-1.5 gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Completo
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="font-normal h-5 px-1.5 gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  >
                                    <AlertCircle className="h-3 w-3" />
                                    Falta info
                                  </Badge>
                                )
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="font-normal h-5 px-1.5 gap-1"
                                >
                                  <Hash className="h-3 w-3" />
                                  Sólo guía
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 text-xs">
                            {item.paquete?.destinatario ? (
                              <div className="truncate">
                                <span className="text-muted-foreground">Para:</span>{' '}
                                <span className="font-medium">{item.paquete.destinatario}</span>
                                {item.paquete.ref && (
                                  <span className="text-muted-foreground">
                                    {' '}
                                    · {item.paquete.ref}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sin destinatario</span>
                            )}
                            {item.paquete?.contenido && (
                              <div className="truncate text-muted-foreground">
                                {item.paquete.contenido}
                              </div>
                            )}
                          </div>

                          <div className="text-right text-xs tabular-nums shrink-0">
                            {item.paquete?.pesoLbs != null ? (
                              <>
                                <div className="font-medium">
                                  {formatPesoNumber(item.paquete.pesoLbs)} lb
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {formatPesoNumber(item.paquete.pesoLbs * LBS_TO_KGS)} kg
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">— lb</span>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-1 shrink-0">
                          {item.paquete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => navigate(`/paquetes/${item.paquete!.id}`)}
                              title="Ver paquete"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => openEditDialog(originalIndex)}
                            title={item.paquete ? 'Editar información' : 'Completar información'}
                          >
                            <Info className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">
                              {item.paquete ? 'Editar' : 'Completar'}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setRemoveIndex(originalIndex)}
                            title="Quitar de la lista"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>
          )}

          {/* Atajos */}
          <div className="text-[11px] text-muted-foreground text-center pt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Atajos:</span>
            <Kbd>/</Kbd>
            <span>añadir</span>
            <span className="opacity-40">·</span>
            <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd>
            <span>crear</span>
            <span className="opacity-40">·</span>
            <Kbd>Ctrl</Kbd> + <Kbd>L</Kbd>
            <span>descartar borrador</span>
          </div>
        </PageContent>

        {/* Footer sticky con CTA */}
        <div className="sticky bottom-0 left-0 right-0 -mx-4 sm:-mx-6 lg:-mx-8 border-t border-border bg-background/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3 mt-4 z-10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Boxes className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground tabular-nums">{resumen.total}</span>
                paquete(s)
              </span>
              <span className="opacity-40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Weight className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground tabular-nums">
                  {formatPesoNumber(resumen.lbs)} lb
                </span>
                <span className="opacity-70">/ {formatPesoNumber(resumen.kgs)} kg</span>
              </span>
              {resumen.pendientes > 0 && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {resumen.pendientes} pendiente(s)
                  </span>
                </>
              )}
            </div>
            <Button
              onClick={handleAgregarAConsolidado}
              disabled={!canCreate || creating}
              className="gap-1.5"
            >
              <PackagePlus className="h-4 w-4" />
              {creating ? 'Creando consolidado…' : 'Crear consolidado'}
            </Button>
          </div>
        </div>

        {/* Dialog: Completar / editar información */}
        <Dialog
          open={editItemIndex != null}
          onOpenChange={(open) => {
            if (!open) tryCloseEditDialog();
          }}
        >
          <DialogContent className="max-w-xl rounded-2xl border-border/50 p-0 overflow-hidden">
            {itemBeingEdited && (() => {
              const yaRegistrado = !!itemBeingEdited.paquete;
              const requiereTodo = !yaRegistrado;
              const totalObligatorios = requiereTodo ? 3 : 0;
              const guia = itemBeingEdited.numeroGuia;

              return (
                <>
                  {/* Header */}
                  <DialogHeader className="px-6 py-4 border-b border-border/60 bg-muted/30 space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ' +
                          (yaRegistrado
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400')
                        }
                      >
                        {yaRegistrado ? <Info className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <DialogTitle className="text-base">
                          {yaRegistrado ? 'Editar información' : 'Completar información'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          {yaRegistrado
                            ? 'Actualice los datos del paquete antes de crear el consolidado.'
                            : 'Complete destinatario, peso y contenido para registrar el paquete.'}
                        </DialogDescription>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Pill con la guía + copiar */}
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Guía</span>
                        <span className="font-mono text-[12px] font-medium">{guia}</span>
                        <button
                          type="button"
                          onClick={() => copiarTexto(guia, 'Guía')}
                          className="h-5 w-5 rounded hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center"
                          title="Copiar guía"
                          aria-label="Copiar guía al portapapeles"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Estado / progreso */}
                      {requiereTodo ? (
                        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Obligatorios
                          </span>
                          <div className="flex items-center gap-0.5">
                            {(['destinatario', 'peso', 'contenido'] as const).map((k) => (
                              <span
                                key={k}
                                title={k}
                                className={
                                  'h-1.5 w-5 rounded-full ' +
                                  (!formErrors[k] ? 'bg-emerald-500' : 'bg-muted-foreground/30')
                                }
                              />
                            ))}
                          </div>
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {camposCompletos}/{totalObligatorios}
                          </span>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="font-normal h-6 px-2 gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Ya registrado
                        </Badge>
                      )}
                    </div>
                  </DialogHeader>

                  {/* Body */}
                  <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
                    {/* Destinatario */}
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <UserIcon className="h-3 w-3" />
                        Destinatario
                      </h3>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-destinatario" className="flex items-center justify-between">
                          <span>
                            Nombre {requiereTodo && <span className="text-destructive">*</span>}
                          </span>
                          {showError('destinatario') && (
                            <span className="text-[11px] text-destructive font-normal">
                              {formErrors.destinatario}
                            </span>
                          )}
                        </Label>
                        <Input
                          id="edit-destinatario"
                          value={form.destinatario}
                          onChange={(e) => setForm((f) => ({ ...f, destinatario: e.target.value }))}
                          onBlur={() => setTouched((t) => ({ ...t, destinatario: true }))}
                          onKeyDown={handleCtrlEnter}
                          placeholder="Nombre completo del destinatario"
                          autoFocus
                          maxLength={120}
                          className={
                            showError('destinatario')
                              ? 'border-destructive focus-visible:ring-destructive/30'
                              : ''
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="edit-ref" className="text-muted-foreground">
                          Ref / cédula <span className="text-[10px]">(opcional)</span>
                        </Label>
                        <Input
                          id="edit-ref"
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
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        Detalles del paquete
                      </h3>

                      {/* Peso */}
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="edit-peso-lbs" className="flex items-center gap-2">
                            <span>
                              Peso (lbs){requiereTodo && <span className="text-destructive"> *</span>}
                            </span>
                            {pesoConvertidoLabel && (
                              <span className="text-[11px] text-muted-foreground tabular-nums font-normal">
                                {pesoConvertidoLabel}
                              </span>
                            )}
                          </Label>
                          <span className="text-[10px] text-muted-foreground">
                            sólo se almacena en libras
                          </span>
                        </div>
                        <div className="relative">
                          <Input
                            id="edit-peso-lbs"
                            type="number"
                            min={0}
                            step={0.01}
                            value={form.pesoLbs}
                            onChange={(e) => setForm((f) => ({ ...f, pesoLbs: e.target.value }))}
                            onBlur={() => setTouched((t) => ({ ...t, peso: true }))}
                            onKeyDown={handleCtrlEnter}
                            placeholder="0.00"
                            className={`pr-12 tabular-nums ${
                              showError('peso')
                                ? 'border-destructive focus-visible:ring-destructive/30'
                                : ''
                            }`}
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
                        <Label htmlFor="edit-contenido" className="flex items-center justify-between">
                          <span>
                            Contenido {requiereTodo && <span className="text-destructive">*</span>}
                          </span>
                          {showError('contenido') && (
                            <span className="text-[11px] text-destructive font-normal">
                              {formErrors.contenido}
                            </span>
                          )}
                        </Label>
                        <Input
                          id="edit-contenido"
                          value={form.contenido}
                          onChange={(e) => setForm((f) => ({ ...f, contenido: e.target.value }))}
                          onBlur={() => setTouched((t) => ({ ...t, contenido: true }))}
                          onKeyDown={handleCtrlEnter}
                          placeholder="Ej: Ropa, electrónicos, documentos…"
                          maxLength={200}
                          className={
                            showError('contenido')
                              ? 'border-destructive focus-visible:ring-destructive/30'
                              : ''
                          }
                        />
                        <div className="flex justify-end">
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {form.contenido.length}/200
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border/50" />

                    {/* Shipper */}
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Truck className="h-3 w-3" />
                        Shipper
                      </h3>
                      <div className="grid gap-2">
                        <Label className="text-muted-foreground">
                          Asignar shipper <span className="text-[10px]">(opcional)</span>
                        </Label>
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
                        onClick={limpiarForm}
                        disabled={savingDialog}
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
                      <Button
                        variant="outline"
                        onClick={tryCloseEditDialog}
                        disabled={savingDialog}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={saveEditDialog}
                        disabled={
                          savingDialog ||
                          (yaRegistrado && !formIsDirty) ||
                          (!formIsValid && showFormErrors)
                        }
                        className="gap-1.5 min-w-[120px]"
                      >
                        {savingDialog ? (
                          'Guardando…'
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
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

        {/* Confirmar descartar borrador */}
        <ConfirmDeleteDialog
          open={confirmClearOpen}
          onOpenChange={setConfirmClearOpen}
          entityLabel="el borrador"
          entityName={`${paquetesParaConsolidado.length} paquete(s) en la lista`}
          onConfirm={limpiarBorrador}
        />

        {/* Confirmar quitar paquete */}
        <ConfirmDeleteDialog
          open={removeIndex != null}
          onOpenChange={(open) => !open && setRemoveIndex(null)}
          entityLabel="paquete de la lista"
          entityName={
            removeIndex != null ? paquetesParaConsolidado[removeIndex]?.numeroGuia ?? null : null
          }
          onConfirm={() => {
            if (removeIndex != null) removeItem(removeIndex);
          }}
        />
      </StandardPageLayout>
    </DashboardLayout>
  );
}
