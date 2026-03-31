import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowLeft, Plus, Info, Trash2, PackagePlus } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
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
import { ShipperSelect } from '@/components/shipper/ShipperSelect';
import { PaqueteSearchCombobox } from '@/components/paquete/PaqueteSearchCombobox';
import { createConsolidado, addPaqueteToConsolidado } from '@/services/consolidados.service';
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
import { usePaquetesList } from '@/hooks/usePaquetes';

type PaqueteEnLista = {
  paquete: Paquete | null;
  numeroGuia: string;
};

const DRAFT_KEY = 'mv_consolidado_draft';

function normalizeCodigo(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ');
}

function saveDraft(guias: string[]) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(guias));
  } catch { /* quota exceeded – ignore */ }
}

function loadDraft(): string[] {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((g: unknown) => typeof g === 'string')) return parsed;
  } catch { /* corrupt data */ }
  return [];
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

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
  const [form, setForm] = useState({
    destinatario: '',
    ref: '',
    pesoLbs: '',
    pesoKgs: '',
    contenido: '',
    shipperId: '' as number | '',
  });
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
    let kgs = 0;
    for (const item of paquetesParaConsolidado) {
      if (item.paquete?.pesoLbs) lbs += item.paquete.pesoLbs;
      if (item.paquete?.pesoKgs) kgs += item.paquete.pesoKgs;
    }
    return { lbs, kgs, total: paquetesParaConsolidado.length };
  }, [paquetesParaConsolidado]);

  useEffect(() => {
    listShippers().then(setShippers).catch(console.error);
  }, []);

  useEffect(() => {
    const guias = loadDraft();
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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (hydrating) return;
    const guias = paquetesParaConsolidado.map((p) => p.numeroGuia);
    saveDraft(guias);
  }, [paquetesParaConsolidado, hydrating]);

  const itemBeingEdited =
    editItemIndex != null && editItemIndex >= 0 && editItemIndex < paquetesParaConsolidado.length
      ? paquetesParaConsolidado[editItemIndex]
      : null;

  const addToList = useCallback(async () => {
    const codigo = normalizeCodigo(createCodigoInput);
    if (!codigo) return;
    if (paquetesParaConsolidado.some((p) => normalizeCodigo(p.numeroGuia) === codigo)) {
      alert(`La guía "${codigo}" ya está en la lista.`);
      setCreateCodigoInput('');
      inputRef.current?.focus();
      return;
    }
    setAddToListLoading(true);
    try {
      const paquete = await getPaqueteByNumeroGuia(codigo);
      setPaquetesParaConsolidado((prev) => [...prev, { paquete, numeroGuia: codigo }]);
    } catch {
      setPaquetesParaConsolidado((prev) => [...prev, { paquete: null, numeroGuia: codigo }]);
    } finally {
      setCreateCodigoInput('');
      setAddToListLoading(false);
      inputRef.current?.focus();
    }
  }, [createCodigoInput, paquetesParaConsolidado]);

  const removeItem = useCallback((index: number) => {
    setPaquetesParaConsolidado((prev) => prev.filter((_, i) => i !== index));
    if (editItemIndex === index) setEditItemIndex(null);
    else if (editItemIndex != null && editItemIndex > index) setEditItemIndex(editItemIndex - 1);
  }, [editItemIndex]);

  const openEditDialog = useCallback((index: number) => {
    const item = paquetesParaConsolidado[index];
    if (!item) return;
    setEditItemIndex(index);
    setForm({
      destinatario: item.paquete?.destinatario ?? '',
      ref: item.paquete?.ref ?? '',
      pesoLbs: item.paquete?.pesoLbs != null ? String(item.paquete.pesoLbs) : '',
      pesoKgs: item.paquete?.pesoKgs != null ? String(item.paquete.pesoKgs) : '',
      contenido: item.paquete?.contenido ?? '',
      shipperId: item.paquete?.shipper?.id ?? '',
    });
  }, [paquetesParaConsolidado]);

  const closeEditDialog = useCallback(() => {
    setEditItemIndex(null);
    setForm({ destinatario: '', ref: '', pesoLbs: '', pesoKgs: '', contenido: '', shipperId: '' });
  }, []);

  const saveEditDialog = useCallback(async () => {
    if (editItemIndex == null) return;
    const item = paquetesParaConsolidado[editItemIndex];
    if (!item) return;

    const pesoLbsNum = form.pesoLbs.trim() ? Number(form.pesoLbs) : undefined;
    const pesoKgsNum = form.pesoKgs.trim() ? Number(form.pesoKgs) : undefined;
    const shipperIdNum =
      form.shipperId === '' ? undefined : Number(form.shipperId);

    if (item.paquete) {
      const input: PaqueteUpdateInput = {
        destinatario: form.destinatario.trim() || null,
        ref: form.ref.trim() || null,
        contenido: form.contenido.trim() || null,
        pesoLbs: pesoLbsNum,
        pesoKgs: pesoKgsNum,
        shipper: shipperIdNum != null ? { id: shipperIdNum } : null,
      };
      const updated = await updatePaquete(item.paquete.id, input);
      setPaquetesParaConsolidado((prev) =>
        prev.map((p, i) => (i === editItemIndex ? { ...p, paquete: updated } : p))
      );
    } else {
      const numeroGuia = item.numeroGuia.trim();
      const pesoFinal = pesoLbsNum ?? (pesoKgsNum ? pesoKgsNum * 2.2046226218 : undefined);
      if (!numeroGuia || !form.destinatario.trim() || pesoFinal == null || pesoFinal <= 0 || !form.contenido.trim()) {
        alert('Complete destinatario, peso y contenido para paquetes nuevos.');
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
      const created = await createPaqueteRegistroMinimo(input);
      setPaquetesParaConsolidado((prev) =>
        prev.map((p, i) => (i === editItemIndex ? { ...p, paquete: created } : p))
      );
    }
    closeEditDialog();
  }, [editItemIndex, paquetesParaConsolidado, form, closeEditDialog]);

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
      navigate(`/consolidados/${c.id}`, { replace: true });
    } catch (e) {
      console.error('Error creando consolidado', e);
      alert('Error al crear el consolidado');
    } finally {
      setCreating(false);
    }
  }, [canCreate, paquetesParaConsolidado, navigate, numeroGuiaConsolidado]);

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Crear consolidado"
        icon={<Layers className="h-4 w-4" />}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/consolidados')} className="gap-1.5 h-8">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Button>
        }
      >
        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground">
            Tipee o escanee códigos de paquete para agregarlos a la lista. Puede quitar ítems o agregar información.
            Pulse &quot;Agregar a consolidado&quot; cuando tenga al menos una guía; la información faltante podrá completarla después desde el consolidado.
          </p>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                ref={inputRef}
                placeholder="Tipee o escanee código de paquete..."
                value={createCodigoInput}
                onChange={(e) => setCreateCodigoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addToList()}
                className="flex-1"
                autoFocus
                disabled={hydrating}
              />
              <Button
                onClick={addToList}
                disabled={addToListLoading || !normalizeCodigo(createCodigoInput) || hydrating}
                className="gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Agregar a la lista
              </Button>
            </div>

            {!showSearchExisting ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground w-fit"
                onClick={() => setShowSearchExisting(true)}
              >
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
                  excludeIds={excludeIds}
                  disabled={hydrating}
                  onSelect={(paq) => {
                    const codigo = normalizeCodigo(paq.numeroGuia);
                    if (listaGuias.has(codigo)) {
                      alert(`La guía "${codigo}" ya está en la lista.`);
                      return;
                    }
                    setPaquetesParaConsolidado((prev) => [
                      ...prev,
                      { paquete: paq, numeroGuia: paq.numeroGuia },
                    ]);
                    inputRef.current?.focus();
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

          {hydrating && (
            <p className="text-sm text-muted-foreground">Restaurando lista guardada...</p>
          )}

          {paquetesParaConsolidado.length > 0 && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="rounded-lg border border-border bg-card/30 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Peso total (lbs)</div>
                    <div className="font-medium">{resumen.lbs.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Peso total (kgs)</div>
                    <div className="font-medium">{resumen.kgs.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Paquetes</div>
                    <div className="font-medium">{resumen.total}</div>
                  </div>
                </div>
              </div>

              {/* Guía del consolidado */}
              <div className="rounded-lg border border-border bg-card/30 p-4 space-y-2">
                <Label htmlFor="guia-consolidado" className="text-sm font-medium">Guía de envío del consolidado</Label>
                <Input
                  id="guia-consolidado"
                  value={numeroGuiaConsolidado}
                  onChange={(e) => setNumeroGuiaConsolidado(e.target.value)}
                  placeholder="Ej: TRACK-123456 (opcional)"
                />
                <p className="text-xs text-muted-foreground">Puede asignar la guía ahora o después desde el detalle del consolidado.</p>
              </div>

              {/* Lista de paquetes */}
              <h3 className="text-sm font-medium">Paquetes en la lista ({paquetesParaConsolidado.length})</h3>
              <ul className="border rounded-md divide-y divide-border">
                {paquetesParaConsolidado.map((item, index) => (
                  <li
                    key={`${item.numeroGuia}-${index}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="font-mono truncate flex-1">{item.numeroGuia}</span>
                    {item.paquete ? (
                      <Badge variant="outline" className="shrink-0">Registrado</Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">Solo guía</Badge>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => openEditDialog(index)}
                      >
                        <Info className="h-3.5 w-3.5" />
                        Info
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Quitar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <Button
                onClick={handleAgregarAConsolidado}
                disabled={!canCreate || creating}
                className="gap-1.5"
              >
                <PackagePlus className="h-4 w-4" />
                {creating ? 'Creando consolidado...' : 'Agregar a consolidado'}
              </Button>
            </div>
          )}
        </div>

        <Dialog open={editItemIndex != null} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent className="rounded-2xl border-border/50">
            <DialogHeader>
              <DialogTitle>Agregar información</DialogTitle>
              <DialogDescription>
                {itemBeingEdited?.paquete
                  ? 'Actualice los datos del paquete si lo desea.'
                  : 'Complete los datos para registrar el paquete.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-destinatario">Destinatario</Label>
                <Input
                  id="edit-destinatario"
                  value={form.destinatario}
                  onChange={(e) => setForm((f) => ({ ...f, destinatario: e.target.value }))}
                  placeholder="Nombre del destinatario"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-ref">Ref (opcional)</Label>
                <Input
                  id="edit-ref"
                  value={form.ref}
                  onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))}
                  placeholder="Referencia del destinatario"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="edit-peso-lbs">Peso (lbs)</Label>
                  <Input
                    id="edit-peso-lbs"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.pesoLbs}
                    onChange={(e) => {
                      const val = e.target.value;
                      const kgsCalc = val.trim() && Number(val) > 0
                        ? (Number(val) * 0.45359237).toFixed(2)
                        : '';
                      setForm((f) => ({ ...f, pesoLbs: val, pesoKgs: kgsCalc }));
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-peso-kgs">Peso (kgs)</Label>
                  <Input
                    id="edit-peso-kgs"
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.pesoKgs}
                    onChange={(e) => {
                      const val = e.target.value;
                      const lbsCalc = val.trim() && Number(val) > 0
                        ? (Number(val) * 2.2046226218).toFixed(2)
                        : '';
                      setForm((f) => ({ ...f, pesoKgs: val, pesoLbs: lbsCalc }));
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-contenido">Contenido</Label>
                <Input
                  id="edit-contenido"
                  value={form.contenido}
                  onChange={(e) => setForm((f) => ({ ...f, contenido: e.target.value }))}
                  placeholder="Descripción del contenido"
                />
              </div>
              <div className="grid gap-2">
                <Label>Shipper</Label>
                <ShipperSelect
                  shippers={shippers}
                  value={form.shipperId}
                  onChange={(v) => setForm((f) => ({ ...f, shipperId: v }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeEditDialog}>
                Cancelar
              </Button>
              <Button onClick={saveEditDialog}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
