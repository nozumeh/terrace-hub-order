import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BadgePercent, Copy, Loader2, Package, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/employee")({ component: EmployeePanel });

interface OrderRow {
  id: string; order_number: number; status: string; total_final: number; discount_applied: number; created_at: string;
}

function EmployeePanel() {
  const { user, profile, loading, roles, refresh } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [floor, setFloor] = useState("1");
  const [busy, setBusy] = useState(false);

  const isStaff = roles.some((r) => r === "worker" || r === "supervisor" || r === "manager");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!isStaff && roles.length > 0) navigate({ to: "/account" });
  }, [loading, user, isStaff, roles, navigate]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setStoreName(profile.store_name || "");
      setFloor(profile.store_floor || "1");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("id,order_number,status,total_final,discount_applied,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30).then(({ data }) => setOrders((data ?? []) as OrderRow[]));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ name, phone, store_name: storeName, store_floor: floor }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Guardado"); refresh(); }
  };

  const copyPromo = () => {
    if (!profile?.promo_code) return;
    navigator.clipboard.writeText(profile.promo_code).then(() => toast.success("Código copiado"));
  };

  if (loading || !user) return null;

  const cargo = roles.includes("manager") ? "Gerente" : roles.includes("supervisor") ? "Dueño/Supervisor" : "Empleado";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <div>
          <div className="text-xs uppercase tracking-widest text-gold">Panel del trabajador</div>
          <h1 className="font-heading text-2xl font-bold">Hola, {profile?.name || user.email}</h1>
          <p className="text-sm text-muted-foreground">Cargo: <span className="font-medium text-foreground">{cargo}</span></p>
        </div>

        <section className="rounded-xl border border-gold/40 bg-card p-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gold"><BadgePercent className="h-4 w-4" /> Tu código promocional</div>
          {profile?.promo_code ? (
            <div className="flex items-center justify-between rounded-lg bg-gold/10 px-4 py-3">
              <div className="font-heading text-2xl font-bold tracking-widest text-gold">{profile.promo_code}</div>
              <Button size="sm" variant="outline" onClick={copyPromo}><Copy className="mr-1 h-4 w-4" />Copiar</Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no se ha generado tu código. Vuelve más tarde.</p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><Package className="h-4 w-4 text-gold" /> Mis pedidos</div>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no tienes pedidos. <Link to="/menu" className="text-gold hover:underline">Ver menú</Link></p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <Link to="/orders/$id" params={{ id: o.id }} className="font-medium hover:text-gold">#{o.order_number}</Link>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${Number(o.total_final).toFixed(2)}</div>
                    {Number(o.discount_applied) > 0 && <div className="text-[10px] text-gold">−${Number(o.discount_applied).toFixed(2)} descuento</div>}
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{o.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-gold" /> Mi perfil</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
            <div className="space-y-2"><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></div>
            <div className="space-y-2"><Label>Tienda</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={80} /></div>
            <div className="space-y-2">
              <Label>Piso</Label>
              <Select value={floor} onValueChange={setFloor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["1","2","3","4","5","Terraza"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="mt-4" onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
        </section>
      </div>
    </div>
  );
}