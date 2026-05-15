import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Save } from "lucide-react";
import { toast } from "sonner";
import { NotificationsBanner } from "@/components/NotificationsBanner";

export const Route = createFileRoute("/restaurant/dashboard")({ component: Dashboard });

interface OrderRow { id: string; total_final: number; status: string; created_at: string }
interface ItemRow { order_id: string; name: string; quantity: number; subtotal: number }
interface RestaurantInfo { id: string; name: string; description: string | null; phone: string | null; address: string | null; hours: string | null; logo_url: string | null }

function Dashboard() {
  const { user, loading, isRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const [resto, setResto] = useState<RestaurantInfo | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isRestaurantOwner) navigate({ to: "/" });
  }, [loading, isRestaurantOwner, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: r } = await supabase.from("restaurants").select("id,name,description,phone,address,hours,logo_url").eq("owner_id", user.id).maybeSingle();
      if (!r) { setBusy(false); return; }
      setResto(r as RestaurantInfo);
      const { data: o } = await supabase.from("orders").select("id,total_final,status,created_at").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(500);
      setOrders((o ?? []) as OrderRow[]);
      if (o && o.length) {
        const { data: it } = await supabase.from("order_items").select("order_id,name,quantity,subtotal").in("order_id", o.map((x) => x.id));
        setItems((it ?? []) as ItemRow[]);
      }
      setBusy(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const today = orders.filter((o) => now - new Date(o.created_at).getTime() < day);
    const week = orders.filter((o) => now - new Date(o.created_at).getTime() < 7 * day);
    const month = orders.filter((o) => now - new Date(o.created_at).getTime() < 30 * day);
    const sum = (xs: OrderRow[]) => xs.reduce((a, b) => a + Number(b.total_final), 0);
    return {
      todayCount: today.length, todaySum: sum(today),
      weekCount: week.length, weekSum: sum(week),
      monthCount: month.length, monthSum: sum(month),
      total: sum(orders),
    };
  }, [orders]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of items) {
      const cur = map.get(it.name) ?? { name: it.name, qty: 0, revenue: 0 };
      cur.qty += Number(it.quantity);
      cur.revenue += Number(it.subtotal);
      map.set(it.name, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [items]);

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

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard icon={<DollarSign className="h-4 w-4" />} label="Ventas hoy" value={`$${stats.todaySum.toFixed(2)}`} sub={`${stats.todayCount} pedidos`} />
          <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Últimos 7 días" value={`$${stats.weekSum.toFixed(2)}`} sub={`${stats.weekCount} pedidos`} />
          <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Últimos 30 días" value={`$${stats.monthSum.toFixed(2)}`} sub={`${stats.monthCount} pedidos`} />
        </div>

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

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-heading text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}