import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type CartItem } from "@/lib/cart";
import { toast } from "sonner";

interface Extra { id: string; name: string; price: number }
interface Removable { id: string; name: string }
interface MenuItem {
  id: string; restaurant_id: string; name: string; price: number; image_url: string | null;
  options: string[] | null;
  menu_item_extras: Extra[];
  menu_item_removable_options: Removable[];
}

export function CartItemEditor({
  item, open, onOpenChange,
}: {
  item: CartItem | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const { update } = useCart();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MenuItem | null>(null);
  const [variant, setVariant] = useState<string>("");
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!open || !item) return;
    setLoading(true);
    setData(null);
    (async () => {
      const { data: m, error } = await supabase
        .from("menu_items")
        .select("id, restaurant_id, name, price, image_url, options, menu_item_extras(id,name,price), menu_item_removable_options(id,name)")
        .eq("id", item.menu_item_id)
        .maybeSingle();
      if (error || !m) {
        toast.error("No se pudo cargar el plato");
        setLoading(false); onOpenChange(false); return;
      }
      const mi = m as unknown as MenuItem;
      setData(mi);
      setVariant(item.variant ?? (Array.isArray(mi.options) && mi.options.length ? mi.options[0] : ""));
      setExtras(new Set(item.extras.map((e) => e.id)));
      setRemoved(new Set(item.removed.map((r) => r.id)));
      setNotes(item.notes ?? "");
      setLoading(false);
    })();
  }, [open, item, onOpenChange]);

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  };

  const save = () => {
    if (!item || !data) return;
    const chosenExtras = data.menu_item_extras.filter((e) => extras.has(e.id))
      .map((e) => ({ id: e.id, name: e.name, price: Number(e.price) }));
    const chosenRemoved = data.menu_item_removable_options.filter((r) => removed.has(r.id))
      .map((r) => ({ id: r.id, name: r.name }));
    const base = Number(data.price);
    const unit = base + chosenExtras.reduce((a, e) => a + e.price, 0);
    update(item.cart_key, {
      menu_item_id: data.id,
      restaurant_id: data.restaurant_id,
      name: data.name,
      base_price: base,
      unit_price: unit,
      variant: variant || null,
      extras: chosenExtras,
      removed: chosenRemoved,
      notes: notes.trim() || undefined,
    });
    toast.success("Cambios guardados");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-sm overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle className="px-5 pt-5">{item?.name ?? "Editar"}</DialogTitle>
        </DialogHeader>

        {loading || !data ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-gold" /></div>
        ) : (
          <div className="max-h-[64vh] space-y-4 overflow-y-auto px-5 pb-2">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-background">
              {data.image_url ? (
                <img src={data.image_url} alt={data.name} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl">🍔</div>
              )}
            </div>
            {Array.isArray(data.options) && data.options.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opción</div>
                <RadioGroup value={variant} onValueChange={setVariant} className="gap-2">
                  {data.options.map((opt) => (
                    <Label key={opt} htmlFor={`eo-${opt}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 hover:border-gold/40">
                      <RadioGroupItem id={`eo-${opt}`} value={opt} />
                      <span className="text-sm">{opt}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {data.menu_item_extras.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Extras</div>
                <div className="space-y-2">
                  {data.menu_item_extras.map((e) => (
                    <Label key={e.id} htmlFor={`ee-${e.id}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 hover:border-gold/40">
                      <Checkbox id={`ee-${e.id}`} checked={extras.has(e.id)} onCheckedChange={() => setExtras((s) => toggle(s, e.id))} />
                      <span className="flex-1 text-sm">{e.name}</span>
                      <span className="text-sm text-gold">+${Number(e.price).toFixed(2)}</span>
                    </Label>
                  ))}
                </div>
              </div>
            )}

            {data.menu_item_removable_options.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quitar ingredientes</div>
                <div className="space-y-2">
                  {data.menu_item_removable_options.map((r) => (
                    <Label key={r.id} htmlFor={`er-${r.id}`} className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card p-3 hover:border-gold/40">
                      <Checkbox id={`er-${r.id}`} checked={removed.has(r.id)} onCheckedChange={() => setRemoved((s) => toggle(s, r.id))} />
                      <span className="text-sm">Sin {r.name}</span>
                    </Label>
                  ))}
                </div>
              </div>
            )}

            {data.menu_item_extras.length === 0 &&
             data.menu_item_removable_options.length === 0 &&
             (!Array.isArray(data.options) || data.options.length === 0) && (
              <p className="text-sm text-muted-foreground">Este plato no tiene extras ni ingredientes para quitar.</p>
            )}

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notas para la cocina
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: término medio, sin sal, alergia a nueces…"
                rows={3}
                maxLength={300}
                className="resize-none"
              />
              <div className="mt-1 text-right text-[10px] text-muted-foreground">{notes.length}/300</div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border bg-card px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!data} className="bg-gold text-primary-foreground hover:bg-gold/90">Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}