import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { buildWhatsAppOrderMessage, openWhatsAppOrder, PAYMENT_LABELS, type PaymentMethod, type DeliveryType } from "@/lib/whatsapp-order";
import { DEFAULT_BCV_RATE, useBcvRate, formatBsLabel } from "@/lib/bcv";

export const Route = createFileRoute("/checkout")({ component: Checkout });

const SERVICE_FEE = 0.5;
const EMPLOYEE_DISCOUNT_RATE = 0.10;
const roundCurrency = (value: number) => Number(value.toFixed(2));

interface RestaurantSettings {
  name: string;
  delivery_pickup: boolean; delivery_to_store: boolean;
  payment_pago_movil: boolean; payment_whatsapp: boolean;
  payment_en_caja: boolean; payment_efectivo: boolean; payment_punto_entrega: boolean;
  whatsapp_number: string; pago_movil_info: string;
}

function Checkout() {
  const navigate = useNavigate();
  const { user, profile, roles, loading } = useAuth();
  const { items, subtotal, clear, restaurantId } = useCart();
  const employee = roles.some((role) => role === "supervisor" || role === "worker");
  const discount = employee && items.length > 0 ? roundCurrency(subtotal * EMPLOYEE_DISCOUNT_RATE) : 0;
  const serviceFee = items.length > 0 ? SERVICE_FEE : 0;
  const [tipChoice, setTipChoice] = useState<"none" | "5" | "10" | "15" | "custom">("none");
  const [tipCustom, setTipCustom] = useState<string>("");
  const tip = useMemo(() => {
    if (items.length === 0) return 0;
    if (tipChoice === "none") return 0;
    if (tipChoice === "custom") {
      const v = parseFloat(tipCustom.replace(",", "."));
      return Number.isFinite(v) && v > 0 ? roundCurrency(v) : 0;
    }
    const pct = Number(tipChoice) / 100;
    return roundCurrency(subtotal * pct);
  }, [tipChoice, tipCustom, subtotal, items.length]);
  const total = roundCurrency(Math.max(0, subtotal - discount + serviceFee + tip));
  const { rate: bcvRate, date: bcvDate } = useBcvRate();

  const [store, setStore] = useState("");
  const [floor, setFloor] = useState("1");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoSettings, setRestoSettings] = useState<RestaurantSettings | null>(null);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("to_store");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/checkout" } as never });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setStore(profile.store_name || "");
      setFloor(profile.store_floor || "1");
    }
  }, [profile]);

  useEffect(() => {
    if (items.length === 0 || !restaurantId) return;
    (async () => {
      const { data } = await supabase.from("restaurants")
        .select("name,delivery_pickup,delivery_to_store,payment_pago_movil,payment_whatsapp,payment_en_caja,payment_efectivo,payment_punto_entrega,whatsapp_number,pago_movil_info")
        .eq("id", restaurantId).maybeSingle();
      if (data) {
        setRestoSettings(data as RestaurantSettings);
        if (!data.delivery_to_store && data.delivery_pickup) setDeliveryType("pickup");
      }
    })();
  }, [items.length, restaurantId]);

  const availablePayments = useMemo<PaymentMethod[]>(() => {
    if (!restoSettings) return ["pago_movil", "whatsapp", "en_caja", "efectivo", "punto_entrega"];
    const any = restoSettings.payment_pago_movil || restoSettings.payment_whatsapp || restoSettings.payment_en_caja || restoSettings.payment_efectivo || restoSettings.payment_punto_entrega;
    if (!any) return ["pago_movil", "whatsapp", "en_caja", "efectivo", "punto_entrega"];
    const list: PaymentMethod[] = [];
    if (restoSettings.payment_pago_movil) list.push("pago_movil");
    if (restoSettings.payment_whatsapp) list.push("whatsapp");
    if (restoSettings.payment_en_caja) list.push("en_caja");
    if (restoSettings.payment_efectivo) list.push("efectivo");
    if (restoSettings.payment_punto_entrega) list.push("punto_entrega");
    return list;
  }, [restoSettings]);

  useEffect(() => {
    if (!paymentMethod && availablePayments.length > 0) setPaymentMethod(availablePayments[0]);
  }, [availablePayments, paymentMethod]);

  const showStoreFields = deliveryType === "to_store";
  const deliveryOptions = restoSettings
    ? [
        ...(restoSettings.delivery_to_store ? [{ v: "to_store" as const, t: "Recibir en mi tienda", s: "El food runner lleva tu pedido" }] : []),
        ...(restoSettings.delivery_pickup ? [{ v: "pickup" as const, t: "Recoger en el restaurante", s: `Pasa a buscar tu pedido en ${restoSettings.name}` }] : []),
      ]
    : [{ v: "to_store" as const, t: "Recibir en mi tienda", s: "El food runner lleva tu pedido" }];

  const placeOrder = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: testRead } = await supabase
      .from("bcv_rates")
      .select("rate")
      .limit(1)
      .single();
    const supabaseURL = (supabase as unknown as { supabaseUrl: string }).supabaseUrl;
    console.log("DIAGNOSTICS:", {
      userID: user?.id,
      supabaseURL,
      bcvRateRead: testRead?.rate,
      projectMatch: supabaseURL.includes("fgqoixfbnivyctduubwz"),
    });
    if (!user || items.length === 0 || !restaurantId) return;
    if (!paymentMethod) { toast.error("Selecciona un método de pago"); return; }
    if (showStoreFields && !store.trim()) { toast.error("Indica el nombre de tu tienda"); return; }
    setBusy(true);
    const { data: rateData, error: rateError } = await supabase
      .from("bcv_rates")
      .select("rate, date")
      .order("date", { ascending: false })
      .limit(1)
      .single();
    if (rateError) console.error("BCV rate error:", rateError);
    const bcvRateSnapshot = Number(rateData?.rate ?? bcvRate ?? DEFAULT_BCV_RATE);
    const orderData = {
      customer_id: user.id,
      restaurant_id: restaurantId,
      subtotal,
      discount_amount: discount,
      total,
      delivery_store: showStoreFields ? store.trim() : (restoSettings?.name ?? "Recoger en local"),
      delivery_floor: showStoreFields ? floor : "—",
      notes: notes.trim(),
      status: "pending",
      payment_method: paymentMethod,
      delivery_type: deliveryType,
      bcv_rate_snapshot: bcvRateSnapshot,
      total_bs: Number((total * bcvRateSnapshot).toFixed(2)),
    };
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({ ...orderData })
      .select()
      .single();
    if (orderError || !order) {
      console.error("ORDER INSERT FAILED:", JSON.stringify(orderError));
      alert("Error guardando orden: " + (orderError?.message || "desconocido") + " Code: " + (orderError?.code || "unknown"));
      setBusy(false);
      toast.error("Error al guardar pedido: " + (orderError?.message || "desconocido"));
      return;
    }
    console.log("ORDER SAVED:", order.id, "to Supabase project fgqoixfbnivyctduubwz");
    const cartItems = items;
    console.log("About to insert items:", JSON.stringify(cartItems));
    console.log("Order ID for items:", order.id);
    for (const item of cartItems) {
      const orderItemPayload = {
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity,
        customizations: {
          base_price: item.base_price,
          variant: item.variant,
          extras: item.extras || [],
          removed: item.removed || [],
          notes: item.notes || null,
        },
      };
      console.log("Inserting order item payload:", JSON.stringify(orderItemPayload));
      const { data: orderItem, error: itemError } = await supabase
        .from("order_items")
        .insert(orderItemPayload as never)
        .select()
        .single();
      if (itemError) {
        console.error("ORDER ITEM FAILED:", JSON.stringify(itemError), { item, orderId: order.id });
        alert("Item insert failed: " + itemError.message + "\nCode: " + itemError.code);
        setBusy(false);
        toast.error("Error al guardar item: " + itemError.message);
        return;
      }
      console.log("Item saved:", orderItem);
    }
    // WhatsApp redirect for non-en_caja methods
    if (paymentMethod !== "en_caja" && paymentMethod !== "efectivo" && paymentMethod !== "punto_entrega") {
      const msg = buildWhatsAppOrderMessage({
        orderNumber: order.order_number,
        createdAt: new Date(order.created_at),
        items: items.map((i) => ({
          quantity: i.quantity, name: i.name, unitPrice: i.unit_price,
          extras: i.extras.map((e) => ({ name: e.name, price: e.price })),
          removed: i.removed.map((r) => r.name),
        })),
        deliveryType,
        deliveryStore: showStoreFields ? store.trim() : (restoSettings?.name ?? ""),
        deliveryFloor: showStoreFields ? floor : "",
        paymentMethod,
        subtotal, discount, total, serviceFee,
        notes: notes.trim(),
        bcvRate: bcvRateSnapshot, bcvDate: rateData?.date ?? bcvDate,
      });
      openWhatsAppOrder(restoSettings?.whatsapp_number || "+584120690379", msg);
    }
    clear();
    toast.success(`Pedido #${order.order_number} confirmado`);
    navigate({ to: "/orders/$id", params: { id: order.id } });
  };

  const paymentFooter = paymentMethod === "pago_movil" ? "Coordina el Pago Móvil por WhatsApp."
    : paymentMethod === "whatsapp" ? "Confirma tu pago por WhatsApp."
    : paymentMethod === "en_caja" ? "Pago al recoger en el local."
    : paymentMethod === "efectivo" ? "Pago en efectivo al recibir."
    : paymentMethod === "punto_entrega" ? "Pago con tarjeta en el punto al recibir."
    : "";

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
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold">Entrega</h2>
          {deliveryOptions.length > 1 && (
            <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as DeliveryType)} className="space-y-2">
              {deliveryOptions.map((o) => (
                <label key={o.v} htmlFor={`d-${o.v}`} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${deliveryType === o.v ? "border-gold bg-gold/5" : "border-border"}`}>
                  <RadioGroupItem value={o.v} id={`d-${o.v}`} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{o.t}</div>
                    <div className="text-xs text-muted-foreground">{o.s}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}
          {showStoreFields ? (
            <>
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
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Te avisaremos cuando esté listo para recoger.
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="n">Notas (opcional)</Label>
            <Textarea id="n" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Sin cebolla, extra salsa, etc." />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-card p-6">
          <h2 className="font-heading text-xl font-bold">Método de pago</h2>
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-2">
            {availablePayments.map((m) => (
              <label key={m} htmlFor={`p-${m}`} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${paymentMethod === m ? "border-gold bg-gold/5" : "border-border"}`}>
                <RadioGroupItem value={m} id={`p-${m}`} />
                <span className="text-sm font-medium">{PAYMENT_LABELS[m]}</span>
              </label>
            ))}
          </RadioGroup>
          <div className="rounded-lg border border-border bg-background p-3 text-xs">
            <div className="font-semibold">💱 Tasa BCV: Bs. {bcvRate.toFixed(2)}/$</div>
            <div className="text-muted-foreground">Válida al {bcvDate}</div>
          </div>
          {paymentMethod === "pago_movil" && restoSettings?.pago_movil_info && (
            <div className="rounded-lg border border-border bg-background p-3 text-xs">
              <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">Datos Pago Móvil</div>
              <pre className="whitespace-pre-wrap font-sans text-foreground">{restoSettings.pago_movil_info}</pre>
            </div>
          )}
          {paymentMethod === "pago_movil" && (
            <div className="rounded-lg border-2 border-sky-500/40 bg-sky-500/10 p-4 text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">📱 Monto a transferir</div>
              <div className="mt-1 font-heading text-2xl font-bold text-foreground">{formatBsLabel(total, bcvRate)}</div>
              <div className="text-xs text-muted-foreground">(equivalente a ${total.toFixed(2)} USD)</div>
              <div className="mt-2 text-[11px] text-muted-foreground">Tasa BCV del día: {bcvRate.toFixed(2)} Bs/$</div>
            </div>
          )}
          {paymentMethod !== "en_caja" && paymentMethod !== "efectivo" && paymentMethod !== "punto_entrega" && (
            <p className="text-xs text-muted-foreground">Al confirmar, se abrirá WhatsApp para coordinar el pago.</p>
          )}
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
            {employee && <div className="flex justify-between text-success"><span>Descuento empleado (10%)</span><span>-${discount.toFixed(2)}</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>Tarifa de servicio</span><span>+${serviceFee.toFixed(2)}</span></div>
            <div className="flex justify-between pt-2 text-lg font-semibold"><span>Total USD</span><span className="text-gold">${total.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-medium"><span className="text-muted-foreground">Total Bs.</span><span>{formatBsLabel(total, bcvRate)}</span></div>
            <div className="pt-1 text-[11px] text-muted-foreground">💱 Tasa BCV: {bcvRate.toFixed(2)} Bs/$</div>
          </div>
          <Button disabled={busy} onClick={placeOrder} size="lg" className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar Pedido
          </Button>
          <p className="text-center text-xs text-muted-foreground">{paymentFooter}</p>
        </div>
      </div>
    </div>
  );
}
