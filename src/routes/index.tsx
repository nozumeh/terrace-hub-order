import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ParallaxBg } from "@/components/ParallaxBg";
import { ArrowRight, MousePointerClick, Bike, UtensilsCrossed, BadgePercent } from "lucide-react";
import cityMarketHero640 from "@/assets/city-market-hero-640.jpg";
import cityMarketHero1024 from "@/assets/city-market-hero-1024.jpg";
import cityMarketHero1600 from "@/assets/city-market-hero-1600.jpg";
import cityMarketHero640Webp from "@/assets/city-market-hero-640.webp";
import cityMarketHero1024Webp from "@/assets/city-market-hero-1024.webp";
import cityMarketHero1600Webp from "@/assets/city-market-hero-1600.webp";
import cityMarketHero640Avif from "@/assets/city-market-hero-640.avif";
import cityMarketHero1024Avif from "@/assets/city-market-hero-1024.avif";
import cityMarketHero1600Avif from "@/assets/city-market-hero-1600.avif";
import capitalBurgersLogo from "@/assets/capital-burgers-logo.jpeg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    links: [
      // Preload the LCP background image as AVIF; browsers that don't support
      // AVIF simply ignore the hint and load the WebP/JPEG fallback.
      {
        rel: "preload",
        as: "image",
        href: cityMarketHero1024Avif,
        type: "image/avif",
        imagesrcset: `${cityMarketHero640Avif} 640w, ${cityMarketHero1024Avif} 1024w, ${cityMarketHero1600Avif} 1600w`,
        imagesizes: "100vw",
        fetchpriority: "high",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <picture>
          <source
            type="image/avif"
            srcSet={`${cityMarketHero640Avif} 640w, ${cityMarketHero1024Avif} 1024w, ${cityMarketHero1600Avif} 1600w`}
            sizes="100vw"
          />
          <source
            type="image/webp"
            srcSet={`${cityMarketHero640Webp} 640w, ${cityMarketHero1024Webp} 1024w, ${cityMarketHero1600Webp} 1600w`}
            sizes="100vw"
          />
          <img
            src={cityMarketHero1024}
            srcSet={`${cityMarketHero640} 640w, ${cityMarketHero1024} 1024w, ${cityMarketHero1600} 1600w`}
            sizes="100vw"
            alt="City Market — el centro tecnológico de Caracas"
            className="absolute inset-0 h-full w-full object-cover opacity-80 [object-position:70%_65%] sm:[object-position:60%_55%] md:[object-position:center]"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/55 md:bg-gradient-to-r md:from-background/85 md:via-background/50 md:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent md:via-background/30" />
        <div className="absolute -right-20 top-1/3 h-[400px] w-[400px] rounded-full bg-gold/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Operativo · Lunes a sábado · 11:00 — 17:00
          </div>
          <h1 className="mt-6 max-w-3xl font-heading text-4xl font-bold leading-[1.05] md:text-6xl">
            Tu almuerzo listo en City Market.{" "}
            <span className="text-gold">Un solo click.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Pedidos directamente a tu tienda. Descuento exclusivo para empleados. Sin salir del edificio.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="bg-gold text-primary-foreground hover:bg-gold/90" asChild>
              <Link to="/restaurants">Ver el Menú <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Soy Empleado — Entrar</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="relative overflow-hidden border-b border-border py-20">
        <ParallaxBg wrapperClass="items-end justify-center md:items-center">
          <span className="magic-text font-heading text-[28vw] font-black uppercase leading-[0.8] tracking-tighter opacity-25 translate-y-[18%] sm:text-[24vw] sm:translate-y-[10%] md:text-[22vw] md:translate-y-0 md:opacity-40">
            Tecnología
          </span>
        </ParallaxBg>
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="mb-12 max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-widest text-gold">Cómo funciona</div>
            <h2 className="mt-2 font-heading text-3xl font-bold md:text-4xl">3 pasos. Menos de 60 segundos.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { n: "01", icon: UtensilsCrossed, t: "Elige tu comida", d: "Explora el menú de los restaurantes disponibles en City Market." },
              { n: "02", icon: MousePointerClick, t: "Haz tu pedido", d: "Un click. Confirma tu tienda y piso." },
              { n: "03", icon: Bike, t: "Te lo llevamos", d: "El food runner entrega directo a tu tienda." },
            ].map((s) => (
              <div key={s.n} className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-gold/50">
                <div className="flex items-center justify-between">
                  <div className="font-heading text-3xl font-bold text-muted-foreground/40">{s.n}</div>
                  <s.icon className="h-5 w-5 text-gold" />
                </div>
                <div className="mt-6 font-heading text-lg font-semibold">{s.t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Employee discount banner */}
      <section className="relative overflow-hidden border-b border-border py-16">
        <ParallaxBg wrapperClass="items-center justify-center" intensity={0.8}>
          <span className="magic-text font-heading text-[26vw] font-black uppercase leading-[0.8] tracking-tighter opacity-20 sm:text-[22vw] md:text-[20vw] md:opacity-30">
            Innovación
          </span>
        </ParallaxBg>
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-card p-8 md:p-12">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-2xl" />
            <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">
                  <BadgePercent className="h-3.5 w-3.5" /> Beneficio empleado
                </div>
                <h3 className="mt-3 font-heading text-2xl font-bold md:text-3xl">¿Eres empleado de City Market?</h3>
                <p className="mt-2 text-muted-foreground">
                  Todos tus pedidos tienen <span className="font-semibold text-foreground">$1 de descuento automático</span>. Regístrate con el nombre de tu tienda y piso.
                </p>
              </div>
              <Button size="lg" className="bg-gold text-primary-foreground hover:bg-gold/90" asChild>
                <Link to="/register">Registrarme</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurants */}
      <section className="relative overflow-hidden border-b border-border py-20">
        <ParallaxBg wrapperClass="items-end justify-center md:items-center">
          <span className="magic-text font-heading text-[28vw] font-black uppercase leading-[0.8] tracking-tighter opacity-25 translate-y-[18%] sm:text-[24vw] sm:translate-y-[10%] md:text-[22vw] md:translate-y-0 md:opacity-35">
            Calidad
          </span>
        </ParallaxBg>
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="mb-10">
            <div className="text-xs font-medium uppercase tracking-widest text-gold">Restaurantes</div>
            <h2 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Los que están cocinando hoy</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <RestoCard name="Capital Burgers" tag="Hamburguesas · Combos · Sides" desc="Carne 100% res, pollo crispy y opciones veggie. Comida hecha al momento." logo={capitalBurgersLogo} />
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Próximamente</div>
              <div className="mt-1 font-heading text-2xl font-bold text-muted-foreground">Más restaurantes</div>
              <p className="mt-4 text-sm text-muted-foreground">Nuevos negocios se sumarán pronto a la plataforma.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-10">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-muted-foreground">
          © 2026 Terraza Gourmet City Market · Tecnología por <span className="text-gold">Coral Pandas Network</span>
        </div>
      </footer>
    </div>
  );
}

function RestoCard({ name, tag, desc, logo }: { name: string; tag: string; desc: string; logo?: string }) {
  return (
    <Link to="/restaurants" search={{ selected: name }} className="group block rounded-xl border border-border bg-card p-6 transition-all hover:border-gold/50 hover:bg-card/80">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{tag}</div>
          <div className="mt-1 font-heading text-2xl font-bold">{name}</div>
        </div>
        {logo ? (
          <img src={logo} alt={`${name} logo`} className="h-14 w-14 rounded-full object-cover ring-2 ring-gold/40" loading="lazy" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-gold">
        Ver Menú <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
