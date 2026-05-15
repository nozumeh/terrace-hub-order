import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Plus, Trash2, Bike } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/runners")({ component: RunnersPage });

interface Runner { id: string; name: string; phone: string; is_active: boolean }
interface Order { id: string; order_number: number; status: string; runner_id: string | null; delivery_store: string; delivery_floor: string }

function RunnersPage() {
  const { user, loading, isRestaurantOwner, requireRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => { if (!loading && !isRestaurantOwner) navigate({ to: "/" }); }, [loading, isRestaurantOwner, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
    if (!r) { setBusy(false); return; }
    setRestaurantId(r.id);
    const [{ data: rn }, { data: o }] = await Promise.all([
      supabase.from("food_runners").select("*").eq("restaurant_id", r.id).order("created_at", { ascending: false }),
      supabase.from("orders").select("id,order_number,status,runner_id,delivery_store,delivery_floor").eq("restaurant_id", r.id).in("status", ["preparing", "on_the_way"]).order("created_at"),
    ]);
    setRunners((rn ?? []) as Runner[]);
    setOrders((o ?? []) as Order[]);
    setBusy(false);
  };

  useEffect(() => { if (user && isRestaurantOwner) load(); }, [user, isRestaurantOwner]);

  const addRunner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireRestaurantOwner() || !restaurantId) return;
    if (!name.trim()) { toast.error("Nombre requerido"); return; }
    const { error } = await supabase.from("food_runners").insert({ restaurant_id: restaurantId, name: name.trim(), phone: phone.trim() });
    if (error) toast.error(error.message);
    else { setName(""); setPhone(""); toast.success("Runner agregado"); load(); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    if (!requireRestaurantOwner()) return;
    const { error } = await supabase.from("food_runners").update({ is_active: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else setRunners((xs) => xs.map((x) => x.id === id ? { ...x, is_active: !current } : x));
  };

  const removeRunner = async (id: string) => {
    if (!requireRestaurantOwner()) return;
    if (!confirm("¿Eliminar este runner?")) return;
    const { error } = await supabase.from("food_runners").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminado"); load(); }
  };

  const assign = async (orderId: string, runnerId: string) => {
    if (!requireRestaurantOwner()) return;
    const patch: { runner_id: string | null; status?: "on_the_way"; out_for_delivery_at?: string } = {
      runner_id: runnerId === "none" ? null : runnerId,
    };
    if (runnerId !== "none") {
      patch.status = "on_the_way";
      patch.out_for_delivery_at = new Date().toISOString();
    }
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) toast.error(error.message);
    else { toast.success("Pedido asignado"); load(); }
  };

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <Button asChild variant="ghost" size="sm"><Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Volver</Link></Button>
          <h1 className="mt-2 font-heading text-3xl font-bold">Food runners</h1>
          <p className="text-sm text-muted-foreground">Gestiona repartidores y asigna pedidos en preparación.</p>
        </div>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold"><Bike className="h-5 w-5 text-gold" /> Repartidores</h2>
          <form onSubmit={addRunner} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-1"><Label className="text-xs">Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
            <div className="space-y-1"><Label className="text-xs">Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></div>
            <div className="flex items-end"><Button type="submit" className="bg-gold text-primary-foreground hover:bg-gold/90"><Plus className="mr-1 h-4 w-4" />Agregar</Button></div>
          </form>

          <ul className="mt-4 divide-y divide-border">
            {runners.length === 0 && <li className="py-3 text-sm text-muted-foreground">Aún no hay repartidores.</li>}
            {runners.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.phone || "—"}</div></div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">Activo <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r.id, r.is_active)} /></div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeRunner(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-lg font-bold">Pedidos para asignar</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay pedidos en preparación o en camino.</p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono font-bold">#{String(o.order_number).padStart(4, "0")}</div>
                    <div className="text-xs text-muted-foreground">{o.delivery_store} · Piso {o.delivery_floor} · {o.status}</div>
                  </div>
                  <Select value={o.runner_id ?? "none"} onValueChange={(v) => assign(o.id, v)}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="Asignar runner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {runners.filter((r) => r.is_active).map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}