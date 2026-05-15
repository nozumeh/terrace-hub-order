import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Briefcase, Store } from "lucide-react";

export const Route = createFileRoute("/register")({ component: RegisterPage });

type AccountType = "customer" | "employee" | "restaurant_owner";
type StaffRole = "empleado" | "gerente" | "dueno";

function RegisterPage() {
  const [tab, setTab] = useState<AccountType>("customer");
  const navigate = useNavigate();

  // shared
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  // employee
  const [storeName, setStoreName] = useState("");
  const [floor, setFloor] = useState("1");
  const [staffRole, setStaffRole] = useState<StaffRole>("empleado");
  // business
  const [businessName, setBusinessName] = useState("");
  const [businessDesc, setBusinessDesc] = useState("");

  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const meta: Record<string, string> = { name, phone, account_type: tab };
      if (tab === "employee") {
        meta.store_name = storeName;
        meta.store_floor = floor;
      }
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/menu`, data: meta },
      });
      if (error) throw error;

      // The session is established immediately if email confirmation is disabled,
      // otherwise we still try to call setup_account so the role/restaurant are
      // created when possible. If no session exists, we surface a hint.
      if (data.session) {
        const { error: setupErr } = await supabase.rpc("setup_account", {
          _account_type: tab,
          _staff_role: tab === "employee" ? staffRole : null,
          _business_name: tab === "restaurant_owner" ? businessName : null,
          _business_description: tab === "restaurant_owner" ? businessDesc : null,
          _business_phone: tab === "restaurant_owner" ? phone : null,
        });
        if (setupErr) throw setupErr;
        toast.success("¡Bienvenido!");
        if (tab === "restaurant_owner") navigate({ to: "/restaurant" });
        else if (tab === "employee") navigate({ to: "/employee" });
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-xl px-4 py-12">
        <h1 className="font-heading text-2xl font-bold">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Elige el tipo de cuenta que necesitas.</p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as AccountType)} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customer" className="gap-2"><User className="h-4 w-4" />Cliente</TabsTrigger>
            <TabsTrigger value="employee" className="gap-2"><Briefcase className="h-4 w-4" />Trabajador</TabsTrigger>
            <TabsTrigger value="restaurant_owner" className="gap-2"><Store className="h-4 w-4" />Negocio</TabsTrigger>
          </TabsList>

          <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
            </div>

            <TabsContent value="customer" className="m-0">
              <p className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                Como cliente puedes pedir comida y revisar tu historial. Si trabajas en City Market, elige <b>Trabajador</b> para tu descuento.
              </p>
            </TabsContent>

            <TabsContent value="employee" className="m-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store">Nombre de la tienda</Label>
                <Input id="store" required={tab === "employee"} value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={80} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Piso</Label>
                  <Select value={floor} onValueChange={setFloor}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["1", "2", "3", "4", "5", "Terraza"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Select value={staffRole} onValueChange={(v) => setStaffRole(v as StaffRole)}>
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

            <Button type="submit" disabled={busy} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear cuenta
            </Button>
            <div className="pt-1 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta? <Link to="/login" className="text-gold hover:underline">Entrar</Link>
            </div>
          </form>
        </Tabs>
      </div>
    </div>
  );
}