import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, UtensilsCrossed, Loader2, Clock } from "lucide-react";
import capitalBurgersLogo from "@/assets/capital-burgers-logo.jpeg";

export const Route = createFileRoute("/restaurants")({
  component: RestaurantsPage,
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <div className="mb-8">
          <div className="text-xs font-medium uppercase tracking-widest text-gold">Restaurantes disponibles</div>
          <h1 className="mt-2 font-heading text-3xl font-bold md:text-4xl">Elige dónde quieres comer</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
            Toca un restaurante para ver su menú completo.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {restaurants.map((r) => {
              const isCapital = r.name.toLowerCase().includes("capital burgers");
              return (
                <Link
                  key={r.id}
                  to="/menu"
                  search={{ r: r.id }}
                  className="group block rounded-2xl border border-border bg-card p-6 transition-all hover:border-gold/60 hover:bg-card/80"
                >
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
                    Ver menú <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
