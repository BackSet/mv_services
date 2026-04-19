import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, useLocation, useNavigate } from "react-router-dom"
import api from "@/services/api"
import { AxiosError } from "axios"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Sparkles,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Brand } from "@/components/brand"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ApiErrorPayload = {
  message?: string
  code?: string
  motivo?: string
}

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

  // Destino tras login (?from=/paquetes etc.)
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
      // foco al password si ya hay usuario recordado
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
      const response = await api.post("/auth/login", {
        username: normalizedUsername,
        password,
      })

      const { token } = response.data
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
      const axiosErr = err as AxiosError<ApiErrorPayload>
      const status = axiosErr.response?.status
      const data = axiosErr.response?.data
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
          else if (!axiosErr.response) message = "No se pudo conectar con el servidor."
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-6 lg:min-h-[85vh] lg:flex-row lg:items-center">
        {/* Card de login */}
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg shadow-foreground/5 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
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
              <ThemeToggle className="h-9 w-9 rounded-md" />
            </div>
          </div>

          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Iniciar sesión
            </h1>
            <p className="text-sm text-muted-foreground">
              Accede a tu panel operativo de MV Services.
            </p>
            {fromParam && (
              <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-foreground">
                Tras iniciar sesión te llevaremos a{" "}
                <span className="font-mono font-medium">{redirectTo}</span>.
              </div>
            )}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 animate-in fade-in slide-in-from-top-1 duration-200"
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
              <Label htmlFor="username" className="text-xs text-muted-foreground">
                Usuario
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  ref={usernameRef}
                  type="text"
                  placeholder="usuario"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyUp={handleCapsCheck}
                  className="border-border bg-muted/50 pl-9"
                  autoComplete="username"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs text-muted-foreground">
                  Contraseña
                </Label>
                {capsLock && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3 w-3" />
                    Bloq Mayús activado
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                    "border-border bg-muted/50 pl-9 pr-10",
                    capsLock && "border-amber-500/50 focus-visible:ring-amber-500/30",
                  )}
                  autoComplete="current-password"
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
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex cursor-pointer items-center gap-2 text-muted-foreground select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-input"
                />
                Recordar usuario
              </label>
            </div>

            <Button type="submit" className="mt-2 h-10 w-full gap-2 text-sm shadow-sm" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Entrando…" : "Ingresar"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿No tienes acceso?{" "}
              <Link
                to="/registro-shipper"
                className="font-medium text-foreground hover:underline"
              >
                Solicitar cuenta
              </Link>
            </p>
          </div>
        </div>

        {/* Card lateral informativo */}
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg shadow-foreground/5 sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Acceso rápido y seguro</h2>
          </div>
          <ul className="space-y-3 text-sm">
            <Feature icon={<Zap className="h-4 w-4" />} title="Operación en un solo panel">
              Gestiona paquetes, consolidados y shippers desde un único lugar.
            </Feature>
            <Feature icon={<ShieldCheck className="h-4 w-4" />} title="Sesión protegida con JWT">
              Tokens con expiración y refresco automático para tu seguridad.
            </Feature>
            <Feature icon={<User className="h-4 w-4" />} title="Roles y permisos">
              Cada perfil ve sólo lo que necesita: admin, operario o shipper.
            </Feature>
          </ul>

          <div className="mt-5 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Sugerencia:</strong>{" "}
            Usa credenciales personales y evita compartir cuentas. Si olvidaste tu contraseña,
            contacta a un administrador.
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground/80">
            © {new Date().getFullYear()} MV Services
          </p>
        </div>
      </div>
    </div>
  )
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-foreground/80">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}
