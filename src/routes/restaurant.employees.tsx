import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Copy, Trash2, Plus, ArrowLeft, Mail, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/employees")({ component: EmployeesPage });

interface Invite {
  id: string;
  restaurant_id: string;
  store_name: string;
  store_floor: string;
  staff_role: string;
  email: string | null;
  token: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
}

function EmployeesPage() {
  const { user, isRestaurantOwner, loading } = useAuth();
  const navigate = useNavigate();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(true);

  // Form state
  const [storeName, setStoreName] = useState("");
  const [floor, setFloor] = useState("1");
  const [staffRole, setStaffRole] = useState("empleado");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!loading && !isRestaurantOwner) navigate({ to: "/" });
  }, [loading, isRestaurantOwner, navigate]);

  const refresh = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("restaurants").select("id").eq("owner_id", user.id).maybeSingle();
    const rid = r?.id ?? null;
    setRestaurantId(rid);
    if (!rid) { setBusy(false); return; }
    const { data } = await supabase
      .from("employee_invitations" as never)
      .select("*")
      .eq("restaurant_id", rid)
      .order("created_at", { ascending: false });
    setInvites(((data ?? []) as unknown) as Invite[]);
    setBusy(false);
  };

  useEffect(() => {
    if (user && isRestaurantOwner) refresh();
  }, [user, isRestaurantOwner]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;
    setCreating(true);
    const { error } = await supabase.from("employee_invitations" as never).insert({
      restaurant_id: restaurantId,
      store_name: storeName,
      store_floor: floor,
      staff_role: staffRole,
      email: email || null,
    } as never);
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Invitación creada");
    setStoreName(""); setEmail(""); setStaffRole("empleado"); setFloor("1");
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta invitación?")) return;
    const { error } = await supabase.from("employee_invitations" as never).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminada"); refresh(); }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/register/empleado?invite=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
  };

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-gold">Restaurante</div>
            <h1 className="font-heading text-3xl font-bold">Invitar empleados</h1>
            <p className="mt-1 text-sm text-muted-foreground">Crea enlaces de invitación para que tus empleados se registren con su tienda y cargo prefijados.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Volver</Link>
          </Button>
        </div>

        <form onSubmit={create} className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-5">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="store">Tienda</Label>
            <Input id="store" required value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label>Piso</Label>
            <Select value={floor} onValueChange={setFloor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4", "5", "Terraza"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cargo</Label>
            <Select value={staffRole} onValueChange={setStaffRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="empleado">Empleado</SelectItem>
                <SelectItem value="gerente">Gerente</SelectItem>
                <SelectItem value="dueno">Dueño</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-4">
            <Label htmlFor="em">Email (opcional)</Label>
            <Input id="em" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="empleado@email.com" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={creating} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Crear</>}
            </Button>
          </div>
        </form>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-heading text-lg font-bold">Invitaciones</h2>
          {invites.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aún no has creado invitaciones.</div>
          ) : (
            <ul className="space-y-2">
              {invites.map((i) => {
                const expired = new Date(i.expires_at) < new Date();
                const used = !!i.used_at;
                const url = `${window.location.origin}/register/empleado?invite=${i.token}`;
                return (
                  <li key={i.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold">{i.store_name}</span>
                          <span className="text-muted-foreground">· Piso {i.store_floor}</span>
                          <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs capitalize">{i.staff_role}</span>
                          {used && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Usada</span>}
                          {!used && expired && <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive"><Clock className="h-3 w-3" /> Expirada</span>}
                          {!used && !expired && <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold"><Mail className="h-3 w-3" /> Activa</span>}
                        </div>
                        {i.email && <div className="mt-1 text-xs text-muted-foreground">Para: {i.email}</div>}
                        <div className="mt-2 truncate font-mono text-xs text-muted-foreground">{url}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Creada {new Date(i.created_at).toLocaleDateString()} · Expira {new Date(i.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {!used && !expired && (
                          <Button size="sm" variant="outline" onClick={() => copyLink(i.token)}>
                            <Copy className="h-3 w-3" /> Copiar enlace
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => remove(i.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
