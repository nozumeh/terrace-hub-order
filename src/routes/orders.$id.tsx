import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, Clock, ChefHat, Bike, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { buildWhatsAppOrderMessage, openWhatsAppOrder, PAYMENT_LABELS, type PaymentMethod, type DeliveryType } from "@/lib/whatsapp-order";
import { formatBsLabel, DEFAULT_BCV_RATE } from "@/lib/bcv";

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
  total_before_discount: number;
  discount_applied: number;
  payment_method: PaymentMethod | null;
  delivery_type: DeliveryType | null;
  created_at: string;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  bcv_rate_snapshot: number | null;
  total_bs: number | null;
}
interface ItemCustomizations {
  base_price?: number;
  variant?: string | null;
  extras?: { id: string; name: string; price: number }[];
  removed?: { id: string; name: string }[];
  notes?: string;
}
interface Item { id: string; name: string; quantity: number; subtotal: number; customizations?: ItemCustomizations | null }

function OrderStatus() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [restaurantName, setRestaurantName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("+584120690379");
  const [loading, setLoading] = useState(true);
  const [avgFloorSeconds, setAvgFloorSeconds] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const load = async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (!o) { setLoading(false); return; }
      const [{ data: it }, { data: r }] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("restaurants").select("name,whatsapp_number").eq("id", o.restaurant_id).maybeSingle(),
      ]);
      setOrder(o as Order);
      setItems((it ?? []) as Item[]);
      setRestaurantName(r?.name ?? "");
      if (r?.whatsapp_number) setWhatsappNumber(r.whatsapp_number);
      setLoading(false);

      // Promedio agregado (RLS-bypass vía RPC SECURITY DEFINER, devuelve solo un número)
      const { data: avg } = await supabase.rpc("avg_delivery_seconds_for_floor", {
        _restaurant_id: o.restaurant_id,
        _floor: o.delivery_floor,
      });
      if (typeof avg === "number") setAvgFloorSeconds(avg);
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

  // Tick every 15s only while in transit
  useEffect(() => {
    if (order?.status !== "on_the_way") return;
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [order?.status]);

  if (loading) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;
  if (!order) return <div className="min-h-screen bg-background"><Header /><div className="px-4 py-20 text-center text-muted-foreground">Pedido no encontrado</div></div>;

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);

  const sendWhatsApp = () => {
    if (!order) return;
    const msg = buildWhatsAppOrderMessage({
      orderNumber: order.order_number,
      createdAt: new Date(order.created_at),
      items: items.map((i) => ({
        quantity: i.quantity,
        name: i.name,
        unitPrice: i.customizations?.base_price ?? Number(i.subtotal) / Math.max(1, i.quantity),
        extras: i.customizations?.extras?.map((e) => ({ name: e.name, price: e.price })) ?? [],
        removed: i.customizations?.removed?.map((r) => r.name) ?? [],
      })),
      deliveryType: (order.delivery_type ?? "to_store") as DeliveryType,
      deliveryStore: order.delivery_store,
      deliveryFloor: order.delivery_floor,
      paymentMethod: (order.payment_method ?? "whatsapp") as PaymentMethod,
      subtotal: Number(order.total_before_discount),
      discount: Number(order.discount_applied),
      total: Number(order.total_final),
      notes: order.notes,
      bcvRate: Number(order.bcv_rate_snapshot ?? 0) || undefined,
      bcvDate: order.created_at.slice(0, 10),
    });
    openWhatsAppOrder(whatsappNumber, msg);
  };

  // ETA: defaults to 8 min when no historical data
  const DEFAULT_ETA_SEC = 8 * 60;
  const etaSec = avgFloorSeconds ?? DEFAULT_ETA_SEC;
  const startedAtMs = order.out_for_delivery_at ? new Date(order.out_for_delivery_at).getTime() : null;
  const remainingSec = startedAtMs !== null ? Math.round((startedAtMs + etaSec * 1000 - now) / 1000) : null;
  const etaLabel = (() => {
    if (order.status === "delivered") return "Entregado";
    if (order.status !== "on_the_way" || remainingSec === null) {
      const m = Math.round(etaSec / 60);
      return `${m}-${m + 5} minutos`;
    }
    if (remainingSec > 60) return `Llega en ~${Math.ceil(remainingSec / 60)} min`;
    if (remainingSec > 0) return `Llega en menos de 1 min`;
    return `Llegará pronto · +${Math.abs(Math.floor(remainingSec / 60))} min`;
  })();
  const etaTone = order.status === "on_the_way" && remainingSec !== null && remainingSec < 0
    ? "text-destructive"
    : "text-foreground";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Pedido</div>
        <h1 className="mt-1 font-heading text-3xl font-bold">#{String(order.order_number).padStart(4, "0")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {restaurantName} · Tiempo estimado: <span className={etaTone}>{etaLabel}</span>
          {avgFloorSeconds !== null && (
            <span className="ml-1 text-xs text-muted-foreground/70">(promedio piso {order.delivery_floor})</span>
          )}
        </p>

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
          {order.delivery_type === "pickup" ? (
            <div className="mt-1 text-sm">🏪 Recoger en <span className="font-medium">{restaurantName}</span></div>
          ) : (
            <div className="mt-1 text-sm">📍 Tienda: <span className="font-medium">{order.delivery_store}</span> · Piso <span className="font-medium">{order.delivery_floor}</span></div>
          )}
          {order.notes && <div className="mt-2 text-xs text-muted-foreground">Notas: {order.notes}</div>}
        </div>

        {order.payment_method && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Método de pago</div>
            <div className="mt-1 text-sm font-medium">{PAYMENT_LABELS[order.payment_method]}</div>
            {order.payment_method !== "en_caja" && (
              <Button onClick={sendWhatsApp} className="mt-3 w-full bg-gold text-primary-foreground hover:bg-gold/90">
                Enviar por WhatsApp 📱
              </Button>
            )}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Items</div>
          <ul className="mt-3 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.id} className="space-y-0.5">
                <div className="flex justify-between">
                  <span>{i.quantity}× {i.name}</span>
                  <span>${Number(i.subtotal).toFixed(2)}</span>
                </div>
                {(i.customizations?.variant || (i.customizations?.extras?.length ?? 0) > 0 || (i.customizations?.removed?.length ?? 0) > 0 || i.customizations?.notes) && (
                  <ul className="ml-4 text-xs text-muted-foreground">
                    {i.customizations?.variant && <li>· {i.customizations.variant}</li>}
                    {i.customizations?.extras?.map((e) => (
                      <li key={`e-${e.id}`} className="text-gold/80">+ {e.name} (${Number(e.price).toFixed(2)})</li>
                    ))}
                    {i.customizations?.removed?.map((r) => (
                      <li key={`r-${r.id}`}>− sin {r.name}</li>
                    ))}
                    {i.customizations?.notes && (
                      <li className="mt-1 italic text-gold/80">📝 {i.customizations.notes}</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${Number(order.total_before_discount).toFixed(2)}</span></div>
            {Number(order.discount_applied) > 0 && (
              <div className="flex justify-between text-success"><span>Descuento</span><span>-${Number(order.discount_applied).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
              <span>Total</span><span className="text-gold">${Number(order.total_final).toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between text-base font-medium">
              <span className="text-muted-foreground">Total Bs.</span>
              <span>{formatBsLabel(Number(order.total_final), Number(order.bcv_rate_snapshot ?? DEFAULT_BCV_RATE))}</span>
            </div>
            {order.bcv_rate_snapshot && (
              <div className="pt-1 text-[11px] text-muted-foreground">
                💱 Tasa BCV: Bs. {Number(order.bcv_rate_snapshot).toFixed(2)} por $1 · 📅 {order.created_at.slice(0, 10)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
