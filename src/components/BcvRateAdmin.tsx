import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Pencil, Download } from "lucide-react";
import { toast } from "sonner";
import { useBcvRate, formatBsLabel } from "@/lib/bcv";
import { useAuth } from "@/lib/auth";

interface RateRow { id: string; rate: number; date: string; notes: string | null; created_by: string | null; created_at: string }

const bcvTable = () => (supabase as never as { from: (t: string) => { select: (c: string) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: RateRow[] | null }> } }; upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }> } }).from("bcv_rates");

export function BcvRateAdmin() {
  const { rate, date, refresh } = useBcvRate();
  const { user } = useAuth();
  const [history, setHistory] = useState<RateRow[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), rate: "", notes: "" });

  const loadHistory = async () => {
    const { data } = await bcvTable().select("id,rate,date,notes,created_by,created_at").order("date", { ascending: false }).limit(30);
    setHistory(data ?? []);
  };

  useEffect(() => { loadHistory(); }, [rate]);

  const openEdit = () => {
    setForm({ date: new Date().toISOString().slice(0, 10), rate: String(rate), notes: "" });
    setOpen(true);
  };

  const save = async () => {
    const r = Number(form.rate);
    if (!form.date || !r || r <= 0) { toast.error("Ingresa una tasa válida"); return; }
    setSaving(true);
    const { error } = await bcvTable().upsert(
      { date: form.date, rate: r, notes: form.notes || null, created_by: user?.id ?? null },
      { onConflict: "date" },
    );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tasa BCV actualizada");
    setOpen(false);
    await refresh();
    loadHistory();
  };

  const exportCsv = () => {
    const rows = [["Fecha", "Tasa Bs/$", "Notas"], ...history.map((h) => [h.date, h.rate, (h.notes ?? "").replace(/"/g, '""')])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tasas-bcv-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const previewRate = Number(form.rate) || rate;

  return (
    <>
      <section className="rounded-xl border-2 border-gold/40 bg-gradient-to-br from-gold/10 to-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gold">💱 Tasa BCV hoy</div>
            <div className="mt-2 font-heading text-3xl font-bold">$1 USD = Bs. {rate.toFixed(2)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Actualizado: {date}</div>
          </div>
          <Button onClick={openEdit} className="bg-gold text-primary-foreground hover:bg-gold/90">
            <Pencil className="h-4 w-4" /> Actualizar tasa
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold">Historial de Tasas BCV</h2>
          <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3 w-3" /> CSV</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr><th className="px-2 py-2 text-left">Fecha</th><th className="px-2 py-2 text-left">Tasa (Bs/$)</th><th className="px-2 py-2 text-left">Variación</th><th className="px-2 py-2 text-left">Notas</th></tr>
            </thead>
            <tbody>
              {history.map((h, i) => {
                const prev = history[i + 1];
                const diff = prev ? ((Number(h.rate) - Number(prev.rate)) / Number(prev.rate)) * 100 : 0;
                const up = diff > 0;
                const tone = !prev || Math.abs(diff) < 0.005 ? "text-muted-foreground" : up ? "text-destructive" : "text-success";
                return (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-2 py-2">{h.date}</td>
                    <td className="px-2 py-2 font-semibold">Bs. {Number(h.rate).toFixed(2)}</td>
                    <td className={`px-2 py-2 ${tone}`}>{prev ? `${up ? "↑ +" : diff < 0 ? "↓ " : ""}${diff.toFixed(2)}%` : "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{h.notes ?? "—"}</td>
                  </tr>
                );
              })}
              {history.length === 0 && <tr><td colSpan={4} className="px-2 py-8 text-center text-muted-foreground">Sin registros</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Actualizar Tasa BCV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tasa Bs.</Label>
              <Input type="number" step="0.01" min="0" placeholder="517.96" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              <p className="text-xs text-muted-foreground">Consulta la tasa oficial en bcv.org.ve</p>
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea rows={2} placeholder="Ej: Tasa oficial BCV 19/05/2026" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="rounded-lg border border-border bg-background p-3 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa</div>
              <div>$1.00 USD = {formatBsLabel(1, previewRate)}</div>
              <div>$10.00 USD = {formatBsLabel(10, previewRate)}</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-gold text-primary-foreground hover:bg-gold/90">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar tasa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}