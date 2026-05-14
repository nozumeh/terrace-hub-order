import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [floor, setFloor] = useState("1");
  const [supervisor, setSupervisor] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/menu`,
        data: { name, store_name: storeName, store_floor: floor, role: supervisor ? "supervisor" : "worker" },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cuenta creada. Revisa tu email para confirmar.");
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-heading text-2xl font-bold">Registro de empleado</h1>
        <p className="mt-1 text-sm text-muted-foreground">Crea tu cuenta para pedir con $1 de descuento automático.</p>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
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
            <Label htmlFor="store">Nombre de la tienda</Label>
            <Input id="store" required value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-2">
            <Label>Piso</Label>
            <Select value={floor} onValueChange={setFloor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4", "5", "Terraza"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="sup" checked={supervisor} onCheckedChange={(v) => setSupervisor(!!v)} />
            <Label htmlFor="sup" className="cursor-pointer text-sm font-normal">Soy supervisor de tienda</Label>
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Crear cuenta
          </Button>
          <div className="pt-2 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta? <Link to="/login" className="text-gold hover:underline">Entrar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
