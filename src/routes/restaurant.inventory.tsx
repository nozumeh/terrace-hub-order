import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft, Plus, Trash2, FileUp, Search, X, Upload, Save } from "lucide-react";
import { toast } from "sonner";
import { CsvImportDialog } from "@/components/CsvImportDialog";

export const Route = createFileRoute("/restaurant/inventory")({ component: Inventory });

interface Item {
  id: string; name: string; description: string | null; category: string;
  price: number; image_url: string | null; is_available: boolean;
}
interface Extra { id: string; menu_item_id: string; name: string; price: number }
interface Removable { id: string; menu_item_id: string; name: string }

const QUICK_EXTRAS = [
  { name: "Queso", price: 0.5 }, { name: "Bacon", price: 1.0 },
  { name: "Aguacate", price: 0.75 }, { name: "Huevo", price: 0.5 },
  { name: "Doble carne", price: 2.0 }, { name: "Jalapeños", price: 0.5 },
];
const DEFAULT_REMOVABLES = ["Lechuga","Tomate","Cebolla","Pepinillos","Mostaza","Mayonesa","Queso","Tocineta","Salsa"];

function Inventory() {
  const { user, loading, isRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("Todos");
  const [csvOpen, setCsvOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => { if (!loading && !isRestaurantOwner) navigate({ to: "/" }); }, [loading, isRestaurantOwner, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
    if (!r) { setBusy(false); return; }
    setRestaurantId(r.id);
    const { data: m } = await supabase.from("menu_items")
      .select("id,name,description,category,price,image_url,is_available")
      .eq("restaurant_id", r.id).order("category").order("name");
    const list = (m ?? []) as Item[];
    setItems(list);
    setCategories(Array.from(new Set(list.map((x) => x.category))).sort());
    setBusy(false);
  };

  useEffect(() => { if (user && isRestaurantOwner) load(); }, [user, isRestaurantOwner]);

  const toggleAvail = async (id: string, current: boolean) => {
    const { error } = await supabase.from("menu_items").update({ is_available: !current }).eq("id", id);
    if (error) toast.error("❌ Error al guardar");
    else {
      setItems((xs) => xs.map((x) => x.id === id ? { ...x, is_available: !current } : x));
      toast.success(!current ? "✓ Disponible" : "✓ Agotado");
    }
  };

  const openNew = () => {
    if (!restaurantId) return;
    setIsNew(true);
    setEditing({ id: "", name: "", description: "", category: categories[0] ?? "Otros", price: 0, image_url: "", is_available: true });
  };

  const openEdit = (it: Item) => { setIsNew(false); setEditing(it); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (activeCat !== "Todos" && i.category !== activeCat) return false;
      if (q && !i.name.toLowerCase().includes(q) && !(i.description ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, activeCat]);

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Button asChild variant="ghost" size="sm"><Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Volver</Link></Button>
            <h1 className="mt-2 font-heading text-3xl font-bold">Inventario</h1>
            <p className="text-sm text-muted-foreground">{items.length} productos · {items.filter((i) => i.is_available).length} disponibles</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openNew} className="bg-gold text-primary-foreground hover:bg-gold/90"><Plus className="h-4 w-4" /> Incluir Inventario</Button>
            <Button onClick={() => setCsvOpen(true)} variant="outline"><FileUp className="h-4 w-4" /> Importar CSV</Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {["Todos", ...categories].map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
                  activeCat === c ? "border-gold bg-gold text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No hay productos. <button onClick={openNew} className="text-gold hover:underline">Agregar el primero →</button></div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {i.image_url ? <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">—</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{i.name}</div>
                    {i.description && <div className="line-clamp-1 text-xs text-muted-foreground">{i.description}</div>}
                    <div className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">{i.category}</div>
                  </div>
                  <div className="font-mono text-sm font-bold text-gold">${Number(i.price).toFixed(2)}</div>
                  <label className="flex items-center gap-2">
                    <Switch checked={i.is_available} onCheckedChange={() => toggleAvail(i.id, i.is_available)} />
                    <span className={`text-xs font-medium ${i.is_available ? "text-emerald-500" : "text-destructive"}`}>
                      {i.is_available ? "🟢 HAY" : "🔴 AGOTADO"}
                    </span>
                  </label>
                  <Button size="sm" variant="outline" onClick={() => openEdit(i)}>Editar</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {restaurantId && (
        <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} restaurantId={restaurantId} onImported={load} />
      )}

      <EditPanel
        item={editing}
        isNew={isNew}
        categories={categories}
        restaurantId={restaurantId}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }}
      />
    </div>
  );
}

