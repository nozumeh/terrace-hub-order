import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({ component: AccountPage });

interface OrderRow {
  id: string; order_number: number; status: string; total_final: number; created_at: string;
}

function AccountPage() {
  const { user, profile, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) { setName(profile.name || ""); setPhone(profile.phone || ""); }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("id,order_number,status,total_final,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20).then(({ data }) => setOrders((data ?? []) as OrderRow[]));
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ name, phone }).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Guardado"); refresh(); }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
        <h1 className="font-heading text-2xl font-bold">Mi cuenta</h1>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-gold" /> Mis datos</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
            <div className="space-y-2"><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={user.email ?? ""} readOnly disabled /></div>
          </div>
          <Button className="mt-4" onClick={save} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar</Button>
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
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{o.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}