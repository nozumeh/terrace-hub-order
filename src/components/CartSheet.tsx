import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth, isEmployee } from "@/lib/auth";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const { items, setQty, remove, subtotal } = useCart();
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const employee = isEmployee(profile, roles);
  const discount = employee && items.length > 0 ? 1 : 0;
  const total = Math.max(0, subtotal - discount);
  const [busy, setBusy] = useState(false);

  const goCheckout = () => {
    setBusy(true);
    if (!user) { navigate({ to: "/login", search: { redirect: "/checkout" } as never }); return; }
    navigate({ to: "/checkout" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col bg-card sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-gold" /> Tu pedido</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Tu carrito está vacío.</div>
          ) : (
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.cart_key} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">${i.unit_price.toFixed(2)} c/u</div>
                      {(i.variant || i.extras.length > 0 || i.removed.length > 0) && (
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {i.variant && <li>· {i.variant}</li>}
                          {i.extras.map((e) => (
                            <li key={`e-${e.id}`} className="text-gold/80">+ {e.name} (${e.price.toFixed(2)})</li>
                          ))}
                          {i.removed.map((r) => (
                            <li key={`r-${r.id}`}>− sin {r.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button onClick={() => remove(i.cart_key)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.cart_key, i.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center text-sm">{i.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(i.cart_key, i.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <div className="font-semibold">${(i.unit_price * i.quantity).toFixed(2)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {items.length > 0 && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            {employee && (
              <div className="flex justify-between text-sm text-success">
                <span>Descuento empleado</span><span>-${discount.toFixed(2)}</span>
              </div>
            )}
            {!user && (
              <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
                Inicia sesión como empleado para obtener <span className="text-gold">$1 de descuento</span>.
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span><span className="text-gold">${total.toFixed(2)}</span>
            </div>
            <Button disabled={busy} onClick={goCheckout} className="w-full bg-gold text-primary-foreground hover:bg-gold/90" size="lg">
              Confirmar Pedido
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}