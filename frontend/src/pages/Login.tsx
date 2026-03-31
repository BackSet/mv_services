import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link, useNavigate } from "react-router-dom"
import api from "@/services/api"
import { AlertCircle, Loader2, User, Lock, ArrowRight } from "lucide-react"

export default function Login() {
    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const response = await api.post('/auth/login', {
                username,
                password
            });

            const { token } = response.data;
            if (token) {
                localStorage.setItem('token', token);
                navigate("/dashboard");
            } else {
                setError("No se recibió un token válido.");
            }
        } catch (err: unknown) {
            console.error("Login error:", err);
            const message =
                typeof err === 'object' && err && 'response' in err
                    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ((err as any).response?.data?.message as string | undefined)
                    : undefined;
            setError(message || "Credenciales inválidas o error de conexión.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-[300px] space-y-8">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-10 h-10 bg-foreground rounded-md flex items-center justify-center text-background text-sm font-medium">
                        M
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">Iniciar Sesión</h1>
                    <p className="text-sm text-muted-foreground">Bienvenido a MV Services</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-xs p-3 rounded border border-destructive/20 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <Label htmlFor="username" className="text-xs text-muted-foreground">Usuario</Label>
                        <div className="relative">
                            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="username"
                                type="text"
                                placeholder="Usuario"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="pl-9 bg-muted/50 border-border"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-xs text-muted-foreground">Contraseña</Label>
                        <div className="relative">
                            <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9 bg-muted/50 border-border"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full h-10 text-sm mt-2 gap-2" disabled={loading}>
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {loading ? "Entrando…" : "Ingresar"}
                        {!loading && <ArrowRight className="w-4 h-4" />}
                    </Button>
                </form>

                <div className="text-center pt-6 space-y-2">
                    <p className="text-sm text-muted-foreground">
                        ¿No tienes acceso?{" "}
                        <Link
                            to="/registro-shipper"
                            className="text-foreground font-medium hover:underline"
                        >
                            Solicitar cuenta
                        </Link>
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                        © {new Date().getFullYear()} MV Services
                    </p>
                </div>
            </div>
        </div>
    )
}