function EditPanel({ item, isNew, categories, restaurantId, onClose, onSaved }: {
  item: Item | null; isNew: boolean; categories: string[]; restaurantId: string | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Item | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [removables, setRemovables] = useState<Removable[]>([]);
  const [removedRemovables, setRemovedRemovables] = useState<string[]>([]);
  const [newRemovable, setNewRemovable] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(item ? { ...item } : null);
    setRemovedRemovables([]);
    setNewRemovable("");
    if (!item || isNew) { setExtras([]); setRemovables([]); return; }
    (async () => {
      const [{ data: ex }, { data: rm }] = await Promise.all([
        supabase.from("menu_item_extras").select("*").eq("menu_item_id", item.id),
        supabase.from("menu_item_removable_options").select("*").eq("menu_item_id", item.id),
      ]);
      setExtras((ex ?? []) as Extra[]);
      setRemovables((rm ?? []) as Removable[]);
    })();
  }, [item, isNew]);

  if (!draft) return null;

  const uploadImage = async (file: File) => {
    if (!restaurantId) return;
    setUploading(true);
    const path = `${restaurantId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file, { upsert: true });
    if (error) { setUploading(false); toast.error(error.message); return; }
    const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
    setDraft({ ...draft, image_url: data.publicUrl });
    setUploading(false);
    toast.success("✓ Imagen subida");
  };

  const addExtraLocal = (name = "", price = 0) => {
    setExtras((xs) => [...xs, { id: `tmp-${Date.now()}-${Math.random()}`, menu_item_id: draft.id, name, price }]);
  };
  const updateExtra = (id: string, patch: Partial<Extra>) =>
    setExtras((xs) => xs.map((e) => e.id === id ? { ...e, ...patch } : e));
  const removeExtra = (id: string) => setExtras((xs) => xs.filter((e) => e.id !== id));

  const toggleRemovable = (name: string) => {
    const existing = removables.find((r) => r.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setRemovables((xs) => xs.filter((x) => x.id !== existing.id));
      if (!existing.id.startsWith("tmp-")) setRemovedRemovables((p) => [...p, existing.id]);
    } else {
      setRemovables((xs) => [...xs, { id: `tmp-${Date.now()}-${Math.random()}`, menu_item_id: draft.id, name }]);
    }
  };
  const addCustomRemovable = () => {
    const n = newRemovable.trim();
    if (!n) return;
    setRemovables((xs) => [...xs, { id: `tmp-${Date.now()}-${Math.random()}`, menu_item_id: draft.id, name: n }]);
    setNewRemovable("");
  };

  const save = async () => {
    if (!restaurantId || !draft.name.trim()) { toast.error("Nombre requerido"); return; }
    setSaving(true);
    let id = draft.id;
    if (isNew) {
      const { data, error } = await supabase.from("menu_items").insert({
        restaurant_id: restaurantId, name: draft.name, description: draft.description ?? "",
        category: draft.category, price: draft.price, image_url: draft.image_url ?? "", is_available: draft.is_available,
      }).select().single();
      if (error || !data) { setSaving(false); toast.error("❌ Error al guardar"); return; }
      id = data.id;
    } else {
      const { error } = await supabase.from("menu_items").update({
        name: draft.name, description: draft.description ?? "", category: draft.category,
        price: draft.price, image_url: draft.image_url ?? "", is_available: draft.is_available,
      }).eq("id", id);
      if (error) { setSaving(false); toast.error("❌ Error al guardar"); return; }
    }

    // Extras: delete removed, insert new
    const newExtras = extras.filter((e) => e.id.startsWith("tmp-")).filter((e) => e.name.trim());
    const keptExtras = extras.filter((e) => !e.id.startsWith("tmp-"));
    if (!isNew) {
      const { data: dbEx } = await supabase.from("menu_item_extras").select("id").eq("menu_item_id", id);
      const toDelete = (dbEx ?? []).filter((e) => !keptExtras.find((k) => k.id === e.id)).map((e) => e.id);
      if (toDelete.length) await supabase.from("menu_item_extras").delete().in("id", toDelete);
      for (const e of keptExtras) {
        await supabase.from("menu_item_extras").update({ name: e.name, price: e.price }).eq("id", e.id);
      }
    }
    if (newExtras.length) {
      await supabase.from("menu_item_extras").insert(newExtras.map((e) => ({ menu_item_id: id, name: e.name, price: e.price })));
    }

    // Removables: delete and insert new
    if (removedRemovables.length) await supabase.from("menu_item_removable_options").delete().in("id", removedRemovables);
    const newRem = removables.filter((r) => r.id.startsWith("tmp-")).filter((r) => r.name.trim());
    if (newRem.length) {
      await supabase.from("menu_item_removable_options").insert(newRem.map((r) => ({ menu_item_id: id, name: r.name })));
    }

    setSaving(false);
    toast.success("✓ Guardado");
    onSaved();
  };

  const remove = async () => {
    if (!confirm("¿Eliminar este producto?")) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", draft.id);
    if (error) toast.error("❌ Error al borrar"); else { toast.success("✓ Eliminado"); onSaved(); }
  };

  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto pb-32 sm:max-w-[480px]">
        <SheetHeader><SheetTitle>{isNew ? "Nuevo producto" : "Editar producto"}</SheetTitle></SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Info básica */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Info básica</h3>
            <div className="space-y-2"><Label>Nombre</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <div className="flex gap-2">
                <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([...categories, draft.category, "Otros"])).filter(Boolean).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="w-32" placeholder="Nueva..." onBlur={(e) => { if (e.target.value.trim()) { setDraft({ ...draft, category: e.target.value.trim() }); e.target.value = ""; } }} />
              </div>
            </div>
            <div className="space-y-2"><Label>Descripción</Label><Textarea rows={3} maxLength={200} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div className="space-y-2"><Label>Precio</Label><Input type="number" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: parseFloat(e.target.value) || 0 })} /></div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
              <Label>HAY disponible</Label>
              <Switch checked={draft.is_available} onCheckedChange={(v) => setDraft({ ...draft, is_available: v })} />
            </div>
          </section>

          {/* Imagen */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Imagen</h3>
            <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-muted">
              {draft.image_url ? <img src={draft.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Sin imagen</div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Subir nueva imagen
              </Button>
              {draft.image_url && <Button variant="ghost" onClick={() => setDraft({ ...draft, image_url: "" })}><X className="h-4 w-4" /> Quitar</Button>}
            </div>
          </section>

          {/* Extras */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Agregar extra a tu pedido</h3>
            <p className="text-xs text-muted-foreground">Ingredientes adicionales que el cliente puede seleccionar</p>
            <ul className="space-y-2">
              {extras.map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <Input placeholder="🍕 nombre" value={e.name} onChange={(ev) => updateExtra(e.id, { name: ev.target.value })} />
                  <Input type="number" step="0.01" className="w-24" value={e.price} onChange={(ev) => updateExtra(e.id, { price: parseFloat(ev.target.value) || 0 })} />
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => removeExtra(e.id)}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
            <Button size="sm" variant="outline" onClick={() => addExtraLocal()}><Plus className="h-3 w-3" /> Agregar extra</Button>
            <div className="flex flex-wrap gap-2">
              {QUICK_EXTRAS.map((q) => (
                <button key={q.name} type="button" onClick={() => addExtraLocal(q.name, q.price)} className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs text-gold hover:bg-gold/20">
                  + {q.name} ${q.price.toFixed(2)}
                </button>
              ))}
            </div>
          </section>

          {/* Removables */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold">Remover de mi pedido</h3>
            <p className="text-xs text-muted-foreground">El cliente puede pedir que se quiten estos ingredientes</p>
            <div className="grid grid-cols-2 gap-2">
              {Array.from(new Set([...DEFAULT_REMOVABLES, ...removables.map((r) => r.name)])).map((n) => {
                const checked = !!removables.find((r) => r.name.toLowerCase() === n.toLowerCase());
                return (
                  <label key={n} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-sm">
                    <Checkbox checked={checked} onCheckedChange={() => toggleRemovable(n)} />
                    {n}
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Personalizado..." value={newRemovable} onChange={(e) => setNewRemovable(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomRemovable(); } }} />
              <Button size="sm" variant="outline" onClick={addCustomRemovable}><Plus className="h-3 w-3" /> Agregar</Button>
            </div>
          </section>

          {!isNew && (
            <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={remove}>
              <Trash2 className="h-4 w-4" /> Eliminar producto
            </Button>
          )}
        </div>

        {/* Sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-border bg-background p-3 sm:left-auto sm:w-[480px]">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 bg-gold text-primary-foreground hover:bg-gold/90" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
