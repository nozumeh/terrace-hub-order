import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, isEmployee } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/checkout")({ component: Checkout });

function Checkout() {
  const navigate = useNavigate();
  const { user, profile, roles, loading } = useAuth();
  const { items, subtotal, restaurantId, clear } = useCart();
  const employee = isEmployee(profile, roles);
  const discount = employee && items.length > 0 ? 1 : 0;
  const total = Math.max(0, subtotal - discount);

  const [store, setStore] = useState("");
  const [floor, setFloor] = useState("1");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/checkout" } as never });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setStore(profile.store_name || "");
      setFloor(profile.store_floor || "1");
    }
  }, [profile]);

  const placeOrder = async () => {
    if (!user || !restaurantId || items.length === 0) return;
    if (!store.trim()) { toast.error("Indica el nombre de tu tienda"); return; }
    setBusy(true);
    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      restaurant_id: restaurantId,
      total_before_discount: subtotal,
      discount_applied: discount,
      total_final: total,
      delivery_store: store.trim(),
      delivery_floor: floor,
      notes: notes.trim(),
      status: "pending",
    }).select().single();
    if (error || !order) { setBusy(false); toast.error(error?.message || "Error"); return; }
    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id, menu_item_id: i.menu_item_id, name: i.name,
        quantity: i.quantity, unit_price: i.unit_price, subtotal: i.unit_price * i.quantity,
        customizations: {
          base_price: i.base_price,
          variant: i.variant,
          extras: i.extras,
          removed: i.removed,
        },
      }))
    );
    if (itemsErr) { setBusy(false); toast.error(itemsErr.message); return; }
    clear();
    toast.success(`Pedido #${order.order_number} confirmado`);
    navigate({ to: "/orders/$id", params: { id: order.id } });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-muted-foreground">Tu carrito está vacío.</p>
          <Button asChild className="mt-4 bg-gold text-primary-foreground hover:bg-gold/90"><a href="/menu">Ver menú</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold">Entrega</h2>
          <div className="space-y-2">
            <Label htmlFor="s">Tienda</Label>
            <Input id="s" value={store} onChange={(e) => setStore(e.target.value)} placeholder="Ej. TechZone Caracas" />
          </div>
          <div className="space-y-2">
            <Label>Piso</Label>
            <Select value={floor} onValueChange={setFloor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4", "5", "Terraza"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="n">Notas (opcional)</Label>
            <Textarea id="n" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Sin cebolla, extra salsa, etc." />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold">Resumen</h2>
          <ul className="space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.cart_key} className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="truncate">{i.quantity}× {i.name}</span>
                  <span className="ml-2 shrink-0">${(i.unit_price * i.quantity).toFixed(2)}</span>
                </div>
                {(i.variant || i.extras.length > 0 || i.removed.length > 0) && (
                  <ul className="ml-4 text-xs text-muted-foreground">
                    {i.variant && <li>· {i.variant}</li>}
                    {i.extras.map((e) => (
                      <li key={`e-${e.id}`} className="text-gold/80">+ {e.name} (${e.price.toFixed(2)})</li>
                    ))}
                    {i.removed.map((r) => (
                      <li key={`r-${r.id}`}>− sin {r.name}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            {employee && <div className="flex justify-between text-success"><span>Descuento empleado</span><span>-${discount.toFixed(2)}</span></div>}
            <div className="flex justify-between pt-2 text-lg font-semibold"><span>Total</span><span className="text-gold">${total.toFixed(2)}</span></div>
          </div>
          <Button disabled={busy} onClick={placeOrder} size="lg" className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar Pedido
          </Button>
          <p className="text-center text-xs text-muted-foreground">Pago al recibir en tu tienda.</p>
        </div>
      </div>
    </div>
  );
}
