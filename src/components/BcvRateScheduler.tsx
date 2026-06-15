import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarClock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ScheduledRow {
  id: string;
  scheduled_rate: number | null;
  scheduled_for: string | null;
}

export function BcvRateScheduler() {
  const [rate, setRate] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<ScheduledRow[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("bcv_rates")
      .select("id,scheduled_rate,scheduled_for")
      .not("scheduled_rate", "is", null)
      .order("scheduled_for", { ascending: true });
    setRows((data ?? []) as ScheduledRow[]);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    const r = Number(rate);
    if (!r || r <= 0) { toast.error("Ingresa una tasa válida"); return; }
    if (!date) { toast.error("Selecciona una fecha"); return; }
    setSaving(true);
    // Store schedule on the row keyed by the target date.
    const { error } = await supabase
      .from("bcv_rates")
      .upsert(
        { date, rate: r, scheduled_rate: r, scheduled_for: date, notes: "Programada" },
        { onConflict: "date" },
      );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tasa programada");
    setRate(""); setDate("");
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("bcv_rates")
      .update({ scheduled_rate: null, scheduled_for: null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Programación cancelada");
    load();
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-gold" />
        <h2 className="font-heading text-xl font-bold">Programar tasa BCV</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        La tasa programada se aplicará automáticamente cuando se cargue el panel en la fecha indicada.
      </p>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label>Tasa Bs.</Label>
          <Input type="number" step="0.01" min="0" placeholder="520.00" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Fecha de aplicación</Label>
          <Input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button onClick={save} disabled={saving} className="bg-gold text-primary-foreground hover:bg-gold/90">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Programar
        </Button>
      </div>

      {rows.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Programaciones pendientes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="px-2 py-2 text-left">Fecha</th><th className="px-2 py-2 text-left">Tasa</th><th className="px-2 py-2"></th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-2">{r.scheduled_for}</td>
                    <td className="px-2 py-2 font-semibold">Bs. {Number(r.scheduled_rate).toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => cancel(r.id)}>
                        <Trash2 className="h-3 w-3" /> Cancelar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}