import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, Clock, ChefHat, Bike, PackageCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id")({ component: OrderStatus });

const STEPS = [
  { key: "pending", label: "Recibido", icon: Clock },
  { key: "confirmed", label: "Confirmado", icon: Check },
  { key: "preparing", label: "Preparando", icon: ChefHat },
  { key: "on_the_way", label: "En camino", icon: Bike },
  { key: "delivered", label: "Entregado", icon: PackageCheck },
] as const;

interface Order {
  id: string; order_number: number; status: string; total_final: number;
  delivery_store: string; delivery_floor: string; restaurant_id: string;
  notes: string;
}
interface Item { id: string; name: string; quantity: number; subtotal: number }

function OrderStatus() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [restaurantName, setRestaurantName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (!o) { setLoading(false); return; }
      const [{ data: it }, { data: r }] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("restaurants").select("name").eq("id", o.restaurant_id).maybeSingle(),
      ]);
      setOrder(o as Order);
      setItems((it ?? []) as Item[]);
      setRestaurantName(r?.name ?? "");
      setLoading(false);
    };
    load();

    const ch = supabase.channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as Order;
          setOrder((prev) => prev ? { ...prev, ...next } : prev);
          toast.info(`Estado: ${STEPS.find((s) => s.key === next.status)?.label ?? next.status}`);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (loading) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;
  if (!order) return <div className="min-h-screen bg-background"><Header /><div className="px-4 py-20 text-center text-muted-foreground">Pedido no encontrado</div></div>;

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Pedido</div>
        <h1 className="mt-1 font-heading text-3xl font-bold">#{String(order.order_number).padStart(4, "0")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{restaurantName} · Tiempo estimado: <span className="text-foreground">15-20 minutos</span></p>

        {/* Stepper */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const active = i <= currentIdx;
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex flex-col items-center">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${active ? "border-gold bg-gold/15 text-gold" : "border-border bg-background text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className={`mt-2 text-[10px] font-medium uppercase tracking-wider ${active ? "text-gold" : "text-muted-foreground"}`}>{s.label}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-background">
            <div className="h-full bg-gold transition-all" style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }} />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Entrega</div>
          <div className="mt-1 text-sm">Tienda: <span className="font-medium">{order.delivery_store}</span> · Piso <span className="font-medium">{order.delivery_floor}</span></div>
          {order.notes && <div className="mt-2 text-xs text-muted-foreground">Notas: {order.notes}</div>}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Items</div>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between">
                <span>{i.quantity}× {i.name}</span>
                <span>${Number(i.subtotal).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-border pt-3 text-lg font-semibold">
            <span>Total</span><span className="text-gold">${Number(order.total_final).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
