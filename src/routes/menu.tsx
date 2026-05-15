import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { CartSheet } from "@/components/CartSheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isEmployee } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import capitalBurgersLogo from "@/assets/capital-burgers-logo.jpeg";

export const Route = createFileRoute("/menu")({ component: MenuPage });

interface Restaurant { id: string; name: string; description: string; is_active: boolean }
interface Item { id: string; restaurant_id: string; name: string; description: string; price: number; category: string; is_available: boolean; image_url: string | null; options: string[] | null }

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
  const [variantItem, setVariantItem] = useState<Item | null>(null);
  const [variantChoice, setVariantChoice] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [{ data: r }, { data: m }] = await Promise.all([
        supabase.from("restaurants").select("*").eq("is_active", true).order("name"),
        supabase.from("menu_items").select("*").order("category"),
      ]);
      const rs = (r ?? []) as Restaurant[];
      setRestaurants(rs);
      setItems((m ?? []) as unknown as Item[]);
      setActiveResto(rs[0]?.id ?? null);
      setLoading(false);
    })();
  }, []);

  const restoItems = useMemo(() => items.filter((i) => i.restaurant_id === activeResto), [items, activeResto]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(restoItems.map((i) => i.category)))], [restoItems]);
  const filtered = activeCat === "All" ? restoItems : restoItems.filter((i) => i.category === activeCat);
  const activeRestoObj = restaurants.find((r) => r.id === activeResto);

  const handleAdd = (i: Item) => {
    if (!i.is_available) return;
    if (Array.isArray(i.options) && i.options.length > 0) {
      setVariantChoice(i.options[0]);
      setVariantItem(i);
      return;
    }
    add({ menu_item_id: i.id, restaurant_id: i.restaurant_id, name: i.name, unit_price: Number(i.price) });
    toast.success(`${i.name} agregado`);
  };

  const confirmVariant = () => {
    if (!variantItem || !variantChoice) return;
    const composedId = `${variantItem.id}::${variantChoice}`;
    const composedName = `${variantItem.name} — ${variantChoice}`;
    add({ menu_item_id: composedId, restaurant_id: variantItem.restaurant_id, name: composedName, unit_price: Number(variantItem.price) });
    toast.success(`${composedName} agregado`);
    setVariantItem(null);
    setVariantChoice("");
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
          <div className="mb-6 flex items-center gap-4">
            {activeRestoObj.name.toLowerCase().includes("capital burgers") && (
              <img
                src={capitalBurgersLogo}
                alt="Capital Burgers logo"
                className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-gold/40 md:h-20 md:w-20"
              />
            )}
            <div>
              <h1 className="font-heading text-2xl font-bold md:text-3xl">{activeRestoObj.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{activeRestoObj.description}</p>
            </div>
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
              const unavailable = !i.is_available;
              return (
                <div key={i.id} className={`flex flex-col rounded-xl border bg-card p-4 transition-colors ${unavailable ? "border-border opacity-60" : "border-border hover:border-gold/40"}`}>
                  <div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-background">
                    {i.image_url ? (
                      <img src={i.image_url} alt={i.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">🍔</div>
                    )}
                    {unavailable && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <span className="rounded-md bg-destructive px-2 py-1 text-xs font-bold uppercase tracking-wider text-destructive-foreground">Agotado</span>
                      </div>
                    )}
                  </div>
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
                    <Button size="sm" onClick={() => handleAdd(i)} disabled={unavailable} className="bg-gold text-primary-foreground hover:bg-gold/90">
                      <Plus className="h-3 w-3" /> Agregar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!variantItem} onOpenChange={(v) => { if (!v) { setVariantItem(null); setVariantChoice(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{variantItem?.name}</DialogTitle>
          </DialogHeader>
          <RadioGroup value={variantChoice} onValueChange={setVariantChoice} className="gap-2">
            {(variantItem?.options ?? []).map((opt) => (
              <Label key={opt} htmlFor={`opt-${opt}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 hover:border-gold/40">
                <RadioGroupItem id={`opt-${opt}`} value={opt} />
                <span className="text-sm">{opt}</span>
              </Label>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVariantItem(null); setVariantChoice(""); }}>Cancelar</Button>
            <Button onClick={confirmVariant} className="bg-gold text-primary-foreground hover:bg-gold/90">Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
