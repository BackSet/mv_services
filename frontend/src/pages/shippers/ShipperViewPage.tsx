import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Info,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  User,
  Copy,
  Star,
  Building2,
  Hash,
  Package,
  ExternalLink,
  Plus,
  Globe,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { KpiCard, Kbd } from '@/components/layout/KpiCard';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShipper } from '@/hooks/useShippers';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { deleteShipper } from '@/services/shippers.service';
import { getUsuarioByShipperId, type Usuario } from '@/services/usuarios.service';
import { listPaquetes, type Paquete } from '@/services/paquetes.service';

// =============================================================================
// Helpers
// =============================================================================

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  } catch {
    toast.error('No se pudo copiar al portapapeles');
  }
}

function CopyButton({ text, label, className = '' }: { text: string; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        copyToClipboard(text, label);
      }}
      className={`h-6 w-6 inline-flex items-center justify-center rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent transition-colors ${className}`}
      title={`Copiar ${label.toLowerCase()}`}
      aria-label={`Copiar ${label.toLowerCase()}`}
    >
      <Copy className="h-3 w-3" />
    </button>
  );
}

// =============================================================================
// Componente
// =============================================================================

export default function ShipperViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: row, loading, error } = useShipper(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkedUser, setLinkedUser] = useState<Usuario | null>(null);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [paquetesLoading, setPaquetesLoading] = useState(false);

  useEffect(() => {
    if (row?.id) {
      getUsuarioByShipperId(row.id).then(setLinkedUser).catch(() => setLinkedUser(null));
    }
  }, [row?.id]);

  // Cargamos los paquetes una sola vez para mostrar estadísticas del shipper.
  useEffect(() => {
    if (!row?.id) return;
    setPaquetesLoading(true);
    listPaquetes()
      .then((all) => {
        const mine = all.filter((p) => p.shipper?.id === row.id);
        setPaquetes(mine);
      })
      .catch(() => setPaquetes([]))
      .finally(() => setPaquetesLoading(false));
  }, [row?.id]);

  const stats = useMemo(() => {
    const totalPaquetes = paquetes.length;
    const consolidados = new Set(
      paquetes.map((p) => p.consolidado?.id).filter((x): x is number => !!x),
    );
    const sinConsolidado = paquetes.filter((p) => !p.consolidado).length;
    return {
      totalPaquetes,
      consolidados: consolidados.size,
      sinConsolidado,
    };
  }, [paquetes]);

  const principalTel = useMemo(() => {
    const tels = row?.telefonos ?? [];
    return tels.find((t) => t.esPrincipal) ?? tels[0] ?? null;
  }, [row?.telefonos]);

  const principalDir = useMemo(() => {
    const dirs = row?.direcciones ?? [];
    return dirs[0] ?? null;
  }, [row?.direcciones]);

  // ---------------------------------------------------------------------------
  // Atajos
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' || tag === 'textarea' || target?.isContentEditable;
      if (isTyping) return;
      if (!row) return;
      if (e.key === 'e') {
        e.preventDefault();
        navigate(`/shippers/${row.id}/edit`);
      } else if (e.key === 'Escape') {
        navigate('/shippers');
      } else if (e.key === 'Delete') {
        e.preventDefault();
        setDeleteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, row]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteShipper(String(id));
      toast.success('Shipper eliminado');
      navigate('/shippers', { replace: true });
    } catch (e) {
      console.error('Error eliminando shipper', e);
      toast.error('No se pudo eliminar el shipper');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }, [id, navigate]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <DetailPageLayout
        title={row ? row.nombre : 'Shipper'}
        subtitle={row ? `Shipper #${row.id}` : 'Detalle del shipper'}
        backUrl="/shippers"
        actions={
          row ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/shippers/${row.id}/edit`)}
                className="gap-1.5"
                title="Editar (E)"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5"
                title="Eliminar (Supr)"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
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
          entityLabel="shipper"
          entityName={row?.nombre}
          loading={deleting}
          onConfirm={handleDelete}
        />

        {loading ? (
          <LoadingState label="Cargando shipper..." />
        ) : error ? (
          <ErrorState title="Error al cargar shipper" description={error} />
        ) : !row ? (
          <ErrorState title="No se encontró el shipper" />
        ) : (
          <div className="space-y-6">
            {/* Encabezado con identificadores rápidos */}
            <div className="rounded-xl border border-border bg-gradient-to-r from-primary/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Globe className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-semibold truncate">{row.nombre}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">#{row.id}</Badge>
                    {row.codigoInterno && (
                      <span className="inline-flex items-center gap-1 text-xs font-mono px-1.5 py-0.5 rounded border border-border bg-muted/40">
                        <Hash className="h-3 w-3" />
                        {row.codigoInterno}
                        <CopyButton text={row.codigoInterno} label="Código" className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  {row.nombreEncargado && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {row.nombreEncargado}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:shrink-0">
                {principalTel && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background/40">
                    <Star className="h-3 w-3 text-amber-500" />
                    <span className="font-mono">{principalTel.numero}</span>
                    <CopyButton text={principalTel.numero} label="Teléfono" className="h-4 w-4" />
                  </span>
                )}
                {principalDir && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background/40 max-w-[16rem] truncate">
                    <MapPin className="h-3 w-3 text-orange-500 shrink-0" />
                    <span className="truncate">
                      {[principalDir.canton, principalDir.ciudad, principalDir.pais].filter(Boolean).join(', ') || principalDir.direccion || '—'}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                icon={<Phone className="h-4 w-4" />}
                label="Teléfonos"
                value={row.telefonos?.length ?? 0}
                accent="info"
                hint={principalTel ? '1 marcado como principal' : 'Sin principal'}
              />
              <KpiCard
                icon={<MapPin className="h-4 w-4" />}
                label="Direcciones"
                value={row.direcciones?.length ?? 0}
                accent="warning"
                hint={principalDir ? `${principalDir.ciudad || principalDir.canton || principalDir.pais || '—'}` : 'Sin dirección'}
              />
              <KpiCard
                icon={<Package className="h-4 w-4" />}
                label="Paquetes"
                value={paquetesLoading ? '…' : stats.totalPaquetes}
                accent="primary"
                hint={paquetesLoading ? 'Cargando…' : stats.sinConsolidado > 0 ? `${stats.sinConsolidado} sin consolidar` : 'Todos consolidados'}
              />
              <KpiCard
                icon={<Building2 className="h-4 w-4" />}
                label="Consolidados"
                value={paquetesLoading ? '…' : stats.consolidados}
                accent="success"
                hint={paquetesLoading ? 'Cargando…' : stats.consolidados === 1 ? 'En 1 consolidado' : `En ${stats.consolidados} consolidados`}
              />
            </div>

            {/* Datos generales */}
            <SectionCard icon={Info} iconColor="blue" title="Datos generales">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nombre</span>
                  <p className="text-sm font-medium mt-1">{row.nombre}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Código interno</span>
                  <div className="flex items-center gap-2 mt-1">
                    {row.codigoInterno ? (
                      <>
                        <p className="text-sm font-mono font-medium">{row.codigoInterno}</p>
                        <CopyButton text={row.codigoInterno} label="Código" />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Encargado</span>
                  <p className="text-sm font-medium mt-1">{row.nombreEncargado || '—'}</p>
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
                  {row.telefonos?.length ?? 0} {row.telefonos?.length === 1 ? 'registrado' : 'registrados'}
                </span>
              }
            >
              {row.telefonos?.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {row.telefonos.map((t, idx) => (
                    <div
                      key={t.id ?? idx}
                      className={`group flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                        t.esPrincipal
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : 'border-border/50 bg-background/40 hover:bg-accent/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {t.esPrincipal && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        <span className="font-mono text-sm truncate">{t.numero}</span>
                        {t.etiqueta && (
                          <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                            {t.etiqueta}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {t.esPrincipal && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400">
                            Principal
                          </Badge>
                        )}
                        <CopyButton text={t.numero} label="Teléfono" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Sin teléfonos registrados</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => navigate(`/shippers/${row.id}/edit`)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar teléfono
                  </Button>
                </div>
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
                <div className="space-y-2">
                  {row.direcciones.map((d, idx) => {
                    const ubic = [d.ciudad, d.canton, d.pais].filter(Boolean).join(', ');
                    const fullText = [d.direccion, ubic, d.referencia].filter(Boolean).join(' · ');
                    return (
                      <div
                        key={d.id || idx}
                        className="group rounded-xl border border-border/40 bg-background/40 p-4 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{d.direccion || '—'}</p>
                            {ubic && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {ubic}
                              </p>
                            )}
                            {d.referencia && (
                              <p className="text-xs text-muted-foreground italic mt-1">
                                "{d.referencia}"
                              </p>
                            )}
                          </div>
                          <CopyButton text={fullText} label="Dirección" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Sin direcciones registradas</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => navigate(`/shippers/${row.id}/edit`)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar dirección
                  </Button>
                </div>
              )}
            </SectionCard>

            {/* Usuario asociado */}
            <SectionCard icon={User} iconColor="violet" title="Usuario asociado">
              {linkedUser ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Username</span>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium">{linkedUser.username}</p>
                        <CopyButton text={linkedUser.username} label="Usuario" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
                      <div className="flex items-center gap-2 mt-1 min-w-0">
                        <p className="text-sm font-medium truncate">{linkedUser.email}</p>
                        <CopyButton text={linkedUser.email} label="Email" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Estado</span>
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className={
                            linkedUser.activo
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-muted/40 text-muted-foreground border-border/50'
                          }
                        >
                          {linkedUser.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate(`/usuarios/${linkedUser.id}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver perfil del usuario
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Este shipper no tiene usuario asociado</p>
                </div>
              )}
            </SectionCard>

            {/* Atajos */}
            <div className="text-[11px] text-muted-foreground text-center pt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span>Atajos:</span>
              <Kbd>E</Kbd>
              <span>editar</span>
              <span className="opacity-40">·</span>
              <Kbd>Supr</Kbd>
              <span>eliminar</span>
              <span className="opacity-40">·</span>
              <Kbd>Esc</Kbd>
              <span>volver</span>
            </div>
          </div>
        )}
      </DetailPageLayout>
    </DashboardLayout>
  );
}
