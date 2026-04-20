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
import { Brand, BrandMark } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const KEY_POINTS = [
  {
    icon: Truck,
    title: "Servicio logístico completo",
    desc: "Nos encargamos de todo el camino de tu paquete: lo recibimos, lo procesamos con cuidado y lo entregamos en su destino final.",
  },
  {
    icon: MapPin,
    title: "Tracking de tu paquete",
    desc: "Sabes en todo momento dónde está tu paquete y en qué etapa del proceso se encuentra, desde que lo recibimos hasta que llega a su destino.",
  },
  {
    icon: Package,
    title: "Tu paquete, en buenas manos",
    desc: "Cada paquete se identifica, se manipula con cuidado y se controla en cada etapa para asegurar que llegue completo y en perfecto estado.",
  },
  {
    icon: MessageCircle,
    title: "Te avisamos en cada etapa",
    desc: "Recibes notificaciones cuando tu paquete es despachado y cuando va camino al destino, sin tener que preguntar.",
  },
  {
    icon: Route,
    title: "Cobertura amplia",
    desc: "Llegamos a múltiples destinos a través de nuestra red de agencias y distribuidores, sin que tú tengas que coordinar nada.",
  },
  {
    icon: Headphones,
    title: "Atención cuando la necesitas",
    desc: "Si surge una novedad con tu paquete, registramos el caso y le damos seguimiento hasta resolverlo.",
  },
  {
    icon: Users,
    title: "Para envíos puntuales o volumen",
    desc: "Funciona igual de bien si envías un paquete o si manejas envíos masivos como shipper, con la misma confiabilidad.",
  },
  {
    icon: ShieldCheck,
    title: "Confiabilidad y respaldo",
    desc: "Cada paquete queda registrado y respaldado en la plataforma, con un historial completo de su recorrido y entrega.",
  },
  {
    icon: Clock,
    title: "Visibilidad en tiempo real",
    desc: "Consulta el estado de tus envíos desde cualquier dispositivo, sin esperar a que alguien te responda por teléfono.",
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
    <div className="min-h-screen bg-background text-foreground font-sans">
      <a
        href="#inicio"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-foreground focus:shadow-popover"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <a
            href="#inicio"
            onClick={scrollTo}
            className="group inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
            aria-label="MV Services - Inicio"
          >
            <BrandMark size={32} />
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
                  "relative rounded-md px-3 py-1.5 text-sm transition-colors",
                  activeSection === item.id
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {activeSection === item.id && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-accent" />
                )}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle className="h-9 w-9 rounded-lg" />
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/login">
                Ingresar
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section
          id="inicio"
          className="relative overflow-hidden border-b border-border/50"
        >
          {/* Decoración de fondo */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -top-40 -right-32 h-[480px] w-[480px] rounded-full bg-accent/15 blur-[120px]" />
            <div className="absolute top-32 -left-32 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[120px]" />
            <div
              className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                backgroundSize: "28px 28px",
              }}
            />
          </div>

          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
            <div className="space-y-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground shadow-soft">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent"></span>
                </span>
                Plataforma operativa
              </span>

              <h1 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Tu paquete llega bien,
                <br />
                <span className="text-accent">y tú sabes</span> dónde está.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Servicio logístico completo de paquetería: lo recibimos, lo cuidamos durante todo el
                trayecto y lo entregamos en su destino, con tracking en tiempo real y avisos en cada
                etapa para que viajes tranquilo.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button asChild size="lg" className="gap-2">
                  <Link to="/registro-shipper">
                    Solicitar cuenta shipper
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="gap-2">
                  <Link to="/login">
                    Iniciar sesión
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
                <StatChip icon={<Truck className="h-3.5 w-3.5" />} label="Servicio" value="Logística completa" />
                <StatChip icon={<MapPin className="h-3.5 w-3.5" />} label="Visibilidad" value="Tracking en tiempo real" />
                <StatChip icon={<Zap className="h-3.5 w-3.5" />} label="Tranquilidad" value="Avisos por etapa" />
              </div>
            </div>

            {/* Mock visual del dashboard */}
            <div className="relative hidden lg:block">
              <div
                aria-hidden
                className="absolute inset-0 -translate-x-3 translate-y-3 rounded-2xl bg-accent/15 blur-2xl"
              />
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-popover">
                <div className="flex items-center gap-2 border-b border-border/60 bg-[#0C0C0C] px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
                  <div className="ml-2 flex h-5 flex-1 items-center justify-center rounded bg-white/5 px-2 text-[10px] text-white/50 font-mono">
                    mvservices.app/tracking
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Mis envíos
                      </div>
                      <div className="font-serif text-xl mt-0.5">Estado actual</div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-medium text-accent-soft-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                      En vivo
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <MiniKpi label="Recibidos" value="124" />
                    <MiniKpi label="En tránsito" value="89" tone="accent" />
                    <MiniKpi label="Entregados" value="35" tone="success" />
                  </div>

                  <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/30 p-3">
                    <FakeRow guia="MV-2026-0001" estado="Entregado" />
                    <FakeRow guia="MV-2026-0002" estado="En tránsito" warn />
                    <FakeRow guia="MV-2026-0003" estado="Entregado" />
                    <FakeRow guia="MV-2026-0004" estado="Recibido" warn />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INFO / KEY POINTS */}
        <section id="info" className="bg-background py-20 lg:py-28">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-14 max-w-2xl">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                Lo que ofrecemos
              </span>
              <h2 className="mt-3 font-serif text-3xl tracking-tight lg:text-5xl leading-[1.1]">
                Pensado para que tu paquete <span className="text-accent">llegue bien</span>
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Cuidamos cada paso del recorrido para que tú no tengas que preocuparte por el camino.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {KEY_POINTS.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="group rounded-2xl border border-border/70 bg-card p-6 shadow-soft transition-all duration-200 ease-claude hover:shadow-card hover:-translate-y-0.5 hover:border-foreground/15"
                  >
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-lg leading-tight">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* FLUJO */}
        <section id="flujo" className="bg-muted/30 py-20 lg:py-28 border-y border-border/50">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-12 max-w-2xl">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                Cómo funciona
              </span>
              <h2 className="mt-3 font-serif text-3xl tracking-tight lg:text-5xl leading-[1.1]">
                Tres pasos hasta su destino
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                Te explicamos en simple cómo viaja tu paquete con nosotros.
              </p>
            </div>
            <div className="relative grid gap-4 md:grid-cols-3">
              {OPERATIVE_FLOW.map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.title}
                    className="relative rounded-2xl border border-border/70 bg-card p-7 shadow-soft transition-all duration-200 ease-claude hover:shadow-card"
                  >
                    <span className="absolute right-6 top-6 font-serif text-3xl text-accent/20">
                      {item.step}
                    </span>
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-serif text-lg leading-tight">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-background py-20 lg:py-28">
          <div className="mx-auto w-full max-w-3xl px-6">
            <div className="mb-12 text-center">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                Preguntas frecuentes
              </span>
              <h2 className="mt-3 font-serif text-3xl tracking-tight lg:text-5xl leading-[1.1]">
                ¿Tienes dudas sobre tu envío?
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed">
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
                      "rounded-xl border bg-card transition-all duration-200 ease-claude",
                      open ? "border-accent/30 shadow-card" : "border-border/70 shadow-soft hover:border-foreground/15",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left"
                      aria-expanded={open}
                    >
                      <span className={cn("text-sm font-medium", open && "text-accent")}>
                        {item.q}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          open && "rotate-180 text-accent",
                        )}
                      />
                    </button>
                    {open && (
                      <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-200">
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
        <section className="bg-muted/30 py-20 border-t border-border/50">
          <div className="mx-auto w-full max-w-4xl px-6">
            <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-[#0C0C0C] p-10 shadow-card sm:p-14">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-accent/30 blur-[100px]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-accent/15 blur-[100px]"
              />
              <div className="relative flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-white">
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/80">
                    <Sparkles className="h-3 w-3 text-accent" />
                    Empieza hoy
                  </div>
                  <h3 className="font-serif text-3xl tracking-tight sm:text-4xl leading-tight">
                    Envía con la tranquilidad
                    <br />
                    <span className="text-accent">de saber dónde está.</span>
                  </h3>
                  <p className="mt-3 max-w-md text-sm text-white/70 leading-relaxed">
                    Ingresa con tu cuenta o solicita una cuenta shipper en pocos minutos para
                    gestionar tus envíos.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row shrink-0">
                  <Button asChild variant="accent" size="lg" className="gap-2">
                    <Link to="/login">
                      Ingresar
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    className="gap-2 bg-white/10 hover:bg-white/15 text-white shadow-none"
                  >
                    <Link to="/registro-shipper">
                      Solicitar cuenta
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer id="contacto" className="border-t border-border/60 bg-card text-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2.5">
              <BrandMark size={32} />
              <Brand size="md" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Servicio logístico de paquetería: lo recibimos, lo cuidamos durante el trayecto y lo
              entregamos en su destino, con tracking y avisos en cada etapa.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                Envío confiable
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-accent" />
                Tracking en tiempo real
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-accent" />
                Avisos por WhatsApp
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild>
              <Link to="/login">Ingresar</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/registro-shipper">Registro shipper</Link>
            </Button>
          </div>
        </div>
        <div className="border-t border-border/60 py-3 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} <span className="font-serif">MV Services</span>. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  )
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm shadow-soft">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">{label}</p>
        <p className="truncate text-xs font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

function MiniKpi({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "accent" | "success"
}) {
  const tones: Record<string, string> = {
    default: "bg-muted/60 text-foreground",
    accent: "bg-accent-soft text-accent-soft-foreground",
    success: "bg-success/15 text-success",
  }
  return (
    <div className={cn("rounded-lg p-2.5", tones[tone])}>
      <div className="text-[9px] uppercase tracking-[0.12em] opacity-70 font-medium">{label}</div>
      <div className="font-serif text-xl leading-tight mt-0.5">{value}</div>
    </div>
  )
}

function FakeRow({ guia, estado, warn = false }: { guia: string; estado: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-card px-2.5 py-2 text-[11px] border border-border/40">
      <span className="font-mono text-foreground/80">{guia}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 font-medium",
          warn ? "bg-warning/15 text-warning" : "bg-success/15 text-success",
        )}
      >
        {estado}
      </span>
    </div>
  )
}
