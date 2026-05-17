import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Package, Settings, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({ component: AccountPage });

interface OrderRow {
  id: string;
  order_number: number;
  status: string;
  total_final: number;
  created_at: string;
  delivery_store: string | null;
}

function AccountPage() {
  const { user, profile, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Form state for settings modal
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id,order_number,status,total_final,created_at,delivery_store")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setOrders((data ?? []) as OrderRow[]));
  }, [user]);

  // Group orders by store + day
  const grouped = useMemo(() => {
    const groups: Record<string, OrderRow[]> = {};
    orders.forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString();
      const key = `${o.delivery_store || "Sin tienda"} · ${day}`;
      (groups[key] ||= []).push(o);
    });
    return Object.entries(groups);
  }, [orders]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name, phone })
      .eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Guardado");
      refresh();
      setSettingsOpen(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-gold">Mi cuenta</div>
            <h1 className="font-heading text-2xl font-bold">Hola, {profile?.name || user.email}</h1>
            {profile?.customer_code && (
              <div className="mt-1 text-xs text-muted-foreground">
                ID Cliente: <span className="font-mono text-gold">{profile.customer_code}</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Configuración"
            className="shrink-0"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-gold" /> Historial de Pedidos
          </div>
          {orders.length === 0 ? (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h2 className="font-heading text-2xl font-bold">¿Listo para ordenar? 🍔</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Elige tu restaurante favorito y recibe tu pedido directo en tu tienda.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link
                  to="/menu"
                  className="group rounded-xl border border-gold/40 bg-card p-5 transition hover:border-gold hover:shadow-[0_0_24px_-8px_hsl(var(--gold)/0.5)]"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10 text-gold">
                    <UtensilsCrossed className="h-6 w-6" />
                  </div>
                  <div className="font-heading text-lg font-bold">Capital Burgers</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Hamburguesas artesanales, papas y más. Pide y recíbelo en tu piso.
                  </p>
                  <div className="mt-4 inline-flex items-center text-sm font-semibold text-gold group-hover:underline">
                    Ver menú →
                  </div>
                </Link>
                <div className="rounded-xl border border-border/60 bg-card/50 p-5 opacity-70">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <UtensilsCrossed className="h-6 w-6" />
                  </div>
                  <div className="font-heading text-lg font-bold">Terraza Gourmet</div>
                  <p className="mt-1 text-xs text-muted-foreground">Próximamente</p>
                  <button
                    disabled
                    className="mt-4 cursor-not-allowed text-sm font-semibold text-muted-foreground"
                  >
                    Próximamente
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(([key, list]) => (
                <div key={key}>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{key}</div>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {list.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <div className="min-w-0">
                          <Link to="/orders/$id" params={{ id: o.id }} className="font-medium hover:text-gold">
                            Pedido #{o.order_number}
                          </Link>
                          <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleTimeString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${Number(o.total_final).toFixed(2)}</div>
                          <div className="text-xs uppercase tracking-wider text-muted-foreground">{o.status}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Los pedidos se realizan por teléfono. Esta vista es solo para tu historial.
        </p>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mi información</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre y Apellido</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label>Número de teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email ?? ""} readOnly disabled />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={busy} className="bg-gold text-primary-foreground hover:bg-gold/90">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
