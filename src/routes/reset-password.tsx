import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nueva contraseña — Terraza Gourmet" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery session in the URL hash and exchanges it
    // via onAuthStateChange. We just wait until a session exists.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Mínimo 6 caracteres."); return; }
    if (password !== confirm) { toast.error("Las contraseñas no coinciden."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña actualizada. Inicia sesión.");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-heading text-2xl font-bold">Nueva contraseña</h1>
        <p className="mt-1 text-sm text-muted-foreground">Crea una contraseña segura para tu cuenta.</p>

        {!ready ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" />
            <p className="mt-3">Validando enlace de recuperación…</p>
            <p className="mt-2 text-xs">
              ¿El enlace expiró? <Link to="/forgot-password" className="text-gold hover:underline">Solicitar uno nuevo</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="pwd">Nueva contraseña</Label>
              <Input id="pwd" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pwd2">Confirmar contraseña</Label>
              <Input id="pwd2" type="password" required minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Guardar contraseña
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
