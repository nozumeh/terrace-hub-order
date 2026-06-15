import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BcvRateAdmin } from "@/components/BcvRateAdmin";
import { BcvRateScheduler } from "@/components/BcvRateScheduler";
import { useBcvRate } from "@/lib/bcv";

export const Route = createFileRoute("/developer")({ component: DeveloperPage });

const ACTIVATION_FEE = 100;
const MONTHLY_FEE = 50;
const COMMISSION_RATE = 0.02;

interface Restaurant { id: string; name: string; is_active: boolean; created_at: string }
interface OrderRow { restaurant_id: string; total: number; created_at: string; status: string }
interface Payment {
  id: string;
  restaurant_id: string;
  kind: "activation" | "monthly" | "commission";
  period: string | null;
  amount: number;
  status: "pending" | "paid";
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatPeriodLabel(p: string): string {
  const [y, m] = p.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  const s = d.toLocaleDateString("es-VE", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function DeveloperPage() {
  const { roles, loading } = useAuth();
  const navigate = useNavigate();
  const { refresh: refreshBcv } = useBcvRate();
  const [busy, setBusy] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!loading && !roles.includes("developer")) navigate({ to: "/" });
  }, [loading, roles, navigate]);

  const refresh = async () => {
    const [{ data: r }, { data: o }, { data: p }] = await Promise.all([
      supabase.from("restaurants").select("id,name,is_active,created_at").order("created_at", { ascending: false }),
      supabase.from("orders").select("restaurant_id,total,created_at,status").neq("status", "cancelled"),
      supabase.from("platform_payments").select("*"),
    ]);
    setRestaurants((r ?? []) as Restaurant[]);
    setOrders((o ?? []) as OrderRow[]);
    setPayments((p ?? []) as Payment[]);
    setBusy(false);
  };

  useEffect(() => { if (roles.includes("developer")) refresh(); }, [roles]);

