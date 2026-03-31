import { Link } from "react-router-dom"

const KEY_POINTS = [
  {
    title: "Gestión de paquetes",
    desc: "Registro, seguimiento y control operativo de paquetes en un solo lugar.",
  },
  {
    title: "Consolidados",
    desc: "Agrupación de envíos con flujo claro para operarios y control de estado.",
  },
  {
    title: "Control por roles",
    desc: "Acceso diferenciado para administración, operario y shipper.",
  },
]

function scrollTo(e: React.MouseEvent<HTMLAnchorElement>) {
  const href = e.currentTarget.getAttribute("href")
  if (!href || !href.startsWith("#")) return
  e.preventDefault()
  document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <a href="#inicio" onClick={scrollTo} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
              M
            </div>
            <span className="text-lg font-bold tracking-tight">
              MV <span className="text-mvs-secondary">Services</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href="#info"
              onClick={scrollTo}
              className="hidden text-sm text-gray-600 transition-colors hover:text-black sm:inline-flex"
            >
              Información
            </a>
            <Link
              to="/login"
              className="inline-flex items-center rounded-full bg-black px-5 py-2 text-sm text-white transition-colors hover:bg-mvs-secondary"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="inicio" className="bg-[#F7F7F5]">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <p className="text-sm tracking-wide text-gray-500">MV Services - Plataforma de gestión logística</p>
              <h1 className="font-serif text-5xl leading-tight tracking-tight lg:text-6xl">
                Operación logística clara, rápida y confiable.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-gray-600">
                Centralice paquetes, consolidados y usuarios en una sola plataforma para trabajar con mayor control y menos fricción.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-full bg-black px-6 py-3 text-sm text-white transition-colors hover:bg-mvs-secondary"
                >
                  Ingresar al sistema
                </Link>
                <Link
                  to="/registro-shipper"
                  className="inline-flex items-center rounded-full border border-black px-6 py-3 text-sm text-black transition-colors hover:bg-black hover:text-white"
                >
                  Solicitar cuenta shipper
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl">
              <img
                src="https://images.unsplash.com/photo-1494412519320-aa613dfb7738?auto=format&fit=crop&q=80&w=1200"
                alt="Operación logística"
                className="h-[360px] w-full object-cover lg:h-[440px]"
              />
            </div>
          </div>
        </section>

        <section id="info" className="bg-white py-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 max-w-2xl">
              <h2 className="font-serif text-3xl tracking-tight lg:text-4xl">Información relevante</h2>
              <p className="mt-3 text-sm text-gray-600">
                Lo esencial de la plataforma para iniciar operación sin navegación innecesaria.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {KEY_POINTS.map((item) => (
                <div key={item.title} className="rounded-2xl border border-gray-100 bg-[#F7F7F5] p-6">
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer id="contacto" className="border-t border-gray-100 bg-black text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">MV Services</p>
            <p className="mt-1 text-xs text-gray-400">Plataforma para gestión de paquetes y consolidados.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-mvs-secondary"
            >
              Ingresar
            </Link>
            <Link
              to="/registro-shipper"
              className="inline-flex items-center rounded-full border border-white/30 px-4 py-2 text-xs font-medium text-white transition-colors hover:border-white hover:bg-white hover:text-black"
            >
              Registro shipper
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
