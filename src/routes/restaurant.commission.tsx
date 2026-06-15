import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Percent } from "lucide-react";

export const Route = createFileRoute("/restaurant/commission")({ component: CommissionPanel });

const COMMISSION_RATE = 0.02;

interface OrderRow { total: number; created_at: string }
interface MonthBucket { key: string; label: string; total: number; commission: number; isCurrent: boolean }

function formatPeriod(year: number, monthIdx: number): string {
  const d = new Date(year, monthIdx, 1);
  const s = d.toLocaleDateString("es-VE", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function CommissionPanel() {
  const { user, isRestaurantOwner, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    if (!loading && !isRestaurantOwner) navigate({ to: "/" });
  }, [loading, isRestaurantOwner, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: r } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!r?.id) { setBusy(false); return; }
      const { data } = await supabase
        .from("orders")
        .select("total, created_at")
        .eq("restaurant_id", r.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      setOrders((data ?? []) as OrderRow[]);
      setBusy(false);
    })();
  }, [user]);

  const { current, history } = useMemo(() => {
    const now = new Date();
    const curKey = `${now.getFullYear()}-${now.getMonth()}`;
    const buckets = new Map<string, MonthBucket>();
    for (const o of orders) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = buckets.get(key);
      const total = Number(o.total) || 0;
      if (existing) {
        existing.total += total;
        existing.commission = Number((existing.total * COMMISSION_RATE).toFixed(2));
      } else {
        buckets.set(key, {
          key,
          label: formatPeriod(d.getFullYear(), d.getMonth()),
          total,
          commission: Number((total * COMMISSION_RATE).toFixed(2)),
          isCurrent: key === curKey,
        });
      }
    }
    const all = Array.from(buckets.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
    const cur = all.find((b) => b.isCurrent) ?? {
      key: curKey,
      label: formatPeriod(now.getFullYear(), now.getMonth()),
      total: 0,
      commission: 0,
      isCurrent: true,
    };
    return { current: cur, history: all.filter((b) => !b.isCurrent) };
  }, [orders]);

  if (busy) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <div>
          <Button asChild size="sm" variant="ghost" className="mb-2 -ml-2">
            <Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Volver al panel</Link>
          </Button>
          <div className="text-xs uppercase tracking-widest text-gold">Restaurante</div>
          <h1 className="font-heading text-3xl font-bold">Comisión Plataforma</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informativo · La comisión del 2% no se cobra automáticamente.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Ventas del mes actual</div>
            <div className="mt-2 font-heading text-3xl font-bold">${current.total.toFixed(2)}</div>
            <div className="mt-1 text-xs text-muted-foreground">{current.label}</div>
          </div>
          <div className="rounded-xl border border-gold/40 bg-gold/5 p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gold">
              <Percent className="h-3 w-3" /> Por pagar a la plataforma (2%)
            </div>
            <div className="mt-2 font-heading text-3xl font-bold text-gold">${current.commission.toFixed(2)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Estimado para el cierre del período</div>
          </div>
        </div>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 font-heading text-xl font-bold">Historial</h2>
          {history.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Aún no hay períodos anteriores.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-4">Período</th>
                    <th className="py-2 pr-4">Total Ventas</th>
                    <th className="py-2 pr-4">Comisión 2%</th>
                    <th className="py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.key} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4">{h.label}</td>
                      <td className="py-3 pr-4">${h.total.toFixed(2)}</td>
                      <td className="py-3 pr-4 font-medium text-gold">${h.commission.toFixed(2)}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                          Pendiente
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            El estado se actualizará a "Pagado" una vez se confirme el pago del período correspondiente.
          </p>
        </section>
      </div>
    </div>
  );
}