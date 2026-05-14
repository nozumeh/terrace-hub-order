import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { CartSheet } from "@/components/CartSheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isEmployee } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/menu")({ component: MenuPage });

interface Restaurant { id: string; name: string; description: string; is_active: boolean }
interface Item { id: string; restaurant_id: string; name: string; description: string; price: number; category: string; is_available: boolean }

function MenuPage() {
  const { profile, roles } = useAuth();
  const employee = isEmployee(profile, roles);
  const { add } = useCart();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeResto, setActiveResto] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: r }, { data: m }] = await Promise.all([
        supabase.from("restaurants").select("*").eq("is_active", true).order("name"),
        supabase.from("menu_items").select("*").eq("is_available", true).order("category"),
      ]);
      const rs = (r ?? []) as Restaurant[];
      setRestaurants(rs);
      setItems((m ?? []) as Item[]);
      setActiveResto(rs[0]?.id ?? null);
      setLoading(false);
    })();
  }, []);

  const restoItems = useMemo(() => items.filter((i) => i.restaurant_id === activeResto), [items, activeResto]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(restoItems.map((i) => i.category)))], [restoItems]);
  const filtered = activeCat === "All" ? restoItems : restoItems.filter((i) => i.category === activeCat);
  const activeRestoObj = restaurants.find((r) => r.id === activeResto);

  const handleAdd = (i: Item) => {
    add({ menu_item_id: i.id, restaurant_id: i.restaurant_id, name: i.name, unit_price: Number(i.price) });
    toast.success(`${i.name} agregado`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header onCartClick={() => setCartOpen(true)} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Restaurant tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {restaurants.map((r) => (
            <button
              key={r.id}
              onClick={() => { setActiveResto(r.id); setActiveCat("All"); }}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                activeResto === r.id ? "border-gold bg-gold/15 text-gold" : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {activeRestoObj && (
          <div className="mb-6">
            <h1 className="font-heading text-2xl font-bold md:text-3xl">{activeRestoObj.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{activeRestoObj.description}</p>
          </div>
        )}

        {/* Category tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`shrink-0 px-3 pb-2 text-sm font-medium transition-colors ${
                activeCat === c ? "border-b-2 border-gold text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">No hay items disponibles.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {filtered.map((i) => {
              const price = Number(i.price);
              const discounted = Math.max(0, price - 1);
              return (
                <div key={i.id} className="flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-gold/40">
                  <div className="mb-3 flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-background text-3xl">🍔</div>
                  <div className="font-medium">{i.name}</div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.description}</p>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      {employee ? (
                        <div className="leading-tight">
                          <div className="text-xs text-muted-foreground line-through">${price.toFixed(2)}</div>
                          <div className="text-lg font-bold text-success">${discounted.toFixed(2)}</div>
                        </div>
                      ) : (
                        <div className="text-lg font-bold text-gold">${price.toFixed(2)}</div>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleAdd(i)} className="bg-gold text-primary-foreground hover:bg-gold/90">
                      <Plus className="h-3 w-3" /> Agregar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
