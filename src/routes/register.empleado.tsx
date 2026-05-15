import { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { RegisterForm, type InvitationData } from "@/components/RegisterForm";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/register/empleado")({
  head: () => ({ meta: [{ title: "Registro de Trabajador — Terraza Gourmet" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ invite: typeof s.invite === "string" ? s.invite : undefined }),
  component: EmployeeRegisterPage,
});

function EmployeeRegisterPage() {
  const { invite } = useSearch({ from: "/register/empleado" });
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(!!invite);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invite) return;
    (async () => {
      const { data, error } = await supabase.rpc("get_invitation_by_token" as never, { _token: invite } as never);
      if (error) { setError(error.message); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) setError("Invitación no encontrada");
      else setInvitation(row as InvitationData);
      setLoading(false);
    })();
  }, [invite]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>
      ) : error ? (
        <div className="mx-auto max-w-xl px-4 py-12">
          <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-6 text-center text-sm text-destructive">{error}</div>
        </div>
      ) : (
        <RegisterForm defaultTab="employee" lockTab inviteToken={invite ?? null} invitation={invitation} />
      )}
    </div>
  );
}
