import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ChefHat, ArrowLeft, Plus, Minus, Printer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/kitchen")({ component: KitchenView });

interface Order {
  id: string; order_number: number; status: string; created_at: string;
  delivery_store: string; delivery_floor: string; notes: string;
}
interface ItemCustomizations {
  variant?: string | null;
  extras?: { id: string; name: string; price: number }[];
  removed?: { id: string; name: string }[];
}
interface OrderItem {
  id: string; order_id: string; name: string; quantity: number;
  customizations?: ItemCustomizations | null;
}

const NEXT: Record<string, { label: string; status: string } | null> = {
  pending: { label: "Confirmar", status: "confirmed" },
  confirmed: { label: "Empezar a preparar", status: "preparing" },
  preparing: { label: "Marcar listo", status: "on_the_way" },
  on_the_way: null,
};

function KitchenView() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !roles.includes("restaurant_owner")) navigate({ to: "/" });
  }, [loading, roles, navigate]);

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
      .in("status", ["pending", "confirmed", "preparing"])
      .order("created_at", { ascending: true });
    const ords = (o ?? []) as Order[];
    setOrders(ords);
    if (ords.length) {
      const { data: oi } = await supabase.from("order_items").select("*").in("order_id", ords.map((x) => x.id));
      const grouped: Record<string, OrderItem[]> = {};
      ((oi ?? []) as OrderItem[]).forEach((it) => { (grouped[it.order_id] ??= []).push(it); });
      setItems(grouped);
    } else {
      setItems({});
    }
    setBusy(false);
  };

  useEffect(() => {
    if (!user || !roles.includes("restaurant_owner")) return;
    refresh();
    const ch = supabase.channel("kitchen-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => refresh())
      .subscribe();
    const interval = setInterval(() => refresh(), 30000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roles]);

  const advance = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as never }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Estado actualizado"); refresh(); }
  };

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const printOrder = (o: Order) => {
    const list = items[o.id] ?? [];
    const created = new Date(o.created_at).toLocaleString();
    const itemsHtml = list.map((it) => {
      const c = it.customizations ?? {};
      const variant = c.variant ? `<div class="row variant"><span class="tag">VARIANTE</span> ${escapeHtml(c.variant)}</div>` : "";
      const extras = (c.extras ?? []).map((e) => `<div class="row extra">+ ${escapeHtml(e.name)}</div>`).join("");
      const removed = (c.removed ?? []).map((r) => `<div class="row removed">SIN ${escapeHtml(r.name.toUpperCase())}</div>`).join("");
      return `<li class="item">
        <div class="line"><span class="qty">${it.quantity}×</span><span class="name">${escapeHtml(it.name)}</span></div>
        ${variant}${extras}${removed}
      </li>`;
    }).join("");
    const notes = o.notes ? `<div class="notes"><div class="notes-label">NOTAS</div>${escapeHtml(o.notes)}</div>` : "";
    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <title>Pedido #${String(o.order_number).padStart(4, "0")}</title>
      <style>
        @page { size: 80mm auto; margin: 6mm; }
        @media print { html, body { width: 80mm; } }
        * { box-sizing: border-box; }
        body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #000; padding: 8px; font-size: 12px; line-height: 1.35; }
        h1 { font-size: 22px; margin: 0; letter-spacing: 1px; }
        .meta { font-size: 11px; color: #444; margin: 2px 0 8px; }
        .delivery { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin-bottom: 8px; }
        ul { list-style: none; padding: 0; margin: 0; }
        .item { padding: 6px 0; border-bottom: 1px dashed #999; }
        .item:last-child { border-bottom: none; }
        .line { display: flex; gap: 6px; align-items: baseline; font-weight: 700; font-size: 14px; }
        .qty { background: #000; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
        .row { margin-left: 18px; font-size: 12px; margin-top: 2px; }
        .tag { background: #eee; padding: 0 4px; border-radius: 2px; font-size: 10px; margin-right: 4px; }
        .extra { color: #000; }
        .extra::before, .removed::before {}
        .removed { font-weight: 700; }
        .notes { margin-top: 10px; padding: 6px; border: 1px solid #000; }
        .notes-label { font-weight: 700; font-size: 10px; margin-bottom: 2px; }
        .footer { margin-top: 12px; text-align: center; font-size: 10px; color: #666; border-top: 1px dashed #000; padding-top: 6px; }
        @media print { .no-print { display: none; } }
        .actions { text-align: center; margin-top: 12px; }
        .actions button { padding: 6px 14px; font-size: 12px; cursor: pointer; }
      </style></head><body>
      <h1>#${String(o.order_number).padStart(4, "0")}</h1>
      <div class="meta">${escapeHtml(created)} · estado: ${escapeHtml(o.status)}</div>
      <div class="delivery">
        <div><strong>Tienda:</strong> ${escapeHtml(o.delivery_store)}</div>
        <div><strong>Piso:</strong> ${escapeHtml(o.delivery_floor)}</div>
      </div>
      <ul>${itemsHtml}</ul>
      ${notes}
      <div class="footer">— Cocina —</div>
      <div class="actions no-print">
        <button onclick="window.print()">Imprimir / Guardar PDF</button>
      </div>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),200));</script>
      </body></html>`;
    const w = window.open("", "_blank", "width=420,height=720");
    if (!w) { toast.error("Permite las ventanas emergentes para imprimir"); return; }
    w.document.open(); w.document.write(html); w.document.close();
  };

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;

  const cols: { key: string; label: string }[] = [
    { key: "pending", label: "Recibidos" },
    { key: "confirmed", label: "Confirmados" },
    { key: "preparing", label: "Preparando" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gold">
              <ChefHat className="h-3 w-3" /> Cocina
            </div>
            <h1 className="font-heading text-3xl font-bold">Orden para preparación</h1>
            <p className="mt-1 text-sm text-muted-foreground">Desglose completo por item · Actualización en tiempo real</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Panel</Link>
          </Button>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            Sin pedidos pendientes en cocina
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cols.map((col) => {
              const list = orders.filter((o) => o.status === col.key);
              return (
                <div key={col.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-heading text-sm font-bold uppercase tracking-wider">{col.label}</h2>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">{list.length}</span>
                  </div>
                  {list.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center text-xs text-muted-foreground">Vacío</div>
                  )}
                  {list.map((o) => {
                    const ageMin = (Date.now() - new Date(o.created_at).getTime()) / 60000;
                    const urgent = ageMin > 15;
                    const next = NEXT[o.status];
                    return (
                      <div key={o.id} className={`rounded-xl border bg-card p-4 ${urgent ? "border-destructive" : "border-border"}`}>
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-lg font-bold">#{String(o.order_number).padStart(4, "0")}</div>
                          <div className={`text-xs font-medium ${urgent ? "text-destructive" : "text-muted-foreground"}`}>{Math.floor(ageMin)} min</div>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {o.delivery_store} · Piso {o.delivery_floor}
                        </div>

                        <ul className="mt-3 space-y-3">
                          {(items[o.id] ?? []).map((it) => {
                            const c = it.customizations ?? {};
                            const hasDetails =
                              !!c.variant ||
                              (c.extras?.length ?? 0) > 0 ||
                              (c.removed?.length ?? 0) > 0;
                            return (
                              <li key={it.id} className="rounded-md border border-border bg-background p-3">
                                <div className="flex items-baseline justify-between gap-2">
                                  <div className="flex-1 font-medium">
                                    <span className="mr-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-gold px-1.5 text-xs font-bold text-primary-foreground">
                                      {it.quantity}×
                                    </span>
                                    {it.name}
                                  </div>
                                </div>
                                {hasDetails && (
                                  <div className="mt-2 space-y-1 text-xs">
                                    {c.variant && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="rounded border border-border bg-card px-1.5 py-0.5 font-medium uppercase tracking-wider text-muted-foreground">Variante</span>
                                        <span className="font-medium">{c.variant}</span>
                                      </div>
                                    )}
                                    {c.extras?.map((e) => (
                                      <div key={`e-${e.id}`} className="flex items-center gap-1.5 text-gold">
                                        <Plus className="h-3 w-3" />
                                        <span className="font-medium">{e.name}</span>
                                      </div>
                                    ))}
                                    {c.removed?.map((r) => (
                                      <div key={`r-${r.id}`} className="flex items-center gap-1.5 text-destructive">
                                        <Minus className="h-3 w-3" />
                                        <span className="font-medium">SIN {r.name.toLowerCase()}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>

                        {o.notes && (
                          <div className="mt-3 rounded-md border border-gold/40 bg-gold/5 p-2 text-xs">
                            <div className="font-bold uppercase tracking-wider text-gold">Notas</div>
                            <div className="mt-0.5 text-foreground">{o.notes}</div>
                          </div>
                        )}

                        {next && (
                          <Button
                            size="sm"
                            className="mt-3 w-full bg-gold text-primary-foreground hover:bg-gold/90"
                            onClick={() => advance(o.id, next.status)}
                          >
                            {next.label}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 w-full"
                          onClick={() => printOrder(o)}
                        >
                          <Printer className="h-3 w-3" /> Imprimir / PDF
                        </Button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}