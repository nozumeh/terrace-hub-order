import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar contraseña — Terraza Gourmet" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Te enviamos un email con instrucciones.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-heading text-2xl font-bold">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {sent ? (
          <div className="mt-8 rounded-xl border border-gold/40 bg-gold/5 p-6 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-gold" />
            <h2 className="mt-3 font-semibold">Revisa tu email</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Si <b>{email}</b> tiene una cuenta, recibirás un enlace para crear una nueva contraseña.
              El enlace expira en 1 hora.
            </p>
            <div className="mt-4 text-sm">
              <Link to="/login" className="text-gold hover:underline">Volver al inicio de sesión</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar enlace
            </Button>
            <div className="pt-2 text-center text-sm text-muted-foreground">
              ¿Te acordaste? <Link to="/login" className="text-gold hover:underline">Volver a entrar</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
