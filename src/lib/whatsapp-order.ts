export type PaymentMethod = "pago_movil" | "whatsapp" | "en_caja" | "efectivo" | "punto_entrega";
export type DeliveryType = "to_store" | "pickup";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pago_movil: "💳 Pago Móvil",
  whatsapp: "📱 Pago por WhatsApp",
  en_caja: "🏪 Pago en local (al recoger)",
  efectivo: "💵 Efectivo (al recibir)",
  punto_entrega: "💳 Punto en entrega (tarjeta)",
};

export interface WhatsAppOrderItem {
  quantity: number;
  name: string;
  unitPrice: number;
  extras?: { name: string; price: number }[];
  removed?: string[];
}

export interface WhatsAppOrderPayload {
  orderNumber: number;
  createdAt: Date;
  items: WhatsAppOrderItem[];
  deliveryType: DeliveryType;
  deliveryStore: string;
  deliveryFloor: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  serviceFee?: number;
  total: number;
  notes?: string;
  bcvRate?: number;
  bcvDate?: string;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function fmtBs(usd: number, rate: number): string {
  return new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(usd * rate);
}

export function buildWhatsAppOrderMessage(p: WhatsAppOrderPayload): string {
  const d = p.createdAt;
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const num = String(p.orderNumber).padStart(4, "0");
  const rate = p.bcvRate ?? 0;
  const withBs = rate > 0;

  const lines: string[] = [];
  lines.push("Hola Capital Burgers 🍔");
  lines.push("");
  lines.push(`PEDIDO #${num}`);
  lines.push(`📅 ${date} - ${time}`);
  lines.push("");
  lines.push("ITEMS:");
  for (const it of p.items) {
    const line = `${it.quantity}× ${it.name} - $${(it.unitPrice * it.quantity).toFixed(2)}`;
    lines.push(withBs ? `${line} (Bs. ${fmtBs(it.unitPrice * it.quantity, rate)})` : line);
    for (const e of it.extras ?? []) lines.push(`  + ${e.name} ($${e.price.toFixed(2)})`);
    for (const r of it.removed ?? []) lines.push(`  - sin ${r}`);
  }
  lines.push("");
  lines.push("ENTREGA:");
  if (p.deliveryType === "pickup") {
    lines.push("🏪 Recoger en restaurante");
  } else {
    lines.push(`📍 Tienda: ${p.deliveryStore}`);
    lines.push(`🏢 Piso: ${p.deliveryFloor}`);
  }
  lines.push("");
  lines.push(`MÉTODO DE PAGO: ${PAYMENT_LABELS[p.paymentMethod]}`);
  lines.push("");
  lines.push(`SUBTOTAL: $${p.subtotal.toFixed(2)}${withBs ? ` (Bs. ${fmtBs(p.subtotal, rate)})` : ""}`);
  if (p.discount > 0) lines.push(`DESCUENTO EMPLEADO (10%): -$${p.discount.toFixed(2)}${withBs ? ` (-Bs. ${fmtBs(p.discount, rate)})` : ""}`);
  if ((p.serviceFee ?? 0) > 0) lines.push(`TARIFA DE SERVICIO: +$${p.serviceFee!.toFixed(2)}${withBs ? ` (+Bs. ${fmtBs(p.serviceFee!, rate)})` : ""}`);
  lines.push("━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`TOTAL: $${p.total.toFixed(2)} USD`);
  if (withBs) {
    lines.push(`TOTAL: Bs. ${fmtBs(p.total, rate)}`);
    lines.push(`💱 Tasa BCV: ${rate.toFixed(2)} Bs/$${p.bcvDate ? ` (${p.bcvDate})` : ""}`);
  }
  if (p.paymentMethod === "pago_movil" && withBs) {
    lines.push("");
    lines.push("💳 DATOS PAGO MÓVIL:");
    lines.push(`Monto exacto: Bs. ${fmtBs(p.total, rate)}`);
  }
  lines.push("");
  lines.push(`📝 Notas: ${p.notes && p.notes.length > 0 ? p.notes : "Sin notas"}`);
  lines.push("");
  lines.push("Por favor confirmar mi pedido ✅");
  return lines.join("\n");
}

export function openWhatsAppOrder(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  if (typeof window !== "undefined") window.open(url, "_blank");
}