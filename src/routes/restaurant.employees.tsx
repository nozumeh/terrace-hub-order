import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Plus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/employees")({ component: EmployeesPage });

interface Staff {
  id: string; restaurant_id: string; name: string; role: string;
  employee_id: string; phone: string | null; is_active: boolean;
}

const ROLES = [
  { v: "cocinero", l: "Cocinero" }, { v: "cajero", l: "Cajero" }, { v: "mesero", l: "Mesero" },
  { v: "supervisor", l: "Supervisor" }, { v: "otro", l: "Otro" },
];

const suggestId = () => "EMP-" + Math.floor(1000 + Math.random() * 9000);

function EmployeesPage() {
  const { user, loading, isRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [busy, setBusy] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);

  useEffect(() => { if (!loading && !isRestaurantOwner) navigate({ to: "/" }); }, [loading, isRestaurantOwner, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
    if (!r) { setBusy(false); return; }
    setRestaurantId(r.id);
    const { data } = await supabase.from("staff_members").select("*").eq("restaurant_id", r.id).order("created_at", { ascending: false });
    setStaff((data ?? []) as Staff[]);
    setBusy(false);
  };

  useEffect(() => { if (user && isRestaurantOwner) load(); }, [user, isRestaurantOwner]);

  const toggleActive = async (s: Staff) => {
    await supabase.from("staff_members").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  };

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Button asChild variant="ghost" size="sm"><Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Volver</Link></Button>
            <h1 className="mt-2 font-heading text-3xl font-bold">Empleados</h1>
            <p className="text-sm text-muted-foreground">{staff.length} empleados · {staff.filter((s) => s.is_active).length} activos</p>
          </div>
          <Button onClick={() => { setEditing(null); setAddOpen(true); }} className="bg-gold text-primary-foreground hover:bg-gold/90">
            <Plus className="h-4 w-4" /> Agregar Empleado
          </Button>
        </div>

        <section className="rounded-xl border border-border bg-card p-6">
          {staff.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <div className="mt-3 font-heading text-lg font-bold">Aún no hay empleados registrados</div>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Agrega tu equipo para gestionar acceso y recompensas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2">ID Empleado</th><th className="py-2">Nombre</th><th className="py-2">Cargo</th>
                  <th className="py-2">Teléfono</th><th className="py-2">Estado</th><th className="py-2"></th>
                </tr></thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="py-2 font-mono text-xs">{s.employee_id}</td>
                      <td className="py-2 font-medium">{s.name}</td>
                      <td className="py-2 capitalize text-muted-foreground">{s.role}</td>
                      <td className="py-2 text-muted-foreground">{s.phone || "—"}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.is_active ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"}`}>
                          {s.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditing(s); setAddOpen(true); }}>Editar</Button>
                          <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          ¿Necesitas invitar a alguien con acceso al sistema? Usa <Link to="/restaurant/employees" className="text-gold hover:underline">invitaciones de empleados</Link> en el panel de invitaciones (próximamente integrado).
        </div>
      </div>

      <StaffDialog open={addOpen} onClose={() => setAddOpen(false)} staff={editing} restaurantId={restaurantId} onSaved={() => { setAddOpen(false); load(); }} />
    </div>
  );
}

function StaffDialog({ open, onClose, staff, restaurantId, onSaved }: {
  open: boolean; onClose: () => void; staff: Staff | null; restaurantId: string | null; onSaved: () => void;
}) {
  const [name, setName] = useState(""); const [role, setRole] = useState("cocinero");
  const [employeeId, setEmployeeId] = useState(""); const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(staff?.name ?? ""); setRole(staff?.role ?? "cocinero");
    setEmployeeId(staff?.employee_id ?? suggestId()); setPhone(staff?.phone ?? "");
  }, [staff, open]);

  const save = async () => {
    if (!restaurantId || !name.trim() || !employeeId.trim()) { toast.error("Nombre y ID requeridos"); return; }
    setSaving(true);
    if (staff) {
      const { error } = await supabase.from("staff_members").update({ name, role, employee_id: employeeId, phone }).eq("id", staff.id);
      setSaving(false);
      if (error) toast.error("❌ " + error.message); else { toast.success("✓ Guardado"); onSaved(); }
    } else {
      const { error } = await supabase.from("staff_members").insert({ restaurant_id: restaurantId, name, role, employee_id: employeeId, phone });
      setSaving(false);
      if (error) toast.error("❌ " + error.message); else { toast.success(`✓ Empleado agregado. ID: ${employeeId}`); onSaved(); }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{staff ? "Editar empleado" : "Agregar Empleado"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Nombre completo *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Cargo *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>ID Empleado *</Label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
            <p className="text-xs text-muted-foreground">Este ID permitirá al empleado reclamar recompensas</p>
          </div>
          <div className="space-y-1"><Label>Teléfono</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-gold text-primary-foreground hover:bg-gold/90" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {staff ? "Guardar" : "Agregar Empleado"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
