import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, UtensilsCrossed, Loader2, Clock, Check } from "lucide-react";
import capitalBurgersLogo from "@/assets/capital-burgers-logo.jpeg";

type RestaurantsSearch = { selected?: string };

export const Route = createFileRoute("/restaurants")({
  component: RestaurantsPage,
  validateSearch: (s: Record<string, unknown>): RestaurantsSearch => ({
    selected: typeof s.selected === "string" ? s.selected : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Restaurantes — Terraza Gourmet City Market" },
      { name: "description", content: "Elige el restaurante: Capital Burgers o Terraza Gourmet. Próximamente más opciones." },
      { property: "og:title", content: "Restaurantes disponibles" },
      { property: "og:description", content: "Capital Burgers y Terraza Gourmet en City Market." },
    ],
  }),
});

interface Restaurant { id: string; name: string; description: string; is_active: boolean }

function RestaurantsPage() {
  const { selected } = Route.useSearch();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  // Auto-hide the loader quickly so it never feels blocking
  useEffect(() => {
    if (!navigatingTo) return;
    const t = setTimeout(() => setNavigatingTo(null), 500);
    return () => clearTimeout(t);
  }, [navigatingTo]);
  const selectedRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    supabase
      .from("restaurants")
      .select("id,name,description,is_active")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setRestaurants((data ?? []) as Restaurant[]);
        setLoading(false);
      });
  }, []);

  const selectedResto = useMemo(
    () => (selected ? restaurants.find((r) => r.id === selected) ?? null : null),
    [selected, restaurants],
  );

  // Smoothly scroll the previously selected restaurant into view
  useEffect(() => {
    if (selectedResto && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedResto]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      {navigatingTo && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4 animate-fade-in">
          <div className="flex items-center gap-2 rounded-full border border-gold/40 bg-background/95 px-4 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-gold" />
            Abriendo <span className="text-foreground">{navigatingTo}</span>…
          </div>
        </div>
      )}
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="mb-8">
          <div className="text-xs font-medium uppercase tracking-widest text-gold">Restaurantes disponibles</div>
          <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Elige dónde quieres comer</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
            Toca un restaurante para ver su menú completo.
          </p>
        </div>

        {/* Quick continue with previously selected */}
        {selectedResto && (
          <div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-gold/40 bg-gold/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-gold" />
              <span className="text-muted-foreground">Continuar con</span>
              <span className="font-heading font-semibold text-foreground">{selectedResto.name}</span>
            </div>
            <Button asChild size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90">
              <Link
                to="/menu"
                search={{ r: selectedResto.id }}
                onClick={() => {
                  setNavigatingTo(selectedResto.name);
                  try {
                    sessionStorage.setItem(
                      "menu_nav_start",
                      JSON.stringify({ t: performance.now(), name: selectedResto.name }),
                    );
                    performance.mark?.("menu-nav-start");
                  } catch { /* ignore */ }
                }}
              >
                Ir al menú <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {restaurants.map((r) => {
              const isCapital = r.name.toLowerCase().includes("capital burgers");
              const isSelected = r.id === selected;
              return (
                <Link
                  key={r.id}
                  to="/menu"
                  search={{ r: r.id }}
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => {
                    setNavigatingTo(r.name);
                    try {
                      sessionStorage.setItem(
                        "menu_nav_start",
                        JSON.stringify({ t: performance.now(), name: r.name }),
                      );
                      performance.mark?.("menu-nav-start");
                    } catch { /* ignore */ }
                  }}
                  className={`group relative block rounded-2xl border p-6 transition-all active:scale-[0.99] ${
                    isSelected
                      ? "border-gold bg-card ring-2 ring-gold/40"
                      : "border-border bg-card hover:border-gold/60 hover:bg-card/80"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      <Check className="h-3 w-3" /> Seleccionado
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Restaurante</div>
                      <div className="mt-1 font-heading text-2xl font-bold">{r.name}</div>
                    </div>
                    {isCapital ? (
                      <img
                        src={capitalBurgersLogo}
                        alt={`${r.name} logo`}
                        className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-gold/40"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                        <UtensilsCrossed className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{r.description}</p>
                  <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-gold">
                    {isSelected ? "Continuar al menú" : "Ver menú"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}

            {/* Coming soon */}
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 md:col-span-2">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Clock className="h-5 w-5 text-gold" />
                <div>
                  <div className="font-heading text-base font-semibold text-foreground">Próximamente más restaurantes</div>
                  <p className="mt-0.5 text-sm">Estamos sumando nuevas opciones para ti dentro de City Market.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
