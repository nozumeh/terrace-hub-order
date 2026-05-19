import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { signUpEmployeeConfirmed } from "@/lib/employee-signup.functions";
import { toast } from "sonner";
import { Loader2, Briefcase, Store, Mail } from "lucide-react";

export type AccountType = "customer" | "employee" | "restaurant_owner";
export type StaffRole = "empleado" | "gerente" | "dueno";

export interface InvitationData {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  store_name: string;
  store_floor: string;
  staff_role: string;
  email: string | null;
  expires_at: string;
  used_at: string | null;
}

interface Props {
  defaultTab?: AccountType;
  lockTab?: boolean;
  inviteToken?: string | null;
  invitation?: InvitationData | null;
}

export function RegisterForm({ defaultTab = "employee", lockTab = false, inviteToken = null, invitation = null }: Props) {
  const [tab, setTab] = useState<AccountType>(defaultTab === "customer" ? "employee" : defaultTab);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState(invitation?.email ?? "");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState(invitation?.store_name ?? "");
  const [floor, setFloor] = useState(invitation?.store_floor ?? "1");
  const [localNumber, setLocalNumber] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>((invitation?.staff_role as StaffRole) ?? "empleado");
  const [businessName, setBusinessName] = useState("");
  const [businessDesc, setBusinessDesc] = useState("");
  const [storeId, setStoreId] = useState("");

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (invitation) {
      setStoreName(invitation.store_name);
      setFloor(invitation.store_floor);
      setStaffRole((invitation.staff_role as StaffRole) ?? "empleado");
      if (invitation.email) setEmail(invitation.email);
    }
  }, [invitation]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "employee") {
        // Empleados: crear con email pre-confirmado (sin verificación) e iniciar sesión.
        await signUpEmployeeConfirmed({
          data: {
            email,
            password,
            name,
            phone,
            store_name: storeName,
            store_floor: floor,
            store_id: storeId,
            local_number: localNumber,
          },
        });
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        if (inviteToken) {
          const { error: invErr } = await supabase.rpc("accept_employee_invite" as never, { _token: inviteToken } as never);
          if (invErr) throw invErr;
        } else {
          const { error: setupErr } = await supabase.rpc("setup_account", {
            _account_type: "employee",
            _staff_role: staffRole,
          });
          if (setupErr) throw setupErr;
        }
        toast.success("¡Bienvenido!");
        navigate({ to: "/employee" });
        return;
      }

      const meta: Record<string, string> = { name, phone, account_type: tab };
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/menu`, data: meta },
      });
      if (error) throw error;

      if (data.session) {
        const { error: setupErr } = await supabase.rpc("setup_account", {
          _account_type: tab,
          _business_name: tab === "restaurant_owner" ? businessName : undefined,
          _business_description: tab === "restaurant_owner" ? businessDesc : undefined,
          _business_phone: tab === "restaurant_owner" ? phone : undefined,
        });
        if (setupErr) throw setupErr;
        toast.success("¡Bienvenido!");
        if (tab === "restaurant_owner") navigate({ to: "/restaurant" });
        else navigate({ to: "/account" });
      } else {
        toast.success("Cuenta creada. Revisa tu email para confirmar y luego inicia sesión.");
        navigate({ to: "/login" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const inviteValid = invitation && !invitation.used_at && new Date(invitation.expires_at) > new Date();
  const inviteExpired = invitation && new Date(invitation.expires_at) <= new Date();
  const inviteUsed = invitation?.used_at != null;

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="font-heading text-2xl font-bold">
        {lockTab && tab === "customer" && "Regístrate como cliente"}
        {lockTab && tab === "employee" && "Regístrate como trabajador"}
        {lockTab && tab === "restaurant_owner" && "Registra tu negocio"}
        {!lockTab && "Crea tu cuenta"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {lockTab ? "Completa tus datos para empezar." : "Elige el tipo de cuenta que necesitas."}
      </p>

      {invitation && (
        <div className={`mt-6 rounded-xl border p-4 text-sm ${inviteValid ? "border-gold/40 bg-gold/5" : "border-destructive/50 bg-destructive/5"}`}>
          <div className="flex items-center gap-2 font-semibold">
            <Mail className="h-4 w-4 text-gold" />
            Invitación de {invitation.restaurant_name}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Tienda: <span className="text-foreground">{invitation.store_name || "—"}</span> · Piso {invitation.store_floor || "—"} · Cargo: <span className="capitalize">{invitation.staff_role}</span>
          </div>
          {inviteExpired && <div className="mt-2 text-xs text-destructive">Esta invitación ha expirado. Pide una nueva al dueño del negocio.</div>}
          {inviteUsed && <div className="mt-2 text-xs text-destructive">Esta invitación ya fue utilizada.</div>}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => !lockTab && setTab(v as AccountType)} className="mt-6">
        {!lockTab && (
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="employee" className="gap-2"><Briefcase className="h-4 w-4" />Trabajador</TabsTrigger>
            <TabsTrigger value="restaurant_owner" className="gap-2"><Store className="h-4 w-4" />Negocio</TabsTrigger>
          </TabsList>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!invitation?.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
          </div>

          <TabsContent value="employee" className="m-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store">Nombre de la tienda</Label>
              <Input id="store" required={tab === "employee"} value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={80} disabled={!!invitation} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local-number">Número de local</Label>
              <Input id="local-number" required={tab === "employee"} value={localNumber} onChange={(e) => setLocalNumber(e.target.value)} maxLength={40} placeholder="Ej: 12B" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-store-id">#ID de Carnet</Label>
              <Input id="emp-store-id" required={tab === "employee"} value={storeId} onChange={(e) => setStoreId(e.target.value)} maxLength={40} placeholder="Ingresa el número de tu carnet" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Piso</Label>
                <Select value={floor} onValueChange={setFloor} disabled={!!invitation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1", "2", "3", "4", "5", "Terraza"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select value={staffRole} onValueChange={(v) => setStaffRole(v as StaffRole)} disabled={!!invitation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empleado">Empleado</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="dueno">Dueño</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="rounded-md bg-gold/10 p-3 text-xs text-gold">Recibirás $1 de descuento automático y un código promocional personal.</p>
          </TabsContent>

          <TabsContent value="restaurant_owner" className="m-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bn">Nombre del negocio</Label>
              <Input id="bn" required={tab === "restaurant_owner"} value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bd">Descripción corta</Label>
              <Textarea id="bd" rows={3} value={businessDesc} onChange={(e) => setBusinessDesc(e.target.value)} maxLength={300} />
            </div>
            <p className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              Tu negocio quedará pendiente de aprobación. Una vez activo podrás cargar tu menú, ver ventas y asignar food runners.
            </p>
          </TabsContent>

          <Button type="submit" disabled={busy || (invitation != null && !inviteValid)} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear cuenta
          </Button>
          <div className="pt-1 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta? <Link to="/login" className="text-gold hover:underline">Entrar</Link>
          </div>
          {!lockTab && (
            <div className="pt-1 text-center text-xs text-muted-foreground">
              Enlaces directos:{" "}
              <Link to="/register/empleado" className="text-gold hover:underline">Trabajador</Link> ·{" "}
              <Link to="/register/restaurante" className="text-gold hover:underline">Negocio</Link>
            </div>
          )}
        </form>
      </Tabs>
    </div>
  );
}
