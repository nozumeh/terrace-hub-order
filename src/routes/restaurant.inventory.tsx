import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Minus, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/inventory")({ component: Inventory });

interface Item { id: string; name: string; category: string; stock_quantity: number | null; is_available: boolean }

const LOW_THRESHOLD = 5;

function Inventory() {
  const { user, loading, isRestaurantOwner, requireRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isRestaurantOwner) navigate({ to: "/" });
  }, [loading, isRestaurantOwner, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
    if (!r) { setBusy(false); return; }
    const { data: m } = await supabase.from("menu_items").select("id,name,category,stock_quantity,is_available").eq("restaurant_id", r.id).order("category").order("name");
    setItems((m ?? []) as Item[]);
    setBusy(false);
  };

  useEffect(() => { if (user && isRestaurantOwner) load(); }, [user, isRestaurantOwner]);

  const adjust = async (id: string, delta: number) => {
    if (!requireRestaurantOwner()) return;
    const cur = items.find((x) => x.id === id);
    const next = Math.max(0, (cur?.stock_quantity ?? 0) + delta);
    const { error } = await supabase.from("menu_items").update({ stock_quantity: next }).eq("id", id);
    if (error) toast.error(error.message);
    else setItems((xs) => xs.map((x) => x.id === id ? { ...x, stock_quantity: next } : x));
  };

  const setStock = async (id: string) => {
    if (!requireRestaurantOwner()) return;
    const v = parseInt(edits[id], 10);
    if (isNaN(v) || v < 0) { toast.error("Cantidad inválida"); return; }
    const { error } = await supabase.from("menu_items").update({ stock_quantity: v }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setItems((xs) => xs.map((x) => x.id === id ? { ...x, stock_quantity: v } : x));
      setEdits((p) => { const n = { ...p }; delete n[id]; return n; });
      toast.success("Stock actualizado");
    }
  };

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;

  const lowCount = items.filter((i) => (i.stock_quantity ?? 0) <= LOW_THRESHOLD).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <Button asChild variant="ghost" size="sm"><Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Volver</Link></Button>
          <h1 className="mt-2 font-heading text-3xl font-bold">Inventario</h1>
          <p className="text-sm text-muted-foreground">Ajusta stock por producto. {lowCount > 0 && <span className="text-destructive">{lowCount} item(s) bajo el umbral.</span>}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <ul className="divide-y divide-border">
            {items.map((i) => {
              const stock = i.stock_quantity ?? 0;
              const low = stock <= LOW_THRESHOLD;
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{i.category}</div>
                  </div>
                  {low && <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive"><AlertTriangle className="h-3 w-3" />Bajo</span>}
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => adjust(i.id, -1)}><Minus className="h-3 w-3" /></Button>
                    {edits[i.id] !== undefined ? (
                      <div className="flex items-center gap-1">
                        <Input type="number" min={0} className="h-8 w-20" value={edits[i.id]} onChange={(e) => setEdits((p) => ({ ...p, [i.id]: e.target.value }))} />
                        <Button size="sm" onClick={() => setStock(i.id)}>OK</Button>
                      </div>
                    ) : (
                      <button className={`min-w-12 rounded-md border border-border px-3 py-1 text-center text-sm font-semibold ${low ? "text-destructive" : ""}`} onClick={() => setEdits((p) => ({ ...p, [i.id]: String(stock) }))}>{stock}</button>
                    )}
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => adjust(i.id, 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}