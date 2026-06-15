import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RatableItem {
  menu_item_id: string | null;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  items: RatableItem[];
  onSubmitted?: () => void;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 ${
              n <= value ? "fill-gold text-gold" : "text-muted-foreground/50"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function RatingDialog({
  open, onOpenChange, orderId, userId, restaurantId, restaurantName, items, onSubmitted,
}: Props) {
  const [restoStars, setRestoStars] = useState(0);
  const [itemStars, setItemStars] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  // Dedupe items by menu_item_id so each appears once.
  const uniqueItems = Array.from(
    new Map(items.filter((i) => i.menu_item_id).map((i) => [i.menu_item_id!, i])).values(),
  );

  const submit = async () => {
    if (restoStars < 1) { toast.error("Por favor califica el restaurante"); return; }
    setBusy(true);
    const rows = [
      {
        order_id: orderId, user_id: userId, restaurant_id: restaurantId,
        menu_item_id: null, stars: restoStars,
      },
      ...uniqueItems
        .filter((i) => (itemStars[i.menu_item_id!] ?? 0) > 0)
        .map((i) => ({
          order_id: orderId, user_id: userId, restaurant_id: restaurantId,
          menu_item_id: i.menu_item_id!, stars: itemStars[i.menu_item_id!],
        })),
    ];
    const { error } = await supabase.from("ratings").insert(rows);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("¡Gracias por tu calificación!");
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Califica tu pedido</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <div className="text-sm font-semibold">{restaurantName}</div>
            <p className="text-xs text-muted-foreground">¿Cómo estuvo tu experiencia con el restaurante?</p>
            <div className="mt-2"><StarPicker value={restoStars} onChange={setRestoStars} /></div>
          </div>

          {uniqueItems.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="text-sm font-semibold">Productos (opcional)</div>
              {uniqueItems.map((i) => (
                <div key={i.menu_item_id} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{i.name}</span>
                  <StarPicker
                    value={itemStars[i.menu_item_id!] ?? 0}
                    onChange={(v) => setItemStars((s) => ({ ...s, [i.menu_item_id!]: v }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Ahora no</Button>
          <Button
            onClick={submit}
            disabled={busy || restoStars < 1}
            className="bg-gold text-primary-foreground hover:bg-gold/90"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar calificación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}