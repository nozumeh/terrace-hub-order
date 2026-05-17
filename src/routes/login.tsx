import { useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "" }),
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      localStorage.setItem("tg:rememberMe", remember ? "true" : "false");
      sessionStorage.setItem("tg:sessionAlive", "1");
    } catch { /* ignore storage errors */ }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("¡Bienvenido!");
    // Determine routing by role
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user!.id);
    const r = (roles ?? []).map((x: { role: string }) => x.role);
    if (redirect) navigate({ to: redirect });
    else if (r.includes("admin")) navigate({ to: "/admin" });
    else if (r.includes("restaurant_owner")) navigate({ to: "/restaurant" });
    else if (r.includes("supervisor") || r.includes("manager") || r.includes("worker")) navigate({ to: "/employee" });
    else navigate({ to: "/account" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-heading text-2xl font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Accede para pedir con tu descuento de empleado.</p>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
              Recordar mi sesión
            </label>
            <Link to="/forgot-password" className="text-sm text-gold hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Entrar
          </Button>
          <div className="pt-2 text-center text-sm text-muted-foreground">
            ¿Empleado nuevo? <Link to="/register" className="text-gold hover:underline">Registrarme</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
