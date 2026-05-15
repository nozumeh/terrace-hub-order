import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

const STATUSES = ["pending", "confirmed", "preparing", "on_the_way", "delivered"] as const;

interface Order {
  id: string; order_number: number; user_id: string; restaurant_id: string;
  status: string; total_final: number; delivery_store: string; delivery_floor: string;
  created_at: string;
}
interface Profile { id: string; name: string; email: string; store_name: string; is_employee: boolean }
interface Restaurant { id: string; name: string; is_active: boolean; owner_id: string | null; description: string | null; phone: string | null; created_at: string }

function AdminPage() {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [busy, setBusy] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    if (!loading && !roles.includes("admin")) navigate({ to: "/" });
  }, [loading, roles, navigate]);

  const refresh = async () => {
    const [{ data: o }, { data: p }, { data: r }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("restaurants").select("id,name,is_active,owner_id,description,phone,created_at").order("created_at", { ascending: false }),
    ]);
    setOrders((o ?? []) as Order[]);
    setProfiles((p ?? []) as Profile[]);
    setRestaurants((r ?? []) as Restaurant[]);
    setBusy(false);
  };

  useEffect(() => {
    if (roles.includes("admin")) refresh();
    const ch = supabase.channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [roles]);

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.created_at.startsWith(today));
  const revenue = todayOrders.reduce((a, b) => a + Number(b.total_final), 0);
  const pending = orders.filter((o) => o.status !== "delivered").length;

  const filtered = useMemo(() =>
    filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus),
    [orders, filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as never }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Estado actualizado");
  };

  const toggleEmployee = async (id: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_employee: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Actualizado"); refresh(); }
  };

  const toggleRestaurant = async (id: string, current: boolean) => {
    const { error } = await supabase.from("restaurants").update({ is_active: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Actualizado"); refresh(); }
  };

  const approveRestaurant = async (r: Restaurant) => {
    const { error } = await supabase.from("restaurants").update({ is_active: true }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    if (r.owner_id) {
      await supabase.from("notifications").insert({
        user_id: r.owner_id,
        title: "¡Tu negocio fue aprobado!",
        body: `${r.name} ya está activo en Terraza Gourmet City Market. Ya puedes recibir pedidos y publicar tu menú.`,
        link: "/restaurant/dashboard",
      });
    }
    toast.success("Restaurante aprobado");
    refresh();
  };

  const rejectRestaurant = async (r: Restaurant) => {
    if (!confirm(`¿Rechazar y eliminar la solicitud de "${r.name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("restaurants").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    if (r.owner_id) {
      await supabase.from("notifications").insert({
        user_id: r.owner_id,
        title: "Tu solicitud de negocio fue rechazada",
        body: `Tu solicitud para "${r.name}" no fue aprobada. Contacta al equipo de City Market para más detalles.`,
      });
    }
    toast.success("Solicitud rechazada");
    refresh();
  };

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;

  const pendingRestaurants = restaurants.filter((r) => !r.is_active);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-gold">Admin</div>
          <h1 className="font-heading text-3xl font-bold">Panel de control</h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Pedidos hoy" value={todayOrders.length.toString()} />
          <Stat label="Revenue hoy" value={`$${revenue.toFixed(2)}`} />
          <Stat label="Restaurantes activos" value={restaurants.filter((r) => r.is_active).length.toString()} />
          <Stat label="Negocios por aprobar" value={pendingRestaurants.length.toString()} highlight={pendingRestaurants.length > 0} />
        </div>

        {/* Pending business approvals */}
        <section className="rounded-xl border border-gold/40 bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold">Solicitudes de negocios</h2>
              <p className="text-sm text-muted-foreground">Aprueba o rechaza los nuevos restaurantes registrados.</p>
            </div>
            <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">{pendingRestaurants.length} pendientes</span>
          </div>
          {pendingRestaurants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No hay solicitudes pendientes.</div>
          ) : (
            <ul className="space-y-3">
              {pendingRestaurants.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="font-heading text-lg font-semibold">{r.name}</div>
                      {r.description && <div className="mt-1 text-sm text-muted-foreground">{r.description}</div>}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {r.phone && <span>📞 {r.phone}</span>}
                        <span>Solicitado: {new Date(r.created_at).toLocaleDateString()}</span>
                        <span>Dueño: {profiles.find((p) => p.id === r.owner_id)?.email ?? r.owner_id ?? "—"}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" onClick={() => rejectRestaurant(r)}>Rechazar</Button>
                      <Button size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90" onClick={() => approveRestaurant(r)}>Aprobar y notificar</Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Orders */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-heading text-xl font-bold">Pedidos</h2>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="px-2 py-2 text-left">#</th><th className="px-2 py-2 text-left">Tienda</th><th className="px-2 py-2 text-left">Restaurante</th><th className="px-2 py-2 text-left">Total</th><th className="px-2 py-2 text-left">Estado</th></tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-2 py-2 font-mono">#{String(o.order_number).padStart(4, "0")}</td>
                    <td className="px-2 py-2">{o.delivery_store} · P{o.delivery_floor}</td>
                    <td className="px-2 py-2 text-muted-foreground">{restaurants.find((r) => r.id === o.restaurant_id)?.name ?? "—"}</td>
                    <td className="px-2 py-2 font-semibold text-gold">${Number(o.total_final).toFixed(2)}</td>
                    <td className="px-2 py-2">
                      <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-2 py-8 text-center text-muted-foreground">Sin pedidos</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Restaurants */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-xl font-bold">Restaurantes</h2>
          <ul className="space-y-2">
            {restaurants.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div className="font-medium">{r.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Activo <Switch checked={r.is_active} onCheckedChange={() => toggleRestaurant(r.id, r.is_active)} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Users */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-xl font-bold">Usuarios</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="px-2 py-2 text-left">Nombre</th><th className="px-2 py-2 text-left">Email</th><th className="px-2 py-2 text-left">Tienda</th><th className="px-2 py-2 text-left">Empleado</th></tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-2 py-2">{p.name || "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{p.email}</td>
                    <td className="px-2 py-2">{p.store_name || "—"}</td>
                    <td className="px-2 py-2"><Switch checked={p.is_employee} onCheckedChange={() => toggleEmployee(p.id, p.is_employee)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-5 ${highlight ? "border-destructive" : "border-border"}`}>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-2 font-heading text-3xl font-bold ${highlight ? "text-destructive" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
