import { Link } from "react-router-dom"
import {
  ArrowRight,
  Boxes,
  ChevronDown,
  Clock,
  Combine,
  Headphones,
  MapPin,
  MessageCircle,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  Zap,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Brand } from "@/components/brand"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const KEY_POINTS = [
  {
    icon: Truck,
    title: "Servicio logístico completo",
    desc: "Nos encargamos de todo el camino de tu paquete: lo recibimos, lo procesamos con cuidado y lo entregamos en su destino final.",
    color: "text-amber-500 bg-amber-500/10",
  },
  {
    icon: MapPin,
    title: "Tracking de tu paquete",
    desc: "Sabes en todo momento dónde está tu paquete y en qué etapa del proceso se encuentra, desde que lo recibimos hasta que llega a su destino.",
    color: "text-rose-500 bg-rose-500/10",
  },
  {
    icon: Package,
    title: "Tu paquete, en buenas manos",
    desc: "Cada paquete se identifica, se manipula con cuidado y se controla en cada etapa para asegurar que llegue completo y en perfecto estado.",
    color: "text-blue-500 bg-blue-500/10",
  },
  {
    icon: MessageCircle,
    title: "Te avisamos en cada etapa",
    desc: "Recibes notificaciones cuando tu paquete es despachado y cuando va camino al destino, sin tener que preguntar.",
    color: "text-green-500 bg-green-500/10",
  },
  {
    icon: Route,
    title: "Cobertura amplia",
    desc: "Llegamos a múltiples destinos a través de nuestra red de agencias y distribuidores, sin que tú tengas que coordinar nada.",
    color: "text-sky-500 bg-sky-500/10",
  },
  {
    icon: Headphones,
    title: "Atención cuando la necesitas",
    desc: "Si surge una novedad con tu paquete, registramos el caso y le damos seguimiento hasta resolverlo.",
    color: "text-fuchsia-500 bg-fuchsia-500/10",
  },
  {
    icon: Users,
    title: "Para envíos puntuales o volumen",
    desc: "Funciona igual de bien si envías un paquete o si manejas envíos masivos como shipper, con la misma confiabilidad.",
    color: "text-cyan-500 bg-cyan-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Confiabilidad y respaldo",
    desc: "Cada paquete queda registrado y respaldado en la plataforma, con un historial completo de su recorrido y entrega.",
    color: "text-teal-500 bg-teal-500/10",
  },
  {
    icon: Clock,
    title: "Visibilidad en tiempo real",
    desc: "Consulta el estado de tus envíos desde cualquier dispositivo, sin esperar a que alguien te responda por teléfono.",
    color: "text-violet-500 bg-violet-500/10",
  },
]

const OPERATIVE_FLOW = [
  {
    step: "01",
    title: "Recibimos tu paquete",
    desc: "Registramos tu paquete en cuanto llega a nuestras manos y lo identificamos para que no se pierda en ningún punto del trayecto.",
    icon: Boxes,
  },
  {
    step: "02",
    title: "Lo preparamos para enviarlo",
    desc: "Lo agrupamos con otros envíos hacia el mismo destino y lo dejamos listo para salir a ruta con todos los controles necesarios.",
    icon: Combine,
  },
  {
    step: "03",
    title: "Lo entregamos en destino",
    desc: "Lo enviamos a través de nuestra red de agencias y distribuidores hasta la persona que lo espera, y te avisamos en el camino.",
    icon: Truck,
  },
]

