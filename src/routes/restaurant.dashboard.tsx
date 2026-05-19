import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Save, Receipt, Trophy } from "lucide-react";
import { toast } from "sonner";
import { NotificationsBanner } from "@/components/NotificationsBanner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useBcvRate, formatBsLabel } from "@/lib/bcv";

export const Route = createFileRoute("/restaurant/dashboard")({ component: Dashboard });

interface OrderRow { id: string; total: number; status: string; created_at: string; bcv_rate_snapshot: number | null; total_bs: number | null }
interface ItemRow { order_id: string; name: string; quantity: number; subtotal: number }
interface RestaurantInfo {
  id: string; name: string; description: string | null; phone: string | null;
  address: string | null; hours: string | null; logo_url: string | null;
}

type Period = "today" | "week" | "month";
const PAGE_SIZE = 10;

function Dashboard() {
  const { user, loading, isRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const { rate: currentBcv } = useBcvRate();
  const [resto, setResto] = useState<RestaurantInfo | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState<Period>("today");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!loading && !isRestaurantOwner) navigate({ to: "/" });
  }, [loading, isRestaurantOwner, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: r } = await supabase.from("restaurants").select("id,name,description,phone,address,hours,logo_url").eq("owner_id", user.id).maybeSingle();
      if (!r) { setBusy(false); return; }
      setResto(r as RestaurantInfo);
      const { data: o } = await supabase.from("orders").select("id,total,status,created_at,bcv_rate_snapshot,total_bs").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(500);
      setOrders((o ?? []) as OrderRow[]);
      if (o && o.length) {
        const { data: it } = await supabase.from("order_items").select("order_id,name,quantity,subtotal").in("order_id", o.map((x) => x.id));
        setItems((it ?? []) as ItemRow[]);
      }
      setBusy(false);
    })();
  }, [user]);

  const periodMs = period === "today" ? 86400000 : period === "week" ? 7 * 86400000 : 30 * 86400000;
  const periodOrders = useMemo(() => {
    const cutoff = Date.now() - periodMs;
    return orders.filter((o) => new Date(o.created_at).getTime() >= cutoff);
  }, [orders, periodMs]);

  const kpis = useMemo(() => {
    const sum = periodOrders.reduce((a, b) => a + Number(b.total), 0);
    const count = periodOrders.length;
    const ticket = count ? sum / count : 0;
    const ids = new Set(periodOrders.map((o) => o.id));
    const periodItems = items.filter((i) => ids.has(i.order_id));
    const map = new Map<string, number>();
    for (const it of periodItems) map.set(it.name, (map.get(it.name) ?? 0) + Number(it.quantity));
    let topName = "—"; let topQty = 0;
    for (const [n, q] of map) if (q > topQty) { topName = n; topQty = q; }
    return { sum, count, ticket, topName, topQty };
  }, [periodOrders, items]);

  const chartData = useMemo(() => {
    const buckets = period === "today" ? 24 : period === "week" ? 7 : 30;
    const unit = period === "today" ? 3600000 : 86400000;
    const now = Date.now();
    const arr = Array.from({ length: buckets }, (_, i) => {
      const start = now - (buckets - 1 - i) * unit;
      return { key: start, label: period === "today" ? format(new Date(start), "HH'h'") : format(new Date(start), "dd MMM", { locale: es }), ventas: 0 };
    });
    for (const o of periodOrders) {
      const t = new Date(o.created_at).getTime();
      const idx = buckets - 1 - Math.floor((now - t) / unit);
      if (idx >= 0 && idx < buckets) arr[idx].ventas += Number(o.total);
    }
    return arr;
  }, [periodOrders, period]);

  useEffect(() => { setPage(1); }, [period]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    const ids = new Set(periodOrders.map((o) => o.id));
    for (const it of items.filter((i) => ids.has(i.order_id))) {
      const cur = map.get(it.name) ?? { name: it.name, qty: 0, revenue: 0 };
      cur.qty += Number(it.quantity);
      cur.revenue += Number(it.subtotal);
      map.set(it.name, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [items, periodOrders]);

  const totalPages = Math.max(1, Math.ceil(periodOrders.length / PAGE_SIZE));
  const pageOrders = periodOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const saveInfo = async () => {
    if (!resto) return;
    setSaving(true);
    const { error } = await supabase.from("restaurants").update({
      name: resto.name, description: resto.description ?? "", phone: resto.phone ?? "",
      address: resto.address ?? "", hours: resto.hours ?? "", logo_url: resto.logo_url ?? "",
    }).eq("id", resto.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Información guardada");
  };

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;
  if (!resto) return <div className="min-h-screen bg-background"><Header /><div className="mx-auto max-w-3xl px-4 py-12 text-center text-muted-foreground">Aún no tienes un negocio activo.</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <NotificationsBanner />
        <div className="flex items-center justify-between">
          <div>
            <Button asChild variant="ghost" size="sm"><Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Volver</Link></Button>
            <h1 className="mt-2 font-heading text-3xl font-bold">{resto.name}</h1>
            <p className="text-sm text-muted-foreground">Resumen ejecutivo del negocio</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold">Resumen</h2>
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {(["today","week","month"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${period === p ? "bg-gold text-black" : "text-muted-foreground hover:text-foreground"}`}>
                {p === "today" ? "Hoy" : p === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<DollarSign className="h-4 w-4" />} label="Ventas" value={`$${kpis.sum.toFixed(2)} USD`} sub={formatBsLabel(kpis.sum, currentBcv)} />
          <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Pedidos" value={`${kpis.count}`} sub="completados" />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Ticket promedio" value={`$${kpis.ticket.toFixed(2)}`} sub="por pedido" />
          <StatCard icon={<Trophy className="h-4 w-4" />} label="Top producto" value={kpis.topName} sub={kpis.topQty ? `${kpis.topQty} vendidos` : "—"} />
        </div>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-lg font-bold">Ventas por {period === "today" ? "hora" : "día"}</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Ventas"]} />
                <Bar dataKey="ventas" fill="#D4A843" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-lg font-bold">Productos más vendidos</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay ventas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="py-2">Producto</th><th className="py-2 text-right">Cantidad</th><th className="py-2 text-right">Ingresos</th></tr></thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.name} className="border-b border-border/50">
                      <td className="py-2">{p.name}</td>
                      <td className="py-2 text-right font-medium">{p.qty}</td>
                      <td className="py-2 text-right">${p.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold flex items-center gap-2"><Receipt className="h-4 w-4" /> Historial de transacciones</h2>
            <span className="text-xs text-muted-foreground">{periodOrders.length} total</span>
          </div>
          {pageOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin transacciones en este periodo.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="py-2">Fecha</th><th className="py-2">Estado</th><th className="py-2 text-right">USD</th><th className="py-2 text-right">Bs.</th><th className="py-2 text-right">Tasa BCV</th></tr></thead>
                  <tbody>
                    {pageOrders.map((o) => (
                      <tr key={o.id} className="border-b border-border/50">
                        <td className="py-2">{format(new Date(o.created_at), "dd MMM yyyy HH:mm", { locale: es })}</td>
                        <td className="py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{o.status}</span></td>
                        <td className="py-2 text-right font-medium">${Number(o.total).toFixed(2)}</td>
                        <td className="py-2 text-right">{formatBsLabel(Number(o.total), Number(o.bcv_rate_snapshot ?? currentBcv))}</td>
                        <td className="py-2 text-right text-muted-foreground">{o.bcv_rate_snapshot ? Number(o.bcv_rate_snapshot).toFixed(2) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                  <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-lg font-bold">Información del negocio</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Nombre</Label><Input value={resto.name} onChange={(e) => setResto({ ...resto, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Teléfono</Label><Input value={resto.phone ?? ""} onChange={(e) => setResto({ ...resto, phone: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Descripción</Label><Textarea rows={2} value={resto.description ?? ""} onChange={(e) => setResto({ ...resto, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Dirección</Label><Input value={resto.address ?? ""} onChange={(e) => setResto({ ...resto, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Horarios</Label><Input value={resto.hours ?? ""} onChange={(e) => setResto({ ...resto, hours: e.target.value })} placeholder="Lun–Sáb 11:00–17:00" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>URL del logo</Label><Input value={resto.logo_url ?? ""} onChange={(e) => setResto({ ...resto, logo_url: e.target.value })} /></div>
          </div>
          <Button className="mt-4" onClick={saveInfo} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar</Button>
        </section>

      </div>
    </div>
  );
}

function periodLabel(p: Period) {
  return p === "today" ? "hoy" : p === "week" ? "últimos 7 días" : "últimos 30 días";
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-heading text-2xl font-bold truncate" title={value}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}