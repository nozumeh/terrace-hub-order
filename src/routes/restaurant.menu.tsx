import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/menu")({ component: MenuManager });

interface Category { id: string; name: string; sort_order: number; restaurant_id: string }
interface Item {
  id: string; restaurant_id: string; category_id: string | null; category: string;
  name: string; description: string | null; price: number;
  image_url: string | null; is_available: boolean;
  stock_quantity: number | null;
}
interface Extra { id: string; menu_item_id: string; name: string; price: number }
interface Removable { id: string; menu_item_id: string; name: string }

function MenuManager() {
  const { user, roles, loading, isRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [removables, setRemovables] = useState<Removable[]>([]);

  useEffect(() => {
    if (!loading && !isRestaurantOwner) navigate({ to: "/" });
  }, [loading, roles, navigate]);

  const refresh = async () => {
    if (!user) return;
    setBusy(true);
    let rid = restaurantId;
    if (!rid) {
      const { data: r } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      rid = r?.id ?? null;
      setRestaurantId(rid);
    }
    if (!rid) { setBusy(false); return; }
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("restaurant_id", rid).order("sort_order"),
      supabase.from("menu_items").select("*").eq("restaurant_id", rid).order("name"),
    ]);
    const cats = (c ?? []) as Category[];
    const its = (m ?? []) as Item[];
    setCategories(cats);
    setItems(its);
    if (its.length) {
      const ids = its.map((x) => x.id);
      const [{ data: ex }, { data: rm }] = await Promise.all([
        supabase.from("menu_item_extras").select("*").in("menu_item_id", ids),
        supabase.from("menu_item_removable_options").select("*").in("menu_item_id", ids),
      ]);
      setExtras((ex ?? []) as Extra[]);
      setRemovables((rm ?? []) as Removable[]);
    } else {
      setExtras([]); setRemovables([]);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (user && isRestaurantOwner) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roles]);

  if (busy || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
      </div>
    );
  }

  if (!isRestaurantOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-3xl p-8 text-center text-muted-foreground">
          No tienes permisos para gestionar el menú.
        </div>
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="mx-auto max-w-3xl p-8 text-center text-muted-foreground">
          No tienes un restaurante asignado.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-gold">Restaurante</div>
            <h1 className="font-heading text-3xl font-bold">Gestión de menú</h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Volver al panel</Link>
          </Button>
        </div>

        <Tabs defaultValue="items" className="w-full">
          <TabsList>
            <TabsTrigger value="items">Platos</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4">
            <CategoriesTab
              restaurantId={restaurantId}
              categories={categories}
              onChange={refresh}
            />
          </TabsContent>

          <TabsContent value="items" className="mt-4">
            <ItemsTab
              restaurantId={restaurantId}
              categories={categories}
              items={items}
              extras={extras}
              removables={removables}
              onChange={refresh}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* -------------------- Categorías -------------------- */
function CategoriesTab({
  restaurantId, categories, onChange,
}: { restaurantId: string; categories: Category[]; onChange: () => void }) {
  const { requireRestaurantOwner } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const startNew = () => { setEditing(null); setName(""); setSortOrder(String(categories.length)); setOpen(true); };
  const startEdit = (c: Category) => { setEditing(c); setName(c.name); setSortOrder(String(c.sort_order)); setOpen(true); };

  const save = async () => {
    if (!requireRestaurantOwner()) return;
    if (!name.trim()) { toast.error("Nombre requerido"); return; }
    const payload = { name: name.trim(), sort_order: parseInt(sortOrder) || 0, restaurant_id: restaurantId };
    const { error } = editing
      ? await supabase.from("menu_categories").update(payload).eq("id", editing.id)
      : await supabase.from("menu_categories").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Guardado"); setOpen(false); onChange();
  };

  const remove = async (id: string) => {
    if (!requireRestaurantOwner()) return;
    const { error } = await supabase.from("menu_categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Categoría eliminada"); onChange();
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold">Categorías</h2>
        <Button size="sm" onClick={startNew} className="bg-gold text-primary-foreground hover:bg-gold/90">
          <Plus className="h-3 w-3" /> Nueva categoría
        </Button>
      </div>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin categorías todavía.</p>
      ) : (
        <ul className="divide-y divide-border">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <div className="w-10 text-xs text-muted-foreground">#{c.sort_order}</div>
              <div className="flex-1 font-medium">{c.name}</div>
              <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-3 w-3" /></Button>
              <DeleteButton onConfirm={() => remove(c.id)} label={`Eliminar “${c.name}”`} />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Orden</label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-gold text-primary-foreground hover:bg-gold/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* -------------------- Items -------------------- */
function ItemsTab({
  restaurantId, categories, items, extras, removables, onChange,
}: {
  restaurantId: string; categories: Category[]; items: Item[];
  extras: Extra[]; removables: Removable[]; onChange: () => void;
}) {
  const { requireRestaurantOwner } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [stock, setStock] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<string, Item[]> = {};
    items.forEach((it) => {
      const key = it.category_id ?? "__none__";
      (map[key] ??= []).push(it);
    });
    return map;
  }, [items]);

  const startNew = () => {
    setEditing(null); setName(""); setDescription(""); setPrice("0"); setImageUrl("");
    setCategoryId(categories[0]?.id ?? ""); setIsAvailable(true); setStock(""); setOpen(true);
  };
  const startEdit = (it: Item) => {
    setEditing(it); setName(it.name); setDescription(it.description ?? "");
    setPrice(String(it.price)); setImageUrl(it.image_url ?? "");
    setCategoryId(it.category_id ?? ""); setIsAvailable(it.is_available);
    setStock(it.stock_quantity === null ? "" : String(it.stock_quantity));
    setOpen(true);
  };

  const save = async () => {
    if (!requireRestaurantOwner()) return;
    if (!name.trim()) { toast.error("Nombre requerido"); return; }
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) { toast.error("Precio inválido"); return; }
    const cat = categories.find((c) => c.id === categoryId);
    let stockVal: number | null = null;
    if (stock.trim() !== "") {
      const n = parseInt(stock);
      if (isNaN(n) || n < 0) { toast.error("Stock inválido"); return; }
      stockVal = n;
    }
    const payload = {
      restaurant_id: restaurantId,
      name: name.trim(),
      description: description.trim(),
      price: p,
      image_url: imageUrl.trim(),
      category_id: categoryId || null,
      category: cat?.name ?? "Otros",
      is_available: isAvailable,
      stock_quantity: stockVal,
    };
    const { error } = editing
      ? await supabase.from("menu_items").update(payload).eq("id", editing.id)
      : await supabase.from("menu_items").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Guardado"); setOpen(false); onChange();
  };

  const remove = async (id: string) => {
    if (!requireRestaurantOwner()) return;
    await supabase.from("menu_item_extras").delete().eq("menu_item_id", id);
    await supabase.from("menu_item_removable_options").delete().eq("menu_item_id", id);
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plato eliminado"); onChange();
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    if (!requireRestaurantOwner()) return;
    if (!file.type.startsWith("image/")) { toast.error("El archivo debe ser una imagen"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5 MB"); return; }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("menu-images")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
    toast.success("Imagen cargada");
  };

  const renderGroup = (catId: string, label: string, list: Item[]) => (
    <section key={catId} className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-3 font-heading text-base font-bold">{label}</h3>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin platos.</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              extras={extras.filter((e) => e.menu_item_id === it.id)}
              removables={removables.filter((r) => r.menu_item_id === it.id)}
              onEdit={() => startEdit(it)}
              onDelete={() => remove(it.id)}
              onChange={onChange}
            />
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={startNew} className="bg-gold text-primary-foreground hover:bg-gold/90">
          <Plus className="h-3 w-3" /> Nuevo plato
        </Button>
      </div>

      {categories.map((c) => renderGroup(c.id, c.name, grouped[c.id] ?? []))}
      {grouped["__none__"]?.length ? renderGroup("__none__", "Sin categoría", grouped["__none__"]) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar plato" : "Nuevo plato"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Descripción</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Precio</label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Categoría</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Imagen del plato</label>
              <div className="mt-1 flex items-start gap-3">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-background">
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 text-muted-foreground hover:text-destructive"
                        aria-label="Quitar imagen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted">
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    {uploading ? "Subiendo..." : "Subir imagen"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => { onPickFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
                    />
                  </label>
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="o pega una URL https://..."
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">JPG/PNG/WEBP · máx 5 MB</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Stock (vacío = ilimitado)</label>
                <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Sin control" />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Switch checked={isAvailable} onCheckedChange={setIsAvailable} /> Disponible
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} className="bg-gold text-primary-foreground hover:bg-gold/90">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemRow({
  item, extras, removables, onEdit, onDelete, onChange,
}: {
  item: Item; extras: Extra[]; removables: Removable[];
  onEdit: () => void; onDelete: () => void; onChange: () => void;
}) {
  const { requireRestaurantOwner } = useAuth();
  const [showExtras, setShowExtras] = useState(false);
  const [stockEdit, setStockEdit] = useState<string | null>(null);

  const toggleAvail = async () => {
    if (!requireRestaurantOwner()) return;
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    onChange();
  };

  const saveStock = async () => {
    if (!requireRestaurantOwner()) return;
    const raw = stockEdit ?? "";
    let val: number | null = null;
    if (raw.trim() !== "") {
      const n = parseInt(raw);
      if (isNaN(n) || n < 0) { toast.error("Stock inválido"); return; }
      val = n;
    }
    const { error } = await supabase
      .from("menu_items")
      .update({ stock_quantity: val })
      .eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    setStockEdit(null);
    toast.success("Stock actualizado");
    onChange();
  };

  const stockLabel = item.stock_quantity === null ? "∞" : String(item.stock_quantity);
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-muted-foreground">
            ${Number(item.price).toFixed(2)} · stock {stockLabel}
            {!item.is_available && " · no disponible"}
          </div>
        </div>
        {stockEdit !== null ? (
          <div className="flex items-center gap-1">
            <Input
              type="number" min="0" value={stockEdit}
              onChange={(e) => setStockEdit(e.target.value)}
              placeholder="∞"
              className="h-8 w-20"
            />
            <Button size="sm" onClick={saveStock}>OK</Button>
            <Button size="sm" variant="ghost" onClick={() => setStockEdit(null)}>×</Button>
          </div>
        ) : (
          <Button
            size="sm" variant="outline"
            onClick={() => setStockEdit(item.stock_quantity === null ? "" : String(item.stock_quantity))}
          >
            Stock: {stockLabel}
          </Button>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Disponible <Switch checked={item.is_available} onCheckedChange={toggleAvail} />
        </div>
        <Button size="sm" variant="ghost" onClick={() => setShowExtras((s) => !s)}>
          Extras / removibles ({extras.length}/{removables.length})
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
        <DeleteButton onConfirm={onDelete} label={`Eliminar “${item.name}”`} />
      </div>
      {showExtras && (
        <div className="mt-3 grid gap-4 rounded-lg border border-border bg-background p-4 md:grid-cols-2">
          <ExtrasEditor itemId={item.id} extras={extras} onChange={onChange} />
          <RemovablesEditor itemId={item.id} removables={removables} onChange={onChange} />
        </div>
      )}
    </li>
  );
}

function ExtrasEditor({ itemId, extras, onChange }: { itemId: string; extras: Extra[]; onChange: () => void }) {
  const { requireRestaurantOwner } = useAuth();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const add = async () => {
    if (!requireRestaurantOwner()) return;
    if (!name.trim()) return;
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) { toast.error("Precio inválido"); return; }
    const { error } = await supabase.from("menu_item_extras").insert({
      menu_item_id: itemId, name: name.trim(), price: p,
    });
    if (error) { toast.error(error.message); return; }
    setName(""); setPrice("0"); onChange();
  };
  const remove = async (id: string) => {
    if (!requireRestaurantOwner()) return;
    const { error } = await supabase.from("menu_item_extras").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChange();
  };
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">Extras</div>
      <ul className="space-y-1">
        {extras.map((e) => (
          <li key={e.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1">{e.name}</span>
            <span className="text-muted-foreground">+${Number(e.price).toFixed(2)}</span>
            <Button size="sm" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-3 w-3" /></Button>
          </li>
        ))}
        {extras.length === 0 && <li className="text-xs text-muted-foreground">Ninguno</li>}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className="h-8" />
        <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 w-24" />
        <Button size="sm" onClick={add}><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}

function RemovablesEditor({ itemId, removables, onChange }: { itemId: string; removables: Removable[]; onChange: () => void }) {
  const [name, setName] = useState("");
  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("menu_item_removable_options").insert({
      menu_item_id: itemId, name: name.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setName(""); onChange();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("menu_item_removable_options").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    onChange();
  };
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold">Opciones removibles</div>
      <ul className="space-y-1">
        {removables.map((r) => (
          <li key={r.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1">{r.name}</span>
            <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button>
          </li>
        ))}
        {removables.length === 0 && <li className="text-xs text-muted-foreground">Ninguna</li>}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Cebolla" className="h-8" />
        <Button size="sm" onClick={add}><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}

function DeleteButton({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}