const FAQS = [
  {
    q: "¿Qué hace MV Services por mí?",
    a: "Nos encargamos de todo el camino de tu paquete: lo recibimos, lo organizamos, lo enviamos al destino y te mantenemos informado durante el proceso. Tú solo te ocupas de entregárnoslo o coordinar la recogida.",
  },
  {
    q: "¿Puedo saber dónde está mi paquete?",
    a: "Sí. En cualquier momento puedes consultar el estado de tu paquete y ver en qué etapa del recorrido se encuentra, desde que lo recibimos hasta que llega a su destino final.",
  },
  {
    q: "¿Cómo me avisan cuando mi paquete sale o llega?",
    a: "Te enviamos notificaciones automáticas por WhatsApp en los momentos clave del recorrido, para que sepas que tu paquete ya fue despachado y va camino al destino.",
  },
  {
    q: "¿A qué destinos llegan?",
    a: "Llegamos a múltiples destinos a través de nuestra red de agencias y distribuidores. Si necesitas confirmar la cobertura para una ruta específica, contáctanos antes de hacer el envío.",
  },
  {
    q: "¿Sirve para envíos pequeños o solo para volumen?",
    a: "Sirve para los dos. Si envías un paquete puntual, recibes el mismo cuidado y seguimiento. Si manejas envíos masivos como shipper, puedes solicitar una cuenta y administrar todos tus envíos desde un solo lugar.",
  },
  {
    q: "¿Qué pasa si hay un problema con mi paquete?",
    a: "Si surge una novedad o incidencia, registramos el caso, te informamos y le damos seguimiento hasta resolverlo. Nunca pierdes visibilidad del estado.",
  },
  {
    q: "¿Cómo solicito una cuenta?",
    a: "Si eres un shipper que envía paquetes con frecuencia, puedes solicitar una cuenta desde el botón \"Solicitar cuenta shipper\". Nuestro equipo revisa la solicitud y te habilita el acceso.",
  },
  {
    q: "¿Necesito instalar algo para usar la plataforma?",
    a: "No. Todo funciona desde el navegador en computadora, tablet o móvil. Solo necesitas tu cuenta para ingresar.",
  },
]

