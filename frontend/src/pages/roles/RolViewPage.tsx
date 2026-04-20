import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Info,
  KeyRound,
  Pencil,
  Trash2,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Hash,
  Copy,
  CheckCircle2,
  XCircle,
  AtSign,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { KpiCard, Kbd } from '@/components/layout/KpiCard';
import { DetailPageSkeleton, ListRowsSkeleton } from '@/components/skeletons';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRol } from '@/hooks/useRoles';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { deleteRol } from '@/services/roles.service';
import { listUsuarios, type Usuario } from '@/services/usuarios.service';
import {
  agruparPermisos,
  accionBadgeClass,
  getAccionInfo,
} from '@/lib/permisosAgrupados';

// =============================================================================
// Helpers
// =============================================================================

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  } catch {
    toast.error('No se pudo copiar al portapapeles');
  }
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        copy(text, label);
      }}
      className="h-6 w-6 inline-flex items-center justify-center rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted transition-colors"
      title={`Copiar ${label.toLowerCase()}`}
      aria-label={`Copiar ${label.toLowerCase()}`}
    >
      <Copy className="h-3 w-3" />
    </button>
  );
}

function rolBadgeClass(nombre: string | null | undefined): string {
  const r = (nombre ?? '').toUpperCase();
  if (r.includes('ADMIN')) return 'bg-accent-soft text-accent-soft-foreground border-accent/30';
  if (r.includes('OPERA')) return 'bg-info/15 text-info border-info/30';
  if (r.includes('SHIPPER')) return 'bg-accent-soft text-accent-soft-foreground border-accent/30';
  return 'bg-muted/40 text-muted-foreground border-border/50';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// =============================================================================
// Componente
// =============================================================================

export default function RolViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: row, loading, error } = useRol(id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [roleUsers, setRoleUsers] = useState<Usuario[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // ---------------------------------------------------------------------------
  // Cargar usuarios con este rol
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (row?.id == null) return;
    let cancelled = false;
    setLoadingUsers(true);
    listUsuarios()
      .then((users) => {
        if (cancelled) return;
        setRoleUsers(users.filter((u) => u.rol?.id === row.id));
      })
      .catch(() => {
        if (!cancelled) setRoleUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });
    return () => { cancelled = true; };
  }, [row?.id]);

  // ---------------------------------------------------------------------------
  // Datos derivados
  // ---------------------------------------------------------------------------

  const grupos = useMemo(() => agruparPermisos(row?.permisos ?? []), [row?.permisos]);
  const totalPermisos = row?.permisos?.length ?? 0;
  const totalUsuarios = roleUsers.length;
  const usuariosActivos = roleUsers.filter((u) => u.activo).length;
  const enUso = totalUsuarios > 0;

  // ---------------------------------------------------------------------------
  // Atajos
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
      if (isTyping) return;
      if (!row) return;
      if (e.key === 'e') {
        e.preventDefault();
        navigate(`/roles/${row.id}/edit`);
      } else if (e.key === 'Escape') {
        navigate('/roles');
      } else if (e.key === 'Delete') {
        e.preventDefault();
        if (enUso) {
          toast.error(`No se puede eliminar: hay ${totalUsuarios} usuario${totalUsuarios === 1 ? '' : 's'} con este rol`);
          return;
        }
        setDeleteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, row, enUso, totalUsuarios]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (enUso) {
      toast.error(`No se puede eliminar: hay ${totalUsuarios} usuario${totalUsuarios === 1 ? '' : 's'} con este rol`);
      setDeleteOpen(false);
      return;
    }
    setDeleting(true);
    try {
      await deleteRol(String(id));
      toast.success('Rol eliminado');
      navigate('/roles', { replace: true });
    } catch (e) {
      console.error('Error eliminando rol', e);
      toast.error('No se pudo eliminar el rol');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }, [id, enUso, totalUsuarios, navigate]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <DetailPageLayout
        title={row ? row.nombre : 'Rol'}
        subtitle={row ? `Rol #${row.id}` : 'Detalle del rol'}
        backUrl="/roles"
        actions={
          row ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/roles/${row.id}/edit`)}
                className="gap-1.5"
                title="Editar (E)"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (enUso) {
                    toast.error(`No se puede eliminar: hay ${totalUsuarios} usuario${totalUsuarios === 1 ? '' : 's'} con este rol`);
                    return;
                  }
                  setDeleteOpen(true);
                }}
                disabled={enUso}
                title={
                  enUso
                    ? `En uso por ${totalUsuarios} usuario${totalUsuarios === 1 ? '' : 's'}`
                    : 'Eliminar (Supr)'
                }
                className="gap-1.5"
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
          entityLabel="rol"
          entityName={row?.nombre}
          loading={deleting}
          onConfirm={handleDelete}
        />

        {loading ? (
          <DetailPageSkeleton kpis={4} sections={[3]} />
        ) : error ? (
          <ErrorState title="Error al cargar rol" description={error} />
        ) : !row ? (
          <ErrorState title="No se encontró el rol" />
        ) : (
          <div className="space-y-6">
            {/* Banner identificativo */}
            <div className="rounded-xl border border-border bg-gradient-to-r from-accent-soft/60 to-transparent p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-soft">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                  <Shield className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${rolBadgeClass(row.nombre)}`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {row.nombre}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">#{row.id}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <KeyRound className="h-3 w-3" />
                      {totalPermisos} permiso{totalPermisos === 1 ? '' : 's'}
                    </span>
                    <span className="opacity-40">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {totalUsuarios} usuario{totalUsuarios === 1 ? '' : 's'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                {totalPermisos > 0 ? (
                  <Badge variant="success" className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="warning" className="gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    Sin permisos
                  </Badge>
                )}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard
                icon={<Hash className="h-4 w-4" />}
                label="ID"
                value={`#${row.id}`}
                accent="muted"
                hint="Identificador único"
              />
              <KpiCard
                icon={<KeyRound className="h-4 w-4" />}
                label="Permisos"
                value={totalPermisos}
                accent={totalPermisos > 0 ? 'success' : 'warning'}
                hint={`${grupos.length} módulo${grupos.length === 1 ? '' : 's'}`}
              />
              <KpiCard
                icon={<Users className="h-4 w-4" />}
                label="Usuarios"
                value={totalUsuarios}
                accent={totalUsuarios > 0 ? 'info' : 'muted'}
                hint={
                  totalUsuarios > 0
                    ? `${usuariosActivos} activo${usuariosActivos === 1 ? '' : 's'}`
                    : 'Sin asignar'
                }
              />
              <KpiCard
                icon={enUso ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                label="Estado"
                value={enUso ? 'En uso' : 'Sin uso'}
                accent={enUso ? 'success' : 'muted'}
                hint={enUso ? 'Eliminación protegida' : 'Puede eliminarse'}
              />
            </div>

            {/* Aviso si está en uso */}
            {enUso && (
              <div className="rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-xs text-info flex items-start gap-2">
                <Users className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Rol asignado a {totalUsuarios} usuario{totalUsuarios === 1 ? '' : 's'}.</p>
                  <p className="mt-0.5 opacity-90">
                    Para eliminarlo, primero reasigna a los usuarios a otro rol.
                  </p>
                </div>
              </div>
            )}

            {/* Información general */}
            <SectionCard
              icon={Info}
              iconColor="blue"
              title="Información general"
              right={<span className="text-xs text-muted-foreground font-mono">#{row.id}</span>}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Identificador
                  </span>
                  <p className="text-sm font-medium mt-1 font-mono">#{row.id}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Nombre
                  </span>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.nombre}</p>
                    <CopyBtn text={row.nombre} label="Nombre" />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Permisos */}
            <SectionCard
              icon={KeyRound}
              iconColor="violet"
              title="Permisos asignados"
              description="Agrupados por módulo. Haz clic en un permiso para ver su detalle."
              right={
                <Badge variant="brand" className="text-[10px] gap-1 tabular-nums">
                  <KeyRound className="h-2.5 w-2.5" />
                  {totalPermisos}
                </Badge>
              }
            >
              {totalPermisos === 0 ? (
                <div className="text-center py-8">
                  <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-warning/60" />
                  <p className="text-sm font-medium">Sin permisos asignados</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este rol no tiene permisos. Los usuarios no podrán realizar acciones del sistema.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 gap-1.5"
                    onClick={() => navigate(`/roles/${row.id}/edit`)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Asignar permisos
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {grupos.map((g) => (
                    <div
                      key={g.moduloKey}
                      className="rounded-lg border border-border/40 bg-background/30"
                    >
                      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/10">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {g.modulo}
                          </span>
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[9px] tabular-nums"
                          >
                            {g.permisos.length}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-3 flex flex-wrap gap-1.5">
                        {g.permisos.map((p) => {
                          const accion = getAccionInfo(p.nombre);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => navigate(`/permisos/${p.id}`)}
                              className={`group inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors hover:opacity-80 ${accionBadgeClass(accion.tone)}`}
                              title={p.descripcion ?? p.nombre}
                            >
                              <span className="font-mono opacity-80">{p.nombre}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Usuarios */}
            <SectionCard
              icon={Users}
              iconColor="amber"
              title="Usuarios con este rol"
              right={
                <Badge variant="info" className="text-[10px] gap-1 tabular-nums">
                  <Users className="h-2.5 w-2.5" />
                  {totalUsuarios}
                </Badge>
              }
            >
              {loadingUsers ? (
                <ListRowsSkeleton rows={4} columns={2} />
              ) : roleUsers.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No hay usuarios con este rol</p>
                  <p className="text-xs mt-1 opacity-80">
                    Este rol está disponible para asignar a nuevos usuarios.
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {roleUsers.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/usuarios/${u.id}`)}
                        className="w-full flex items-center gap-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2 hover:border-accent/30 hover:bg-accent-soft/40 transition-colors ease-claude text-left"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                          {getInitials(u.username || u.email || '?')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-medium truncate">{u.username}</span>
                            {u.activo ? (
                              <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                            ) : (
                              <XCircle className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                            <AtSign className="h-2.5 w-2.5" />
                            {u.email}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            {/* Aviso si sin permisos y con usuarios */}
            {totalPermisos === 0 && totalUsuarios > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    Hay {totalUsuarios} usuario{totalUsuarios === 1 ? '' : 's'} con este rol pero no tiene permisos asignados.
                  </p>
                  <p className="mt-0.5 opacity-90">
                    No podrán realizar ninguna acción del sistema hasta que asignes permisos.
                  </p>
                </div>
              </div>
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
            </div>
          </div>
        )}
      </DetailPageLayout>
    </DashboardLayout>
  );
}
