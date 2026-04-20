import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiMessage, registerShipper } from "@/services/auth.service";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  User,
  UserCircle2,
  Globe,
  ShieldCheck,
  Zap,
  Check,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Brand, BrandMark } from "@/components/brand";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; tone: string };

function evaluatePassword(pw: string): Strength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"];
  const tones = [
    "bg-destructive",
    "bg-warning",
    "bg-warning",
    "bg-success",
    "bg-success",
  ];
  return { score: clamped, label: labels[clamped], tone: tones[clamped] };
}

const STEPS = [
  { n: 1, label: "Cuenta", icon: UserCircle2 },
  { n: 2, label: "Shipper", icon: Building2 },
  { n: 3, label: "Revisar", icon: CheckCircle2 },
] as const;

export default function ShipperRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  const step1Valid = !errors.username && !errors.email && !errors.password && !errors.confirmPassword;
  const step2Valid = !errors.shipperNombre;

  const showError = (key: keyof typeof touched) =>
    touched[key] && (errors as Record<string, string | undefined>)[key];

  const fieldClass = (key: keyof typeof touched) =>
    cn(showError(key) && "border-destructive focus-visible:ring-destructive/40");

  const goNext = () => {
    if (step === 1) {
      setTouched((t) => ({ ...t, username: true, email: true, password: true, confirmPassword: true }));
      if (step1Valid) setStep(2);
      return;
    }
    if (step === 2) {
      setTouched((t) => ({ ...t, shipperNombre: true }));
      if (step2Valid) setStep(3);
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
      shipperNombre: true,
    });
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 font-sans">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
            </Link>
            <div className="flex items-center gap-3">
              <Brand size="sm" />
              <ThemeToggle className="h-9 w-9 rounded-lg" />
            </div>
          </div>
          <div className="rounded-2xl border border-success/30 bg-card shadow-card p-8 text-center space-y-5">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-success/15 text-success flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl tracking-tight">¡Solicitud enviada!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hola <span className="font-medium text-foreground">{success.username}</span>,
                tu registro está <span className="font-semibold text-foreground">pendiente de aprobación</span> por un
                operario. Te avisaremos a <span className="font-mono text-foreground">{success.email}</span>{" "}
                cuando puedas iniciar sesión.
              </p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-left text-xs text-warning flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Mientras tu solicitud esté pendiente <strong>no podrás iniciar sesión</strong>. Si
                intentas hacerlo verás un mensaje recordándotelo.
              </span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => navigate("/")}>Ir al inicio</Button>
              <Button className="flex-1" onClick={() => navigate("/login")}>Ir a iniciar sesión</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background font-sans">
      {/* Panel marca */}
      <aside className="relative hidden lg:flex lg:w-[40%] xl:w-[42%] flex-col justify-between overflow-hidden bg-[#0C0C0C] text-white p-10 xl:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-accent/30 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/4 h-[320px] w-[320px] rounded-full bg-accent/15 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <BrandMark size={40} />
            <Brand size="lg" className="text-white" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            ¿Ya tienes cuenta? <span className="text-accent">Inicia sesión</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
              <Sparkles className="h-3 w-3 text-accent" />
              Únete como shipper
            </span>
            <h2 className="font-serif text-4xl xl:text-5xl leading-[1.05] tracking-tight">
              Crea tu cuenta
              <br />
              <span className="text-accent">en minutos.</span>
            </h2>
            <p className="text-base text-white/70 leading-relaxed">
              Solicita acceso a la plataforma y empieza a gestionar tus envíos
              con visibilidad total en cada paso.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <BrandFeature icon={<Zap className="h-3.5 w-3.5" />}>
              Registro rápido en 3 pasos guiados
            </BrandFeature>
            <BrandFeature icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              Validación humana antes de activar tu cuenta
            </BrandFeature>
            <BrandFeature icon={<Globe className="h-3.5 w-3.5" />}>
              Acceso a tu panel personalizado de shipper
            </BrandFeature>
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-white/40">
          © {new Date().getFullYear()} <span className="font-serif">MV Services</span>
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-6 sm:px-10 lg:px-12 pt-6">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2.5">
            <BrandMark size={32} />
            <Brand size="sm" />
          </Link>
          <Link
            to="/"
            className="hidden lg:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al inicio
          </Link>
          <ThemeToggle className="h-9 w-9 rounded-lg" />
        </header>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-12 py-10">
          <div className="w-full max-w-[520px] space-y-8">
            <div className="space-y-2">
              <span className="inline-block text-[11px] uppercase tracking-[0.18em] font-medium text-accent">
                Paso {step} de 3
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-foreground leading-tight">
                {step === 1 && "Tu cuenta de acceso"}
                {step === 2 && "Datos del shipper"}
                {step === 3 && "Revisa y confirma"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {step === 1 && "Configura tus credenciales para entrar a la plataforma."}
                {step === 2 && "Cuéntanos sobre tu empresa o perfil de envío."}
                {step === 3 && "Verifica los datos antes de enviar tu solicitud."}
              </p>
            </div>

            <Stepper current={step} onJump={(n) => {
              if (n < step) setStep(n as 1 | 2 | 3);
              else if (n === 2 && step1Valid) setStep(2);
              else if (n === 3 && step1Valid && step2Valid) setStep(3);
            }} />

            <form onSubmit={handleSubmit} className="space-y-5">
              {globalError && (
                <div
                  role="alert"
                  className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg border border-destructive/30 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {globalError}
                </div>
              )}

              {/* Paso 1: cuenta */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" variant="form">
                      Usuario <span className="text-accent">*</span>
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
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
                        className={cn("pl-10 h-11", fieldClass("username"))}
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
                    <Label htmlFor="email" variant="form">
                      Email <span className="text-accent">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                        required
                        placeholder="email@ejemplo.com"
                        autoComplete="email"
                        className={cn("pl-10 h-11", fieldClass("email"))}
                      />
                    </div>
                    {showError("email") && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" variant="form">
                      Contraseña <span className="text-accent">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                        required
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className={cn("pl-10 pr-11 h-11", fieldClass("password"))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {password && (
                      <div className="space-y-1 pt-1">
                        <div className="flex h-1 gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={cn(
                                "flex-1 rounded-full transition-colors",
                                i < strength.score ? strength.tone : "bg-muted",
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
                    <Label htmlFor="confirmPassword" variant="form">
                      Confirmar contraseña <span className="text-accent">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                        required
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className={cn("pl-10 pr-16 h-11", fieldClass("confirmPassword"))}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {confirmPassword && (
                          <span title={passwordsMatch ? "Coincide" : "No coincide"}>
                            {passwordsMatch ? (
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
              )}

              {/* Paso 2: shipper */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-200">
                  <div className="space-y-1.5">
                    <Label htmlFor="shipperNombre" variant="form">
                      Nombre del shipper <span className="text-accent">*</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                      <Input
                        id="shipperNombre"
                        value={shipperNombre}
                        onChange={(e) => setShipperNombre(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, shipperNombre: true }))}
                        required
                        placeholder="Nombre de la empresa o persona"
                        className={cn("pl-10 h-11", fieldClass("shipperNombre"))}
                      />
                    </div>
                    {showError("shipperNombre") && (
                      <p className="text-[11px] text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.shipperNombre}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="codigoInterno" variant="form">
                        Código interno{" "}
                        <span className="text-muted-foreground/70 font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id="codigoInterno"
                        value={codigoInterno}
                        onChange={(e) => setCodigoInterno(e.target.value)}
                        placeholder="COD-123"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nombreEncargado" variant="form">
                        Encargado{" "}
                        <span className="text-muted-foreground/70 font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id="nombreEncargado"
                        value={nombreEncargado}
                        onChange={(e) => setNombreEncargado(e.target.value)}
                        placeholder="Nombre del encargado"
                        className="h-11"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Paso 3: revisión */}
              {step === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                  <ReviewSection
                    title="Cuenta de acceso"
                    icon={<UserCircle2 className="h-4 w-4" />}
                    onEdit={() => setStep(1)}
                  >
                    <ReviewRow label="Usuario" value={username} mono />
                    <ReviewRow label="Email" value={email} mono />
                    <ReviewRow label="Contraseña" value={"•".repeat(Math.min(password.length, 12))} />
                  </ReviewSection>

                  <ReviewSection
                    title="Datos del shipper"
                    icon={<Building2 className="h-4 w-4" />}
                    onEdit={() => setStep(2)}
                  >
                    <ReviewRow label="Nombre" value={shipperNombre} />
                    {codigoInterno && <ReviewRow label="Código interno" value={codigoInterno} mono />}
                    {nombreEncargado && <ReviewRow label="Encargado" value={nombreEncargado} />}
                  </ReviewSection>

                  <div className="rounded-lg border border-accent/30 bg-accent-soft/60 px-4 py-3 text-xs text-accent-soft-foreground flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      Tu solicitud quedará <strong>pendiente de aprobación</strong>. Te notificaremos
                      por email cuando un operario revise tu cuenta.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-2">
                {step > 1 ? (
                  <Button type="button" variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Anterior
                  </Button>
                ) : (
                  <span />
                )}

                {step < 3 ? (
                  <Button type="button" onClick={goNext} className="gap-2">
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    loading={loading}
                    loadingText="Enviando solicitud…"
                    disabled={!isValid}
                    className="gap-2"
                  >
                    Enviar solicitud
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground pt-2">
                ¿Ya tienes cuenta?{" "}
                <Link to="/login" className="font-medium text-accent hover:underline underline-offset-4">
                  Iniciar sesión
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stepper({ current, onJump }: { current: 1 | 2 | 3; onJump: (n: number) => void }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((s, idx) => {
        const completed = current > s.n;
        const active = current === s.n;
        return (
          <li key={s.n} className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => onJump(s.n)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors flex-1 text-left group",
                active && "bg-accent-soft",
                !active && !completed && "hover:bg-muted",
                !active && completed && "hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                  completed && "bg-accent text-accent-foreground",
                  active && "bg-foreground text-background",
                  !completed && !active && "bg-muted text-muted-foreground",
                )}
              >
                {completed ? <Check className="h-3.5 w-3.5" /> : s.n}
              </span>
              <span
                className={cn(
                  "text-[12px] font-medium hidden sm:inline",
                  active && "text-accent-soft-foreground",
                  completed && "text-foreground",
                  !active && !completed && "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1 transition-colors hidden sm:block",
                  current > s.n ? "bg-accent/40" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewSection({
  title,
  icon,
  onEdit,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
            {icon}
          </span>
          {title}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-[11px] font-medium text-accent hover:underline underline-offset-4"
        >
          Editar
        </button>
      </div>
      <dl className="divide-y divide-border/50">{children}</dl>
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
      <dt className="text-[12px] uppercase tracking-wider font-medium text-muted-foreground">{label}</dt>
      <dd className={cn("col-span-2 text-foreground truncate", mono && "font-mono text-[13px]")}>
        {value}
      </dd>
    </div>
  );
}

function BrandFeature({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm text-white/75">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 border border-white/10 text-accent">
        {icon}
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
  );
}
