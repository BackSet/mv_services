import { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Save,
  Shield,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe, setMeCache } from '@/hooks/useMe';
import {
  changeMyPassword,
  updateMe,
  updateMyShipper,
} from '@/services/perfil.service';
import { cn } from '@/lib/utils';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

type Tab = 'perfil' | 'password' | 'shipper';

type ApiError = { message?: string };

function getErrorMessage(err: unknown, fallback: string): string {
  const ax = err as AxiosError<ApiError>;
  return ax?.response?.data?.message ?? (err instanceof Error ? err.message : fallback);
}

type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string };

function evaluatePassword(pw: string): Strength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte'];
  const colors = [
    'bg-destructive',
    'bg-warning',
    'bg-warning',
    'bg-success',
    'bg-success',
  ];
  return { score: clamped, label: labels[clamped], color: colors[clamped] };
}

export default function MiPerfilDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { me } = useMe();
  const isShipper = Boolean(me?.shipperId);

  const [tab, setTab] = useState<Tab>('perfil');

  // Perfil
  const [username, setUsername] = useState(me?.username ?? '');
  const [email, setEmail] = useState(me?.email ?? '');
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [perfilError, setPerfilError] = useState('');

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Shipper
  const [shipperNombre, setShipperNombre] = useState(me?.shipperNombre ?? '');
  const [codigoInterno, setCodigoInterno] = useState('');
  const [nombreEncargado, setNombreEncargado] = useState('');
  const [savingShipper, setSavingShipper] = useState(false);
  const [shipperError, setShipperError] = useState('');
  const [loadingShipper, setLoadingShipper] = useState(false);

  // Reset al abrir / cambiar usuario
  useEffect(() => {
    if (!open) return;
    setTab('perfil');
    setUsername(me?.username ?? '');
    setEmail(me?.email ?? '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPerfilError('');
    setPasswordError('');
    setShipperError('');
    setShipperNombre(me?.shipperNombre ?? '');
    setCodigoInterno('');
    setNombreEncargado('');
  }, [open, me?.username, me?.email, me?.shipperNombre]);

  // Cargar datos del shipper al entrar a la tab "shipper"
  useEffect(() => {
    if (!open || tab !== 'shipper' || !isShipper || !me?.shipperId) return;
    let cancelled = false;
    setLoadingShipper(true);
    import('@/services/shippers.service')
      .then(({ getShipper }) => getShipper(me.shipperId as number))
      .then((sh) => {
        if (cancelled) return;
        setShipperNombre(sh.nombre ?? '');
        setCodigoInterno(sh.codigoInterno ?? '');
        setNombreEncargado(sh.nombreEncargado ?? '');
      })
      .catch((e) => {
        if (cancelled) return;
        setShipperError(getErrorMessage(e, 'No se pudo cargar tu shipper.'));
      })
      .finally(() => {
        if (!cancelled) setLoadingShipper(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, tab, isShipper, me?.shipperId]);

  // Validaciones
  const perfilErrors = useMemo(() => {
    const e: Partial<Record<'username' | 'email', string>> = {};
    const u = username.trim();
    if (!u) e.username = 'Requerido';
    else if (!USERNAME_REGEX.test(u)) e.username = '3–32 caracteres. Letras, números, . _ -';
    const em = email.trim();
    if (!em) e.email = 'Requerido';
    else if (!EMAIL_REGEX.test(em)) e.email = 'Email no válido';
    return e;
  }, [username, email]);

  const perfilDirty =
    (me?.username ?? '') !== username.trim() || (me?.email ?? '').toLowerCase() !== email.trim().toLowerCase();
  const perfilValid = Object.keys(perfilErrors).length === 0;

  const strength = useMemo(() => evaluatePassword(newPassword), [newPassword]);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const passwordErrors = useMemo(() => {
    const e: Partial<Record<'current' | 'new' | 'confirm', string>> = {};
    if (!currentPassword) e.current = 'Requerido';
    if (!newPassword) e.new = 'Requerido';
    else if (newPassword.length < 8) e.new = 'Mínimo 8 caracteres';
    else if (newPassword === currentPassword) e.new = 'Debe ser distinta a la actual';
    if (!confirmPassword) e.confirm = 'Repite la nueva';
    else if (newPassword && confirmPassword !== newPassword) e.confirm = 'No coincide';
    return e;
  }, [currentPassword, newPassword, confirmPassword]);
  const passwordValid = Object.keys(passwordErrors).length === 0;

  const shipperErrors = useMemo(() => {
    const e: Partial<Record<'nombre', string>> = {};
    if (!shipperNombre.trim()) e.nombre = 'Requerido';
    return e;
  }, [shipperNombre]);
  const shipperValid = Object.keys(shipperErrors).length === 0;

  // Submits
  async function onSavePerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!perfilValid || !perfilDirty) return;
    setSavingPerfil(true);
    setPerfilError('');
    try {
      const resp = await updateMe({
        username: username.trim(),
        email: email.trim().toLowerCase(),
      });
      setMeCache(resp.me);
      if (resp.token) {
        localStorage.setItem('token', resp.token);
        localStorage.setItem('mv_last_username', resp.me.username);
      }
      toast.success('Perfil actualizado');
    } catch (err) {
      const msg = getErrorMessage(err, 'No se pudo actualizar el perfil.');
      setPerfilError(msg);
      toast.error('Error al actualizar', { description: msg });
    } finally {
      setSavingPerfil(false);
    }
  }

  async function onSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid) return;
    setSavingPassword(true);
    setPasswordError('');
    try {
      await changeMyPassword({ currentPassword, newPassword });
      toast.success('Contraseña actualizada');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = getErrorMessage(err, 'No se pudo cambiar la contraseña.');
      setPasswordError(msg);
      toast.error('Error', { description: msg });
    } finally {
      setSavingPassword(false);
    }
  }

  async function onSaveShipper(e: React.FormEvent) {
    e.preventDefault();
    if (!shipperValid) return;
    setSavingShipper(true);
    setShipperError('');
    try {
      const updated = await updateMyShipper({
        nombre: shipperNombre.trim(),
        codigoInterno: codigoInterno.trim() || null,
        nombreEncargado: nombreEncargado.trim() || null,
      });
      setMeCache(updated);
      toast.success('Datos del shipper actualizados');
    } catch (err) {
      const msg = getErrorMessage(err, 'No se pudo actualizar el shipper.');
      setShipperError(msg);
      toast.error('Error', { description: msg });
    } finally {
      setSavingShipper(false);
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType<{ className?: string }>; show: boolean }> = [
    { id: 'perfil', label: 'Perfil', icon: UserIcon, show: true },
    { id: 'password', label: 'Contraseña', icon: Lock, show: true },
    { id: 'shipper', label: 'Mi shipper', icon: Building2, show: isShipper },
  ];

  const initials = (me?.username ?? '?')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('') || '?';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl !p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 bg-muted/30 space-y-0">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shadow-soft ring-2 ring-accent/20 shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-serif text-2xl leading-tight">Mi cuenta</DialogTitle>
              <DialogDescription>
                Gestiona tus datos personales{isShipper ? ' y la información de tu shipper' : ''}.
              </DialogDescription>
            </div>
            {me?.rol && (
              <Badge variant="brand" className="text-[10px] uppercase tracking-wider">
                <Shield className="h-3 w-3 mr-1" /> {me.rol}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-border/60">
          <div className="inline-flex items-center gap-0.5 -mb-px">
            {tabs.filter((t) => t.show).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'relative inline-flex items-center gap-2 h-10 px-4 text-[13px] font-medium transition-colors border-b-2',
                    active
                      ? 'text-foreground border-accent'
                      : 'text-muted-foreground hover:text-foreground border-transparent',
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', active && 'text-accent')} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
          {tab === 'perfil' && (
            <form onSubmit={onSavePerfil} className="space-y-4">
              {perfilError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{perfilError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="me-username" variant="form">
                  Usuario <span className="text-accent">*</span>
                </Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="me-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="usuario"
                    autoComplete="username"
                    className={cn('pl-10 h-11', perfilErrors.username && 'border-destructive focus-visible:ring-destructive/40')}
                  />
                </div>
                {perfilErrors.username ? (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {perfilErrors.username}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Si cambias tu usuario, recibirás un nuevo token automáticamente.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="me-email" variant="form">
                  Email <span className="text-accent">*</span>
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="me-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    autoComplete="email"
                    className={cn('pl-10 h-11', perfilErrors.email && 'border-destructive focus-visible:ring-destructive/40')}
                  />
                </div>
                {perfilErrors.email && (
                  <p className="text-[11px] text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {perfilErrors.email}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <div className="text-[11px] text-muted-foreground">
                  {perfilDirty ? (
                    <span className="text-accent inline-flex items-center gap-1 font-medium">
                      <Sparkles className="h-3 w-3" /> Cambios sin guardar
                    </span>
                  ) : (
                    'Sin cambios'
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!perfilDirty || !perfilValid}
                  loading={savingPerfil}
                  loadingText="Guardando…"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  Guardar cambios
                </Button>
              </div>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={onSavePassword} className="space-y-4">
              {passwordError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <PasswordField
                id="me-current"
                label="Contraseña actual"
                required
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggle={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
                error={passwordErrors.current}
              />

              <PasswordField
                id="me-new"
                label="Nueva contraseña"
                required
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                autoComplete="new-password"
                error={passwordErrors.new}
              />

              {newPassword && (
                <div className="space-y-1.5">
                  <div className="flex h-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'flex-1 rounded-full transition-colors',
                          i < strength.score ? strength.color : 'bg-muted',
                        )}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Fortaleza: <span className="font-medium text-foreground">{strength.label}</span>
                  </div>
                </div>
              )}

              <PasswordField
                id="me-confirm"
                label="Confirmar nueva contraseña"
                required
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
                autoComplete="new-password"
                error={passwordErrors.confirm}
                rightIcon={
                  confirmPassword ? (
                    passwordsMatch ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )
                  ) : undefined
                }
              />

              <div className="flex items-center justify-end pt-3 border-t border-border/60">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!passwordValid}
                  loading={savingPassword}
                  loadingText="Cambiando…"
                >
                  <Lock className="h-4 w-4 mr-1.5" />
                  Cambiar contraseña
                </Button>
              </div>
            </form>
          )}

          {tab === 'shipper' && (
            <form onSubmit={onSaveShipper} className="space-y-4">
              {shipperError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{shipperError}</span>
                </div>
              )}
              {loadingShipper ? (
                <div role="status" aria-label="Cargando datos del shipper" className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-11 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="me-sh-nombre" variant="form">
                      Nombre <span className="text-accent">*</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                      <Input
                        id="me-sh-nombre"
                        value={shipperNombre}
                        onChange={(e) => setShipperNombre(e.target.value)}
                        placeholder="Nombre del shipper"
                        className={cn('pl-10 h-11', shipperErrors.nombre && 'border-destructive focus-visible:ring-destructive/40')}
                      />
                    </div>
                    {shipperErrors.nombre && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {shipperErrors.nombre}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="me-sh-codigo" variant="form">
                        Código interno
                      </Label>
                      <Input
                        id="me-sh-codigo"
                        value={codigoInterno}
                        onChange={(e) => setCodigoInterno(e.target.value)}
                        placeholder="Ej: SHP-1234"
                        className="h-11 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="me-sh-encargado" variant="form">
                        Encargado
                      </Label>
                      <Input
                        id="me-sh-encargado"
                        value={nombreEncargado}
                        onChange={(e) => setNombreEncargado(e.target.value)}
                        placeholder="Nombre del encargado"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-border/60">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!shipperValid}
                      loading={savingShipper}
                      loadingText="Guardando…"
                    >
                      <Save className="h-4 w-4 mr-1.5" />
                      Guardar shipper
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  required,
  autoComplete,
  error,
  rightIcon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  rightIcon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} variant="form">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder="••••••••"
          className={cn('pl-10 pr-16 h-11', error && 'border-destructive focus-visible:ring-destructive/40')}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {rightIcon}
          <button
            type="button"
            onClick={onToggle}
            tabIndex={-1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={show ? 'Ocultar' : 'Mostrar'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}
