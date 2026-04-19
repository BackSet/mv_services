import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  User,
  Info,
  Truck,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Lock,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  AtSign,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { SectionCard } from '@/components/layout/SectionCard';
import { Kbd } from '@/components/layout/KpiCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  deleteUsuario,
  getUsuario,
  listUsuarios,
  updateUsuario,
  type Usuario,
  type UsuarioUpdateInput,
} from '@/services/usuarios.service';
import { listRoles, type Rol } from '@/services/roles.service';
import { listShippers, type Shipper } from '@/services/shippers.service';
import { ShipperCombobox } from '@/components/shipper/ShipperCombobox';
import { LoadingState } from '@/components/states/LoadingState';
import { ErrorState } from '@/components/states/ErrorState';
import ConfirmDeleteDialog from '@/components/notion/ConfirmDeleteDialog';
import { useMe } from '@/hooks/useMe';
import {
  esEmailValido,
  esUsernameValido,
  evaluarPassword,
  generarPassword,
} from '@/lib/password';
import { cn } from '@/lib/utils';

// =============================================================================
// Componente
// =============================================================================

type FormState = {
  username: string;
  email: string;
  password: string;
  rolId: string;
  shipperId: string;
  activo: boolean;
};

const emptyForm: FormState = {
  username: '',
  email: '',
  password: '',
  rolId: '',
  shipperId: '',
  activo: true,
};

