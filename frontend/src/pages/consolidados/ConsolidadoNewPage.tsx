import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
  type ClipboardEvent as ReactClipboardEvent,
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
  ChevronRight,
  Lightbulb,
  XCircle,
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { processPool } from '@/lib/concurrency';
import {
  CONSOLIDADO_DRAFT_KEY,
  CONSOLIDADO_DRAFT_TIMESTAMP_KEY,
} from '@/lib/consolidadoDraftStorage';
import { usePaquetesList } from '@/hooks/usePaquetes';

// =============================================================================
// Tipos / helpers
// =============================================================================

type PaqueteEnLista = {
  paquete: Paquete | null;
  numeroGuia: string;
  /** Shipper preasignado (sólo aplica cuando aún no hay `paquete`). */
  shipperPreasignadoId?: number | null;
};

type CreationFailure = {
  numeroGuia: string;
  reason: string;
  /** Cuando ya se registró el paquete pero falló al añadirlo al consolidado. */
  paqueteId?: number;
};

type CreationProgress = {
  current: number;
  total: number;
  message: string;
};

const BULK_SEPARATOR = /[\s,;|]+/;
const MAX_BULK_PASTE = 200;
const CREATE_CONCURRENCY = 4;
const BULK_LOOKUP_CONCURRENCY = 6;

function normalizeCodigo(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ');
}

function paqueteEsCompleto(p: Paquete | null): boolean {
  if (!p) return false;
  return !!(p.destinatario && p.contenido && p.pesoLbs != null && p.pesoLbs > 0);
}

type DraftV2 = {
  v: 2;
  items: { g: string; s?: number | null }[];
  /** Guía de envío del consolidado (opcional). */
  consolidadoGuia?: string;
};

function saveDraft(items: PaqueteEnLista[], consolidadoGuia: string) {
  try {
    const guiaCons = consolidadoGuia.trim();
    const payload: DraftV2 = {
      v: 2,
      items: items.map((p) => ({
        g: p.numeroGuia,
        ...(p.shipperPreasignadoId != null
          ? { s: p.shipperPreasignadoId }
          : {}),
      })),
      ...(guiaCons ? { consolidadoGuia: guiaCons } : {}),
    };
    localStorage.setItem(CONSOLIDADO_DRAFT_KEY, JSON.stringify(payload));
    localStorage.setItem(CONSOLIDADO_DRAFT_TIMESTAMP_KEY, new Date().toISOString());
  } catch {
    /* quota */
  }
}

type LoadedDraftItem = { numeroGuia: string; shipperPreasignadoId?: number | null };

function loadDraft(): {
  items: LoadedDraftItem[];
  ts: string | null;
  consolidadoGuia: string;
} {
  try {
    const raw = localStorage.getItem(CONSOLIDADO_DRAFT_KEY);
    const ts = localStorage.getItem(CONSOLIDADO_DRAFT_TIMESTAMP_KEY);
    if (!raw) return { items: [], ts: null, consolidadoGuia: '' };
    const parsed = JSON.parse(raw) as unknown;

    // v2: { v: 2, items: [{ g, s? }], consolidadoGuia? }
    if (
      parsed &&
      typeof parsed === 'object' &&
      'v' in parsed &&
      (parsed as { v: number }).v === 2 &&
      Array.isArray((parsed as DraftV2).items)
    ) {
      const d = parsed as DraftV2;
      const items = d.items
        .filter((it) => it && typeof it.g === 'string' && it.g.trim())
        .map((it) => ({
          numeroGuia: it.g,
          shipperPreasignadoId:
            typeof it.s === 'number' && it.s > 0 ? it.s : null,
        }));
      const consolidadoGuia =
        typeof d.consolidadoGuia === 'string' ? d.consolidadoGuia.trim() : '';
      return { items, ts, consolidadoGuia };
    }

    // v1: string[]
    if (Array.isArray(parsed) && parsed.every((g: unknown) => typeof g === 'string')) {
      return {
        items: (parsed as string[]).map((g) => ({ numeroGuia: g })),
        ts,
        consolidadoGuia: '',
      };
    }
  } catch {
    /* corrupt */
  }
  return { items: [], ts: null, consolidadoGuia: '' };
}

