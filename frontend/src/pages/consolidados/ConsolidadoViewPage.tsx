import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Info, Trash2, Lock, LockOpen, PackagePlus, Printer } from 'lucide-react';
import { printPackageLabels } from '@/lib/printLabels';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import NotionTable from '@/components/notion/NotionTable';
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
import { ShipperSelect } from '@/components/shipper/ShipperSelect';
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


function normalizeCodigo(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ');
}

export default function ConsolidadoViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const consolidadoId = id ? Number(id) : null;
  const { me } = useMe();
  const role = me?.rol ?? null;
  const canEdit = role === 'ADMIN' || role === 'MV_ADMIN' || (me?.permisos?.includes('consolidados.add_paquete') ?? false);

  const [row, setRow] = useState<Consolidado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [numeroGuiaEnvio, setNumeroGuiaEnvio] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    pesoKgs: '',
    contenido: '',
    shipperId: '' as number | '',
  });

  const { data: allPaquetes, loading: loadingPaquetes, refresh: refreshPaquetes } = usePaquetesList();

  const paquetesDelConsolidado = useMemo(() => {
    if (!consolidadoId) return [];
    return allPaquetes
      .filter((p) => p.consolidado?.id === consolidadoId)
      .sort((a, b) => b.id - a.id);
  }, [allPaquetes, consolidadoId]);

  const paquetesDelConsolidadoIds = useMemo(
    () => new Set(paquetesDelConsolidado.map((p) => p.id)),
    [paquetesDelConsolidado],
  );

  const pesoCalculadoLbs = useMemo(() =>
    paquetesDelConsolidado.reduce((sum, p) => sum + (p.pesoLbs ?? 0), 0),
    [paquetesDelConsolidado]
  );
  const pesoCalculadoKgs = useMemo(() =>
    paquetesDelConsolidado.reduce((sum, p) => sum + (p.pesoKgs ?? 0), 0),
    [paquetesDelConsolidado]
  );

  const estado = (row?.estado || '—').toUpperCase();
  const isAbierto = estado === 'ABIERTO';

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

  const addPaqueteAlConsolidado = useCallback(async () => {
    if (!id || !consolidadoId || !isAbierto) return;
    const codigo = normalizeCodigo(addInput);
    if (!codigo) return;

    const yaEnConsolidado = paquetesDelConsolidado.some(
      (p) => normalizeCodigo(p.numeroGuia) === codigo
    );
    if (yaEnConsolidado) {
      alert(`La guía "${codigo}" ya está en este consolidado.`);
      setAddInput('');
      addInputRef.current?.focus();
      return;
    }

    setAddLoading(true);
    try {
      let paquete = await getPaqueteByNumeroGuia(codigo);
      if (!paquete) {
        paquete = await createPaqueteSoloGuia(codigo);
      }
      if (paquete.consolidado?.id && paquete.consolidado.id !== consolidadoId) {
        alert(`El paquete ya pertenece al consolidado #${paquete.consolidado.id}.`);
        return;
      }
      await addPaqueteToConsolidado(String(id), paquete.id);
      await refreshPaquetes();
      await reload();
      setAddInput('');
    } catch (e) {
      console.error('Error agregando paquete', e);
      alert('Error al agregar el paquete al consolidado.');
    } finally {
      setAddLoading(false);
      addInputRef.current?.focus();
    }
  }, [id, consolidadoId, isAbierto, addInput, paquetesDelConsolidado, refreshPaquetes, reload]);

  const openEditDialog = useCallback((paq: Paquete) => {
    setEditPaquete(paq);
    setEditNumeroGuia(paq.numeroGuia);
    setForm({
      destinatario: paq.destinatario ?? '',
      ref: paq.ref ?? '',
      pesoLbs: paq.pesoLbs != null ? String(paq.pesoLbs) : '',
      pesoKgs: paq.pesoKgs != null ? String(paq.pesoKgs) : '',
      contenido: paq.contenido ?? '',
      shipperId: paq.shipper?.id ?? '',
    });
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditPaquete(null);
    setEditNumeroGuia('');
    setForm({ destinatario: '', ref: '', pesoLbs: '', pesoKgs: '', contenido: '', shipperId: '' });
  }, []);

  const saveEditDialog = useCallback(async () => {
    if (!editPaquete) return;
    const pesoLbsNum = form.pesoLbs.trim() ? Number(form.pesoLbs) : undefined;
    const pesoKgsNum = form.pesoKgs.trim() ? Number(form.pesoKgs) : undefined;
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
          pesoKgs: pesoKgsNum,
          shipper: shipperIdNum != null ? { id: shipperIdNum } : null,
        };
        await updatePaquete(editPaquete.id, input);
      } else {
        const numeroGuia = editNumeroGuia.trim();
        const pesoFinal = pesoLbsNum ?? (pesoKgsNum ? pesoKgsNum * 2.2046226218 : undefined);
        if (!numeroGuia || !form.destinatario.trim() || pesoFinal == null || pesoFinal <= 0 || !form.contenido.trim()) {
          alert('Complete destinatario, peso y contenido.');
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
      await refreshPaquetes();
      await reload();
      closeEditDialog();
    } catch (e) {
      console.error('Error guardando paquete', e);
      alert('Error al guardar la información del paquete.');
    } finally {
      setSaving(false);
    }
  }, [editPaquete, editNumeroGuia, form, refreshPaquetes, reload, closeEditDialog]);

  const handleAbrir = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await abrirConsolidado(String(id));
      setRow(updated);
      await refreshPaquetes();
    } catch (e) {
      console.error('Error abriendo consolidado', e);
      alert('Error al abrir el consolidado.');
    } finally {
      setSaving(false);
    }
  }, [id, refreshPaquetes]);

  const handleQuitarPaquete = useCallback(async (paqueteId: number) => {
    if (!id || !consolidadoId) return;
    setSaving(true);
    try {
      const updated = await removePaqueteFromConsolidado(String(id), paqueteId);
      setRow(updated);
      await refreshPaquetes();
    } catch (e) {
      console.error('Error quitando paquete', e);
      alert('Error al quitar el paquete del consolidado.');
    } finally {
      setSaving(false);
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
    } catch (e) {
      console.error('Error cerrando consolidado', e);
      alert('Error al cerrar el consolidado.');
    } finally {
      setSaving(false);
    }
  }, [id, isAbierto, numeroGuiaEnvio, refreshPaquetes]);

  const paqueteConInfo = (p: Paquete) =>
    !!(p.destinatario || p.contenido || (p.pesoLbs != null && p.pesoLbs > 0));

  const todosConInfo = paquetesDelConsolidado.length > 0 && paquetesDelConsolidado.every(paqueteConInfo);
  const paquetesSinInfo = paquetesDelConsolidado.filter((p) => !paqueteConInfo(p));

  return (
    <DashboardLayout>
      <StandardPageLayout
        title={row ? `Consolidado #${row.id}` : 'Consolidado'}
        icon={<PackagePlus className="h-4 w-4" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/consolidados')} className="gap-1.5 h-8">
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver
            </Button>
            {paquetesDelConsolidado.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
                onClick={() => {
                  const labels = paquetesDelConsolidado.map((p) => ({
                    numeroGuia: p.numeroGuia,
                    shipperNombre: p.shipper?.nombre ?? null,
                    shipperEncargado: p.shipper?.nombreEncargado ?? null,
                    destinatarioNombre: p.destinatario ?? null,
                    ref: p.ref ?? null,
                    pesoLbs: p.pesoLbs ?? null,
                    pesoKgs: p.pesoKgs ?? null,
                    contenido: p.contenido ?? null,
                  }));
                  printPackageLabels(labels, { title: `Consolidado #${id}` });
                }}
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir todas
              </Button>
            )}
            {row && canEdit && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="h-8">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Eliminar
              </Button>
            )}
          </div>
        }
      >
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={(open) => { if (!deleting) setDeleteOpen(open); }}
          entityLabel="consolidado"
          entityName={row ? `#${row.id}` : undefined}
          loading={deleting}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deleteConsolidado(String(id));
              navigate('/consolidados', { replace: true });
            } catch (e) {
              console.error('Error eliminando consolidado', e);
              alert('Error al eliminar el consolidado.');
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
            }
          }}
        />

        {loading ? (
          <div className="py-8"><LoadingState label="Cargando consolidado..." /></div>
        ) : error ? (
          <div className="py-8"><ErrorState title="Error" description={error} /></div>
        ) : !row ? (
          <div className="py-8"><ErrorState title="No se encontró el consolidado" /></div>
        ) : (
          <div className="space-y-6 py-4">
            {/* --- Detalle --- */}
            <div className="rounded-lg border border-border bg-card/30 p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{estado}</Badge>
                {row.numeroGuia && <Badge variant="secondary">Guía: {row.numeroGuia}</Badge>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Peso total (lbs)</div>
                  <div className="font-medium">{pesoCalculadoLbs.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Peso total (kgs)</div>
                  <div className="font-medium">{pesoCalculadoKgs.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Paquetes</div>
                  <div className="font-medium">{paquetesDelConsolidado.length}</div>
                </div>
              </div>
            </div>

            {/* --- Guía de envío --- */}
            {canEdit ? (
              <div className="rounded-lg border border-border bg-card/30 p-4 space-y-3">
                <div className="text-sm font-medium">Guía de envío</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="guia-envio" className="text-xs text-muted-foreground">Número de guía del consolidado</Label>
                    <Input
                      id="guia-envio"
                      value={numeroGuiaEnvio}
                      onChange={(e) => setNumeroGuiaEnvio(e.target.value)}
                      disabled={saving || !isAbierto}
                      placeholder="Ej: TRACK-123456"
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
                        Guardar guía y cerrar consolidado
                      </Button>
                    ) : (
                      <Button
                        onClick={handleAbrir}
                        disabled={saving}
                        variant="default"
                        className="gap-1.5 h-10"
                      >
                        <LockOpen className="h-3.5 w-3.5" />
                        Abrir consolidado
                      </Button>
                    )}
                  </div>
                </div>
                {isAbierto && !todosConInfo && (
                  <p className="text-xs text-amber-600">
                    {paquetesSinInfo.length} paquete{paquetesSinInfo.length !== 1 ? 's' : ''} sin información completa. Complete la información de todos los paquetes para poder cerrar el consolidado.
                  </p>
                )}
                {!isAbierto && (
                  <p className="text-xs text-muted-foreground">El consolidado está cerrado. No se pueden agregar más paquetes ni modificar la guía. Si lo cerró por error, puede volver a abrirlo para seguir editando.</p>
                )}
              </div>
            ) : row.numeroGuia ? (
              <div className="rounded-lg border border-border bg-card/30 p-4 space-y-1">
                <div className="text-xs text-muted-foreground">Guía de envío</div>
                <div className="text-sm font-medium">{row.numeroGuia}</div>
              </div>
            ) : null}

            {/* --- Agregar paquete (solo si abierto y con permisos) --- */}
            {isAbierto && canEdit && (
              <div className="rounded-lg border border-border bg-card/30 p-4 space-y-4">
                <div className="text-sm font-medium">Agregar paquete al consolidado</div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    ref={addInputRef}
                    placeholder="Tipee o escanee código de paquete..."
                    value={addInput}
                    onChange={(e) => setAddInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPaqueteAlConsolidado()}
                    className="flex-1"
                    disabled={addLoading}
                  />
                  <Button
                    onClick={addPaqueteAlConsolidado}
                    disabled={addLoading || !normalizeCodigo(addInput)}
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
                      excludeIds={paquetesDelConsolidadoIds}
                      disabled={addLoading}
                      onSelect={async (paq) => {
                        if (!id || !consolidadoId) return;
                        const yaEnConsolidado = paquetesDelConsolidado.some(
                          (p) => p.id === paq.id,
                        );
                        if (yaEnConsolidado) {
                          alert(`El paquete "${paq.numeroGuia}" ya está en este consolidado.`);
                          return;
                        }
                        if (paq.consolidado?.id && paq.consolidado.id !== consolidadoId) {
                          alert(`El paquete ya pertenece al consolidado #${paq.consolidado.id}.`);
                          return;
                        }
                        setAddLoading(true);
                        try {
                          await addPaqueteToConsolidado(String(id), paq.id);
                          await refreshPaquetes();
                          await reload();
                        } catch (e) {
                          console.error('Error agregando paquete', e);
                          alert('Error al agregar el paquete al consolidado.');
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

                <p className="text-xs text-muted-foreground">
                  Tipee un código para crear o agregar. Si quiere elegir un paquete ya creado, use «Buscar paquete ya creado».
                </p>
              </div>
            )}

            {/* --- Tabla de paquetes --- */}
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Paquetes del consolidado ({paquetesDelConsolidado.length})
              </div>
              {loadingPaquetes ? (
                <LoadingState variant="inline" label="Cargando paquetes..." />
              ) : paquetesDelConsolidado.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay paquetes en este consolidado. {isAbierto ? 'Use el campo de arriba para agregar.' : ''}
                </p>
              ) : (
                <NotionTable
                  rows={paquetesDelConsolidado}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => navigate(`/paquetes/${r.id}`)}
                  columns={[
                    { header: 'GUÍA', className: 'font-medium', cell: (r) => <span className="font-mono text-xs">{r.numeroGuia}</span> },
                    {
                      header: 'SHIPPER',
                      cell: (r) => r.shipper?.nombre ?? <span className="text-muted-foreground">—</span>,
                    },
                    {
                      header: 'DESTINATARIO',
                      cell: (r) => r.destinatario || <span className="text-muted-foreground">—</span>,
                    },
                    {
                      header: 'REF',
                      cell: (r) => r.ref || <span className="text-muted-foreground">—</span>,
                    },
                    {
                      header: 'CONTENIDO',
                      cell: (r) => r.contenido || <span className="text-muted-foreground">—</span>,
                    },
                    {
                      header: 'LBS',
                      className: 'w-[80px]',
                      cell: (r) => r.pesoLbs != null ? r.pesoLbs.toFixed(2) : <span className="text-muted-foreground">—</span>,
                    },
                    {
                      header: 'KGS',
                      className: 'w-[80px]',
                      cell: (r) => r.pesoKgs != null ? r.pesoKgs.toFixed(2) : <span className="text-muted-foreground">—</span>,
                    },
                    {
                      header: 'ESTADO',
                      className: 'w-[120px]',
                      cell: (r) => paqueteConInfo(r)
                        ? <Badge variant="outline" className="text-xs">Completo</Badge>
                        : <Badge variant="secondary" className="text-xs">Pendiente</Badge>,
                    },
                    {
                      header: '',
                      className: 'w-[150px]',
                      cell: (r: Paquete) => (
                        <div className="flex gap-1">
                          {isAbierto && canEdit && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={(e) => { e.stopPropagation(); openEditDialog(r); }}
                              >
                                <Info className="h-3 w-3" />
                                Info
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                                disabled={saving}
                                onClick={(e) => { e.stopPropagation(); handleQuitarPaquete(r.id); }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
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
                              }], { title: `Etiqueta ${r.numeroGuia}` });
                            }}
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
              )}
            </div>
          </div>
        )}

        {/* --- Dialog Agregar información --- */}
        <Dialog open={editPaquete != null} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent className="rounded-2xl border-border/50">
            <DialogHeader>
              <DialogTitle>Agregar información</DialogTitle>
              <DialogDescription>
                Paquete: {editPaquete?.numeroGuia ?? editNumeroGuia}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="ed-dest">Destinatario</Label>
                <Input
                  id="ed-dest"
                  value={form.destinatario}
                  onChange={(e) => setForm((f) => ({ ...f, destinatario: e.target.value }))}
                  placeholder="Nombre del destinatario"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ed-ref">Ref (opcional)</Label>
                <Input
                  id="ed-ref"
                  value={form.ref}
                  onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))}
                  placeholder="Referencia del destinatario"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="ed-peso-lbs">Peso (lbs)</Label>
                  <Input
                    id="ed-peso-lbs"
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
                  <Label htmlFor="ed-peso-kgs">Peso (kgs)</Label>
                  <Input
                    id="ed-peso-kgs"
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
                <Label htmlFor="ed-cont">Contenido</Label>
                <Input
                  id="ed-cont"
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
              <Button variant="outline" onClick={closeEditDialog} disabled={saving}>Cancelar</Button>
              <Button onClick={saveEditDialog} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </StandardPageLayout>
    </DashboardLayout>
  );
}
