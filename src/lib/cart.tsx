import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartExtra { id: string; name: string; price: number }
export interface CartRemoved { id: string; name: string }

export interface CartItem {
  /** Unique per (item + variant + extras + removed) combination. */
  cart_key: string;
  /** Real menu_items.id (FK to DB). */
  menu_item_id: string;
  restaurant_id: string;
  name: string;
  /** Final unit price (base + extras). */
  unit_price: number;
  base_price: number;
  variant: string | null;
  extras: CartExtra[];
  removed: CartRemoved[];
  notes?: string;
  quantity: number;
}

export type AddCartInput = Omit<CartItem, "quantity" | "cart_key"> & { cart_key?: string };

interface CartCtx {
  items: CartItem[];
  add: (i: AddCartInput) => void;
  update: (oldKey: string, i: AddCartInput) => void;
  setQty: (cartKey: string, qty: number) => void;
  remove: (cartKey: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  restaurantId: string | null;
}

const Ctx = createContext<CartCtx | null>(null);

function buildCartKey(i: AddCartInput): string {
  const parts: string[] = [i.menu_item_id];
  if (i.variant) parts.push(`v:${i.variant}`);
  if (i.extras.length) parts.push("e:" + [...i.extras].map((e) => e.id).sort().join(","));
  if (i.removed.length) parts.push("r:" + [...i.removed].map((r) => r.id).sort().join(","));
  if (i.notes && i.notes.trim()) parts.push("n:" + i.notes.trim().toLowerCase());
  return parts.join("::");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem("tg_cart") || "[]");
      // Migrate legacy entries (no cart_key/extras fields)
      return (raw as CartItem[]).map((it) => ({
        cart_key: it.cart_key ?? it.menu_item_id,
        menu_item_id: it.menu_item_id,
        restaurant_id: it.restaurant_id,
        name: it.name,
        unit_price: it.unit_price,
        base_price: it.base_price ?? it.unit_price,
        variant: it.variant ?? null,
        extras: it.extras ?? [],
        removed: it.removed ?? [],
        notes: it.notes ?? "",
        quantity: it.quantity,
      }));
    } catch { return []; }
  });

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("tg_cart", JSON.stringify(items));
  }, [items]);

  const add: CartCtx["add"] = (input) => {
    const cart_key = input.cart_key ?? buildCartKey(input);
    setItems((prev) => {
      // Different restaurant → replace cart
      if (prev.length && prev[0].restaurant_id !== input.restaurant_id) {
        return [{ ...input, cart_key, quantity: 1 }];
      }
      const existing = prev.find((p) => p.cart_key === cart_key);
      if (existing) {
        return prev.map((p) => p.cart_key === cart_key ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...input, cart_key, quantity: 1 }];
    });
  };

  const setQty: CartCtx["setQty"] = (cartKey, qty) => {
    setItems((prev) => qty <= 0
      ? prev.filter((p) => p.cart_key !== cartKey)
      : prev.map((p) => p.cart_key === cartKey ? { ...p, quantity: qty } : p));
  };
  const remove = (cartKey: string) => setItems((p) => p.filter((x) => x.cart_key !== cartKey));
  const clear = () => setItems([]);

  const update: CartCtx["update"] = (oldKey, input) => {
    const newKey = input.cart_key ?? buildCartKey(input);
    setItems((prev) => {
      const old = prev.find((p) => p.cart_key === oldKey);
      if (!old) return prev;
      const qty = old.quantity;
      const withoutOld = prev.filter((p) => p.cart_key !== oldKey);
      const collision = withoutOld.find((p) => p.cart_key === newKey);
      if (collision) {
        return withoutOld.map((p) =>
          p.cart_key === newKey ? { ...p, quantity: p.quantity + qty } : p,
        );
      }
      return [...withoutOld, { ...input, cart_key: newKey, quantity: qty }];
    });
  };

  const count = items.reduce((a, b) => a + b.quantity, 0);
  const subtotal = items.reduce((a, b) => a + b.unit_price * b.quantity, 0);
  const restaurantId = items[0]?.restaurant_id ?? null;

  return <Ctx.Provider value={{ items, add, update, setQty, remove, clear, count, subtotal, restaurantId }}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};
