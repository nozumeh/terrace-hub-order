import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Plus, Minus, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/kitchen")({ component: KitchenView });

interface Order {
  id: string; order_number: number; status: string; created_at: string;
  delivery_store: string; delivery_floor: string; notes: string;
  user_id: string;
}
interface Customizations {
  variant?: string | null;
  extras?: { id: string; name: string; price: number }[];
  removed?: { id: string; name: string }[];
  notes?: string;
}
interface OrderItem {
  id: string; order_id: string; name: string; quantity: number;
  customizations?: Customizations | null;
}

const NEXT: Record<string, { label: string; status: string } | null> = {
  pending: { label: "▶ Empezar preparación", status: "preparing" },
  confirmed: { label: "▶ Empezar preparación", status: "preparing" },
  preparing: { label: "✓ Marcar como listo", status: "on_the_way" },
  on_the_way: { label: "🚀 Entregado", status: "delivered" },
};

function KitchenView() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !roles.includes("restaurant_owner")) navigate({ to: "/" });
  }, [loading, roles, navigate]);

  // Live clock + age refresh every second
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = async (rid?: string | null) => {
    if (!user) return;
    let id = rid ?? restaurantId;
    if (!id) {
      const { data: r } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
      id = r?.id ?? null;
      setRestaurantId(id);
    }
    if (!id) { setBusy(false); return; }
    const { data: o } = await supabase
      .from("orders").select("*")
      .eq("restaurant_id", id)
      .in("status", ["pending", "confirmed", "preparing", "on_the_way"])
      .order("created_at", { ascending: true });
    const ords = (o ?? []) as Order[];
    setOrders(ords);
    if (ords.length) {
      const [{ data: oi }, { data: ps }] = await Promise.all([
        supabase.from("order_items").select("*").in("order_id", ords.map((x) => x.id)),
        supabase.from("profiles").select("id,name").in("id", Array.from(new Set(ords.map((x) => x.user_id)))),
      ]);
      const grouped: Record<string, OrderItem[]> = {};
      ((oi ?? []) as OrderItem[]).forEach((it) => { (grouped[it.order_id] ??= []).push(it); });
      setItems(grouped);
      const pm: Record<string, string> = {};
      ((ps ?? []) as { id: string; name: string }[]).forEach((p) => { pm[p.id] = p.name; });
      setProfiles(pm);
    } else {
      setItems({});
    }
    setBusy(false);
    setLastUpdated(Date.now());
  };

  useEffect(() => {
    if (!user || !roles.includes("restaurant_owner")) return;
    refresh();
    const ch = supabase.channel("kitchen-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => refresh())
      .subscribe();
    const i = setInterval(() => refresh(), 15000);
    return () => { supabase.removeChannel(ch); clearInterval(i); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roles]);

  const advance = async (id: string, status: string) => {
    if (status === "delivered") {
      setCompleting(id);
      setTimeout(async () => {
        const { error } = await supabase.from("orders").update({ status }).eq("id", id);
        setCompleting(null);
        if (error) toast.error("❌ Error al guardar");
        else { toast.success("✓ Pedido entregado"); refresh(); }
      }, 600);
      return;
    }
    const patch: Record<string, unknown> = { status };
    if (status === "on_the_way") patch.out_for_delivery_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(patch as never).eq("id", id);
    if (error) toast.error("❌ Error al guardar");
    else { toast.success("✓ Guardado"); refresh(); }
  };

  const counts = useMemo(() => {
    let active = 0, wait = 0;
    orders.forEach((o) => {
      const age = (now - new Date(o.created_at).getTime()) / 60000;
      if (o.status === "preparing" || o.status === "on_the_way") active++;
      else if (age > 15) wait++;
      else active++;
    });
    return { active, wait };
  }, [orders, now]);

  if (busy) return (
    <div className="min-h-screen bg-black text-white"><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>
  );

  const clock = new Date(now).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="ghost" className="text-zinc-300 hover:bg-zinc-900 hover:text-white">
              <Link to="/restaurant"><ArrowLeft className="h-4 w-4" /> Salir</Link>
            </Button>
            <div className="font-heading text-sm font-bold tracking-wider sm:text-base">🍔 COCINA</div>
          </div>
          <div className="font-mono text-lg font-bold sm:text-2xl">{clock}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 font-bold text-red-400">🔴 {counts.active} ACTIVOS</span>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-1 font-bold text-yellow-400">🟡 {counts.wait} ESPERA</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {orders.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-24 w-24 text-emerald-500" />
            <div className="mt-6 font-heading text-4xl font-bold text-emerald-400">✓ Todo al día</div>
            <div className="mt-2 text-zinc-500">Sin pedidos pendientes</div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((o) => {
              const ageMs = now - new Date(o.created_at).getTime();
              const ageMin = Math.floor(ageMs / 60000);
              const critical = ageMin > 30 && o.status !== "delivered";
              const urgent = ageMin > 15 && ageMin <= 30 && o.status !== "delivered";
              const next = NEXT[o.status];
              const isCompleting = completing === o.id;
              return (
                <div
                  key={o.id}
                  className={`rounded-xl border-2 bg-zinc-900 p-4 transition-all ${
                    isCompleting ? "border-emerald-500 bg-emerald-950/40 scale-95 opacity-70" :
                    critical ? "border-[#F85149] bg-red-950/30 animate-pulse" :
                    urgent ? "border-[#E8872A]" : "border-zinc-800"
                  }`}
                >
                  <div className={`-mx-4 -mt-4 mb-3 rounded-t-xl px-4 py-2 ${
                    critical ? "bg-red-950" : urgent ? "bg-orange-950" : "bg-zinc-950"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-lg font-bold">#{String(o.order_number).padStart(4, "0")}</div>
                      <div className="text-xs text-zinc-400">{new Date(o.created_at).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    {critical && <div className="mt-1 text-xs font-bold text-[#F85149]">🚨 HACE {ageMin} MIN — CRÍTICO</div>}
                    {urgent && <div className="mt-1 text-xs font-bold text-[#E8872A]">⚠️ HACE {ageMin} MIN — URGENTE</div>}
                  </div>

                  <ul className="space-y-3">
                    {(items[o.id] ?? []).map((it) => {
                      const c = it.customizations ?? {};
                      return (
                        <li key={it.id} className="rounded-md bg-zinc-950 p-3">
                          <div className="flex items-baseline gap-2">
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-gold px-1.5 text-xs font-bold text-black">{it.quantity}×</span>
                            <span className="font-semibold">{it.name}</span>
                          </div>
                          {c.variant && <div className="ml-8 mt-1 text-xs text-zinc-400">Variante: {c.variant}</div>}
                          {c.extras?.map((e) => (
                            <div key={e.id} className="ml-8 mt-1 flex items-center gap-1 text-xs text-gold">
                              <Plus className="h-3 w-3" /> {e.name}
                            </div>
                          ))}
                          {c.removed?.map((r) => (
                            <div key={r.id} className="ml-8 mt-1 flex items-center gap-1 text-xs text-red-400">
                              <Minus className="h-3 w-3" /> SIN {r.name.toLowerCase()}
                            </div>
                          ))}
                          {c.notes && (
                            <div className="ml-8 mt-2 rounded border border-gold/40 bg-gold/10 p-2 text-xs">
                              <div className="font-bold uppercase text-gold">Nota cocina</div>
                              <div className="mt-1 whitespace-pre-wrap">{c.notes}</div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
                    📍 {o.delivery_store} — PISO {o.delivery_floor}
                  </div>
                  {profiles[o.user_id] && <div className="mt-1 text-xs text-zinc-400">👤 {profiles[o.user_id]}</div>}
                  {o.notes && (
                    <div className="mt-2 rounded border border-gold/40 bg-gold/10 p-2 text-xs">
                      <div className="font-bold uppercase text-gold">Notas</div>
                      <div className="mt-1">{o.notes}</div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-xs text-zinc-500">⏱ hace {ageMin} min</div>
                    {next && (
                      <Button
                        size="sm"
                        className={`${next.status === "delivered" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-gold hover:bg-gold/90"} font-bold text-black`}
                        onClick={() => advance(o.id, next.status)}
                        disabled={isCompleting}
                      >
                        {next.label}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-4 py-4 text-xs text-zinc-500">
        <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
          <span>Auto-actualización cada 15s · Última: {new Date(lastUpdated).toLocaleTimeString("es-VE")}</span>
          <Button size="sm" variant="outline" onClick={() => refresh()} className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
            <RefreshCw className="h-3 w-3" /> Actualizar ahora
          </Button>
        </div>
      </footer>
    </div>
  );
}
