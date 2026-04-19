import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Info,
  Pencil,
  Trash2,
  Shield,
  KeyRound,
  Layers,
  Users,
  Copy,
  AlertTriangle,
  ExternalLink,
  Hash,
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { KpiCard, Kbd } from '@/components/layout/KpiCard';
import { PageContent } from '@/components/layout/PageContent';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import type { Permiso } from '@/services/permisos.service';
import { deletePermiso, getPermiso } from '@/services/permisos.service';
import { listRoles, type Rol } from '@/services/roles.service';
import { listUsuarios, type Usuario } from '@/services/usuarios.service';
import {
  accionBadgeClass,
  getAccionInfo,
  getModuloKey,
  getModuloLabel,
} from '@/lib/permisosAgrupados';

function CopyButton({ text, label = 'Texto' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success(`${label} copiado`);
          setTimeout(() => setDone(false), 1200);
        } catch {
          toast.error('No se pudo copiar');
        }
      }}
      className={`h-6 w-6 inline-flex items-center justify-center rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent transition-all ${
        done ? 'text-emerald-600 dark:text-emerald-400' : ''
      }`}
      title={`Copiar ${label.toLowerCase()}`}
      aria-label={`Copiar ${label.toLowerCase()}`}
    >
      {done ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function PermisoViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<Permiso | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [allRoles, setAllRoles] = useState<Rol[]>([]);
  const [allUsuarios, setAllUsuarios] = useState<Usuario[]>([]);

  // ---------------------------------------------------------------------------
  // Carga
  // ---------------------------------------------------------------------------

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        setRow(await getPermiso(String(id)));
      } catch (e) {
        console.error('Error cargando permiso', e);
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!row?.id) return;
    listRoles().then(setAllRoles).catch(() => setAllRoles([]));
    listUsuarios().then(setAllUsuarios).catch(() => setAllUsuarios([]));
  }, [row?.id]);

  // ---------------------------------------------------------------------------
  // Datos derivados
  // ---------------------------------------------------------------------------

  const relatedRoles = useMemo(
    () => (row ? allRoles.filter((r) => r.permisos?.some((p) => p.id === row.id)) : []),
    [allRoles, row],
  );

  const relatedUsuarios = useMemo(() => {
    if (!row) return [];
    const relatedRoleIds = new Set(relatedRoles.map((r) => r.id));
    return allUsuarios.filter((u) => u.rol?.id && relatedRoleIds.has(u.rol.id));
  }, [row, relatedRoles, allUsuarios]);

  const moduloKey = useMemo(() => getModuloKey(row?.nombre), [row?.nombre]);
  const moduloLabel = useMemo(() => getModuloLabel(moduloKey), [moduloKey]);
  const accion = useMemo(() => getAccionInfo(row?.nombre), [row?.nombre]);

  const enUso = relatedRoles.length > 0;
  const usuariosActivos = useMemo(
    () => relatedUsuarios.filter((u) => u.activo).length,
    [relatedUsuarios],
  );

  // ---------------------------------------------------------------------------
  // Acciones
  // ---------------------------------------------------------------------------

  const handleDelete = useCallback(() => {
    if (enUso) {
      toast.error(
        `No se puede eliminar: ${relatedRoles.length} rol${relatedRoles.length === 1 ? '' : 'es'} usa${relatedRoles.length === 1 ? '' : 'n'} este permiso`,
      );
      return;
    }
    setDeleteOpen(true);
  }, [enUso, relatedRoles.length]);

  // Atajos
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      if (!row) return;
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        navigate(`/permisos/${row.id}/edit`);
      }
      if (e.key === 'Delete') {
        e.preventDefault();
        handleDelete();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/permisos');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [row, navigate, handleDelete]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <DetailPageLayout
        title={row ? row.nombre : 'Permiso'}
        subtitle="Detalle del permiso"
        backUrl="/permisos"
        actions={
          row ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/permisos/${row.id}/edit`)}
                className="gap-1.5"
                title="Editar (E)"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="gap-1.5"
                title={enUso ? 'No se puede eliminar (en uso)' : 'Eliminar (Supr)'}
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
          entityLabel="permiso"
          entityName={row?.nombre}
          loading={deleting}
          onConfirm={async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await deletePermiso(String(id));
              toast.success('Permiso eliminado');
              navigate('/permisos', { replace: true });
            } catch (e) {
              console.error('Error eliminando permiso', e);
              toast.error('No se pudo eliminar el permiso');
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
            }
          }}
        />

        {loading ? (
          <LoadingState label="Cargando permiso..." />
        ) : error ? (
          <ErrorState title="Error al cargar permiso" description={error} />
        ) : !row ? (
          <ErrorState title="No se encontró el permiso" />
        ) : (
          <PageContent spacing="6">
            {/* Banner principal */}
            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-background p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`h-14 w-14 rounded-xl flex items-center justify-center shrink-0 ${accionBadgeClass(accion.tone)}`}>
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-semibold font-mono break-all">{row.nombre}</h1>
                      <CopyButton text={row.nombre} label="Permiso" />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[11px] gap-1">
                        <Layers className="h-3 w-3" />
                        {moduloLabel}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[11px] ${accionBadgeClass(accion.tone)}`}
                      >
                        {accion.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                        <Hash className="h-2.5 w-2.5" />
                        ID {row.id}
                      </Badge>
                    </div>
                    {row.descripcion?.trim() ? (
                      <p className="text-xs text-muted-foreground max-w-2xl">{row.descripcion}</p>
                    ) : (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Este permiso no tiene descripción. Considera agregar una.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                icon={<Shield className="h-4 w-4" />}
                label="Roles que lo usan"
                value={relatedRoles.length}
                accent={enUso ? 'info' : 'muted'}
                hint={
                  enUso
                    ? `${relatedRoles.length === 1 ? '1 rol' : `${relatedRoles.length} roles`} con este permiso`
                    : 'Sin asignar a ningún rol'
                }
              />
              <KpiCard
                icon={<Users className="h-4 w-4" />}
                label="Usuarios afectados"
                value={relatedUsuarios.length}
                accent={relatedUsuarios.length > 0 ? 'primary' : 'muted'}
                hint={
                  relatedUsuarios.length === 0
                    ? 'Ningún usuario lo recibe'
                    : `${usuariosActivos} activos`
                }
              />
              <KpiCard
                icon={<Layers className="h-4 w-4" />}
                label="Módulo"
                value={moduloLabel}
                accent="info"
                hint={`Clave: ${moduloKey}`}
              />
              <KpiCard
                icon={<KeyRound className="h-4 w-4" />}
                label="Acción"
                value={accion.label}
                accent={
                  accion.tone === 'create' ? 'success'
                  : accion.tone === 'delete' ? 'warning'
                  : accion.tone === 'update' ? 'warning'
                  : 'info'
                }
                hint={accion.raw || 'Sin clasificar'}
              />
            </div>

            {/* Aviso de uso */}
            {enUso && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 flex items-start gap-3">
                <Shield className="h-4 w-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
                <div className="text-xs text-sky-900 dark:text-sky-200 space-y-0.5">
                  <p className="font-medium">Permiso en uso</p>
                  <p className="text-sky-800 dark:text-sky-300/90">
                    Este permiso está asignado a {relatedRoles.length} rol{relatedRoles.length === 1 ? '' : 'es'}
                    {relatedUsuarios.length > 0 && ` y afecta a ${relatedUsuarios.length} usuario${relatedUsuarios.length === 1 ? '' : 's'}`}.
                    No se puede eliminar mientras esté siendo utilizado.
                  </p>
                </div>
              </div>
            )}

            {/* Información */}
            <SectionCard
              icon={Info}
              iconColor="blue"
              title="Información del permiso"
              description="Datos básicos y nomenclatura"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    ID interno
                  </span>
                  <div className="text-sm font-medium mt-1 inline-flex items-center gap-2">
                    <span className="font-mono">#{row.id}</span>
                    <CopyButton text={String(row.id)} label="ID" />
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Nombre técnico
                  </span>
                  <div className="text-sm font-medium mt-1 inline-flex items-center gap-2">
                    <span className="font-mono break-all">{row.nombre}</span>
                    <CopyButton text={row.nombre} label="Permiso" />
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Módulo
                  </span>
                  <div className="mt-1 inline-flex items-center gap-2">
                    <Badge variant="secondary" className="text-[11px] gap-1">
                      <Layers className="h-3 w-3" />
                      {moduloLabel}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-mono">({moduloKey})</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Acción
                  </span>
                  <div className="mt-1">
                    <Badge variant="outline" className={`text-[11px] ${accionBadgeClass(accion.tone)}`}>
                      {accion.label}
                    </Badge>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Descripción
                  </span>
                  {row.descripcion?.trim() ? (
                    <p className="text-sm mt-1 leading-relaxed">{row.descripcion}</p>
                  ) : (
                    <p className="text-sm mt-1 text-muted-foreground italic">
                      Sin descripción.{' '}
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => navigate(`/permisos/${row.id}/edit`)}
                      >
                        Agregar
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Roles relacionados */}
            <SectionCard
              icon={Shield}
              iconColor="green"
              title="Roles que incluyen este permiso"
              description={
                relatedRoles.length === 0
                  ? 'Aún no asignado'
                  : `${relatedRoles.length} rol${relatedRoles.length === 1 ? '' : 'es'} usan este permiso`
              }
              right={
                relatedRoles.length > 0 ? (
                  <Badge variant="secondary" className="text-[10px] tabular-nums">
                    {relatedRoles.length}
                  </Badge>
                ) : null
              }
            >
              {relatedRoles.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedRoles.map((r) => {
                    const numUsuariosRol = allUsuarios.filter((u) => u.rol?.id === r.id).length;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => navigate(`/roles/${r.id}`)}
                        className="group flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border/50 bg-background hover:border-primary/40 hover:bg-accent/50 transition-all text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{r.nombre}</div>
                            <div className="text-[10px] text-muted-foreground tabular-nums">
                              {(r.permisos?.length ?? 0)} permisos · {numUsuariosRol} usuario{numUsuariosRol === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Este permiso no está asignado a ningún rol.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/roles')}>
                    Ir a roles
                  </Button>
                </div>
              )}
            </SectionCard>

            {/* Usuarios afectados */}
            {relatedUsuarios.length > 0 && (
              <SectionCard
                icon={Users}
                iconColor="violet"
                title="Usuarios con este permiso"
                description={`Vía ${relatedRoles.length} rol${relatedRoles.length === 1 ? '' : 'es'}`}
                right={
                  <Badge variant="secondary" className="text-[10px] tabular-nums">
                    {relatedUsuarios.length}
                  </Badge>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {relatedUsuarios.slice(0, 12).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => navigate(`/usuarios/${u.id}`)}
                      className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-background hover:border-primary/40 hover:bg-accent/50 transition-all text-left min-w-0"
                    >
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold uppercase shrink-0">
                        {(u.username ?? '?').slice(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{u.username}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                      </div>
                      {u.activo ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                {relatedUsuarios.length > 12 && (
                  <p className="text-[11px] text-muted-foreground text-center mt-3">
                    +{relatedUsuarios.length - 12} usuarios más
                  </p>
                )}
              </SectionCard>
            )}

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
              <span className="opacity-40">·</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={() => navigate('/permisos')}
              >
                <ArrowLeft className="h-3 w-3" />
                Lista
              </Button>
            </div>
          </PageContent>
        )}
      </DetailPageLayout>
    </DashboardLayout>
  );
}