function clearDraft() {
  localStorage.removeItem(CONSOLIDADO_DRAFT_KEY);
  localStorage.removeItem(CONSOLIDADO_DRAFT_TIMESTAMP_KEY);
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

// `processPool` se importa desde `@/lib/concurrency` para reutilización.

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
  const [creationProgress, setCreationProgress] = useState<CreationProgress | null>(null);
  const [creationFailures, setCreationFailures] = useState<CreationFailure[]>([]);
  const [pendingConsolidadoId, setPendingConsolidadoId] = useState<number | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [editItemIndex, setEditItemIndex] = useState<number | null>(null);
  const [numeroGuiaConsolidado, setNumeroGuiaConsolidado] = useState('');
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completos' | 'pendientes'>('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  // Selección múltiple
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [bulkRemoveOpen, setBulkRemoveOpen] = useState(false);
  const [bulkShipperOpen, setBulkShipperOpen] = useState(false);
  const [bulkShipperId, setBulkShipperId] = useState<number | ''>('');
  const [applyingBulkShipper, setApplyingBulkShipper] = useState(false);

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

  // Sugerencia: si todos los paquetes registrados con shipper apuntan al mismo,
  // ofrecer aplicar ese shipper a los huérfanos (sólo-guía o registrados sin shipper).
  const commonShipperSuggestion = useMemo(() => {
    const conShipper: number[] = [];
    let huerfanos = 0;
    for (const item of paquetesParaConsolidado) {
      if (item.paquete?.shipper?.id) {
        conShipper.push(item.paquete.shipper.id);
      } else if (!item.paquete) {
        // sólo guía → siempre huérfano si no tiene preasignado
        if (item.shipperPreasignadoId == null) huerfanos++;
      } else {
        // registrado pero sin shipper
        huerfanos++;
      }
    }
    if (conShipper.length === 0 || huerfanos === 0) return null;
    const first = conShipper[0];
    const allSame = conShipper.every((id) => id === first);
    if (!allSame) return null;
    const shipper = shippers.find((s) => s.id === first);
    if (!shipper) return null;
    return { shipperId: first, shipperNombre: shipper.nombre, huerfanos };
  }, [paquetesParaConsolidado, shippers]);

  // Selección
  const visibleIndexes = useMemo(
    () => filteredPaquetes.map((f) => f.originalIndex),
    [filteredPaquetes],
  );

  const visibleSelectedCount = useMemo(
    () => visibleIndexes.filter((i) => selectedIndexes.has(i)).length,
    [visibleIndexes, selectedIndexes],
  );

  const selectionState: 'none' | 'all' | 'partial' =
    visibleIndexes.length === 0
      ? 'none'
      : visibleSelectedCount === 0
      ? 'none'
      : visibleSelectedCount === visibleIndexes.length
      ? 'all'
      : 'partial';

  // Limpia selección cuando la lista cambia drásticamente o se filtra fuera.
  useEffect(() => {
    if (selectedIndexes.size === 0) return;
    setSelectedIndexes((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx < paquetesParaConsolidado.length) next.add(idx);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paquetesParaConsolidado.length]);

  // ---------------------------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------------------------

  useEffect(() => {
    listShippers().then(setShippers).catch(console.error);
  }, []);

  useEffect(() => {
    const { items, ts, consolidadoGuia } = loadDraft();
    setDraftTimestamp(ts);
    if (consolidadoGuia) setNumeroGuiaConsolidado(consolidadoGuia);
    if (items.length === 0) {
      setHydrating(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const hydrated: PaqueteEnLista[] = await processPool(
        items,
        BULK_LOOKUP_CONCURRENCY,
        async (it) => {
          try {
            const paquete = await getPaqueteByNumeroGuia(it.numeroGuia);
            return {
              paquete,
              numeroGuia: it.numeroGuia,
              shipperPreasignadoId:
                paquete == null ? it.shipperPreasignadoId ?? null : null,
            };
          } catch {
            return {
              paquete: null,
              numeroGuia: it.numeroGuia,
              shipperPreasignadoId: it.shipperPreasignadoId ?? null,
            };
          }
        },
      );
      if (!cancelled) {
        setPaquetesParaConsolidado(hydrated);
        setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hydrating) return;
    const guiaCons = numeroGuiaConsolidado.trim();
    if (paquetesParaConsolidado.length === 0 && !guiaCons) {
      clearDraft();
      setDraftTimestamp(null);
    } else {
      saveDraft(paquetesParaConsolidado, numeroGuiaConsolidado);
      setDraftTimestamp(new Date().toISOString());
    }
  }, [paquetesParaConsolidado, numeroGuiaConsolidado, hydrating]);

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  const itemBeingEdited =
    editItemIndex != null && editItemIndex >= 0 && editItemIndex < paquetesParaConsolidado.length
      ? paquetesParaConsolidado[editItemIndex]
      : null;

  /** Añade una sola guía (o registra como sólo-guía si no existe). */
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

  /** Añade muchas guías a la vez (paste / escaneo en lote). */
  const bulkAdd = useCallback(
    async (raw: string[]) => {
      const seen = new Set<string>();
      const tokens: string[] = [];
      for (const t of raw) {
        const c = normalizeCodigo(t);
        if (!c || seen.has(c)) continue;
        seen.add(c);
        tokens.push(c);
      }
      if (tokens.length === 0) return;
      if (tokens.length > MAX_BULK_PASTE) {
        toast.warning(
          `Demasiadas guías (${tokens.length}). Se procesarán las primeras ${MAX_BULK_PASTE}.`,
        );
        tokens.length = MAX_BULK_PASTE;
      }

      const yaEnLista = new Set(
        paquetesParaConsolidado.map((p) => normalizeCodigo(p.numeroGuia)),
      );

      const aProcesar = tokens.filter((t) => !yaEnLista.has(t));
      const duplicadas = tokens.length - aProcesar.length;

      if (aProcesar.length === 0) {
        toast.warning(
          duplicadas === 1
            ? 'La guía ya está en la lista.'
            : `Las ${duplicadas} guías ya están en la lista.`,
        );
        return;
      }

      setAddToListLoading(true);
      const toastId = toast.loading(
        `Procesando ${aProcesar.length} guía${aProcesar.length === 1 ? '' : 's'}…`,
      );
      try {
        const resultados = await processPool(
          aProcesar,
          BULK_LOOKUP_CONCURRENCY,
          async (codigo): Promise<PaqueteEnLista> => {
            try {
              const paquete = await getPaqueteByNumeroGuia(codigo);
              return { paquete, numeroGuia: codigo };
            } catch {
              return { paquete: null, numeroGuia: codigo };
            }
          },
        );

        let conInfo = 0;
        let soloGuia = 0;
        for (const r of resultados) {
          if (r.paquete) conInfo++;
          else soloGuia++;
        }

        setPaquetesParaConsolidado((prev) => [...prev, ...resultados]);
        setCreateCodigoInput('');

        const partes: string[] = [];
        if (conInfo > 0) partes.push(`${conInfo} con información`);
        if (soloGuia > 0) partes.push(`${soloGuia} sin información`);
        if (duplicadas > 0) partes.push(`${duplicadas} duplicada${duplicadas === 1 ? '' : 's'}`);

        toast.success(
          `${aProcesar.length} guía${aProcesar.length === 1 ? '' : 's'} agregada${
            aProcesar.length === 1 ? '' : 's'
          }`,
          { id: toastId, description: partes.join(' · ') },
        );
      } finally {
        setAddToListLoading(false);
        inputRef.current?.focus();
      }
    },
    [paquetesParaConsolidado],
  );

  /** Handler de pegado: si pegan múltiples guías, las procesa en lote. */
  const handleInputPaste = useCallback(
    (e: ReactClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData('text');
      if (!text) return;
      const tokens = text
        .split(BULK_SEPARATOR)
        .map((s) => s.trim())
        .filter(Boolean);
      if (tokens.length <= 1) return; // pegado normal
      e.preventDefault();
      void bulkAdd(tokens);
    },
    [bulkAdd],
  );

  const removeItem = useCallback(
    (index: number) => {
      const guia = paquetesParaConsolidado[index]?.numeroGuia;
      setPaquetesParaConsolidado((prev) => prev.filter((_, i) => i !== index));
      if (editItemIndex === index) setEditItemIndex(null);
      else if (editItemIndex != null && editItemIndex > index) setEditItemIndex(editItemIndex - 1);
      setSelectedIndexes((prev) => {
        const next = new Set<number>();
        for (const i of prev) {
          if (i === index) continue;
          next.add(i > index ? i - 1 : i);
        }
        return next;
      });
      if (guia) toast.success(`Quitado de la lista: ${guia}`);
      setRemoveIndex(null);
    },
    [editItemIndex, paquetesParaConsolidado],
  );

  // -- Selección múltiple ------------------------------------------------------

  const toggleSelected = useCallback((index: number, checked: boolean) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(index);
      else next.delete(index);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      const allSelected = visibleIndexes.every((i) => next.has(i));
      if (allSelected) {
        for (const i of visibleIndexes) next.delete(i);
      } else {
        for (const i of visibleIndexes) next.add(i);
      }
      return next;
    });
  }, [visibleIndexes]);

  const clearSelection = useCallback(() => setSelectedIndexes(new Set()), []);

  const removeSelected = useCallback(() => {
    if (selectedIndexes.size === 0) return;
    const toRemove = selectedIndexes;
    const removedCount = toRemove.size;
    setPaquetesParaConsolidado((prev) =>
      prev.filter((_, i) => !toRemove.has(i)),
    );
    setSelectedIndexes(new Set());
    if (editItemIndex != null && toRemove.has(editItemIndex)) {
      setEditItemIndex(null);
    }
    setBulkRemoveOpen(false);
    toast.success(`${removedCount} paquete${removedCount === 1 ? '' : 's'} quitado${removedCount === 1 ? '' : 's'} de la lista`);
  }, [selectedIndexes, editItemIndex]);

  /** Aplica un shipper a todos los seleccionados (registra updates al backend). */
  const applyBulkShipper = useCallback(
    async (shipperId: number, indexes: Set<number>) => {
      if (shipperId == null || indexes.size === 0) return;
      setApplyingBulkShipper(true);
      const toastId = toast.loading(
        `Asignando shipper a ${indexes.size} paquete${indexes.size === 1 ? '' : 's'}…`,
      );
      const items = paquetesParaConsolidado
        .map((it, i) => ({ it, i }))
        .filter(({ i }) => indexes.has(i));

      let actualizados = 0;
      let preasignados = 0;
      const fallidos: string[] = [];

      const conPaquete = items.filter(({ it }) => it.paquete);
      const sinPaquete = items.filter(({ it }) => !it.paquete);

      // Update concurrente para los que ya están registrados.
      const updatesByIndex = new Map<number, Paquete>();
      await processPool(conPaquete, CREATE_CONCURRENCY, async ({ it, i }) => {
        try {
          const updated = await updatePaquete(it.paquete!.id, {
            shipper: { id: shipperId },
          });
          updatesByIndex.set(i, updated);
          actualizados++;
        } catch (e) {
          console.error('Error asignando shipper', it.numeroGuia, e);
          fallidos.push(it.numeroGuia);
        }
      });

      // Para los sólo-guía: marcar como preasignado localmente.
      const preasignacionByIndex = new Map<number, number>();
      for (const { i } of sinPaquete) {
        preasignacionByIndex.set(i, shipperId);
        preasignados++;
      }

      setPaquetesParaConsolidado((prev) =>
        prev.map((p, i) => {
          if (updatesByIndex.has(i)) {
            return { ...p, paquete: updatesByIndex.get(i)!, shipperPreasignadoId: null };
          }
          if (preasignacionByIndex.has(i)) {
            return { ...p, shipperPreasignadoId: preasignacionByIndex.get(i)! };
          }
          return p;
        }),
      );

      const partes: string[] = [];
      if (actualizados > 0) partes.push(`${actualizados} actualizado${actualizados === 1 ? '' : 's'}`);
      if (preasignados > 0) partes.push(`${preasignados} preasignado${preasignados === 1 ? '' : 's'}`);
      if (fallidos.length > 0) partes.push(`${fallidos.length} fallido${fallidos.length === 1 ? '' : 's'}`);

      if (fallidos.length === 0) {
        toast.success('Shipper asignado', {
          id: toastId,
          description: partes.join(' · '),
        });
      } else {
        toast.warning(`Aplicado con ${fallidos.length} error${fallidos.length === 1 ? '' : 'es'}`, {
          id: toastId,
          description: partes.join(' · '),
        });
      }

      setApplyingBulkShipper(false);
      setBulkShipperOpen(false);
      setBulkShipperId('');
    },
    [paquetesParaConsolidado],
  );

  /** Aplica el shipper común sugerido a los paquetes huérfanos. */
  const applyCommonShipperToOrphans = useCallback(async () => {
    if (!commonShipperSuggestion) return;
    const huerfanosIdx = new Set<number>();
    paquetesParaConsolidado.forEach((it, i) => {
      const tieneShipper = !!it.paquete?.shipper?.id;
      if (!tieneShipper && it.shipperPreasignadoId !== commonShipperSuggestion.shipperId) {
        huerfanosIdx.add(i);
      }
    });
    if (huerfanosIdx.size === 0) return;
    await applyBulkShipper(commonShipperSuggestion.shipperId, huerfanosIdx);
  }, [commonShipperSuggestion, paquetesParaConsolidado, applyBulkShipper]);

  // -- Dialog de edición ------------------------------------------------------

  const openEditDialog = useCallback(
    (index: number) => {
      const item = paquetesParaConsolidado[index];
      if (!item) return;
      const next = {
        destinatario: item.paquete?.destinatario ?? '',
        ref: item.paquete?.ref ?? '',
        pesoLbs: item.paquete?.pesoLbs != null ? String(item.paquete.pesoLbs) : '',
        contenido: item.paquete?.contenido ?? '',
        shipperId: (item.paquete?.shipper?.id ?? item.shipperPreasignadoId ?? '') as number | '',
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

  /** Encuentra el siguiente índice pendiente después de `fromIndex`. */
  const findNextPendingIndex = useCallback(
    (fromIndex: number): number | null => {
      const total = paquetesParaConsolidado.length;
      // Buscar después
      for (let i = fromIndex + 1; i < total; i++) {
        if (!paqueteEsCompleto(paquetesParaConsolidado[i].paquete)) return i;
      }
      // Envolver al inicio
      for (let i = 0; i < fromIndex; i++) {
        if (!paqueteEsCompleto(paquetesParaConsolidado[i].paquete)) return i;
      }
      return null;
    },
    [paquetesParaConsolidado],
  );

  const saveEditDialog = useCallback(
    async (opts?: { thenNextPending?: boolean }) => {
      if (editItemIndex == null) return;
      const item = paquetesParaConsolidado[editItemIndex];
      if (!item) return;

      if (!formIsValid) {
        setShowFormErrors(true);
        toast.error('Revise los campos marcados');
        return;
      }

      // Si nada cambió y el paquete ya estaba registrado, comportarse como cerrar/saltar.
      if (item.paquete && !formIsDirty) {
        if (opts?.thenNextPending) {
          const nextIdx = findNextPendingIndex(editItemIndex);
          if (nextIdx != null) {
            openEditDialog(nextIdx);
          } else {
            toast.success('No quedan paquetes pendientes');
            closeEditDialog();
          }
        } else {
          closeEditDialog();
        }
        return;
      }

      const pesoLbsNum = form.pesoLbs.trim() ? Number(form.pesoLbs) : undefined;
      const shipperIdNum = form.shipperId === '' ? undefined : Number(form.shipperId);

      setSavingDialog(true);
      try {
        let updatedItem: PaqueteEnLista;
        if (item.paquete) {
          const input: PaqueteUpdateInput = {
            destinatario: form.destinatario.trim() || null,
            ref: form.ref.trim() || null,
            contenido: form.contenido.trim() || null,
            pesoLbs: pesoLbsNum,
            shipper: shipperIdNum != null ? { id: shipperIdNum } : null,
          };
          const updated = await updatePaquete(item.paquete.id, input);
          updatedItem = { ...item, paquete: updated, shipperPreasignadoId: null };
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
          updatedItem = { ...item, paquete: created, shipperPreasignadoId: null };
          toast.success('Paquete registrado');
        }

        setPaquetesParaConsolidado((prev) =>
          prev.map((p, i) => (i === editItemIndex ? updatedItem : p)),
        );

        if (opts?.thenNextPending) {
          const nextIdx = findNextPendingIndex(editItemIndex);
          if (nextIdx != null) {
            // Reabrir directamente con los datos del siguiente.
            // Como `paquetesParaConsolidado` se actualiza asíncronamente,
            // calculamos a partir del estado anterior.
            const nextItem =
              nextIdx === editItemIndex ? updatedItem : paquetesParaConsolidado[nextIdx];
            const nextForm = {
              destinatario: nextItem.paquete?.destinatario ?? '',
              ref: nextItem.paquete?.ref ?? '',
              pesoLbs:
                nextItem.paquete?.pesoLbs != null
                  ? String(nextItem.paquete.pesoLbs)
                  : '',
              contenido: nextItem.paquete?.contenido ?? '',
              shipperId: (nextItem.paquete?.shipper?.id ??
                nextItem.shipperPreasignadoId ??
                '') as number | '',
            };
            setEditItemIndex(nextIdx);
            setForm(nextForm);
            setInitialForm(nextForm);
            setTouched({});
            setShowFormErrors(false);
            setSavingDialog(false);
          } else {
            toast.success('No quedan paquetes pendientes');
            closeEditDialog();
          }
        } else {
          closeEditDialog();
        }
      } catch (e) {
        console.error(e);
        toast.error('No se pudo guardar la información');
      } finally {
        setSavingDialog(false);
      }
    },
    [
      editItemIndex,
      paquetesParaConsolidado,
      form,
      formIsValid,
      formIsDirty,
      findNextPendingIndex,
      openEditDialog,
      closeEditDialog,
    ],
  );

  // -- Crear consolidado ------------------------------------------------------

  const canCreate = paquetesParaConsolidado.length >= 1;

  /**
   * Resuelve `paqueteId` para cada item: registra los sólo-guía y aplica el
   * shipper preasignado si lo tiene. Devuelve un mapa por índice.
   */
  const ensurePaqueteIds = useCallback(
    async (items: PaqueteEnLista[]): Promise<{
      idsByIndex: Map<number, number>;
      failures: CreationFailure[];
    }> => {
      const idsByIndex = new Map<number, number>();
      const failures: CreationFailure[] = [];

      // Marcar los que ya tienen ID (sin trabajo).
      items.forEach((it, i) => {
        if (it.paquete) idsByIndex.set(i, it.paquete.id);
      });

      const toCreate = items
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => !it.paquete);

      let processed = idsByIndex.size;
      const total = items.length;
      setCreationProgress({
        current: processed,
        total,
        message: 'Registrando paquetes nuevos…',
      });

      await processPool(toCreate, CREATE_CONCURRENCY, async ({ it, i }) => {
        try {
          const created = await createPaqueteSoloGuia(it.numeroGuia);
          let finalPaquete = created;
          if (it.shipperPreasignadoId != null && it.shipperPreasignadoId > 0) {
            try {
              finalPaquete = await updatePaquete(created.id, {
                shipper: { id: it.shipperPreasignadoId },
              });
            } catch (eShipper) {
              console.warn('Shipper preasignado no aplicado', it.numeroGuia, eShipper);
            }
          }
          idsByIndex.set(i, finalPaquete.id);
          // Actualizar paquete localmente (mejor UX si hay reintento).
          setPaquetesParaConsolidado((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, paquete: finalPaquete, shipperPreasignadoId: null } : p)),
          );
        } catch (e) {
          console.error('Error registrando paquete', it.numeroGuia, e);
          failures.push({
            numeroGuia: it.numeroGuia,
            reason: 'No se pudo registrar el paquete',
          });
        } finally {
          processed++;
          setCreationProgress({
            current: processed,
            total,
            message: 'Registrando paquetes nuevos…',
          });
        }
      });

      return { idsByIndex, failures };
    },
    [],
  );

  const handleAgregarAConsolidado = useCallback(async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    setCreationFailures([]);
    setCreationProgress({
      current: 0,
      total: paquetesParaConsolidado.length,
      message: 'Creando consolidado…',
    });
    try {
      const guiaTrimmed = numeroGuiaConsolidado.trim() || null;
      const consolidado =
        pendingConsolidadoId != null
          ? { id: pendingConsolidadoId }
          : await createConsolidado(guiaTrimmed ? { numeroGuia: guiaTrimmed } : undefined);

      setPendingConsolidadoId(consolidado.id);

      const { idsByIndex, failures: registrationFailures } = await ensurePaqueteIds(
        paquetesParaConsolidado,
      );

      const additionFailures: CreationFailure[] = [];
      let processed = 0;
      const total = paquetesParaConsolidado.length;
      setCreationProgress({
        current: processed,
        total,
        message: 'Agregando al consolidado…',
      });

      const aAgregar = paquetesParaConsolidado
        .map((it, i) => ({ it, i, paqueteId: idsByIndex.get(i) }))
        .filter((x) => x.paqueteId != null) as {
        it: PaqueteEnLista;
        i: number;
        paqueteId: number;
      }[];

      await processPool(aAgregar, CREATE_CONCURRENCY, async ({ it, paqueteId }) => {
        try {
          await addPaqueteToConsolidado(consolidado.id, paqueteId);
        } catch (e) {
          console.error('Error agregando al consolidado', it.numeroGuia, e);
          additionFailures.push({
            numeroGuia: it.numeroGuia,
            reason: 'No se pudo agregar al consolidado',
            paqueteId,
          });
        } finally {
          processed++;
          setCreationProgress({
            current: processed,
            total,
            message: 'Agregando al consolidado…',
          });
        }
      });

      const allFailures = [...registrationFailures, ...additionFailures];

      if (allFailures.length === 0) {
        clearDraft();
        toast.success('Consolidado creado correctamente', {
          description: `${paquetesParaConsolidado.length} paquete(s) agregado(s)`,
        });
        setPendingConsolidadoId(null);
        navigate(`/consolidados/${consolidado.id}`, { replace: true });
        return;
      }

      // Hay errores parciales: dejamos el dialog abierto para reintentar.
      setCreationFailures(allFailures);
      toast.warning(
        `Consolidado creado con ${allFailures.length} error${
          allFailures.length === 1 ? '' : 'es'
        }`,
        {
          description:
            'Revise las guías fallidas y reintente o continúe al detalle.',
        },
      );
    } catch (e) {
      console.error('Error creando consolidado', e);
      toast.error('No se pudo crear el consolidado', {
        description: 'Intente nuevamente.',
      });
    } finally {
      setCreating(false);
      setCreationProgress(null);
    }
  }, [
    canCreate,
    creating,
    paquetesParaConsolidado,
    navigate,
    numeroGuiaConsolidado,
    ensurePaqueteIds,
    pendingConsolidadoId,
  ]);

  /** Reintenta sólo las guías que fallaron. */
  const retryFailedAdditions = useCallback(async () => {
    if (creationFailures.length === 0 || pendingConsolidadoId == null) return;
    setCreating(true);
    const total = creationFailures.length;
    setCreationProgress({ current: 0, total, message: 'Reintentando…' });
    const stillFailing: CreationFailure[] = [];
    let processed = 0;

    await processPool(creationFailures, CREATE_CONCURRENCY, async (f) => {
      try {
        let paqueteId = f.paqueteId;
        if (paqueteId == null) {
          const created = await createPaqueteSoloGuia(f.numeroGuia);
          paqueteId = created.id;
          setPaquetesParaConsolidado((prev) =>
            prev.map((p) =>
              normalizeCodigo(p.numeroGuia) === normalizeCodigo(f.numeroGuia)
                ? { ...p, paquete: created, shipperPreasignadoId: null }
                : p,
            ),
          );
        }
        await addPaqueteToConsolidado(pendingConsolidadoId, paqueteId);
      } catch (e) {
        console.error('Reintento falló', f.numeroGuia, e);
        stillFailing.push({ ...f, reason: 'Reintento falló' });
      } finally {
        processed++;
        setCreationProgress({ current: processed, total, message: 'Reintentando…' });
      }
    });

    setCreationFailures(stillFailing);
    setCreating(false);
    setCreationProgress(null);

    if (stillFailing.length === 0) {
      clearDraft();
      toast.success('Todos los paquetes fueron agregados');
      const id = pendingConsolidadoId;
      setPendingConsolidadoId(null);
      navigate(`/consolidados/${id}`, { replace: true });
    } else {
      toast.warning(`Aún quedan ${stillFailing.length} fallo${stillFailing.length === 1 ? '' : 's'}`);
    }
  }, [creationFailures, pendingConsolidadoId, navigate]);

  /** Continúa al detalle del consolidado dejando los fallidos sin agregar. */
  const continueToDetail = useCallback(() => {
    if (pendingConsolidadoId == null) return;
    const id = pendingConsolidadoId;
    setCreationFailures([]);
    setPendingConsolidadoId(null);
    // No limpia el borrador para que el usuario pueda reintentar más tarde.
    navigate(`/consolidados/${id}`, { replace: true });
  }, [pendingConsolidadoId, navigate]);

  const limpiarBorrador = useCallback(() => {
    setPaquetesParaConsolidado([]);
    setNumeroGuiaConsolidado('');
    setSearch('');
    setFilterStatus('all');
    clearSelection();
    clearDraft();
    setDraftTimestamp(null);
    setConfirmClearOpen(false);
    setPendingConsolidadoId(null);
    setCreationFailures([]);
    toast.success('Borrador descartado');
  }, [clearSelection]);

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

      // Esc → limpiar selección
      if (e.key === 'Escape' && selectedIndexes.size > 0 && !isTyping) {
        clearSelection();
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
  }, [
    canCreate,
    creating,
    paquetesParaConsolidado.length,
    handleAgregarAConsolidado,
    selectedIndexes.size,
    clearSelection,
  ]);

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
  const nextPendingFromCurrent =
    editItemIndex != null ? findNextPendingIndex(editItemIndex) : null;
  const hasNextPending = nextPendingFromCurrent != null;

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
            className={`rounded-xl border p-4 shadow-soft ${
              resumen.total === 0
                ? 'border-dashed border-border bg-muted/20'
                : resumen.pendientes > 0
                ? 'border-warning/30 bg-warning/5'
                : 'border-success/30 bg-success/5'
            }`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    resumen.total === 0
                      ? 'bg-muted text-muted-foreground'
                      : resumen.pendientes > 0
                      ? 'bg-warning/15 text-warning'
                      : 'bg-success/15 text-success'
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
                      ? 'Tipee, escanee o pegue varios códigos de paquete a la vez.'
                      : resumen.pendientes > 0
                      ? 'Puede crear el consolidado ahora y completar la información después, o usar “Completar” para registrar los datos antes.'
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
                    placeholder="Tipee, escanee o pegue una o varias guías…"
                    value={createCodigoInput}
                    onChange={(e) => setCreateCodigoInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addToList()}
                    onPaste={handleInputPaste}
                    className="pl-9 font-mono"
                    autoFocus
                    disabled={hydrating}
                    aria-describedby="paste-hint"
                  />
                  {createCodigoInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreateCodigoInput('');
                        inputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center"
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
                  loading={addToListLoading}
                  loadingText="Agregando…"
                  className="gap-1.5 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </div>

              <p id="paste-hint" className="text-[11px] text-muted-foreground">
                Tip: pegue varias guías separadas por coma, espacio o salto de línea para añadirlas en lote.
              </p>

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

          {/* Guía del consolidado (visible con lista o si hay valor guardado en borrador) */}
          {(paquetesParaConsolidado.length > 0 || numeroGuiaConsolidado.trim().length > 0) && (
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
                  Se guarda en el borrador junto con la lista. Puede asignarla ahora o después desde el detalle del
                  consolidado.
                </p>
              </div>
            </SectionCard>
          )}

          {/* Sugerencia de shipper común */}
          {commonShipperSuggestion && (
            <div className="rounded-xl border border-accent/30 bg-accent-soft/40 p-3 flex items-start gap-3 shadow-soft">
              <div className="h-8 w-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-sm">
                  Todos los paquetes registrados son del shipper{' '}
                  <span className="font-medium text-foreground">
                    {commonShipperSuggestion.shipperNombre}
                  </span>
                  .{' '}
                  <span className="text-muted-foreground">
                    Hay {commonShipperSuggestion.huerfanos} sin shipper asignado.
                  </span>
                </div>
              </div>
              <Button
                variant="soft"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={applyCommonShipperToOrphans}
                disabled={applyingBulkShipper}
                loading={applyingBulkShipper}
                loadingText="Aplicando…"
              >
                <Truck className="h-3.5 w-3.5" />
                Aplicar a los demás
              </Button>
            </div>
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
                    placeholder="Buscar por guía, destinatario, contenido, ref o shipper…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center"
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
                    className={`relative px-3 py-2 text-xs font-medium transition-colors ease-claude -mb-px border-b-2 ${
                      filterStatus === t.key
                        ? 'text-foreground border-accent'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 text-[10px] tabular-nums opacity-70">{t.count}</span>
                  </button>
                ))}
              </div>

              {/* Barra de selección activa */}
              {selectedIndexes.size > 0 && (
                <div className="-mx-6 px-6 py-2 mb-2 bg-accent-soft/50 border-y border-accent/20 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-accent-soft-foreground">
                    {selectedIndexes.size} seleccionado{selectedIndexes.size === 1 ? '' : 's'}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    de {paquetesParaConsolidado.length}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => setBulkShipperOpen(true)}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      Asignar shipper
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setBulkRemoveOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Quitar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground"
                      onClick={clearSelection}
                    >
                      <X className="h-3.5 w-3.5" />
                      Limpiar
                    </Button>
                  </div>
                </div>
              )}

              {filteredPaquetes.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Sin resultados con los filtros actuales.
                  <Button variant="link" size="sm" onClick={limpiarFiltros} className="ml-1 h-auto p-0">
                    Limpiar
                  </Button>
                </div>
              ) : (
                <>
                  {/* Header con select-all */}
                  <div className="-mx-6 px-6 py-2 border-b border-border/40 flex items-center gap-3 bg-muted/20">
                    <Checkbox
                      checked={
                        selectionState === 'all'
                          ? true
                          : selectionState === 'partial'
                          ? 'indeterminate'
                          : false
                      }
                      onCheckedChange={() => toggleSelectAllVisible()}
                      aria-label="Seleccionar todos los visibles"
                    />
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {visibleSelectedCount > 0
                        ? `${visibleSelectedCount} de ${visibleIndexes.length} visibles`
                        : `${visibleIndexes.length} visibles`}
                    </span>
                  </div>
                  <ul className="divide-y divide-border/60 -mx-6 border-b border-border/40">
                    {filteredPaquetes.map(({ item, originalIndex }) => {
                      const completo = paqueteEsCompleto(item.paquete);
                      const isSelected = selectedIndexes.has(originalIndex);
                      const shipperPreasignadoNombre =
                        item.shipperPreasignadoId != null
                          ? shippers.find((s) => s.id === item.shipperPreasignadoId)?.nombre
                          : null;
                      return (
                        <li
                          key={`${item.numeroGuia}-${originalIndex}`}
                          className={`group flex items-center gap-3 px-6 py-2.5 transition-colors ${
                            isSelected
                              ? 'bg-accent-soft/40 hover:bg-accent-soft/60'
                              : 'hover:bg-muted/60'
                          }`}
                        >
                          {/* Selección */}
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) =>
                              toggleSelected(originalIndex, c === true)
                            }
                            aria-label={`Seleccionar ${item.numeroGuia}`}
                          />

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
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {item.paquete ? (
                                  completo ? (
                                    <Badge
                                      variant="outline"
                                      className="font-normal h-5 px-1.5 gap-1 border-success/40 bg-success/15 text-success"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      Completo
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="font-normal h-5 px-1.5 gap-1 border-warning/40 bg-warning/15 text-warning"
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
                                {shipperPreasignadoNombre && (
                                  <Badge
                                    variant="outline"
                                    className="font-normal h-5 px-1.5 gap-1 border-accent/30 bg-accent-soft/40 text-accent-soft-foreground"
                                    title="Shipper preasignado — se aplicará al registrar"
                                  >
                                    <Truck className="h-3 w-3" />
                                    {shipperPreasignadoNombre}
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
                              {item.paquete?.shipper?.nombre && (
                                <div className="truncate text-[11px] text-muted-foreground flex items-center gap-1">
                                  <Truck className="h-3 w-3" />
                                  {item.paquete.shipper.nombre}
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
                </>
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
            <span className="opacity-40">·</span>
            <Kbd>Esc</Kbd>
            <span>limpiar selección</span>
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
                  <span className="inline-flex items-center gap-1.5 text-warning">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {resumen.pendientes} pendiente(s)
                  </span>
                </>
              )}
              {creating && creationProgress && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="inline-flex items-center gap-1.5 text-info">
                    <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                    {creationProgress.message} ({creationProgress.current}/{creationProgress.total})
                  </span>
                </>
              )}
            </div>
            <Button
              onClick={handleAgregarAConsolidado}
              disabled={!canCreate || creating}
              loading={creating}
              loadingText={
                creationProgress
                  ? `${creationProgress.current}/${creationProgress.total}…`
                  : 'Creando consolidado…'
              }
              className="gap-1.5"
            >
              <PackagePlus className="h-4 w-4" />
              Crear consolidado
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
          <DialogContent className="flex max-h-[min(92vh,900px)] w-[calc(100vw-1.5rem)] max-w-xl min-w-0 flex-col rounded-2xl border-border/50 p-0 sm:w-full">
            {itemBeingEdited && (() => {
              const yaRegistrado = !!itemBeingEdited.paquete;
              const requiereTodo = !yaRegistrado;
              const totalObligatorios = requiereTodo ? 3 : 0;
              const guia = itemBeingEdited.numeroGuia;

              return (
                <>
                  {/* Header */}
                  <DialogHeader className="shrink-0 px-6 py-4 border-b border-border/60 bg-muted/30 space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ' +
                          (yaRegistrado
                            ? 'bg-success/15 text-success'
                            : 'bg-warning/15 text-warning')
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
                          className="h-5 w-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center"
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
                                  (!formErrors[k] ? 'bg-success' : 'bg-muted-foreground/30')
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
                          className="font-normal h-6 px-2 gap-1 border-success/40 bg-success/15 text-success"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Ya registrado
                        </Badge>
                      )}

                      {/* Indicador de pendientes restantes */}
                      {resumen.pendientes > 1 && (
                        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {resumen.pendientes} pendiente
                          {resumen.pendientes === 1 ? '' : 's'} en total
                        </span>
                      )}
                    </div>
                  </DialogHeader>

                  {/* Body */}
                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 space-y-5">
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
                  <DialogFooter className="mt-0 grid shrink-0 grid-cols-1 gap-3 border-t border-border/60 bg-muted/20 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-4 sm:gap-y-2 sm:px-6">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={limpiarForm}
                        disabled={savingDialog}
                        className="shrink-0 text-xs gap-1"
                        title="Limpiar todos los campos"
                      >
                        <FilterX className="h-3.5 w-3.5" />
                        Limpiar
                      </Button>
                      <span className="inline-flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                        <Kbd>Ctrl</Kbd>
                        <span>+</span>
                        <Kbd>↵</Kbd>
                        <span>guardar</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2 justify-self-stretch sm:justify-self-end">
                      <Button
                        variant="outline"
                        onClick={tryCloseEditDialog}
                        disabled={savingDialog}
                        className="shrink-0"
                      >
                        Cancelar
                      </Button>
                      {hasNextPending && (
                        <Button
                          variant="soft"
                          onClick={() => saveEditDialog({ thenNextPending: true })}
                          disabled={
                            (!formIsValid && showFormErrors) || savingDialog
                          }
                          loading={savingDialog}
                          className="shrink-0 gap-1.5"
                          title="Guarda y abre el siguiente paquete pendiente"
                        >
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          Guardar y siguiente
                        </Button>
                      )}
                      <Button
                        onClick={() => saveEditDialog()}
                        disabled={
                          (yaRegistrado && !formIsDirty) ||
                          (!formIsValid && showFormErrors)
                        }
                        loading={savingDialog}
                        loadingText="Guardando…"
                        className="shrink-0 gap-1.5"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Guardar
                      </Button>
                    </div>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Dialog: Asignar shipper en lote */}
        <Dialog
          open={bulkShipperOpen}
          onOpenChange={(open) => {
            if (!open && !applyingBulkShipper) {
              setBulkShipperOpen(false);
              setBulkShipperId('');
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                <Truck className="h-5 w-5" aria-hidden />
              </div>
              <DialogTitle>Asignar shipper en lote</DialogTitle>
              <DialogDescription className="leading-relaxed">
                Aplicar el shipper a los{' '}
                <span className="font-medium text-foreground">{selectedIndexes.size}</span> paquete
                {selectedIndexes.size === 1 ? '' : 's'} seleccionado
                {selectedIndexes.size === 1 ? '' : 's'}. Los paquetes ya registrados se actualizan en el servidor; los “Sólo guía” quedan preasignados y se aplicarán al registrarlos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 mt-2">
              <Label className="text-xs text-muted-foreground">Shipper</Label>
              <ShipperCombobox
                shippers={shippers}
                value={bulkShipperId}
                onChange={(v) => setBulkShipperId(v)}
                placeholder="Seleccionar shipper…"
              />
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setBulkShipperOpen(false);
                  setBulkShipperId('');
                }}
                disabled={applyingBulkShipper}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (bulkShipperId === '') return;
                  void applyBulkShipper(Number(bulkShipperId), new Set(selectedIndexes));
                }}
                disabled={bulkShipperId === '' || applyingBulkShipper}
                loading={applyingBulkShipper}
                loadingText="Aplicando…"
                className="gap-1.5"
              >
                <Truck className="h-3.5 w-3.5" />
                Aplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Errores parciales en la creación */}
        <Dialog
          open={creationFailures.length > 0}
          onOpenChange={(open) => {
            if (!open) {
              // No cerrar si hay un consolidado pendiente; obligar a decidir.
              if (pendingConsolidadoId == null) setCreationFailures([]);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-warning/15 text-warning">
                <AlertCircle className="h-5 w-5" aria-hidden />
              </div>
              <DialogTitle>Algunas guías no pudieron agregarse</DialogTitle>
              <DialogDescription>
                El consolidado se creó, pero {creationFailures.length} guía
                {creationFailures.length === 1 ? '' : 's'} fallaron al procesarse. Puede reintentarlas o continuar al detalle.
              </DialogDescription>
            </DialogHeader>

            <ul className="rounded-lg border border-border/60 divide-y divide-border/60 max-h-[40vh] overflow-y-auto bg-muted/20">
              {creationFailures.map((f) => (
                <li
                  key={f.numeroGuia}
                  className="flex items-center gap-2 px-3 py-2 text-xs"
                >
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span className="font-mono">{f.numeroGuia}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {f.reason}
                  </span>
                </li>
              ))}
            </ul>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={continueToDetail}
                disabled={creating}
              >
                Continuar al detalle
              </Button>
              <Button
                onClick={() => void retryFailedAdditions()}
                loading={creating}
                loadingText={
                  creationProgress
                    ? `${creationProgress.current}/${creationProgress.total}…`
                    : 'Reintentando…'
                }
                className="gap-1.5"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Reintentar fallidos
              </Button>
            </DialogFooter>
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

        {/* Confirmar quitar paquete (individual) */}
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

        {/* Confirmar quitar selección (lote) */}
        <ConfirmDeleteDialog
          open={bulkRemoveOpen}
          onOpenChange={setBulkRemoveOpen}
          entityLabel="paquetes seleccionados"
          entityName={`${selectedIndexes.size} paquete(s) en la lista`}
          onConfirm={removeSelected}
        />
      </StandardPageLayout>
    </DashboardLayout>
  );
}
