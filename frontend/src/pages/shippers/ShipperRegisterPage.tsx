import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiMessage, registerShipper } from "@/services/auth.service";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
  UserCircle2,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string };

function evaluatePassword(pw: string): Strength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"];
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-emerald-600",
  ];
  return { score: clamped, label: labels[clamped], color: colors[clamped] };
}

export default function ShipperRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [success, setSuccess] = useState<{ username: string; email: string } | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [shipperNombre, setShipperNombre] = useState("");
  const [codigoInterno, setCodigoInterno] = useState("");
  const [nombreEncargado, setNombreEncargado] = useState("");

  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
    shipperNombre: false,
  });

  const usernameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    const u = username.trim();
    if (!u) e.username = "Requerido";
    else if (!USERNAME_REGEX.test(u))
      e.username = "Sólo letras, números, punto, guion y guion bajo (3–32).";

    const em = email.trim();
    if (!em) e.email = "Requerido";
    else if (!EMAIL_REGEX.test(em)) e.email = "Email no válido";

    if (!password) e.password = "Requerido";
    else if (password.length < 8) e.password = "Mínimo 8 caracteres";

    if (!confirmPassword) e.confirmPassword = "Repite la contraseña";
    else if (password && password !== confirmPassword)
      e.confirmPassword = "No coincide con la contraseña";

    if (!shipperNombre.trim()) e.shipperNombre = "Requerido";
    return e;
  }, [username, email, password, confirmPassword, shipperNombre]);

  const isValid = Object.keys(errors).length === 0;
  const strength = useMemo(() => evaluatePassword(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const requiredFilled = useMemo(() => {
    let n = 0;
    if (username.trim() && !errors.username) n++;
    if (email.trim() && !errors.email) n++;
    if (password && !errors.password) n++;
    if (confirmPassword && !errors.confirmPassword) n++;
    if (shipperNombre.trim() && !errors.shipperNombre) n++;
    return n;
  }, [username, email, password, confirmPassword, shipperNombre, errors]);
  const progress = Math.round((requiredFilled / 5) * 100);

  const setAllTouched = () => {
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
      shipperNombre: true,
    });
  };

  const showError = (key: keyof typeof touched) =>
    touched[key] && (errors as Record<string, string | undefined>)[key];

  const fieldClass = (key: keyof typeof touched) =>
    cn("h-9", showError(key) && "border-destructive focus-visible:ring-destructive");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAllTouched();
    if (!isValid) {
      setGlobalError("Revisa los campos marcados antes de continuar.");
      return;
    }
    setGlobalError("");
    setLoading(true);
    try {
      await registerShipper({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        shipperNombre: shipperNombre.trim(),
        codigoInterno: codigoInterno.trim() || null,
        nombreEncargado: nombreEncargado.trim() || null,
      });

      localStorage.setItem("mv_last_username", username.trim());
      toast.success("Solicitud enviada", {
        description: "Un operario revisará tu registro pronto.",
      });
      setSuccess({ username: username.trim(), email: email.trim().toLowerCase() });
    } catch (err) {
      console.error("Register shipper error:", err);
      setGlobalError(extractApiMessage(err, "Error en el registro. Verifica los datos e intenta de nuevo."));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4 py-8">
        <div className="w-full max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
            </Link>
            <div className="flex items-center gap-3">
              <Brand size="sm" />
              <ThemeToggle className="h-8 w-8 rounded-md" />
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">¡Solicitud enviada!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Hola <span className="font-medium text-foreground">{success.username}</span>,
                tu registro está <span className="font-semibold">pendiente de aprobación</span> por un
                operario. Te avisaremos a <span className="font-mono text-foreground">{success.email}</span>{" "}
                cuando puedas iniciar sesión.
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-left text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Mientras tu solicitud esté pendiente <strong>no podrás iniciar sesión</strong>. Si
                intentas hacerlo verás un mensaje recordándotelo.
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Ir al inicio</Button>
              <Button className="flex-1" onClick={() => navigate("/login")}>Ir a iniciar sesión</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex w-full items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/" aria-label="Inicio">
                <Brand size="sm" className="hover:opacity-80 transition-opacity" />
              </Link>
              <ThemeToggle className="h-8 w-8 rounded-md" />
            </div>
          </div>
          <div className="flex flex-col items-center text-center space-y-2 pt-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Registro shipper
            </h1>
            <p className="text-xs text-muted-foreground">
              Crea tu cuenta y perfil de shipper en minutos.
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">Progreso del registro</span>
              <span className="text-muted-foreground">{requiredFilled}/5</span>
            </div>
            <span
              className={cn(
                "text-[11px] font-medium",
                isValid ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
              )}
            >
              {isValid ? "Listo para crear" : "Completa los datos"}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progress === 100 ? "bg-emerald-500" : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {globalError && (
            <div
              role="alert"
              className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/30 flex items-start gap-2"
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              {globalError}
            </div>
          )}

          {/* Sección Cuenta */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <UserCircle2 className="h-3.5 w-3.5" />
              </div>
              Cuenta de acceso
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Usuario <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  ref={usernameRef}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                  required
                  placeholder="usuario"
                  autoComplete="username"
                  spellCheck={false}
                  className={cn(fieldClass("username"), "pl-9")}
                />
              </div>
              {showError("username") ? (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.username}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Letras, números, punto, guion o guion bajo (3–32 caracteres).
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Email <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  required
                  placeholder="email@ejemplo.com"
                  autoComplete="email"
                  className={cn(fieldClass("email"), "pl-9")}
                />
              </div>
              {showError("email") && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Contraseña <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={cn(fieldClass("password"), "pl-9 pr-9")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Indicador de fortaleza */}
              {password && (
                <div className="space-y-1">
                  <div className="flex h-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-full transition-colors",
                          i < strength.score ? strength.color : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      Fortaleza: <span className="font-medium text-foreground">{strength.label}</span>
                    </span>
                    {strength.score < 3 && (
                      <span className="text-muted-foreground">
                        Mejora con mayúsculas, números y símbolos.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {showError("password") && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.password}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Confirmar contraseña <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={cn(fieldClass("confirmPassword"), "pl-9 pr-16")}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {confirmPassword && (
                    <span title={passwordsMatch ? "Coincide" : "No coincide"}>
                      {passwordsMatch ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {showError("confirmPassword") && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          {/* Sección Shipper */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              Datos del shipper
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shipperNombre" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="shipperNombre"
                value={shipperNombre}
                onChange={(e) => setShipperNombre(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, shipperNombre: true }))}
                required
                placeholder="Nombre de la empresa o persona"
                className={fieldClass("shipperNombre")}
              />
              {showError("shipperNombre") && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.shipperNombre}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="codigoInterno" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Código interno{" "}
                  <span className="text-muted-foreground/60 normal-case font-normal">(opcional)</span>
                </Label>
                <Input
                  id="codigoInterno"
                  value={codigoInterno}
                  onChange={(e) => setCodigoInterno(e.target.value)}
                  placeholder="COD-123"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nombreEncargado" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Encargado{" "}
                  <span className="text-muted-foreground/60 normal-case font-normal">(opcional)</span>
                </Label>
                <Input
                  id="nombreEncargado"
                  value={nombreEncargado}
                  onChange={(e) => setNombreEncargado(e.target.value)}
                  placeholder="Nombre del encargado"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-10 text-sm shadow-sm gap-2"
            disabled={loading || !isValid}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Enviando solicitud…" : "Enviar solicitud de registro"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-medium text-foreground hover:underline">
              Iniciar sesión
            </Link>
          </p>

          <p className="text-center text-[10px] text-muted-foreground/80">
            Al registrarte aceptas el uso responsable de la plataforma.
          </p>
        </form>
      </div>
    </div>
  );
}
