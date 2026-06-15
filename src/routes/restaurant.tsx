import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Settings2, ChefHat, BarChart3, Bike, Boxes, UserPlus, CheckCircle2, Circle, X, CreditCard, Percent } from "lucide-react";
import { toast } from "sonner";
import { CsvImportDialog } from "@/components/CsvImportDialog";
import { NotificationsBanner } from "@/components/NotificationsBanner";

export const Route = createFileRoute("/restaurant")({ component: RestaurantPanel });

interface Order {
  id: string; order_number: number; status: string; created_at: string;
  delivery_store: string; delivery_floor: string; notes: string;
  customer_id: string;
}
interface OrderItem { id: string; order_id: string; name: string; quantity: number }
interface Item { id: string; name: string; price: number; is_available: boolean; category: string }
interface Category { id: string; name: string; display_order: number }
interface MenuItemFull { id: string; name: string; price: number; is_available: boolean; category: string; category_id: string | null; image_url: string | null }
interface CustomerInfo { name: string; phone: string | null; store_id: string | null; customer_code: string | null }

function RestaurantPanel() {
  const { user, roles, loading, isRestaurantOwner, requireRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isChildRoute = location.pathname.replace(/\/$/, "") !== "/restaurant";
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [customers, setCustomers] = useState<Record<string, CustomerInfo>>({});
  const [menu, setMenu] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuFull, setMenuFull] = useState<MenuItemFull[]>([]);
  const [busy, setBusy] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isRestaurantOwner) navigate({ to: "/" });
  }, [loading, roles, navigate]);

  const refresh = async () => {
    if (!user) return;
    let rid = restaurantId;
    if (!rid) {
      const { data: r } = await supabase
        .from("restaurants")
        .select("id,is_active")
        .eq("owner_id", user.id)
        .maybeSingle();
      rid = r?.id ?? null;
      setRestaurantId(rid);
      setIsActive(r?.is_active ?? false);
    }
    if (!rid) { setBusy(false); return; }

    const [{ data: o }, { data: m }, { data: cats }] = await Promise.all([
      supabase.from("orders").select("*").eq("restaurant_id", rid).neq("status", "delivered").order("created_at", { ascending: false }),
      supabase.from("menu_items").select("*").eq("restaurant_id", rid).order("category"),
      supabase.from("menu_categories").select("id,name,display_order").eq("restaurant_id", rid).eq("is_active", true).order("display_order"),
    ]);
    const ords = (o ?? []) as Order[];
    setOrders(ords);
    setMenu((m ?? []) as Item[]);
    setMenuFull((m ?? []) as MenuItemFull[]);
    setCategories((cats ?? []) as Category[]);
    if (ords.length) {
      const customerIds = Array.from(new Set(ords.map((x) => x.customer_id).filter(Boolean)));
      const [{ data: oi }, { data: ps }] = await Promise.all([
        supabase.from("order_items").select("*").in("order_id", ords.map((x) => x.id)),
        customerIds.length
          ? supabase.from("profiles").select("id,name,phone,store_id,customer_code").in("id", customerIds)
          : Promise.resolve({ data: [] as { id: string; name: string; phone: string | null; store_id: string | null; customer_code: string | null }[] }),
      ]);
      const grouped: Record<string, OrderItem[]> = {};
      ((oi ?? []) as OrderItem[]).forEach((it) => { (grouped[it.order_id] ??= []).push(it); });
      setOrderItems(grouped);
      const cm: Record<string, CustomerInfo> = {};
      ((ps ?? []) as { id: string; name: string; phone: string | null; store_id: string | null; customer_code: string | null }[]).forEach((p) => {
        cm[p.id] = { name: p.name, phone: p.phone, store_id: p.store_id, customer_code: p.customer_code };
      });
      setCustomers(cm);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (user && isRestaurantOwner) refresh();
    const interval = setInterval(() => { refresh(); }, 30000);
    return () => clearInterval(interval);
  }, [user, roles]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as never }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Actualizado"); refresh(); }
  };

  const toggleAvailable = async (id: string, current: boolean) => {
    if (!requireRestaurantOwner()) return;
    const { error } = await supabase.from("menu_items").update({ is_available: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setMenu((m) => m.map((x) => x.id === id ? { ...x, is_available: !current } : x));
      setMenuFull((m) => m.map((x) => x.id === id ? { ...x, is_available: !current } : x));
    }
  };

  const savePrice = async (id: string) => {
    if (!requireRestaurantOwner()) return;
    const newPrice = parseFloat(editingPrice[id]);
    if (isNaN(newPrice) || newPrice < 0) { toast.error("Precio inválido"); return; }
    const { error } = await supabase.from("menu_items").update({ price: newPrice }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Precio actualizado");
      setMenu((m) => m.map((x) => x.id === id ? { ...x, price: newPrice } : x));
      setEditingPrice((p) => { const n = { ...p }; delete n[id]; return n; });
    }
  };

  const [importOpen, setImportOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("onboarding_seen")) {
      setShowOnboarding(true);
    }
  }, []);
  const dismissOnboarding = () => {
    localStorage.setItem("onboarding_seen", "1");
    setShowOnboarding(false);
  };

  if (isChildRoute) {
    return <Outlet />;
  }

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <NotificationsBanner />
        {showOnboarding && (
          <div className="relative rounded-xl border border-gold/40 bg-gold/5 p-6">
            <button
              onClick={dismissOnboarding}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="font-heading text-lg font-semibold">
              ¡Bienvenido a Terraza Gourmet, Capital Burgers! 🎉
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu restaurante ya está activo. Sigue estos pasos para empezar a recibir pedidos:
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gold" />
                <span>1. Restaurante registrado</span>
              </li>
              <li className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>2. Configura tu menú</span>
                <Link to="/restaurant/inventory" className="ml-2 text-gold hover:underline">Ir a Inventario →</Link>
              </li>
              <li className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>3. Agrega tu primer Food Runner</span>
                <Link to="/restaurant/runners" className="ml-2 text-gold hover:underline">Ir a Food Runners →</Link>
              </li>
              <li className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>4. Activa tu vista de cocina</span>
                <Link to="/restaurant/kitchen" className="ml-2 text-gold hover:underline">Ir a Cocina →</Link>
              </li>
            </ul>
            <Button onClick={dismissOnboarding} className="mt-5 bg-gold text-primary-foreground hover:bg-gold/90">
              Entendido, empecemos
            </Button>
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-gold">Restaurante</div>
              <h1 className="font-heading text-3xl font-bold">Pedidos en curso</h1>
              <p className="mt-1 text-sm text-muted-foreground">Auto-refresco cada 30s</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/restaurant/dashboard"><BarChart3 className="h-3 w-3" /> Resumen</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/restaurant/inventory"><Boxes className="h-3 w-3" /> Inventario</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/restaurant/runners"><Bike className="h-3 w-3" /> Food runners</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/restaurant/employees"><UserPlus className="h-3 w-3" /> Empleados</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/restaurant/payments"><CreditCard className="h-3 w-3" /> Métodos de pago</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/restaurant/commission"><Percent className="h-3 w-3" /> Comisión Plataforma</Link>
              </Button>
              <Button asChild size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90">
                <Link to="/restaurant/kitchen"><ChefHat className="h-3 w-3" /> Vista cocina</Link>
              </Button>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">Sin pedidos activos</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {orders.map((o) => {
              const ageMin = (Date.now() - new Date(o.created_at).getTime()) / 60000;
              const urgent = ageMin > 15;
              return (
                <div key={o.id} className={`rounded-xl border bg-card p-5 ${urgent ? "border-destructive" : "border-border"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-mono font-bold">#{String(o.order_number).padStart(4, "0")}</div>
                    <div className={`text-xs ${urgent ? "text-destructive" : "text-muted-foreground"}`}>{Math.floor(ageMin)} min</div>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">Tienda: <span className="text-foreground">{o.delivery_store}</span> · Piso {o.delivery_floor}</div>
                  {customers[o.customer_id] && (
                    <div className="mt-2 rounded-md border border-border bg-background/50 p-2 text-xs">
                      <div className="font-semibold text-foreground">
                        👤 {customers[o.customer_id].name || "Cliente"}
                        {(customers[o.customer_id].store_id || customers[o.customer_id].customer_code) && (
                          <span className="ml-2 font-mono text-gold">
                            #{customers[o.customer_id].store_id || customers[o.customer_id].customer_code}
                          </span>
                        )}
                      </div>
                      {customers[o.customer_id].phone && (
                        <a
                          href={`tel:${customers[o.customer_id].phone}`}
                          className="mt-0.5 inline-block text-muted-foreground hover:text-gold"
                        >
                          📞 {customers[o.customer_id].phone}
                        </a>
                      )}
                    </div>
                  )}
                  <ul className="mt-3 space-y-1 text-sm">
                    {(orderItems[o.id] ?? []).map((it) => (
                      <li key={it.id}>{it.quantity}× {it.name}</li>
                    ))}
                  </ul>
                  {o.notes && <div className="mt-2 rounded-md border border-border bg-background p-2 text-xs text-muted-foreground">{o.notes}</div>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {o.status === "pending" && <Button size="sm" onClick={() => updateStatus(o.id, "confirmed")} className="bg-gold text-primary-foreground hover:bg-gold/90">Confirmar</Button>}
                    {o.status === "confirmed" && <Button size="sm" onClick={() => updateStatus(o.id, "preparing")} className="bg-gold text-primary-foreground hover:bg-gold/90">Preparando</Button>}
                    {o.status === "preparing" && <Button size="sm" onClick={() => updateStatus(o.id, "on_the_way")} className="bg-gold text-primary-foreground hover:bg-gold/90">Listo para envío</Button>}
                    {o.status === "on_the_way" && <Button size="sm" onClick={() => updateStatus(o.id, "delivered")} variant="outline">Marcar entregado</Button>}
                    <span className="ml-auto self-center text-xs uppercase tracking-wider text-muted-foreground">{o.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-heading text-xl font-bold">Menú</h2>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" disabled={!isRestaurantOwner} className="bg-gold text-primary-foreground hover:bg-gold/90">
                <Link to="/restaurant/menu"><Settings2 className="h-3 w-3" /> Gestionar menú</Link>
              </Button>
              <Button size="sm" variant="outline" disabled={!isRestaurantOwner} onClick={() => { if (requireRestaurantOwner()) setImportOpen(true); }}>
                <Upload className="h-3 w-3" /> Importar CSV
              </Button>
            </div>
          </div>
          {restaurantId && (
            <CsvImportDialog
              open={importOpen}
              onOpenChange={setImportOpen}
              restaurantId={restaurantId}
              onImported={refresh}
            />
          )}
          {menuFull.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Aún no tienes platillos en tu menú.{" "}
              <Link to="/restaurant/menu" className="text-gold hover:underline">Agregar el primero →</Link>
            </div>
          ) : (
            (() => {
              const groups = new Map<string, { name: string; items: MenuItemFull[] }>();
              categories.forEach((c) => groups.set(c.id, { name: c.name, items: [] }));
              const uncategorized: MenuItemFull[] = [];
              menuFull.forEach((it) => {
                if (it.category_id && groups.has(it.category_id)) groups.get(it.category_id)!.items.push(it);
                else {
                  const key = `text:${it.category || "Otros"}`;
                  if (!groups.has(key)) groups.set(key, { name: it.category || "Otros", items: [] });
                  groups.get(key)!.items.push(it);
                }
              });
              return (
                <div className="space-y-6">
                  {Array.from(groups.entries()).filter(([, g]) => g.items.length > 0).map(([key, g]) => (
                    <div key={key}>
                      <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-gold">{g.name}</h3>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {g.items.map((m) => (
                          <div key={m.id} className="flex gap-3 rounded-lg border border-border bg-background p-3">
                            {m.image_url ? (
                              <img src={m.image_url} alt={m.name} className="h-16 w-16 shrink-0 rounded-md object-cover" />
                            ) : (
                              <div className="h-16 w-16 shrink-0 rounded-md bg-muted" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{m.name}</div>
                              {editingPrice[m.id] !== undefined ? (
                                <div className="mt-1 flex items-center gap-1">
                                  <Input type="number" step="0.01" className="h-7 w-20" value={editingPrice[m.id]} onChange={(e) => setEditingPrice((p) => ({ ...p, [m.id]: e.target.value }))} />
                                  <Button size="sm" className="h-7 px-2" onClick={() => savePrice(m.id)}>OK</Button>
                                </div>
                              ) : (
                                <button onClick={() => setEditingPrice((p) => ({ ...p, [m.id]: String(m.price) }))} className="text-sm font-semibold text-gold hover:underline">${Number(m.price).toFixed(2)}</button>
                              )}
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <Switch checked={m.is_available} onCheckedChange={() => toggleAvailable(m.id, m.is_available)} />
                                {m.is_available ? "Disponible" : "Agotado"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </section>
      </div>
    </div>
  );
}