export default function UsuarioEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me } = useMe();

  const [original, setOriginal] = useState<Usuario | null>(null);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [usernamesExistentes, setUsernamesExistentes] = useState<string[]>([]);
  const [emailsExistentes, setEmailsExistentes] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<FormState>(emptyForm);

  const isSelf = useMemo(
    () =>
      me?.username != null &&
      original?.username != null &&
      me.username.toLowerCase() === original.username.toLowerCase(),
    [me, original],
  );

  // ---------------------------------------------------------------------------
  // Carga inicial
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [u, rs, ss, all] = await Promise.all([
          getUsuario(String(id)),
          listRoles(),
          listShippers(),
          listUsuarios(),
        ]);
        if (cancelled) return;
        setOriginal(u);
        setRoles(rs);
        setShippers(ss);

        const baseUsername = (u.username ?? '').toLowerCase();
        const baseEmail = (u.email ?? '').toLowerCase();
        setUsernamesExistentes(
          all
            .map((x) => (x.username ?? '').toLowerCase())
            .filter((x) => x && x !== baseUsername),
        );
        setEmailsExistentes(
          all
            .map((x) => (x.email ?? '').toLowerCase())
            .filter((x) => x && x !== baseEmail),
        );

        const initial: FormState = {
          username: u.username || '',
          email: u.email || '',
          password: '',
          rolId: u.rol?.id?.toString() || '',
          shipperId: u.shipper?.id?.toString() || '',
          activo: !!u.activo,
        };
        setForm(initial);
        setInitialForm(initial);
      } catch (e: unknown) {
        if (cancelled) return;
        console.error('Error cargando usuario', e);
        setLoadError(e instanceof Error ? e.message : 'No se pudo cargar el usuario');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // ---------------------------------------------------------------------------
  // Validación
  // ---------------------------------------------------------------------------

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const username = form.username.trim();
    const email = form.email.trim();

    if (!username) e.username = 'El usuario es obligatorio';
    else if (!esUsernameValido(username))
      e.username = '3-50 caracteres · letras, números, . _ -';
    else if (usernamesExistentes.includes(username.toLowerCase()))
      e.username = 'Este usuario ya existe';

    if (!email) e.email = 'El email es obligatorio';
    else if (!esEmailValido(email)) e.email = 'Formato de email no válido';
    else if (emailsExistentes.includes(email.toLowerCase()))
      e.email = 'Este email ya está en uso';

    if (form.password && form.password.length < 8)
      e.password = 'Mínimo 8 caracteres (déjalo vacío para no cambiar)';

    if (!form.rolId) e.rolId = 'Selecciona un rol';

    return e;
  }, [form, usernamesExistentes, emailsExistentes]);

  const isValid = Object.keys(errors).length === 0;
  const showError = (k: string) => touched && !!errors[k];

  const passwordStrength = useMemo(() => evaluarPassword(form.password), [form.password]);

  // ---------------------------------------------------------------------------
  // Dirty tracking
  // ---------------------------------------------------------------------------

  const isDirty = useMemo(() => {
    return (
      form.username !== initialForm.username ||
      form.email !== initialForm.email ||
      form.rolId !== initialForm.rolId ||
      form.shipperId !== initialForm.shipperId ||
      form.activo !== initialForm.activo ||
      form.password.length > 0
    );
  }, [form, initialForm]);

  useEffect(() => {
    if (!isDirty || submitting) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, submitting]);

  const tryNavigateAway = useCallback(
    (target: string) => {
      if (isDirty && !submitting && !confirm('Hay cambios sin guardar. ¿Salir igualmente?')) {
        return;
      }
      navigate(target);
    },
    [isDirty, submitting, navigate],
  );

  // ---------------------------------------------------------------------------
  // Password helpers
  // ---------------------------------------------------------------------------

  const generarPwd = useCallback(() => {
    const pwd = generarPassword(14);
    setForm((f) => ({ ...f, password: pwd }));
    setShowPassword(true);
    toast.success('Contraseña generada');
  }, []);

  const copiarPwd = useCallback(async () => {
    if (!form.password) return;
    try {
      await navigator.clipboard.writeText(form.password);
      toast.success('Contraseña copiada');
    } catch {
      toast.error('No se pudo copiar');
    }
  }, [form.password]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setTouched(true);
      if (!isValid) {
        toast.error('Revisa los campos marcados');
        return;
      }
      if (isSelf && !form.activo && initialForm.activo) {
        if (!confirm('Vas a desactivar tu propio usuario y perderás el acceso. ¿Continuar?')) {
          return;
        }
      }
      setSubmitting(true);
      try {
        const rol = roles.find((r) => String(r.id) === form.rolId);
        const payload: UsuarioUpdateInput = {
          username: form.username.trim(),
          email: form.email.trim(),
          rol,
          shipper: form.shipperId ? { id: Number(form.shipperId) } : null,
          activo: form.activo,
        };
        if (form.password.trim()) payload.password = form.password;
        await updateUsuario(String(id), payload);
        toast.success('Usuario actualizado');
        navigate(`/usuarios/${id}`);
      } catch (err) {
        console.error('Error actualizando usuario', err);
        toast.error('No se pudo actualizar el usuario');
      } finally {
        setSubmitting(false);
      }
    },
    [isValid, form, initialForm.activo, isSelf, roles, id, navigate],
  );

  // ---------------------------------------------------------------------------
  // Eliminar
  // ---------------------------------------------------------------------------

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
  // Atajos
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (ctrlOrMeta && (e.key === 's' || e.key === 'S' || e.key === 'Enter')) {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          tryNavigateAway(`/usuarios/${id}`);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submit, tryNavigateAway, id]);

  const strengthBar = (() => {
    const colors: Record<string, string> = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      amber: 'bg-amber-500',
      emerald: 'bg-emerald-500',
      green: 'bg-green-500',
    };
    return colors[passwordStrength.color];
  })();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout>
      <StandardPageLayout
        title="Editar Usuario"
        subtitle={original?.username ? `Modificando: ${original.username}` : undefined}
        icon={<User className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => tryNavigateAway(`/usuarios/${id}`)}
              className="gap-1.5"
              title="Volver (Esc)"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver
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
              disabled={loading || isSelf}
              className="gap-1.5"
              title={isSelf ? 'No puedes eliminar tu propio usuario' : 'Eliminar usuario'}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Eliminar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => submit()}
              disabled={submitting || loading || !isValid || !isDirty}
              className="gap-1.5"
              title="Guardar (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5" />
              {submitting ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        }
      >
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (deleting) return;
            setDeleteOpen(open);
          }}
          entityLabel="usuario"
          entityName={original ? `${original.username} (${original.email})` : null}
          loading={deleting}
          onConfirm={handleDelete}
        />

        {loading ? (
          <LoadingState label="Cargando usuario..." />
        ) : loadError || !original ? (
          <ErrorState
            title="No se pudo cargar el usuario"
            description={loadError ?? undefined}
            action={<Button variant="outline" onClick={() => navigate('/usuarios')}>Volver al listado</Button>}
          />
        ) : (
          <>
            <form
              id="usuario-edit-form"
              onSubmit={submit}
              className="max-w-4xl mx-auto p-6 space-y-6 pb-32"
            >
              {/* Banner identificativo */}
              <div
                className={cn(
                  'rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
                  isSelf
                    ? 'bg-primary/5 border-primary/30'
                    : 'bg-card/50 border-border',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    isSelf ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                  )}>
                    <User className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold leading-tight truncate">
                        {original.username}
                      </p>
                      <Badge variant="outline" className="text-[10px] font-mono">#{original.id}</Badge>
                      {isSelf && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                          Tu cuenta
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{original.email}</p>
                  </div>
                </div>
                {isDirty && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 shrink-0">
                    <AlertCircle className="h-3 w-3" />
                    Cambios sin guardar
                  </Badge>
                )}
              </div>

              {/* Aviso si auto-edición */}
              {isSelf && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Estás editando tu propia cuenta.</p>
                    <p className="mt-0.5 opacity-90">
                      Si cambias la contraseña, asegúrate de recordarla. Si te desactivas, perderás el acceso.
                    </p>
                  </div>
                </div>
              )}

              {/* Cuenta */}
              <SectionCard icon={Info} iconColor="blue" title="Cuenta">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      Usuario <span className="text-destructive">*</span>
                      <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal">
                        {form.username.length}/50
                      </span>
                    </Label>
                    <div className="relative">
                      <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        className={cn(
                          'h-9 pl-8',
                          showError('username') && 'border-destructive focus-visible:ring-destructive/20',
                        )}
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        onBlur={() => setTouched(true)}
                        maxLength={50}
                        autoComplete="off"
                      />
                    </div>
                    {showError('username') && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.username}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        className={cn(
                          'h-9 pl-8',
                          showError('email') && 'border-destructive focus-visible:ring-destructive/20',
                        )}
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        onBlur={() => setTouched(true)}
                        autoComplete="off"
                      />
                    </div>
                    {showError('email') && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      Nueva contraseña
                      <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                        opcional · déjalo vacío para no cambiar
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground tabular-nums font-normal">
                        {form.password.length} caracteres
                      </span>
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          className={cn(
                            'h-9 pl-8 pr-9 font-mono',
                            showError('password') && 'border-destructive focus-visible:ring-destructive/20',
                          )}
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          onBlur={() => setTouched(true)}
                          placeholder="Sin cambios"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center transition-colors"
                          title={showPassword ? 'Ocultar' : 'Mostrar'}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {form.password && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 px-2 shrink-0"
                          onClick={copiarPwd}
                          title="Copiar contraseña"
                          aria-label="Copiar contraseña"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 shrink-0 gap-1.5"
                        onClick={generarPwd}
                        title="Generar contraseña segura"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Generar</span>
                      </Button>
                    </div>

                    {form.password && (
                      <div className="space-y-1">
                        <div className="h-1 rounded-full bg-muted overflow-hidden flex gap-0.5">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                'flex-1 transition-all',
                                i <= passwordStrength.score ? strengthBar : 'bg-muted',
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                          <span>Fortaleza: <span className="font-medium text-foreground">{passwordStrength.label}</span></span>
                          {passwordStrength.score >= 3 && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Aceptable
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {showError('password') && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password}
                      </p>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Permisos y estado */}
              <SectionCard icon={Shield} iconColor="green" title="Permisos y estado">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      Rol <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.rolId}
                      onValueChange={(v) => { setForm({ ...form, rolId: v }); setTouched(true); }}
                    >
                      <SelectTrigger
                        className={cn(
                          'h-9',
                          showError('rolId') && 'border-destructive focus-visible:ring-destructive/20',
                        )}
                      >
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showError('rolId') && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.rolId}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Estado de la cuenta
                    </Label>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, activo: !form.activo })}
                      disabled={isSelf && form.activo}
                      title={isSelf && form.activo ? 'No puedes desactivar tu propia cuenta desde aquí sin confirmar' : undefined}
                      className={cn(
                        'h-9 w-full rounded-md border px-3 flex items-center justify-between transition-colors',
                        form.activo
                          ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                          : 'border-border bg-muted/30 text-muted-foreground',
                        isSelf && form.activo && 'opacity-90',
                      )}
                    >
                      <span className="flex items-center gap-2 text-xs font-medium">
                        {form.activo ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Activo · puede iniciar sesión
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" />
                            Inactivo · acceso bloqueado
                          </>
                        )}
                      </span>
                      <span
                        className={cn(
                          'h-4 w-7 rounded-full transition-colors relative',
                          form.activo ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all',
                            form.activo ? 'left-3.5' : 'left-0.5',
                          )}
                        />
                      </span>
                    </button>
                    {isSelf && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Si te desactivas, perderás el acceso al sistema.
                      </p>
                    )}
                  </div>
                </div>
              </SectionCard>

              {/* Shipper */}
              <SectionCard
                icon={Truck}
                iconColor="orange"
                title="Shipper asociado"
                right={
                  form.shipperId ? (
                    <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30">
                      Vinculado
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Opcional</span>
                  )
                }
              >
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Shipper
                  </Label>
                  <ShipperCombobox
                    shippers={shippers}
                    value={form.shipperId === '' ? '' : Number(form.shipperId)}
                    onChange={(id) => setForm({ ...form, shipperId: id === '' ? '' : String(id) })}
                    placeholder="Seleccionar shipper (opcional)"
                  />
                </div>
              </SectionCard>

              {/* Atajos */}
              <div className="text-[11px] text-muted-foreground text-center pt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <span>Atajos:</span>
                <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd>
                <span>guardar</span>
                <span className="opacity-40">·</span>
                <Kbd>Esc</Kbd>
                <span>volver</span>
              </div>
            </form>

            {/* Footer sticky */}
            <div className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-6 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                  {!isDirty ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground/50" />
                      <span className="truncate">Sin cambios pendientes</span>
                    </span>
                  ) : isValid ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="truncate">Listo para guardar cambios</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="truncate">
                        {Object.keys(errors).length} campo{Object.keys(errors).length === 1 ? '' : 's'} por revisar
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => tryNavigateAway(`/usuarios/${id}`)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => submit()}
                    disabled={submitting || !isValid || !isDirty}
                    className="gap-1.5 min-w-[120px]"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {submitting ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </StandardPageLayout>
    </DashboardLayout>
  );
}
