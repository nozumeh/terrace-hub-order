import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/payments")({ component: PaymentsPage });

interface PaymentSettings {
  id: string;
  delivery_pickup: boolean;
  delivery_to_store: boolean;
  payment_pago_movil: boolean;
  payment_whatsapp: boolean;
  payment_en_caja: boolean;
  payment_efectivo: boolean;
  whatsapp_number: string;
  pago_movil_info: string;
}

function PaymentsPage() {
  const { user, loading, isRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const [resto, setResto] = useState<PaymentSettings | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isRestaurantOwner) navigate({ to: "/" });
  }, [loading, isRestaurantOwner, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("id,delivery_pickup,delivery_to_store,payment_pago_movil,payment_whatsapp,payment_en_caja,payment_efectivo,whatsapp_number,pago_movil_info")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (data) setResto(data as PaymentSettings);
      setBusy(false);
    })();
  }, [user]);

  const save = async () => {
    if (!resto) return;
    setSaving(true);
    const { error } = await supabase.from("restaurants").update({
      delivery_pickup: resto.delivery_pickup,
      delivery_to_store: resto.delivery_to_store,
      payment_pago_movil: resto.payment_pago_movil,
      payment_whatsapp: resto.payment_whatsapp,
      payment_en_caja: resto.payment_en_caja,
      payment_efectivo: resto.payment_efectivo,
      whatsapp_number: resto.whatsapp_number ?? "",
      pago_movil_info: resto.pago_movil_info ?? "",
    }).eq("id", resto.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Métodos de pago guardados");
  };

  if (busy) return <div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div></div>;
  if (!resto) return <div className="min-h-screen bg-background"><Header /><div className="mx-auto max-w-3xl px-4 py-12 text-center text-muted-foreground">Aún no tienes un negocio activo.</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <Button asChild variant="ghost" size="sm"><Link to="/restaurant"><ArrowLeft className="h-3 w-3" /> Volver</Link></Button>
          <h1 className="mt-2 font-heading text-3xl font-bold">Métodos de pago y entrega</h1>
          <p className="text-sm text-muted-foreground">Configura cómo los clientes reciben y pagan sus pedidos.</p>
        </div>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Opciones de entrega</h2>
          <ToggleRow
            title="Recibir pedido en tienda"
            subtitle="Food runner lleva el pedido directamente a la tienda del empleado"
            checked={resto.delivery_to_store}
            onChange={(v) => setResto({ ...resto, delivery_to_store: v })}
          />
          <ToggleRow
            title="Recoger en restaurante"
            subtitle="El cliente recoge su pedido en el local"
            checked={resto.delivery_pickup}
            onChange={(v) => setResto({ ...resto, delivery_pickup: v })}
          />
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Métodos de pago</h2>
          <ToggleRow
            title="💳 Pago Móvil"
            checked={resto.payment_pago_movil}
            onChange={(v) => setResto({ ...resto, payment_pago_movil: v })}
          />
          {resto.payment_pago_movil && (
            <div className="mb-3 ml-1 space-y-2">
              <Label className="text-xs">Datos de Pago Móvil (banco, teléfono, cédula)</Label>
              <Textarea
                rows={2}
                value={resto.pago_movil_info ?? ""}
                onChange={(e) => setResto({ ...resto, pago_movil_info: e.target.value })}
                placeholder="Banco Mercantil&#10;0412-1234567&#10;V-12345678"
              />
            </div>
          )}
          <ToggleRow
            title="📱 Pago por WhatsApp"
            checked={resto.payment_whatsapp}
            onChange={(v) => setResto({ ...resto, payment_whatsapp: v })}
          />
          {resto.payment_whatsapp && (
            <div className="mb-3 ml-1 space-y-2">
              <Label className="text-xs">Número de WhatsApp</Label>
              <Input
                value={resto.whatsapp_number ?? ""}
                onChange={(e) => setResto({ ...resto, whatsapp_number: e.target.value })}
                placeholder="+584120690379"
              />
            </div>
          )}
          <ToggleRow
            title="🏪 Pago en local (en caja)"
            subtitle="El cliente paga al recoger"
            checked={resto.payment_en_caja}
            onChange={(v) => setResto({ ...resto, payment_en_caja: v })}
          />
          <ToggleRow
            title="💵 Pago en efectivo"
            subtitle="El cliente paga al recibir"
            checked={resto.payment_efectivo}
            onChange={(v) => setResto({ ...resto, payment_efectivo: v })}
          />
        </section>

        <Button onClick={save} disabled={saving} className="bg-gold text-primary-foreground hover:bg-gold/90">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({ title, subtitle, checked, onChange }: { title: string; subtitle?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        {subtitle && <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}