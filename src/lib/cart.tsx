import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartItem {
  menu_item_id: string;
  restaurant_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

interface CartCtx {
  items: CartItem[];
  add: (i: Omit<CartItem, "quantity">) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  restaurantId: string | null;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("tg_cart") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("tg_cart", JSON.stringify(items));
  }, [items]);

  const add: CartCtx["add"] = (i) => {
    setItems((prev) => {
      // If different restaurant, replace
      if (prev.length && prev[0].restaurant_id !== i.restaurant_id) {
        return [{ ...i, quantity: 1 }];
      }
      const existing = prev.find((p) => p.menu_item_id === i.menu_item_id);
      if (existing) {
        return prev.map((p) => p.menu_item_id === i.menu_item_id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...i, quantity: 1 }];
    });
  };

  const setQty: CartCtx["setQty"] = (id, qty) => {
    setItems((prev) => qty <= 0 ? prev.filter((p) => p.menu_item_id !== id)
      : prev.map((p) => p.menu_item_id === id ? { ...p, quantity: qty } : p));
  };
  const remove = (id: string) => setItems((p) => p.filter((x) => x.menu_item_id !== id));
  const clear = () => setItems([]);

  const count = items.reduce((a, b) => a + b.quantity, 0);
  const subtotal = items.reduce((a, b) => a + b.unit_price * b.quantity, 0);
  const restaurantId = items[0]?.restaurant_id ?? null;

  return <Ctx.Provider value={{ items, add, setQty, remove, clear, count, subtotal, restaurantId }}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
};