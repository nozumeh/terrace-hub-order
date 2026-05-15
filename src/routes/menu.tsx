import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { CartSheet } from "@/components/CartSheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isEmployee } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Plus, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import capitalBurgersLogo from "@/assets/capital-burgers-logo.jpeg";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

type MenuSearch = { r?: string };
export const Route = createFileRoute("/menu")({
  component: MenuPage,
  validateSearch: (s: Record<string, unknown>): MenuSearch => ({
    r: typeof s.r === "string" ? s.r : undefined,
  }),
});

interface Restaurant { id: string; name: string; description: string; is_active: boolean }
interface Category { id: string; restaurant_id: string; name: string; sort_order: number }
interface Extra { id: string; name: string; price: number }
interface Removable { id: string; name: string }
interface Item {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  category_id: string | null;
  is_available: boolean;
  stock_quantity: number | null;
  image_url: string | null;
  options: string[] | null;
  menu_item_extras: Extra[];
  menu_item_removable_options: Removable[];
}

function MenuPage() {
  const { profile, roles } = useAuth();
  const employee = isEmployee(profile, roles);
  const { add } = useCart();
  const { r: restoParam } = Route.useSearch();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeResto, setActiveResto] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [customizeItem, setCustomizeItem] = useState<Item | null>(null);
  const [variantChoice, setVariantChoice] = useState<string>("");
  const [chosenExtras, setChosenExtras] = useState<Set<string>>(new Set());
  const [chosenRemoved, setChosenRemoved] = useState<Set<string>>(new Set());
  const [paramIssue, setParamIssue] = useState<null | { reason: "missing" | "inactive"; fallbackName: string | null }>(null);

  const fetchAll = async () => {
    const [{ data: r }, { data: c }, { data: m }] = await Promise.all([
      supabase.from("restaurants").select("*").eq("is_active", true).order("name"),
      supabase.from("menu_categories").select("*").order("sort_order"),
      supabase
        .from("menu_items")
        .select("*, menu_item_extras(id,name,price), menu_item_removable_options(id,name)")
        .eq("is_available", true)
        .order("category"),
    ]);
    const rs = (r ?? []) as Restaurant[];
    setRestaurants(rs);
    setCategories((c ?? []) as Category[]);
    setItems((m ?? []) as unknown as Item[]);
    let nextActive: string | null = null;
    setActiveResto((prev) => {
      if (prev) { nextActive = prev; return prev; }
      if (restoParam && rs.some((x) => x.id === restoParam)) { nextActive = restoParam; return restoParam; }
      nextActive = rs[0]?.id ?? null;
      return nextActive;
    });
    if (restoParam && !rs.some((x) => x.id === restoParam)) {
      const { data: maybe } = await supabase
        .from("restaurants")
        .select("id,name,is_active")
        .eq("id", restoParam)
        .maybeSingle();
      const fb = rs.find((x) => x.id === nextActive)?.name ?? null;
      if (!maybe) setParamIssue({ reason: "missing", fallbackName: fb });
      else if (!maybe.is_active) setParamIssue({ reason: "inactive", fallbackName: fb });
      else setParamIssue(null);
    } else {
      setParamIssue(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    let t: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefetch = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => { fetchAll(); }, 300);
    };
    const channel = supabase
      .channel("menu-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_item_extras" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_item_removable_options" }, debouncedRefetch)
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restoItems = useMemo(() => items.filter((i) => i.restaurant_id === activeResto), [items, activeResto]);
  const restoCategories = useMemo(
    () => categories.filter((c) => c.restaurant_id === activeResto),
    [categories, activeResto],
  );
  // Prefer named categories from menu_categories; fall back to legacy text column on items.
  const catNames = useMemo(() => {
    if (restoCategories.length > 0) return restoCategories.map((c) => c.name);
    return Array.from(new Set(restoItems.map((i) => i.category)));
  }, [restoCategories, restoItems]);
  const catTabs = ["All", ...catNames];
  const filtered = activeCat === "All"
    ? restoItems
    : restoItems.filter((i) => {
        if (restoCategories.length > 0) {
          const matched = restoCategories.find((c) => c.name === activeCat);
          return matched ? i.category_id === matched.id || i.category === activeCat : false;
        }
        return i.category === activeCat;
      });
  const activeRestoObj = restaurants.find((r) => r.id === activeResto);

  const needsCustomization = (i: Item) =>
    (Array.isArray(i.options) && i.options.length > 0) ||
    (i.menu_item_extras?.length ?? 0) > 0 ||
    (i.menu_item_removable_options?.length ?? 0) > 0;

  const handleAdd = (i: Item) => {
    if (!i.is_available) return;
    if (needsCustomization(i)) {
      setVariantChoice(Array.isArray(i.options) && i.options.length > 0 ? i.options[0] : "");
      setChosenExtras(new Set());
      setChosenRemoved(new Set());
      setCustomizeItem(i);
      return;
    }
    add({
      menu_item_id: i.id,
      restaurant_id: i.restaurant_id,
      name: i.name,
      base_price: Number(i.price),
      unit_price: Number(i.price),
      variant: null,
      extras: [],
      removed: [],
    });
    toast.success(`${i.name} agregado`);
  };

  const closeCustomize = () => {
    setCustomizeItem(null);
    setVariantChoice("");
    setChosenExtras(new Set());
    setChosenRemoved(new Set());
  };

  const toggleSet = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  };

  const confirmCustomize = () => {
    if (!customizeItem) return;
    const extras = (customizeItem.menu_item_extras ?? []).filter((e) => chosenExtras.has(e.id));
    const removed = (customizeItem.menu_item_removable_options ?? []).filter((r) => chosenRemoved.has(r.id));
    const extrasPrice = extras.reduce((a, e) => a + Number(e.price), 0);
    add({
      menu_item_id: customizeItem.id,
      restaurant_id: customizeItem.restaurant_id,
      name: customizeItem.name,
      base_price: Number(customizeItem.price),
      unit_price: Number(customizeItem.price) + extrasPrice,
      variant: variantChoice || null,
      extras: extras.map((e) => ({ id: e.id, name: e.name, price: Number(e.price) })),
      removed: removed.map((r) => ({ id: r.id, name: r.name })),
    });
    toast.success(`${customizeItem.name} agregado`);
    closeCustomize();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header onCartClick={() => setCartOpen(true)} />
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link
          to="/restaurants"
          search={activeResto ? { selected: activeResto } : undefined}
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-muted-foreground hover:text-gold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Restaurantes
        </Link>
        {paramIssue && (
          <Alert className="mb-4 border-gold/40 bg-gold/5">
            <AlertTriangle className="h-4 w-4 text-gold" />
            <AlertTitle>Restaurante no disponible</AlertTitle>
            <AlertDescription>
              {paramIssue.reason === "missing"
                ? "El restaurante solicitado no existe."
                : "El restaurante solicitado está temporalmente inactivo."}
              {paramIssue.fallbackName
                ? ` Te mostramos el menú de ${paramIssue.fallbackName}.`
                : " No hay restaurantes disponibles por ahora."}{" "}
              <Link to="/restaurants" className="font-medium text-gold underline-offset-2 hover:underline">
                Ver todos
              </Link>
            </AlertDescription>
          </Alert>
        )}
        {/* Restaurant tabs (quick switcher) */}
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
          {catTabs.map((c) => (
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
              const outOfStock = i.stock_quantity !== null && i.stock_quantity <= 0;
              const unavailable = !i.is_available || outOfStock;
              const lowStock = i.stock_quantity !== null && i.stock_quantity > 0 && i.stock_quantity <= 5;
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
                    {!unavailable && lowStock && (
                      <div className="absolute right-2 top-2 rounded-md bg-gold/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Quedan {i.stock_quantity}
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

      <Dialog open={!!customizeItem} onOpenChange={(v) => { if (!v) closeCustomize(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{customizeItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {Array.isArray(customizeItem?.options) && customizeItem!.options!.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opción</div>
                <RadioGroup value={variantChoice} onValueChange={setVariantChoice} className="gap-2">
                  {(customizeItem?.options ?? []).map((opt) => (
                    <Label key={opt} htmlFor={`opt-${opt}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 hover:border-gold/40">
                      <RadioGroupItem id={`opt-${opt}`} value={opt} />
                      <span className="text-sm">{opt}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {(customizeItem?.menu_item_extras?.length ?? 0) > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Extras</div>
                <div className="space-y-2">
                  {customizeItem!.menu_item_extras.map((e) => (
                    <Label key={e.id} htmlFor={`ex-${e.id}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 hover:border-gold/40">
                      <Checkbox
                        id={`ex-${e.id}`}
                        checked={chosenExtras.has(e.id)}
                        onCheckedChange={() => setChosenExtras((s) => toggleSet(s, e.id))}
                      />
                      <span className="flex-1 text-sm">{e.name}</span>
                      <span className="text-sm text-gold">+${Number(e.price).toFixed(2)}</span>
                    </Label>
                  ))}
                </div>
              </div>
            )}

            {(customizeItem?.menu_item_removable_options?.length ?? 0) > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quitar ingredientes</div>
                <div className="space-y-2">
                  {customizeItem!.menu_item_removable_options.map((r) => (
                    <Label key={r.id} htmlFor={`rm-${r.id}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 hover:border-gold/40">
                      <Checkbox
                        id={`rm-${r.id}`}
                        checked={chosenRemoved.has(r.id)}
                        onCheckedChange={() => setChosenRemoved((s) => toggleSet(s, r.id))}
                      />
                      <span className="text-sm">Sin {r.name}</span>
                    </Label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCustomize}>Cancelar</Button>
            <Button onClick={confirmCustomize} className="bg-gold text-primary-foreground hover:bg-gold/90">Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
