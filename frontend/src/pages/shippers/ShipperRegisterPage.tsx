import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/services/api";
import { clearMeCache } from "@/hooks/useMe";
import { AlertCircle, Loader2 } from "lucide-react";

export default function ShipperRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [shipperNombre, setShipperNombre] = useState("");
  const [codigoInterno, setCodigoInterno] = useState("");
  const [nombreEncargado, setNombreEncargado] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register-shipper", {
        username,
        email,
        password,
        shipperNombre,
        codigoInterno: codigoInterno || null,
        nombreEncargado: nombreEncargado || null,
      });

      const token = res?.data?.token as string | undefined;
      if (!token) {
        setError("No se recibió un token válido.");
        return;
      }
      localStorage.setItem("token", token);
      clearMeCache();
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      console.error("Register shipper error:", err);
      const message =
        typeof err === "object" && err && "response" in err
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((err as any).response?.data?.message as string | undefined) ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((err as any).response?.data as string | undefined)
          : undefined;
      setError(message || "Error en el registro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-[380px] space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-9 h-9 bg-foreground rounded flex items-center justify-center text-background text-sm font-medium">
            M
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Registro shipper</h1>
          <p className="text-xs text-muted-foreground">Cuenta y perfil de shipper</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-destructive/10 text-destructive text-xs p-3 rounded border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="text-xs font-medium text-muted-foreground">Cuenta</div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Usuario</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="usuario" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Contraseña</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="text-xs font-medium text-muted-foreground">Shipper</div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Nombre</Label>
              <Input value={shipperNombre} onChange={(e) => setShipperNombre(e.target.value)} required placeholder="Nombre de la empresa" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Código interno (opcional)</Label>
              <Input value={codigoInterno} onChange={(e) => setCodigoInterno(e.target.value)} placeholder="COD-123" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Encargado (opcional)</Label>
              <Input value={nombreEncargado} onChange={(e) => setNombreEncargado(e.target.value)} placeholder="Nombre del encargado" />
            </div>
          </div>

          <Button type="submit" className="w-full h-10 text-sm" disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
            {loading ? "Creando…" : "Crear cuenta"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            ¿Ya tienes cuenta? <Link to="/login" className="text-foreground hover:underline">Iniciar sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

