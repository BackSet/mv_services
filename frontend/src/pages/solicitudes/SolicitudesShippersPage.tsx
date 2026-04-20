import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCcw,
  UserPlus,
  AlertCircle,
  Mail,
  User as UserIcon,
  Hash,
  Building2,
  Search,
  Eye,
  ListChecks,
  FilterX,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { KpiCard } from '@/components/layout/KpiCard';
import { CardGridSkeleton } from '@/components/skeletons';
import { ErrorState } from '@/components/states/ErrorState';
import EmptyState from '@/components/notion/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { processPool } from '@/lib/concurrency';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  aprobarSolicitud,
  listSolicitudes,
  rechazarSolicitud,
  type EstadoSolicitudShipper,
  type ShipperSolicitud,
} from '@/services/shipperSolicitudes.service';
import { useInvalidateSolicitudes } from '@/hooks/useSolicitudesPendientes';
import { cn } from '@/lib/utils';
import { SectionCard } from '@/components/layout/SectionCard';
import { PageContent } from '@/components/layout/PageContent';

type Tab = EstadoSolicitudShipper | 'ALL';

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType<{ className?: string }> }> = [
  { id: 'PENDIENTE', label: 'Pendientes', icon: Clock },
  { id: 'APROBADA', label: 'Aprobadas', icon: CheckCircle2 },
  { id: 'RECHAZADA', label: 'Rechazadas', icon: XCircle },
  { id: 'ALL', label: 'Todas', icon: Inbox },
];

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function estadoBadge(estado: EstadoSolicitudShipper) {
  if (estado === 'PENDIENTE') {
    return (
      <Badge variant="outline" className="text-[10px] bg-warning/15 text-warning border-warning/30">
        <Clock className="h-3 w-3 mr-1" /> Pendiente
      </Badge>
    );
  }
  if (estado === 'APROBADA') {
    return (
      <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Aprobada
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] bg-destructive/15 text-destructive border-destructive/30">
      <XCircle className="h-3 w-3 mr-1" /> Rechazada
    </Badge>
  );
}