  // Auto-apply scheduled BCV rate when its date arrives.
  useEffect(() => {
    if (!roles.includes("developer")) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("bcv_rates")
        .select("id,scheduled_rate,scheduled_for")
        .not("scheduled_rate", "is", null)
        .lte("scheduled_for", today);
      const rows = (data ?? []) as Array<{ id: string; scheduled_rate: number | null; scheduled_for: string | null }>;
      for (const r of rows) {
        if (r.scheduled_rate == null) continue;
        const newRate = Number(r.scheduled_rate);
        const { error } = await supabase
          .from("bcv_rates")
          .upsert(
            { date: today, rate: newRate, notes: "Aplicada automáticamente desde programación" },
            { onConflict: "date" },
          );
        if (!error) {
          await supabase
            .from("bcv_rates")
            .update({ scheduled_rate: null, scheduled_for: null })
            .eq("id", r.id);
          toast.success(`Tasa BCV actualizada automáticamente a Bs. ${newRate.toFixed(2)}`);
          await refreshBcv();
        }
      }
    })();
  }, [roles, refreshBcv]);

  const period = currentPeriod();

  const findPayment = (restaurant_id: string, kind: Payment["kind"], p: string | null) =>
    payments.find((x) => x.restaurant_id === restaurant_id && x.kind === kind && (x.period ?? null) === p);

  const upsertPayment = async (
    restaurant_id: string,
    kind: Payment["kind"],
    p: string | null,
    amount: number,
    nextStatus: "pending" | "paid",
  ) => {
    const existing = findPayment(restaurant_id, kind, p);
    const row = {
      restaurant_id,
      kind,
      period: p,
      amount,
      status: nextStatus,
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null,
    };
    const { error } = existing
      ? await supabase.from("platform_payments").update(row).eq("id", existing.id)
      : await supabase.from("platform_payments").insert(row);
    if (error) { toast.error(error.message); return; }
    toast.success("Actualizado");
    refresh();
  };

  // Aggregate sales per restaurant per month
  const salesByRestMonth = useMemo(() => {
    const map = new Map<string, Map<string, number>>(); // rid -> period -> total
    for (const o of orders) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(o.restaurant_id)) map.set(o.restaurant_id, new Map());
      const m = map.get(o.restaurant_id)!;
      m.set(key, (m.get(key) ?? 0) + Number(o.total || 0));
    }
    return map;
  }, [orders]);

  // All periods seen in sales (sorted desc)
  const allPeriods = useMemo(() => {
    const s = new Set<string>();
    for (const m of salesByRestMonth.values()) for (const k of m.keys()) s.add(k);
    s.add(period);
    return Array.from(s).sort((a, b) => (a < b ? 1 : -1));
  }, [salesByRestMonth, period]);

  // Summary numbers
  const summary = useMemo(() => {
    let actCollected = 0, actPending = 0;
    let monthCollected = 0, monthPending = 0;
    let commCollected = 0, commPending = 0;

    for (const r of restaurants) {
      const act = findPayment(r.id, "activation", null);
      if (act?.status === "paid") actCollected += Number(act.amount);
      else actPending += ACTIVATION_FEE;

      for (const p of allPeriods) {
        const m = findPayment(r.id, "monthly", p);
        if (m?.status === "paid") monthCollected += Number(m.amount);
        else monthPending += MONTHLY_FEE;

        const sales = salesByRestMonth.get(r.id)?.get(p) ?? 0;
        const owed = Number((sales * COMMISSION_RATE).toFixed(2));
        const c = findPayment(r.id, "commission", p);
        if (c?.status === "paid") commCollected += Number(c.amount);
        else if (owed > 0) commPending += owed;
      }
    }
    return { actCollected, actPending, monthCollected, monthPending, commCollected, commPending };
  }, [restaurants, payments, allPeriods, salesByRestMonth]);

  if (loading || busy) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-5xl px-4 py-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-3xl font-bold">Panel del Developer</h1>
          <p className="text-sm text-muted-foreground">Gestión de cobros y comisiones de la plataforma</p>
        </div>

        <Tabs defaultValue="restaurantes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="restaurantes">Restaurantes</TabsTrigger>
            <TabsTrigger value="comisiones">Comisiones</TabsTrigger>
            <TabsTrigger value="bcv">Tasa BCV</TabsTrigger>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
          </TabsList>

          {/* RESTAURANTES */}
          <TabsContent value="restaurantes" className="mt-6">
            <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <h2 className="mb-1 font-heading text-xl font-bold">Restaurantes activos</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Activación ${ACTIVATION_FEE} (una sola vez) · Mensualidad ${MONTHLY_FEE}/mes ({formatPeriodLabel(period)})
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left">Restaurante</th>
                      <th className="px-2 py-2 text-left">Estado</th>
                      <th className="px-2 py-2 text-left">Activación ${ACTIVATION_FEE}</th>
                      <th className="px-2 py-2 text-left">Mes actual ${MONTHLY_FEE}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.filter((r) => r.is_active).map((r) => {
                      const act = findPayment(r.id, "activation", null);
                      const mon = findPayment(r.id, "monthly", period);
                      const actPaid = act?.status === "paid";
                      const monPaid = mon?.status === "paid";
                      return (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-2 py-2 font-semibold">{r.name}</td>
                          <td className="px-2 py-2 text-success">Activo</td>
                          <td className="px-2 py-2">
                            <Button
                              size="sm"
                              variant={actPaid ? "default" : "outline"}
                              className={actPaid ? "bg-success text-primary-foreground hover:bg-success/90" : ""}
                              onClick={() => upsertPayment(r.id, "activation", null, ACTIVATION_FEE, actPaid ? "pending" : "paid")}
                            >
                              {actPaid ? "Pagado" : "Pendiente"}
                            </Button>
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              size="sm"
                              variant={monPaid ? "default" : "outline"}
                              className={monPaid ? "bg-success text-primary-foreground hover:bg-success/90" : ""}
                              onClick={() => upsertPayment(r.id, "monthly", period, MONTHLY_FEE, monPaid ? "pending" : "paid")}
                            >
                              {monPaid ? "Pagado" : "Pendiente"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {restaurants.filter((r) => r.is_active).length === 0 && (
                      <tr><td colSpan={4} className="px-2 py-8 text-center text-muted-foreground">Sin restaurantes activos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </TabsContent>

          {/* COMISIONES */}
          <TabsContent value="comisiones" className="mt-6">
            <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
              <h2 className="mb-1 font-heading text-xl font-bold">Comisiones (2%)</h2>
              <p className="mb-4 text-sm text-muted-foreground">Marca cada período como Pagado cuando el restaurante pague su comisión.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 text-left">Restaurante</th>
                      <th className="px-2 py-2 text-left">Período</th>
                      <th className="px-2 py-2 text-right">Ventas</th>
                      <th className="px-2 py-2 text-right">Comisión 2%</th>
                      <th className="px-2 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.flatMap((r) =>
                      allPeriods.map((p) => {
                        const sales = salesByRestMonth.get(r.id)?.get(p) ?? 0;
                        const owed = Number((sales * COMMISSION_RATE).toFixed(2));
                        if (sales === 0) return null;
                        const c = findPayment(r.id, "commission", p);
                        const paid = c?.status === "paid";
                        return (
                          <tr key={`${r.id}-${p}`} className="border-t border-border">
                            <td className="px-2 py-2 font-semibold">{r.name}</td>
                            <td className="px-2 py-2">{formatPeriodLabel(p)}</td>
                            <td className="px-2 py-2 text-right">${sales.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right font-semibold text-gold">${owed.toFixed(2)}</td>
                            <td className="px-2 py-2">
                              <Button
                                size="sm"
                                variant={paid ? "default" : "outline"}
                                className={paid ? "bg-success text-primary-foreground hover:bg-success/90" : ""}
                                onClick={() => upsertPayment(r.id, "commission", p, owed, paid ? "pending" : "paid")}
                              >
                                {paid ? "Pagado" : "Pendiente"}
                              </Button>
                            </td>
                          </tr>
                        );
                      }),
                    )}
                  </tbody>
                </table>
                {restaurants.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">Sin datos</div>
                )}
              </div>
            </section>
          </TabsContent>

          {/* TASA BCV */}
          <TabsContent value="bcv" className="mt-6 space-y-4">
            <BcvRateAdmin />
            <BcvRateScheduler />
          </TabsContent>

          {/* RESUMEN */}
          <TabsContent value="resumen" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryCard title="Activación cobrada" value={summary.actCollected} tone="success" />
              <SummaryCard title="Activación pendiente" value={summary.actPending} tone="warn" />
              <SummaryCard title="Mensualidades cobradas" value={summary.monthCollected} tone="success" />
              <SummaryCard title="Mensualidades pendientes" value={summary.monthPending} tone="warn" />
              <SummaryCard title="Comisiones cobradas" value={summary.commCollected} tone="success" />
              <SummaryCard title="Comisiones pendientes" value={summary.commPending} tone="warn" />
            </div>
            <section className="mt-6 rounded-xl border-2 border-gold/40 bg-gradient-to-br from-gold/10 to-card p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-gold">Ingresos totales plataforma</div>
              <div className="mt-2 font-heading text-3xl font-bold">
                ${(summary.actCollected + summary.monthCollected + summary.commCollected).toFixed(2)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Pendiente por cobrar: ${(summary.actPending + summary.monthPending + summary.commPending).toFixed(2)}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, tone }: { title: string; value: number; tone: "success" | "warn" }) {
  const color = tone === "success" ? "text-success" : "text-destructive";
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className={`mt-2 font-heading text-2xl font-bold ${color}`}>${value.toFixed(2)}</div>
    </div>
  );
}