function scrollTo(e: React.MouseEvent<HTMLAnchorElement>) {
  const href = e.currentTarget.getAttribute("href")
  if (!href || !href.startsWith("#")) return
  e.preventDefault()
  const el = document.querySelector(href)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" })
    history.replaceState(null, "", href)
  }
}

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState<string>("inicio")
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Scroll spy simple
  useEffect(() => {
    const ids = ["inicio", "info", "flujo", "faq"]
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: "-40% 0px -55% 0px" },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Skip to content */}
      <a
        href="#inicio"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <a
            href="#inicio"
            onClick={scrollTo}
            className="group inline-flex items-center transition-opacity hover:opacity-80"
            aria-label="MV Services - Inicio"
          >
            <Brand size="lg" />
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {[
              { id: "info", label: "Plataforma" },
              { id: "flujo", label: "Flujo" },
              { id: "faq", label: "FAQ" },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={scrollTo}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeSection === item.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle className="h-9 w-9 rounded-md" />
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow"
            >
              Ingresar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section id="inicio" className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/40">
          {/* Decoración de fondo */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-mvs-secondary/10 blur-3xl" />
          </div>

          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                </span>
                Plataforma operativa
              </span>

              <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Tu paquete llega bien,{" "}
                <span className="bg-gradient-to-r from-foreground to-mvs-secondary bg-clip-text text-transparent">
                  y tú sabes en todo momento dónde está.
                </span>
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Servicio logístico completo de paquetería: lo recibimos, lo cuidamos durante todo el
                trayecto y lo entregamos en su destino, con tracking en tiempo real y avisos en cada
                etapa para que viajes tranquilo.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
                >
                  Ingresar al sistema
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/registro-shipper"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Solicitar cuenta shipper
                </Link>
              </div>

              <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
                <StatChip icon={<Truck className="h-3.5 w-3.5" />} label="Servicio" value="Logística completa" />
                <StatChip icon={<MapPin className="h-3.5 w-3.5" />} label="Visibilidad" value="Tracking en tiempo real" />
                <StatChip icon={<Zap className="h-3.5 w-3.5" />} label="Tranquilidad" value="Avisos en cada etapa" />
              </div>
            </div>

            {/* Mock visual del dashboard */}
            <div className="relative">
              <div className="absolute inset-0 -translate-x-3 translate-y-3 rounded-2xl bg-gradient-to-br from-primary/20 to-mvs-secondary/20 blur-2xl" aria-hidden />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-foreground/10">
                {/* Barra superior fake */}
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <div className="ml-2 flex h-5 flex-1 items-center justify-center rounded bg-background px-2 text-[10px] text-muted-foreground">
                    mvservices.app/tracking
                  </div>
                </div>
                {/* Contenido fake */}
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Mis envíos</div>
                      <div className="text-base font-semibold">Estado actual</div>
                    </div>
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      En vivo
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <MiniKpi label="Recibidos" value="124" tone="bg-blue-500/10 text-blue-500" />
                    <MiniKpi label="En tránsito" value="89" tone="bg-violet-500/10 text-violet-500" />
                    <MiniKpi label="Entregados" value="35" tone="bg-emerald-500/10 text-emerald-500" />
                  </div>

                  <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                    <FakeRow guia="MV-2024-0001" estado="Entregado" />
                    <FakeRow guia="MV-2024-0002" estado="En tránsito" warn />
                    <FakeRow guia="MV-2024-0003" estado="Entregado" />
                    <FakeRow guia="MV-2024-0004" estado="Recibido" warn />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INFO / KEY POINTS */}
        <section id="info" className="bg-background py-16 lg:py-24">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-12 max-w-2xl">
              <span className="text-xs font-medium uppercase tracking-wider text-mvs-secondary">
                Lo que ofrecemos
              </span>
              <h2 className="mt-2 font-serif text-3xl tracking-tight lg:text-4xl">
                Pensado para que tu paquete llegue bien
              </h2>
              <p className="mt-3 text-sm text-muted-foreground lg:text-base">
                Cuidamos cada paso del recorrido para que tú no tengas que preocuparte por el camino.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {KEY_POINTS.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-md"
                  >
                    <div className={cn("mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110", item.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* FLUJO */}
        <section id="flujo" className="bg-muted/30 py-16 lg:py-24">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 max-w-2xl">
              <span className="text-xs font-medium uppercase tracking-wider text-mvs-secondary">
                Cómo funciona
              </span>
              <h2 className="mt-2 font-serif text-3xl tracking-tight lg:text-4xl">
                Tres pasos hasta su destino
              </h2>
              <p className="mt-3 text-sm text-muted-foreground lg:text-base">
                Te explicamos en simple cómo viaja tu paquete con nosotros.
              </p>
            </div>
            <div className="relative grid gap-4 md:grid-cols-3">
              {OPERATIVE_FLOW.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="relative rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
                  >
                    <span className="absolute right-5 top-5 font-serif text-2xl font-bold text-muted-foreground/30">
                      {item.step}
                    </span>
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-background py-16 lg:py-24">
          <div className="mx-auto w-full max-w-3xl px-6">
            <div className="mb-10 text-center">
              <span className="text-xs font-medium uppercase tracking-wider text-mvs-secondary">
                Preguntas frecuentes
              </span>
              <h2 className="mt-2 font-serif text-3xl tracking-tight lg:text-4xl">
                ¿Tienes dudas sobre tu envío?
              </h2>
              <p className="mt-3 text-sm text-muted-foreground lg:text-base">
                Las respuestas que más nos hacen nuestros clientes.
              </p>
            </div>

            <div className="space-y-3">
              {FAQS.map((item, idx) => {
                const open = openFaq === idx
                return (
                  <div
                    key={item.q}
                    className={cn(
                      "rounded-xl border bg-card transition-colors",
                      open ? "border-foreground/20 shadow-sm" : "border-border",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left"
                      aria-expanded={open}
                    >
                      <span className="text-sm font-medium">{item.q}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          open && "rotate-180",
                        )}
                      />
                    </button>
                    {open && (
                      <div className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                        {item.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="bg-muted/30 py-16">
          <div className="mx-auto w-full max-w-4xl px-6">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-muted p-8 shadow-lg sm:p-12">
              <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Empieza hoy
                  </div>
                  <h3 className="font-serif text-2xl tracking-tight sm:text-3xl">
                    Envía con la tranquilidad de saber dónde está
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Ingresa con tu cuenta o solicita una cuenta shipper en pocos minutos para gestionar tus envíos.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                  >
                    Ingresar
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/registro-shipper"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    Solicitar cuenta
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="contacto" className="border-t border-border bg-card text-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <Brand size="sm" />
            <p className="mt-2 text-xs text-muted-foreground">
              Servicio logístico de paquetería: lo recibimos, lo cuidamos durante el trayecto y lo
              entregamos en su destino, con tracking y avisos en cada etapa.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Envío confiable
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                Tracking en tiempo real
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                Avisos por WhatsApp
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ingresar
            </Link>
            <Link
              to="/registro-shipper"
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Registro shipper
            </Link>
          </div>
        </div>
        <div className="border-t border-border/60 py-3 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} MV Services. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-xs font-semibold">{value}</p>
      </div>
    </div>
  )
}

function MiniKpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={cn("rounded-md p-2", tone)}>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-base font-bold leading-tight">{value}</div>
    </div>
  )
}

function FakeRow({ guia, estado, warn = false }: { guia: string; estado: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded bg-card px-2 py-1.5 text-[10px]">
      <span className="font-mono text-foreground/80">{guia}</span>
      <span
        className={cn(
          "rounded px-1.5 py-0.5 font-medium",
          warn ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        )}
      >
        {estado}
      </span>
    </div>
  )
}
