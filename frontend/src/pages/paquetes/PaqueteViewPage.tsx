import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Package,
  Pencil,
  Trash2,
  Printer,
  Layers,
  Truck,
  Copy,
  RefreshCcw,
  Calendar,
  Weight,
  User,
  FileText,
  Hash,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Activity,
  Circle,
  PlusCircle,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getPaquete,
  deletePaquete,
  type Paquete,
} from '@/services/paquetes.service';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { printPackageLabels } from '@/lib/printLabels';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function formatFechaCompleta(s?: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('es', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}

function formatFechaRelativa(s?: string | null): string {
  if (!s) return '';
  try {
    const date = new Date(s);
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    if (diffSec < 60) return 'hace unos segundos';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHr < 24) return `hace ${diffHr} h`;
    if (diffDay === 1) return 'ayer';
    if (diffDay < 30) return `hace ${diffDay} días`;
    if (diffDay < 365) return `hace ${Math.floor(diffDay / 30)} meses`;
    return `hace ${Math.floor(diffDay / 365)} años`;
  } catch {
    return '';
  }
}

export default function PaqueteViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<Paquete | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async (silent = false) => {
    if (!id) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const p = await getPaquete(String(id));
      setRow(p);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error cargando paquete';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const copiar = async (texto: string | null | undefined, etiqueta = 'Texto') => {
    if (!texto) {
      toast.info(`No hay ${etiqueta.toLowerCase()} para copiar.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(`${etiqueta} copiado al portapapeles.`);
    } catch {
      toast.error('No se pudo copiar al portapapeles.');
    }
  };

  const duplicar = () => {
    if (!row) return;
    const params = new URLSearchParams();
    if (row.destinatario) params.set('destinatario', row.destinatario);
    if (row.contenido) params.set('contenido', row.contenido);
    if (row.shipper?.id) params.set('shipperId', String(row.shipper.id));
    navigate(`/paquetes/new${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const imprimirEtiqueta = () => {
    if (!row) return;
    printPackageLabels(
      [
        {
          numeroGuia: row.numeroGuia,
          shipperNombre: row.shipper?.nombre ?? null,
          shipperEncargado: row.shipper?.nombreEncargado ?? null,
          destinatarioNombre: row.destinatario ?? null,
          ref: row.ref ?? null,
          pesoLbs: row.pesoLbs,
          pesoKgs: row.pesoKgs,
          contenido: row.contenido,
          consolidadoGuia: row.consolidado?.numeroGuia ?? (row.consolidado?.id ? `#${row.consolidado.id}` : null),
        },
      ],
      { title: `Etiqueta · ${row.numeroGuia}` },
    );
  };

  // Atajos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        (target?.isContentEditable ?? false);
      if (isEditable) return;
      if (!row) return;
      const k = e.key.toLowerCase();
      if (k === 'e' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        navigate(`/paquetes/${row.id}/edit`);
      } else if (k === 'p' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        imprimirEtiqueta();
      } else if (k === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        load(true);
      } else if (k === 'c' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        copiar(row.numeroGuia, 'Guía');
      } else if (k === 'd' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        duplicar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, navigate]);

  const status = useMemo(() => {
    if (!row) return undefined;
    if (row.consolidado) {
      return { label: 'Consolidado', variant: 'completed' as const };
    }
    if (row.shipper) {
      return { label: 'Con shipper', variant: 'in-progress' as const };
    }
    return { label: 'Pendiente', variant: 'pending' as const };
  }, [row]);

  return (
    <DashboardLayout>
      <DetailPageLayout
        title={row ? row.numeroGuia : 'Paquete'}
        subtitle={row ? `Detalle del paquete · ${formatFechaRelativa(row.fechaRegistro)}` : 'Detalle del paquete'}
        backUrl="/paquetes"
        status={status}
        actions={
          row ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => load(true)}
                disabled={refreshing}
                className="gap-1.5 h-8"
                title="Refrescar (R)"
              >
                <RefreshCcw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
                <span className="hidden sm:inline">Refrescar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
                onClick={() => copiar(row.numeroGuia, 'Guía')}
                title="Copiar guía (C)"
              >
                <Copy className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copiar guía</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8"
                onClick={imprimirEtiqueta}
                title="Imprimir etiqueta (P)"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Etiqueta</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={duplicar}
                className="gap-1.5 h-8"
                title="Duplicar (D)"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Duplicar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/paquetes/${row.id}/edit`)}
                className="gap-1.5 h-8"
                title="Editar (E)"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5 h-8"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Eliminar</span>
              </Button>
            </div>
          ) : undefined
        }
      >
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (deleting) return;
            setDeleteOpen(open);
          }}
          entityLabel="paquete"
          entityName={row?.numeroGuia}
          loading={deleting}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deletePaquete(String(id));
              toast.success('Paquete eliminado.');
              navigate('/paquetes', { replace: true });
            } catch (e) {
              console.error('Error eliminando paquete', e);
              toast.error('No se pudo eliminar el paquete.');
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
            }
          }}
        />

        {loading ? (
          <LoadingState label="Cargando paquete..." />
        ) : error ? (
          <ErrorState
            title="Error al cargar paquete"
            description={error}
            action={<Button variant="outline" size="sm" onClick={() => load()}>Reintentar</Button>}
          />
        ) : !row ? (
          <ErrorState title="No se encontró el paquete" />
        ) : (
          <div className="space-y-6">
            {/* Resumen rápido */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickStat
                icon={<Hash className="h-4 w-4" />}
                label="Guía"
                value={
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-sm truncate">{row.numeroGuia}</span>
                    <button
                      type="button"
                      onClick={() => copiar(row.numeroGuia, 'Guía')}
                      className="h-6 w-6 shrink-0 rounded-md border border-border/60 bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors"
                      title="Copiar guía al portapapeles"
                      aria-label="Copiar guía"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                }
                accent="primary"
              />
              <QuickStat
                icon={<Weight className="h-4 w-4" />}
                label="Peso"
                value={
                  row.pesoLbs != null || row.pesoKgs != null ? (
                    <div className="flex flex-col leading-tight">
                      {row.pesoLbs != null && <span>{row.pesoLbs.toFixed(2)} lb</span>}
                      {row.pesoKgs != null && (
                        <span className="text-xs text-muted-foreground">{row.pesoKgs.toFixed(2)} kg</span>
                      )}
                    </div>
                  ) : '—'
                }
                accent="muted"
              />
              <QuickStat
                icon={<Truck className="h-4 w-4" />}
                label="Shipper"
                value={
                  row.shipper ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/shippers/${row.shipper!.id}`)}
                      className="text-sm font-medium hover:text-primary transition-colors text-left line-clamp-1"
                    >
                      {row.shipper.nombre}
                    </button>
                  ) : (
                    <span className="text-sm text-amber-600 dark:text-amber-400">Sin asignar</span>
                  )
                }
                accent={row.shipper ? 'success' : 'warning'}
              />
              <QuickStat
                icon={<Layers className="h-4 w-4" />}
                label="Consolidado"
                value={
                  row.consolidado ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/consolidados/${row.consolidado!.id}`)}
                        className="text-sm font-mono hover:text-primary transition-colors text-left line-clamp-1 min-w-0"
                        title="Ver consolidado"
                      >
                        {row.consolidado.numeroGuia ?? `#${row.consolidado.id}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => copiar(row.consolidado!.numeroGuia ?? `#${row.consolidado!.id}`, 'Consolidado')}
                        className="h-6 w-6 shrink-0 rounded-md border border-border/60 bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors"
                        title="Copiar número de consolidado al portapapeles"
                        aria-label="Copiar consolidado"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sin consolidar</span>
                  )
                }
                accent={row.consolidado ? 'success' : 'muted'}
              />
            </div>

            <SectionCard icon={Activity} iconColor="violet" title="Trayectoria del paquete" description="Etapas registradas hasta el momento.">
              <Timeline
                steps={[
                  {
                    label: 'Registrado',
                    description: row.fechaRegistro ? formatFechaCompleta(row.fechaRegistro) : 'Sin fecha registrada',
                    state: 'done',
                  },
                  {
                    label: 'Asignado a shipper',
                    description: row.shipper
                      ? `${row.shipper.nombre}${row.shipper.nombreEncargado ? ` · ${row.shipper.nombreEncargado}` : ''}`
                      : 'Pendiente de asignar a un shipper.',
                    state: row.shipper ? 'done' : 'pending',
                  },
                  {
                    label: 'Consolidado',
                    description: row.consolidado
                      ? `${row.consolidado.numeroGuia ?? `#${row.consolidado.id}`}${row.consolidado.estado ? ` · ${row.consolidado.estado}` : ''}`
                      : 'Aún no incluido en ningún consolidado.',
                    state: row.consolidado ? 'done' : 'pending',
                  },
                ]}
              />
            </SectionCard>

            <SectionCard icon={Package} iconColor="blue" title="Información del paquete">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                <DetailField icon={<Hash className="h-3.5 w-3.5" />} label="Número de guía">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{row.numeroGuia}</span>
                    <button
                      type="button"
                      onClick={() => copiar(row.numeroGuia, 'Guía')}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Copiar"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </DetailField>
                <DetailField icon={<User className="h-3.5 w-3.5" />} label="Destinatario">
                  {row.destinatario || <span className="text-muted-foreground">—</span>}
                </DetailField>
                <DetailField icon={<FileText className="h-3.5 w-3.5" />} label="Contenido">
                  {row.contenido || <span className="text-muted-foreground">—</span>}
                </DetailField>
                <DetailField icon={<Hash className="h-3.5 w-3.5" />} label="Ref">
                  {row.ref ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{row.ref}</span>
                      <button
                        type="button"
                        onClick={() => copiar(row.ref, 'Ref')}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Copiar"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </DetailField>
                <DetailField icon={<Weight className="h-3.5 w-3.5" />} label="Peso">
                  {row.pesoLbs != null || row.pesoKgs != null ? (
                    <div className="flex flex-wrap items-baseline gap-2">
                      {row.pesoLbs != null && (
                        <span className="font-medium tabular-nums">{row.pesoLbs.toFixed(2)} lb</span>
                      )}
                      {row.pesoLbs != null && row.pesoKgs != null && (
                        <span className="text-muted-foreground">·</span>
                      )}
                      {row.pesoKgs != null && (
                        <span className="text-muted-foreground tabular-nums">{row.pesoKgs.toFixed(2)} kg</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </DetailField>
                <DetailField icon={<Calendar className="h-3.5 w-3.5" />} label="Fecha de registro">
                  {row.fechaRegistro ? (
                    <div>
                      <div>{formatFechaCompleta(row.fechaRegistro)}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {formatFechaRelativa(row.fechaRegistro)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </DetailField>
              </dl>
            </SectionCard>

            <SectionCard icon={Truck} iconColor="green" title="Shipper">
              {row.shipper ? (
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{row.shipper.nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        Encargado: {row.shipper.nombreEncargado || '—'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate(`/shippers/${row.shipper!.id}`)}
                  >
                    Ver shipper
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <EmptyAssoc
                  icon={<Truck className="h-5 w-5" />}
                  title="Sin shipper asociado"
                  description="Asigna un shipper para este paquete desde la edición."
                  actionLabel="Asignar shipper"
                  onAction={() => navigate(`/paquetes/${row.id}/edit`)}
                />
              )}
            </SectionCard>

            <SectionCard icon={Layers} iconColor="orange" title="Consolidado">
              {row.consolidado ? (
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {row.consolidado.numeroGuia ?? `#${row.consolidado.id}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => copiar(row.consolidado!.numeroGuia ?? `#${row.consolidado!.id}`, 'Consolidado')}
                          className="h-6 w-6 rounded-md border border-border/60 bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center transition-colors"
                          title="Copiar número de consolidado al portapapeles"
                          aria-label="Copiar consolidado"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID interno: #{row.consolidado.id}
                      </div>
                      {row.posicionEnConsolidado != null && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span
                            title="Posición del paquete dentro del consolidado (calculada automáticamente)"
                            className="inline-flex items-center justify-center min-w-[28px] h-5 px-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold tabular-nums text-[11px]"
                          >
                            #{row.posicionEnConsolidado}
                          </span>
                          <span className="text-muted-foreground">
                            posición en el consolidado
                          </span>
                        </div>
                      )}
                      {row.consolidado.estado && (
                        <Badge
                          variant={row.consolidado.estado === 'CERRADO' ? 'default' : 'secondary'}
                          className="font-normal"
                        >
                          {row.consolidado.estado === 'CERRADO' ? (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          ) : (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {row.consolidado.estado}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate(`/consolidados/${row.consolidado!.id}`)}
                  >
                    Ver consolidado
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <EmptyAssoc
                  icon={<Layers className="h-5 w-5" />}
                  title="Sin consolidar"
                  description="Este paquete aún no pertenece a ningún consolidado."
                  actionLabel="Ver consolidados"
                  onAction={() => navigate('/consolidados')}
                />
              )}
            </SectionCard>

            <div className="text-[11px] text-muted-foreground text-center pt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span>Atajos:</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">E</kbd>
              <span>editar</span>
              <span className="opacity-40">·</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">D</kbd>
              <span>duplicar</span>
              <span className="opacity-40">·</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">P</kbd>
              <span>imprimir</span>
              <span className="opacity-40">·</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">C</kbd>
              <span>copiar guía</span>
              <span className="opacity-40">·</span>
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/40 font-mono text-[10px]">R</kbd>
              <span>refrescar</span>
            </div>
          </div>
        )}
      </DetailPageLayout>
    </DashboardLayout>
  );
}

type StatAccent = 'primary' | 'success' | 'warning' | 'muted';

function QuickStat({
  icon,
  label,
  value,
  accent = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: StatAccent;
}) {
  const accentMap: Record<StatAccent, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    muted: 'bg-muted text-muted-foreground',
  };
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-sm font-medium">{value}</div>
        </div>
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', accentMap[accent])}>
          {icon}
        </span>
      </div>
    </div>
  );
}

function DetailField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="text-sm mt-1.5">{children}</dd>
    </div>
  );
}

type TimelineStepState = 'done' | 'pending' | 'current';

function Timeline({
  steps,
}: {
  steps: { label: string; description: string; state: TimelineStepState }[];
}) {
  return (
    <ol className="relative space-y-4">
      {steps.map((s, i) => {
        const isDone = s.state === 'done';
        const isLast = i === steps.length - 1;
        return (
          <li key={s.label} className="relative flex gap-3 pb-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center shrink-0 border',
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted/40 border-border text-muted-foreground',
                )}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-px flex-1 mt-1',
                    isDone ? 'bg-emerald-500/30' : 'bg-border',
                  )}
                />
              )}
            </div>
            <div className={cn('pb-3 min-w-0', isLast && 'pb-0')}>
              <div className="text-sm font-medium leading-tight">
                {s.label}
                {!isDone && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground font-normal">
                    Pendiente
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EmptyAssoc({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