export default function SolicitudesShippersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('PENDIENTE');
  const [rows, setRows] = useState<ShipperSolicitud[]>([]);
  const [counts, setCounts] = useState<Record<EstadoSolicitudShipper, number>>({
    PENDIENTE: 0,
    APROBADA: 0,
    RECHAZADA: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [focusId, setFocusId] = useState<number | null>(() => {
    const f = searchParams.get('focus');
    return f ? Number(f) : null;
  });

  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectingFor, setRejectingFor] = useState<ShipperSolicitud | null>(null);
  const [rejectingBulk, setRejectingBulk] = useState<ShipperSolicitud[] | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [keyboardFocusId, setKeyboardFocusId] = useState<number | null>(null);
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const invalidate = useInvalidateSolicitudes();

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [list, allList] = await Promise.all([
        listSolicitudes(tab),
        // necesitamos contadores por estado: traemos todas para counts (peso bajo)
        tab === 'ALL' ? Promise.resolve(null) : listSolicitudes('ALL'),
      ]);
      setRows(list);
      const all = allList ?? list;
      const cnt: Record<EstadoSolicitudShipper, number> = {
        PENDIENTE: 0,
        APROBADA: 0,
        RECHAZADA: 0,
      };
      for (const s of all) cnt[s.estado] = (cnt[s.estado] ?? 0) + 1;
      setCounts(cnt);
    } catch (e: unknown) {
      console.error('Error cargando solicitudes', e);
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Limpia focus tras montar
  useEffect(() => {
    if (focusId == null) return;
    const t = setTimeout(() => {
      setFocusId(null);
      const next = new URLSearchParams(searchParams);
      next.delete('focus');
      setSearchParams(next, { replace: true });
    }, 4000);
    return () => clearTimeout(t);
  }, [focusId, searchParams, setSearchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [
        r.username,
        r.email,
        r.shipperNombre,
        r.codigoInterno ?? '',
        r.nombreEncargado ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const total = counts.PENDIENTE + counts.APROBADA + counts.RECHAZADA;

  async function onAprobar(s: ShipperSolicitud) {
    if (actionId != null) return;
    setActionId(s.id);
    try {
      await aprobarSolicitud(s.id);
      toast.success('Solicitud aprobada', { description: `${s.username} ya puede iniciar sesión.` });
      await load();
      invalidate();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e instanceof Error ? e.message : 'No se pudo aprobar la solicitud.');
      toast.error('Error al aprobar', { description: msg });
    } finally {
      setActionId(null);
    }
  }

  function openRejectDialog(s: ShipperSolicitud) {
    setRejectingFor(s);
    setRejectMotivo('');
  }

  async function confirmReject() {
    const motivo = rejectMotivo.trim();
    if (motivo.length < 4) {
      toast.error('Motivo demasiado corto', { description: 'Indica al menos 4 caracteres.' });
      return;
    }
    if (rejectingBulk && rejectingBulk.length > 0) {
      setSubmittingReject(true);
      let ok = 0;
      const fallidos: string[] = [];
      try {
        await processPool(rejectingBulk, 4, async (s) => {
          try {
            await rechazarSolicitud(s.id, motivo);
            ok++;
          } catch (e) {
            console.error('Error rechazando solicitud', s.id, e);
            fallidos.push(s.username);
          }
        });
        if (ok > 0) {
          toast.success(`${ok} solicitud${ok !== 1 ? 'es' : ''} rechazada${ok !== 1 ? 's' : ''}.`);
        }
        if (fallidos.length > 0) {
          toast.error(`No se pudieron rechazar ${fallidos.length}: ${fallidos.slice(0, 3).join(', ')}${fallidos.length > 3 ? '…' : ''}`);
        }
        setRejectingBulk(null);
        setRejectMotivo('');
        setSelectedIds(new Set());
        await load();
        invalidate();
      } finally {
        setSubmittingReject(false);
      }
      return;
    }
    if (!rejectingFor) return;
    setSubmittingReject(true);
    try {
      await rechazarSolicitud(rejectingFor.id, motivo);
      toast.success('Solicitud rechazada', { description: `Se notificó como rechazada a ${rejectingFor.username}.` });
      setRejectingFor(null);
      setRejectMotivo('');
      await load();
      invalidate();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e instanceof Error ? e.message : 'No se pudo rechazar la solicitud.');
      toast.error('Error al rechazar', { description: msg });
    } finally {
      setSubmittingReject(false);
    }
  }

  // Solo se pueden seleccionar y operar en lote las pendientes
  const pendientesFiltradas = useMemo(
    () => filtered.filter((s) => s.estado === 'PENDIENTE'),
    [filtered],
  );
  const pendientesSeleccionadas = useMemo(
    () => pendientesFiltradas.filter((s) => selectedIds.has(s.id)),
    [pendientesFiltradas, selectedIds],
  );
  const allPendientesSelected =
    pendientesFiltradas.length > 0 && pendientesSeleccionadas.length === pendientesFiltradas.length;

  const toggleSelectAllPendientes = () => {
    if (allPendientesSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendientesFiltradas.map((s) => s.id)));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const aprobarSeleccion = async () => {
    if (pendientesSeleccionadas.length === 0) return;
    setBulkBusy(true);
    let ok = 0;
    const fallidos: string[] = [];
    try {
      await processPool(pendientesSeleccionadas, 4, async (s) => {
        try {
          await aprobarSolicitud(s.id);
          ok++;
        } catch (e) {
          console.error('Error aprobando solicitud', s.id, e);
          fallidos.push(s.username);
        }
      });
      if (ok > 0) {
        toast.success(`${ok} solicitud${ok !== 1 ? 'es' : ''} aprobada${ok !== 1 ? 's' : ''}.`);
      }
      if (fallidos.length > 0) {
        toast.error(`No se pudieron aprobar ${fallidos.length}: ${fallidos.slice(0, 3).join(', ')}${fallidos.length > 3 ? '…' : ''}`);
      }
      setSelectedIds(new Set());
      await load();
      invalidate();
    } finally {
      setBulkBusy(false);
    }
  };

  const abrirRechazoLote = () => {
    if (pendientesSeleccionadas.length === 0) return;
    setRejectingBulk(pendientesSeleccionadas);
    setRejectMotivo('');
  };

  // Atajos: A para aprobar, R para rechazar la tarjeta enfocada o la primera pendiente
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      const candidatoId = keyboardFocusId ?? pendientesFiltradas[0]?.id ?? null;
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
        return;
      }
      if (e.key.toLowerCase() === 'a' && pendientesSeleccionadas.length > 0) {
        e.preventDefault();
        void aprobarSeleccion();
        return;
      }
      if (e.key.toLowerCase() === 'r' && pendientesSeleccionadas.length > 0) {
        e.preventDefault();
        abrirRechazoLote();
        return;
      }
      if (candidatoId == null) return;
      const sol = pendientesFiltradas.find((s) => s.id === candidatoId);
      if (!sol) return;
      if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        void onAprobar(sol);
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        openRejectDialog(sol);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardFocusId, pendientesFiltradas, pendientesSeleccionadas]);

  return (
    <DashboardLayout>
      <StandardPageLayout
        icon={<Inbox className="h-5 w-5 text-accent" />}
        title="Solicitudes de shippers"
        subtitle="Aprueba o rechaza el registro de nuevos shippers."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={refreshing}
              className="h-9"
            >
              <RefreshCcw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
              Actualizar
            </Button>
          </div>
        }
      >
        <PageContent>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={<Clock className="h-4 w-4" />}
              accent="warning"
              label="Pendientes"
              value={counts.PENDIENTE}
              hint="Esperan revisión"
            />
            <KpiCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              accent="success"
              label="Aprobadas"
              value={counts.APROBADA}
              hint="Convertidas en shipper"
            />
            <KpiCard
              icon={<XCircle className="h-4 w-4" />}
              accent="muted"
              label="Rechazadas"
              value={counts.RECHAZADA}
              hint="No autorizadas"
            />
            <KpiCard
              icon={<Inbox className="h-4 w-4" />}
              accent="info"
              label="Total histórico"
              value={total}
              hint="Acumulado total"
            />
          </div>

          {/* Tabs + búsqueda */}
          <SectionCard
            title="Filtros"
            description="Filtra por estado y encuentra solicitudes por texto."
            icon={Search}
            iconColor="gray"
            className="bg-card/40"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl border border-border/50 bg-muted/20">
                {TABS.map((t) => {
                  const active = tab === t.id;
                  const cnt = t.id === 'ALL' ? total : counts[t.id as EstadoSolicitudShipper];
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={cn(
                        'inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium transition-all ease-claude',
                        active
                          ? 'bg-background shadow-soft text-foreground border border-border/60'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                      <span
                        className={cn(
                          'inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded-full text-[10px] font-bold',
                          active ? 'bg-accent-soft text-accent-soft-foreground' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {cnt}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por usuario, email, nombre, encargado o código…"
                  className="h-9 pl-9 text-sm"
                />
              </div>
            </div>
          </SectionCard>

          {/* Contenido */}
          {loading ? (
            <CardGridSkeleton cards={4} fields={4} />
          ) : error ? (
            <ErrorState
              title="No se pudieron cargar las solicitudes"
              description={error}
              action={
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  <RefreshCcw className="h-4 w-4 mr-1.5" /> Reintentar
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-5 w-5" />}
              title="Sin solicitudes"
              description={
                search.trim()
                  ? 'No se encontraron resultados para tu búsqueda.'
                  : tab === 'PENDIENTE'
                  ? 'No hay solicitudes pendientes en este momento.'
                  : 'No hay registros en este estado.'
              }
            />
          ) : (
            <div className="grid gap-3">
              {/* Barra de selección masiva (solo aplica a pendientes) */}
              {pendientesFiltradas.length > 0 && (
                <div
                  className={cn(
                    'flex items-center justify-between gap-3 flex-wrap rounded-xl border px-3 py-2 transition-all ease-claude',
                    pendientesSeleccionadas.length > 0
                      ? 'border-accent/40 bg-accent-soft/40'
                      : 'border-border/40 bg-muted/20',
                  )}
                >
                  <div className="flex items-center gap-2.5 text-xs">
                    <Checkbox
                      checked={
                        allPendientesSelected
                          ? true
                          : pendientesSeleccionadas.length > 0
                          ? 'indeterminate'
                          : false
                      }
                      onCheckedChange={() => toggleSelectAllPendientes()}
                      aria-label="Seleccionar todas las pendientes"
                    />
                    <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                    {pendientesSeleccionadas.length > 0 ? (
                      <span className="font-medium text-foreground">
                        {pendientesSeleccionadas.length} de {pendientesFiltradas.length} pendientes seleccionada
                        {pendientesSeleccionadas.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Selecciona pendientes para aprobar o rechazar en lote ·{' '}
                        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">A</kbd> aprueba ·{' '}
                        <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">R</kbd> rechaza
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {pendientesSeleccionadas.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setSelectedIds(new Set())}
                        disabled={bulkBusy}
                      >
                        <FilterX className="h-3.5 w-3.5 mr-1" />
                        Limpiar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={abrirRechazoLote}
                      disabled={pendientesSeleccionadas.length === 0 || bulkBusy}
                      title="Atajo: R"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rechazar ({pendientesSeleccionadas.length})
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => void aprobarSeleccion()}
                      disabled={pendientesSeleccionadas.length === 0 || bulkBusy}
                      loading={bulkBusy}
                      loadingText="Aprobando…"
                      title="Atajo: A"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aprobar ({pendientesSeleccionadas.length})
                    </Button>
                  </div>
                </div>
              )}

              {filtered.map((s) => {
                const isFocused = focusId === s.id;
                const isPendiente = s.estado === 'PENDIENTE';
                const isSelected = selectedIds.has(s.id);
                return (
                  <article
                    key={s.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(s.id, el);
                      else cardRefs.current.delete(s.id);
                    }}
                    tabIndex={isPendiente ? 0 : -1}
                    onFocus={() => isPendiente && setKeyboardFocusId(s.id)}
                    onBlur={() => setKeyboardFocusId((prev) => (prev === s.id ? null : prev))}
                    className={cn(
                      'rounded-2xl border bg-card/50 backdrop-blur-sm overflow-hidden transition-all ease-claude shadow-soft outline-none',
                      isFocused
                        ? 'border-accent shadow-card ring-2 ring-accent/30'
                        : isSelected
                        ? 'border-accent/60 ring-1 ring-accent/30 shadow-card'
                        : 'border-border/40 hover:border-border/70 hover:shadow-card',
                      isPendiente && 'focus-visible:ring-2 focus-visible:ring-accent/40',
                    )}
                  >
                    <div className="p-4 sm:p-5 flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3 min-w-0">
                          {isPendiente && (
                            <div className="pt-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(s.id)}
                                aria-label={`Seleccionar solicitud de ${s.username}`}
                              />
                            </div>
                          )}
                          <div className="h-11 w-11 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0">
                            <UserPlus className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-semibold truncate">
                                {s.shipperNombre || s.username}
                              </h3>
                              {estadoBadge(s.estado)}
                            </div>
                            <div className="text-[12px] text-muted-foreground mt-0.5">
                              Solicitado el {formatDate(s.fechaSolicitud)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {s.estado === 'PENDIENTE' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openRejectDialog(s)}
                                disabled={actionId != null}
                                className="h-9 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-1.5" />
                                Rechazar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => void onAprobar(s)}
                                disabled={actionId != null}
                                loading={actionId === s.id}
                                loadingText="Aprobando…"
                                className="h-9"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                Aprobar
                              </Button>
                            </>
                          )}
                          {s.estado === 'APROBADA' && s.shipperCreadoId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/shippers/${s.shipperCreadoId}`)}
                              className="h-9"
                            >
                              <Eye className="h-4 w-4 mr-1.5" />
                              Ver shipper
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <Field icon={UserIcon} label="Username" value={`@${s.username}`} mono />
                        <Field icon={Mail} label="Email" value={s.email} mono />
                        <Field icon={Hash} label="Código interno" value={s.codigoInterno || '—'} mono />
                        <Field icon={Building2} label="Encargado" value={s.nombreEncargado || '—'} />
                      </div>

                      {s.estado === 'RECHAZADA' && s.motivoRechazo && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs uppercase tracking-wider text-destructive font-semibold">
                              Motivo de rechazo
                            </div>
                            <p className="text-foreground/90 mt-0.5">{s.motivoRechazo}</p>
                          </div>
                        </div>
                      )}

                      {(s.estado === 'APROBADA' || s.estado === 'RECHAZADA') && s.fechaResolucion && (
                        <div className="text-[11px] text-muted-foreground">
                          Resuelto el {formatDate(s.fechaResolucion)}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </PageContent>

        {/* Diálogo de rechazo (individual o lote) */}
        <Dialog
          open={Boolean(rejectingFor) || Boolean(rejectingBulk)}
          onOpenChange={(open) => {
            if (!open && !submittingReject) {
              setRejectingFor(null);
              setRejectingBulk(null);
              setRejectMotivo('');
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {rejectingBulk
                  ? `Rechazar ${rejectingBulk.length} solicitud${rejectingBulk.length !== 1 ? 'es' : ''}`
                  : 'Rechazar solicitud'}
              </DialogTitle>
              <DialogDescription>
                {rejectingBulk
                  ? 'Se aplicará el mismo motivo a todas las solicitudes seleccionadas.'
                  : 'Indica un motivo para que el solicitante entienda por qué se rechazó.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor="motivo" className="text-xs font-medium text-muted-foreground">
                Motivo de rechazo
              </label>
              <textarea
                id="motivo"
                value={rejectMotivo}
                onChange={(e) => setRejectMotivo(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Ej: Datos incompletos / no se pudo verificar la empresa…"
                className="w-full rounded-lg border border-border/60 bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <div className="text-right text-[10px] text-muted-foreground">
                {rejectMotivo.length}/500
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectingFor(null);
                  setRejectingBulk(null);
                  setRejectMotivo('');
                }}
                disabled={submittingReject}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => void confirmReject()}
                disabled={rejectMotivo.trim().length < 4}
                loading={submittingReject}
                loadingText={rejectingBulk ? 'Rechazando lote…' : 'Rechazando…'}
              >
                {rejectingBulk
                  ? `Rechazar ${rejectingBulk.length} solicitud${rejectingBulk.length !== 1 ? 'es' : ''}`
                  : 'Rechazar solicitud'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </StandardPageLayout>
    </DashboardLayout>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={cn('text-sm font-medium truncate mt-0.5', mono && 'font-mono')}>{value}</div>
    </div>
  );
}
