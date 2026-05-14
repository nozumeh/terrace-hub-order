import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileUp } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restaurantId: string;
  onImported: () => void;
}

interface ParsedItem {
  name: string;
  price: number;
  category: string;
  description: string;
  image_url: string;
  is_available: boolean;
}

// Minimal CSV parser supporting quoted fields with embedded commas, newlines and escaped quotes.
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

function pickFirstImage(s: string): string {
  if (!s) return "";
  const first = s.split(",")[0].trim();
  return first;
}

function normalizeCategory(s: string): string {
  if (!s) return "Otros";
  // WooCommerce categories often look like "Hamburguesas > Premium" or "Cat A | Cat B"
  const first = s.split("|")[0].split(">").pop() || s;
  return first.trim() || "Otros";
}

export function CsvImportDialog({ open, onOpenChange, restaurantId, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setItems([]); setFileName(""); if (fileRef.current) fileRef.current.value = ""; };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) { toast.error("CSV vacío"); return; }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.findIndex((h) => h === name.toLowerCase());
    const iName = idx("Nombre");
    const iPrice = idx("Precio normal");
    const iCat = idx("Categorías");
    const iDesc = idx("Descripción corta");
    const iImg = idx("Imágenes");
    const iStock = idx("¿Existencias?");
    const iType = idx("Tipo");
    if (iName < 0 || iPrice < 0) {
      toast.error("Columnas requeridas faltantes (Nombre, Precio normal)");
      return;
    }
    const parsed: ParsedItem[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const type = (iType >= 0 ? row[iType] : "")?.trim().toLowerCase();
      if (type === "variation") continue;
      const name = (row[iName] ?? "").trim();
      if (!name) continue;
      const priceRaw = (row[iPrice] ?? "").toString().replace(",", ".").trim();
      const price = parseFloat(priceRaw);
      if (isNaN(price)) continue;
      const stockRaw = (iStock >= 0 ? row[iStock] : "1").toString().trim();
      const is_available = stockRaw === "1" || stockRaw.toLowerCase() === "true" || stockRaw.toLowerCase() === "sí" || stockRaw.toLowerCase() === "si";
      parsed.push({
        name,
        price,
        category: normalizeCategory(iCat >= 0 ? row[iCat] : ""),
        description: stripHtml(iDesc >= 0 ? row[iDesc] : ""),
        image_url: pickFirstImage(iImg >= 0 ? row[iImg] : ""),
        is_available,
      });
    }
    if (parsed.length === 0) { toast.error("No se encontraron productos válidos"); return; }
    setItems(parsed);
  };

  const preview = useMemo(() => items.slice(0, 5), [items]);

  const doImport = async () => {
    if (!items.length) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("import_menu_from_csv" as never, {
      _restaurant_id: restaurantId,
      _items: items as never,
    } as never);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`✓ ${data ?? items.length} productos importados correctamente`);
    reset();
    onOpenChange(false);
    onImported();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>Formato WooCommerce — columnas: Nombre, Precio normal, Categorías, Descripción corta, Imágenes, ¿Existencias?, Tipo.</DialogDescription>
        </DialogHeader>

        <label
          htmlFor="csv-file-input"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background p-8 text-center text-sm text-muted-foreground hover:border-gold/60"
        >
          <FileUp className="h-6 w-6" />
          {fileName ? <span className="text-foreground">{fileName}</span> : <span>Click para seleccionar un archivo .csv</span>}
          <input
            id="csv-file-input"
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>

        {preview.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="p-2 text-left">Nombre</th>
                  <th className="p-2 text-left">Categoría</th>
                  <th className="p-2 text-right">Precio</th>
                  <th className="p-2 text-center">Disp.</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 text-muted-foreground">{p.category}</td>
                    <td className="p-2 text-right">${p.price.toFixed(2)}</td>
                    <td className="p-2 text-center">{p.is_available ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={busy}>Cancelar</Button>
          <Button onClick={doImport} disabled={!items.length || busy} className="bg-gold text-primary-foreground hover:bg-gold/90">
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            Importar {items.length} productos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}