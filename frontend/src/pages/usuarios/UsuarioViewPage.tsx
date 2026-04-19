import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Pencil,
  Trash2,
  Truck,
  Mail,
  AtSign,
  Copy,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Hash,
  ShieldCheck,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { DetailPageLayout } from '@/components/detail/DetailPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { KpiCard, Kbd } from '@/components/layout/KpiCard';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUsuario } from '@/hooks/useUsuarios';
import { useMe } from '@/hooks/useMe';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { deleteUsuario } from '@/services/usuarios.service';

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

function CopyBtn({ text, label, className = '' }: { text: string; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        copy(text, label);
      }}
      className={`h-6 w-6 inline-flex items-center justify-center rounded border border-transparent text-muted-foreground hover:text-foreground hover:border-border hover:bg-accent transition-colors ${className}`}
      title={`Copiar ${label.toLowerCase()}`}
      aria-label={`Copiar ${label.toLowerCase()}`}
    >
      <Copy className="h-3 w-3" />
    </button>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function rolBadgeClass(rol: string | null | undefined): string {
  const r = (rol ?? '').toUpperCase();
  if (r.includes('ADMIN')) return 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30';
  if (r.includes('OPERA')) return 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30';
  if (r.includes('SHIPPER')) return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30';
  return 'bg-muted/40 text-muted-foreground border-border/50';
}

// =============================================================================
// Componente
// =============================================================================

export default function UsuarioViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: row, loading, error } = useUsuario(id);
  const { me } = useMe();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSelf =
    me?.username != null &&
    row?.username != null &&
    me.username.toLowerCase() === row.username.toLowerCase();

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
        navigate(`/usuarios/${row.id}/edit`);
      } else if (e.key === 'Escape') {
        navigate('/usuarios');
      } else if (e.key === 'Delete') {
        e.preventDefault();
        if (isSelf) {
          toast.error('No puedes eliminar tu propio usuario');
          return;
        }
        setDeleteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, row, isSelf]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (isSelf) {
      toast.error('No puedes eliminar tu propio usuario');
      setDeleteOpen(false);
      return;
    }
    setDeleting(true);
    try {
      await deleteUsuario(String(id));
      toast.success('Usuario eliminado');
      navigate('/usuarios', { replace: true });
    } catch (e) {
      console.error('Error eliminando usuario', e);
      toast.error('No se pudo eliminar el usuario');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }, [id, isSelf, navigate]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <DetailPageLayout
        title={row ? row.username : 'Usuario'}
        subtitle={row ? `Usuario #${row.id}` : 'Detalle del usuario'}
        backUrl="/usuarios"
        status={
          row
            ? { label: row.activo ? 'Activo' : 'Inactivo', variant: row.activo ? 'active' : 'inactive' }
            : undefined
        }
        actions={
          row ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/usuarios/${row.id}/edit`)}
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
                  if (isSelf) {
                    toast.error('No puedes eliminar tu propio usuario');
                    return;
                  }
                  setDeleteOpen(true);
                }}
                disabled={isSelf}
                title={isSelf ? 'No puedes eliminar tu propio usuario' : 'Eliminar (Supr)'}
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
          entityLabel="usuario"
          entityName={row ? `${row.username} (${row.email})` : null}
          loading={deleting}
          onConfirm={handleDelete}
        />

        {loading ? (
          <LoadingState label="Cargando usuario..." />
        ) : error ? (
          <ErrorState title="Error al cargar usuario" description={error} />
        ) : !row ? (
          <ErrorState title="No se encontró el usuario" />
        ) : (
          <div className="space-y-6">
            {/* Banner identificativo */}
            <div className="rounded-xl border border-border bg-gradient-to-r from-primary/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary text-base font-semibold">
                  {getInitials(row.username || row.email || '?')}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-semibold truncate">{row.username}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">#{row.id}</Badge>
                    {isSelf && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-primary/10 text-primary border-primary/30"
                      >
                        Tu cuenta
                      </Badge>
                    )}
                    {row.rol?.nombre && (
                      <Badge variant="outline" className={`text-[10px] ${rolBadgeClass(row.rol.nombre)}`}>
                        <Shield className="h-2.5 w-2.5 mr-1" />
                        {row.rol.nombre}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 min-w-0">
                    <AtSign className="h-3 w-3 shrink-0" />
                    <span className="truncate">{row.email}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                {row.activo ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Activo
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-muted/40 text-muted-foreground border-border/50 gap-1"
                  >
                    <XCircle className="h-3 w-3" />
                    Inactivo
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
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Rol"
                value={row.rol?.nombre || '—'}
                accent={row.rol?.nombre ? 'primary' : 'warning'}
                hint={row.rol?.nombre ? 'Permisos definidos por rol' : 'Sin rol asignado'}
              />
              <KpiCard
                icon={<Truck className="h-4 w-4" />}
                label="Shipper"
                value={row.shipper?.nombre || '—'}
                accent={row.shipper ? 'info' : 'muted'}
                hint={row.shipper ? 'Vinculado a un shipper' : 'Sin shipper asociado'}
              />
              <KpiCard
                icon={row.activo ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                label="Estado"
                value={row.activo ? 'Activo' : 'Inactivo'}
                accent={row.activo ? 'success' : 'muted'}
                hint={row.activo ? 'Puede iniciar sesión' : 'Acceso deshabilitado'}
              />
            </div>

            {/* Información personal */}
            <SectionCard
              icon={User}
              iconColor="blue"
              title="Información personal"
              right={
                <span className="text-xs text-muted-foreground font-mono">#{row.id}</span>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Usuario
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-medium">{row.username}</p>
                    <CopyBtn text={row.username} label="Usuario" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Email
                  </span>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium truncate">{row.email}</p>
                    <CopyBtn text={row.email} label="Email" />
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Estado y rol */}
            <SectionCard icon={Shield} iconColor="green" title="Acceso y permisos">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Estado de la cuenta
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    {row.activo ? (
                      <>
                        <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Activo
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Puede iniciar sesión normalmente.
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground border border-border">
                          <XCircle className="h-3.5 w-3.5" />
                          Inactivo
                        </span>
                        <span className="text-xs text-muted-foreground">
                          No podrá iniciar sesión hasta reactivarlo.
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Rol asignado
                  </span>
                  <div className="mt-2">
                    {row.rol?.nombre ? (
                      <Badge variant="outline" className={`text-xs ${rolBadgeClass(row.rol.nombre)}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {row.rol.nombre}
                      </Badge>
                    ) : (
                      <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 text-xs font-medium text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        <Shield className="h-3.5 w-3.5" />
                        Sin rol asignado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Shipper asociado */}
            <SectionCard icon={Truck} iconColor="orange" title="Shipper asociado">
              {row.shipper ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Nombre
                      </span>
                      <p className="text-sm font-medium mt-1">{row.shipper.nombre}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Código interno
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {row.shipper.codigoInterno ? (
                          <>
                            <p className="text-sm font-mono font-medium">{row.shipper.codigoInterno}</p>
                            <CopyBtn text={row.shipper.codigoInterno} label="Código" />
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Encargado
                      </span>
                      <p className="text-sm font-medium mt-1">{row.shipper.nombreEncargado || '—'}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate(`/shippers/${row.shipper!.id}`)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ver perfil del shipper
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Truck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Este usuario no tiene shipper asociado</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => navigate(`/usuarios/${row.id}/edit`)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Asignar shipper
                  </Button>
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
