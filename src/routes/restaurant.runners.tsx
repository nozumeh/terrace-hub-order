import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Plus, Bike } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/runners")({ component: RunnersPage });

interface Runner { id: string; name: string; phone: string; schedule: string | null; notes: string | null; is_active: boolean }
interface Shift { id: string; runner_id: string; shift_date: string; check_in: string | null; check_out: string | null; status: string }

function RunnersPage() {
  const { user, loading, isRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [busy, setBusy] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Runner | null>(null);
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftRunner, setShiftRunner] = useState<string>("");

  useEffect(() => { if (!loading && !isRestaurantOwner) navigate({ to: "/" }); }, [loading, isRestaurantOwner, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
    if (!r) { setBusy(false); return; }
    setRestaurantId(r.id);
    const { data: rn } = await supabase.from("food_runners").select("*").eq("restaurant_id", r.id).order("created_at", { ascending: false });
    const list = (rn ?? []) as Runner[];
    setRunners(list);
    if (list.length) {
      const { data: sh } = await supabase.from("runner_shifts").select("*")
        .in("runner_id", list.map((x) => x.id))
        .gte("shift_date", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10))
        .order("shift_date", { ascending: false });
      setShifts((sh ?? []) as Shift[]);
    }
    setBusy(false);
  };

  useEffect(() => { if (user && isRestaurantOwner) load(); }, [user, isRestaurantOwner]);

  const today = new Date().toISOString().slice(0, 10);
  const todayShift = useMemo(() => shifts.find((s) => s.shift_date === today && s.status !== "completed"), [shifts, today]);
  const todayRunner = useMemo(() => runners.find((r) => r.id === todayShift?.runner_id), [runners, todayShift]);

  const shiftsThisMonth = (runnerId: string) => {
    const start = new Date(); start.setDate(1);
    const startStr = start.toISOString().slice(0, 10);
    return shifts.filter((s) => s.runner_id === runnerId && s.shift_date >= startStr).length;
  };

  const registerShift = async () => {
    if (!shiftRunner) { toast.error("Selecciona un runner"); return; }
    const { error } = await supabase.from("runner_shifts").insert({
      runner_id: shiftRunner, shift_date: shiftDate, status: "scheduled",
    });
    if (error) toast.error("❌ " + error.message); else { toast.success("✓ Turno registrado"); setShiftRunner(""); load(); }
  };

  const checkIn = async () => {
    if (!todayShift) return;
    await supabase.from("runner_shifts").update({ check_in: new Date().toISOString(), status: "active" }).eq("id", todayShift.id);
    toast.success("✓ Check-in"); load();
  };
  const checkOut = async () => {
    if (!todayShift) return;
    await supabase.from("runner_shifts").update({ check_out: new Date().toISOString(), status: "completed" }).eq("id", todayShift.id);
    toast.success("✓ Salida marcada"); load();
  };

  const toggleActive = async (r: Runner) => {
    await supabase.from("food_runners").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <Button asChild variant="ghost" size="sm"><Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Volver</Link></Button>
          <h1 className="mt-2 font-heading text-3xl font-bold">Food Runners</h1>
          <p className="text-sm text-muted-foreground">Gestiona repartidores, turnos y horarios.</p>
        </div>

        {/* Runner de hoy */}
        <section className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-widest text-gold">🏃 Runner de hoy {todayShift?.status === "active" && <span className="ml-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-400">ACTIVO 🟢</span>}</div>
            <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString("es-VE")}</div>
          </div>
          {!todayRunner ? (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">No hay runner asignado hoy</p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Select value={shiftRunner} onValueChange={setShiftRunner}>
                  <SelectTrigger className="w-60"><SelectValue placeholder="Asignar runner..." /></SelectTrigger>
                  <SelectContent>
                    {runners.filter((r) => r.is_active).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => { setShiftDate(today); registerShift(); }} className="bg-gold text-primary-foreground hover:bg-gold/90">Asignar runner para hoy</Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <div className="font-heading text-2xl font-bold">{todayRunner.name}</div>
              <div className="text-sm text-muted-foreground">📱 {todayRunner.phone || "—"}</div>
              {todayShift?.check_in && <div className="text-sm">Entrada: {new Date(todayShift.check_in).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</div>}
              {todayShift?.check_out && <div className="text-sm">Salida: {new Date(todayShift.check_out).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</div>}
              <div className="flex gap-2 pt-2">
                {!todayShift?.check_in && <Button size="sm" onClick={checkIn}>Marcar entrada</Button>}
                {todayShift?.check_in && !todayShift?.check_out && <Button size="sm" onClick={checkOut}>Marcar salida</Button>}
              </div>
            </div>
          )}
        </section>

        {/* Registrar turno */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 font-heading text-lg font-bold">Registrar turno</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1"><Label className="text-xs">Fecha</Label><Input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} /></div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Runner</Label>
              <Select value={shiftRunner} onValueChange={setShiftRunner}>
                <SelectTrigger><SelectValue placeholder="Seleccionar runner..." /></SelectTrigger>
                <SelectContent>{runners.filter((r) => r.is_active).map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={registerShift} className="bg-gold text-primary-foreground hover:bg-gold/90"><Plus className="h-4 w-4" /> Registrar turno</Button>
          </div>
        </section>

        {/* Roster */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold"><Bike className="mr-2 inline h-5 w-5 text-gold" /> Todos los food runners</h2>
            <Button onClick={() => { setEditing(null); setAddOpen(true); }} className="bg-gold text-primary-foreground hover:bg-gold/90"><Plus className="h-4 w-4" /> Agregar Runner</Button>
          </div>
          {runners.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay runners registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2">Nombre</th><th className="py-2">Teléfono</th><th className="py-2">Horario</th>
                  <th className="py-2">Estado</th><th className="py-2 text-right">Turnos este mes</th><th className="py-2"></th>
                </tr></thead>
                <tbody>
                  {runners.map((r) => (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="py-2 font-medium">{r.name}</td>
                      <td className="py-2 text-muted-foreground">{r.phone || "—"}</td>
                      <td className="py-2 text-muted-foreground">{r.schedule || "—"}</td>
                      <td className="py-2"><Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} /></td>
                      <td className="py-2 text-right font-mono">{shiftsThisMonth(r.id)}</td>
                      <td className="py-2 text-right"><Button size="sm" variant="outline" onClick={() => { setEditing(r); setAddOpen(true); }}>Editar</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Shift history */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 font-heading text-lg font-bold">Historial de turnos (30 días)</h2>
          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin turnos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2">Fecha</th><th className="py-2">Runner</th><th className="py-2">Entrada</th><th className="py-2">Salida</th><th className="py-2">Estado</th>
                </tr></thead>
                <tbody>
                  {shifts.map((s) => {
                    const rn = runners.find((r) => r.id === s.runner_id);
                    return (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2">{new Date(s.shift_date).toLocaleDateString("es-VE")}</td>
                        <td className="py-2">{rn?.name ?? "—"}</td>
                        <td className="py-2 text-muted-foreground">{s.check_in ? new Date(s.check_in).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td className="py-2 text-muted-foreground">{s.check_out ? new Date(s.check_out).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td className="py-2 text-xs uppercase tracking-wider">{s.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <RunnerDialog open={addOpen} onClose={() => setAddOpen(false)} runner={editing} restaurantId={restaurantId} onSaved={() => { setAddOpen(false); load(); }} />
    </div>
  );
}

function RunnerDialog({ open, onClose, runner, restaurantId, onSaved }: {
  open: boolean; onClose: () => void; runner: Runner | null; restaurantId: string | null; onSaved: () => void;
}) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [schedule, setSchedule] = useState(""); const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(runner?.name ?? ""); setPhone(runner?.phone ?? "");
    setSchedule(runner?.schedule ?? ""); setNotes(runner?.notes ?? "");
  }, [runner, open]);

  const save = async () => {
    if (!restaurantId || !name.trim() || !phone.trim()) { toast.error("Nombre y teléfono requeridos"); return; }
    setSaving(true);
    if (runner) {
      await supabase.from("food_runners").update({ name, phone, schedule, notes }).eq("id", runner.id);
    } else {
      await supabase.from("food_runners").insert({ restaurant_id: restaurantId, name, phone, schedule, notes });
    }
    setSaving(false); toast.success("✓ Guardado"); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{runner ? "Editar runner" : "Agregar Runner"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nombre completo *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label>Teléfono/WhatsApp *</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0414-123-4567" /></div>
          <div className="space-y-1"><Label>Horario</Label><Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Lun-Vie 11am-4pm" /></div>
          <div className="space-y-1"><Label>Notas</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-gold text-primary-foreground hover:bg-gold/90" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {runner ? "Guardar" : "Agregar Runner"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
