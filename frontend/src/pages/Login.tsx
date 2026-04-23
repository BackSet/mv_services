import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { getApiErrorPayload, login } from "@/services/auth.service"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  User,
  Zap,
  Globe,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Brand, BrandMark } from "@/components/brand"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type SolicitudInfo =
  | { kind: 'PENDIENTE'; message: string }
  | { kind: 'RECHAZADA'; message: string; motivo?: string }
  | null

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [solicitudInfo, setSolicitudInfo] = useState<SolicitudInfo>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [capsLock, setCapsLock] = useState(false)
  const usernameRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)

  const fromParam = new URLSearchParams(location.search).get("from")
  const redirectTo = fromParam && fromParam.startsWith("/") ? fromParam : "/dashboard"

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      navigate(redirectTo, { replace: true })
      return
    }
    const savedUsername = localStorage.getItem("mv_last_username")
    if (savedUsername) {
      setUsername(savedUsername)
      window.setTimeout(() => passwordRef.current?.focus(), 50)
    } else {
      window.setTimeout(() => usernameRef.current?.focus(), 50)
    }
  }, [navigate, redirectTo])

  const handleCapsCheck = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLock(e.getModifierState("CapsLock"))
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedUsername = username.trim()
    if (!normalizedUsername || !password.trim()) {
      setError("Ingresa usuario y contraseña.")
      return
    }

    setError("")
    setSolicitudInfo(null)
    setLoading(true)

    try {
      const response = await login({
        username: normalizedUsername,
        password,
      })

      const { token } = response
      if (token) {
        localStorage.setItem("token", token)
        if (remember) {
          localStorage.setItem("mv_last_username", normalizedUsername)
        } else {
          localStorage.removeItem("mv_last_username")
        }
        toast.success(`Bienvenido, ${normalizedUsername}.`)
        navigate(redirectTo, { replace: true })
      } else {
        setError("No se recibió un token válido.")
      }
    } catch (err) {
      console.error("Login error:", err)
      const data = getApiErrorPayload(err)
      const status = (err as { response?: { status?: number } })?.response?.status ?? data?.status
      const code = data?.code

      if (code === 'SHIPPER_SOLICITUD_PENDIENTE') {
        setSolicitudInfo({
          kind: 'PENDIENTE',
          message: data?.message ?? 'Tu registro aún está pendiente de aprobación por un operario.',
        })
      } else if (code === 'SHIPPER_SOLICITUD_RECHAZADA') {
        setSolicitudInfo({
          kind: 'RECHAZADA',
          message: data?.message ?? 'Tu solicitud de registro fue rechazada.',
          motivo: data?.motivo,
        })
      } else {
        let message = data?.message
        if (!message) {
          if (status === 401 || status === 403) message = "Usuario o contraseña incorrectos."
          else if (!data) message = "No se pudo conectar con el servidor."
          else message = "Error al iniciar sesión."
        }
        setError(message)
        passwordRef.current?.focus()
        passwordRef.current?.select()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background font-sans">
      {/* Panel marca (lado izquierdo) */}
      <aside className="relative hidden lg:flex lg:w-[42%] xl:w-1/2 flex-col justify-between overflow-hidden bg-[#0C0C0C] text-white p-10 xl:p-14">
        {/* Glow naranja decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-accent/30 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/4 h-[320px] w-[320px] rounded-full bg-accent/15 blur-[100px]"
        />
        {/* Trama sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <BrandMark size={40} decorative />
            <Brand size="lg" className="text-white group-hover:opacity-90 transition-opacity" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al sitio
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Plataforma operativa
            </span>
            <h2 className="font-serif text-4xl xl:text-5xl leading-[1.05] tracking-tight">
              Logística inteligente,
              <br />
              <span className="text-accent">a tu medida.</span>
            </h2>
            <p className="text-base text-white/70 leading-relaxed">
              Gestiona paquetes, consolidados y shippers en un único panel
              diseñado para mover el mundo de forma simple.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <BrandFeature icon={<Zap className="h-3.5 w-3.5" />}>
              Operación unificada en tiempo real
            </BrandFeature>
            <BrandFeature icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              Sesiones protegidas con tokens JWT y refresco automático
            </BrandFeature>
            <BrandFeature icon={<Globe className="h-3.5 w-3.5" />}>
              Roles y permisos para cada equipo: admin, operario o shipper
            </BrandFeature>
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-white/40">
          © {new Date().getFullYear()} <span className="font-serif">MV Services</span> · Todos los derechos reservados
        </p>
      </aside>

      {/* Panel formulario (lado derecho) */}
      <main className="flex-1 flex flex-col">
        {/* Header móvil + theme */}
        <header className="flex items-center justify-between px-6 sm:px-10 lg:px-12 pt-6">
          <Link to="/" className="lg:hidden inline-flex items-center gap-2.5">
            <BrandMark size={32} decorative />
            <Brand size="sm" />
          </Link>
          <div className="hidden lg:block" />
          <ThemeToggle className="h-9 w-9 rounded-lg" />
        </header>

        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-12 py-10">
          <div className="w-full max-w-[420px] space-y-8">
            <div className="space-y-2">
              <span className="inline-block text-[11px] uppercase tracking-[0.18em] font-medium text-accent">
                Bienvenido
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl tracking-tight text-foreground leading-tight">
                Iniciar sesión
              </h1>
              <p className="text-sm text-muted-foreground">
                Accede a tu panel operativo de MV Services.
              </p>
              {fromParam && (
                <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/60 px-3 py-2 text-[11px] text-accent-soft-foreground">
                  Tras iniciar sesión te llevaremos a{" "}
                  <span className="font-mono font-medium">{redirectTo}</span>.
                </div>
              )}
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {solicitudInfo?.kind === 'PENDIENTE' && (
                <div
                  role="alert"
                  className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold">Solicitud pendiente de aprobación</div>
                      <p className="mt-0.5">
                        {solicitudInfo.message} No podrás iniciar sesión hasta que un operario apruebe tu registro.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {solicitudInfo?.kind === 'RECHAZADA' && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-200"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold">Solicitud rechazada</div>
                      <p className="mt-0.5">{solicitudInfo.message}</p>
                      {solicitudInfo.motivo && (
                        <p className="mt-1">
                          <span className="font-semibold">Motivo:</span> {solicitudInfo.motivo}
                        </p>
                      )}
                      <p className="mt-1 text-foreground/80">
                        Si crees que es un error, contacta al equipo de operaciones.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="username" variant="form">Usuario</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="username"
                    ref={usernameRef}
                    type="text"
                    placeholder="usuario"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyUp={handleCapsCheck}
                    className="pl-10 h-11"
                    autoComplete="username"
                    spellCheck={false}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" variant="form">Contraseña</Label>
                  {capsLock && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-warning">
                      <AlertCircle className="h-3 w-3" />
                      Bloq Mayús activado
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                  <Input
                    id="password"
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handleCapsCheck}
                    onKeyDown={handleCapsCheck}
                    className={cn(
                      "pl-10 pr-11 h-11",
                      capsLock && "border-warning/50 focus-visible:ring-warning/30",
                    )}
                    autoComplete="current-password"
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
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex cursor-pointer items-center gap-2 text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-accent"
                  />
                  Recordar usuario
                </label>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 mt-1"
                loading={loading}
                loadingText="Entrando…"
              >
                Ingresar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="pt-2 text-center text-sm text-muted-foreground">
              ¿No tienes acceso?{" "}
              <Link
                to="/registro-shipper"
                className="font-medium text-accent hover:underline underline-offset-4"
              >
                Solicitar cuenta
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function BrandFeature({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 text-sm text-white/75">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 border border-white/10 text-accent">
        {icon}
      </span>
      <span className="leading-relaxed">{children}</span>
    </div>
  )
}
