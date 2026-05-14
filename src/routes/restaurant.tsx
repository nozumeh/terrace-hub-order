import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { CsvImportDialog } from "@/components/CsvImportDialog";

export const Route = createFileRoute("/restaurant")({ component: RestaurantPanel });

interface Order {
  id: string; order_number: number; status: string; created_at: string;
  delivery_store: string; delivery_floor: string; notes: string;
  user_id: string;
}
interface OrderItem { id: string; order_id: string; name: string; quantity: number }
interface Item { id: string; name: string; price: number; is_available: boolean; category: string }

function RestaurantPanel() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [menu, setMenu] = useState<Item[]>([]);
  const [busy, setBusy] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !roles.includes("restaurant_owner") && !roles.includes("admin")) navigate({ to: "/" });
  }, [loading, roles, navigate]);

  const refresh = async () => {
    if (!user) return;
    let rid = restaurantId;
    if (!rid) {
      const { data: r } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
      // admin fallback: pick first restaurant
      if (!r && roles.includes("admin")) {
        const { data: anyR } = await supabase.from("restaurants").select("id").limit(1).maybeSingle();
        rid = anyR?.id ?? null;
      } else rid = r?.id ?? null;
      setRestaurantId(rid);
    }
    if (!rid) { setBusy(false); return; }

    const [{ data: o }, { data: m }] = await Promise.all([
      supabase.from("orders").select("*").eq("restaurant_id", rid).neq("status", "delivered").order("created_at", { ascending: false }),
      supabase.from("menu_items").select("*").eq("restaurant_id", rid).order("category"),
    ]);
    const ords = (o ?? []) as Order[];
    setOrders(ords);
    setMenu((m ?? []) as Item[]);
    if (ords.length) {
      const { data: oi } = await supabase.from("order_items").select("*").in("order_id", ords.map((x) => x.id));
      const grouped: Record<string, OrderItem[]> = {};
      ((oi ?? []) as OrderItem[]).forEach((it) => { (grouped[it.order_id] ??= []).push(it); });
      setOrderItems(grouped);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (user && (roles.includes("restaurant_owner") || roles.includes("admin"))) refresh();
    const interval = setInterval(() => { refresh(); }, 30000);
    return () => clearInterval(interval);
  }, [user, roles]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as never }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Actualizado"); refresh(); }
  };

  const toggleAvailable = async (id: string, current: boolean) => {
    const { error } = await supabase.from("menu_items").update({ is_available: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else { setMenu((m) => m.map((x) => x.id === id ? { ...x, is_available: !current } : x)); }
  };

  const savePrice = async (id: string) => {
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

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-gold">Restaurante</div>
          <h1 className="font-heading text-3xl font-bold">Pedidos en curso</h1>
          <p className="mt-1 text-sm text-muted-foreground">Auto-refresco cada 30s</p>
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
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-3 w-3" /> Importar CSV
            </Button>
          </div>
          {restaurantId && (
            <CsvImportDialog
              open={importOpen}
              onOpenChange={setImportOpen}
              restaurantId={restaurantId}
              onImported={refresh}
            />
          )}
          <ul className="divide-y divide-border">
            {menu.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.category}</div>
                </div>
                {editingPrice[m.id] !== undefined ? (
                  <div className="flex items-center gap-2">
                    <Input type="number" step="0.01" className="h-8 w-24" value={editingPrice[m.id]} onChange={(e) => setEditingPrice((p) => ({ ...p, [m.id]: e.target.value }))} />
                    <Button size="sm" onClick={() => savePrice(m.id)}>OK</Button>
                  </div>
                ) : (
                  <button onClick={() => setEditingPrice((p) => ({ ...p, [m.id]: String(m.price) }))} className="text-sm font-semibold text-gold hover:underline">${Number(m.price).toFixed(2)}</button>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Disponible <Switch checked={m.is_available} onCheckedChange={() => toggleAvailable(m.id, m.is_available)} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
