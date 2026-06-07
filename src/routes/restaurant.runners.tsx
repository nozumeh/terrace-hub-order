import { useEffect, useMemo, useState, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Plus, Bike, MessageSquare, Radio, Send, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/restaurant/runners")({ component: RunnersPage });

interface Runner {
  id: string;
  name: string;
  phone: string;
  schedule: string | null;
  notes: string | null;
  is_active: boolean;
  user_id: string | null;
}
interface Shift {
  id: string;
  runner_id: string;
  shift_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}
interface RunnerMessage {
  id: string;
  runner_id: string;
  restaurant_id: string;
  message: string;
  sent_by: string;
  sent_at: string;
  runner_name?: string;
  is_broadcast: boolean;
}

// ─── Utility: send in-app notification to runner's user account ───────────────
async function notifyRunner(userId: string, title: string, body: string) {
  if (!userId) return;
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
  });
}

function RunnersPage() {
  const { user, loading, isRestaurantOwner } = useAuth();
  const navigate = useNavigate();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [runners, setRunners] = useState<Runner[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [messages, setMessages] = useState<RunnerMessage[]>([]);
  const [busy, setBusy] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Runner | null>(null);
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [shiftRunner, setShiftRunner] = useState<string>("");

  useEffect(() => {
    if (!loading && !isRestaurantOwner) navigate({ to: "/" });
  }, [loading, isRestaurantOwner, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("restaurants").select("id, name").eq("owner_id", user.id).maybeSingle();
    if (!r) {
      setBusy(false);
      return;
    }
    setRestaurantId(r.id);
    setRestaurantName((r as { id: string; name: string }).name ?? "");

    const { data: rn } = await supabase
      .from("food_runners")
      .select("*")
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: false });
    const list = (rn ?? []) as Runner[];
    setRunners(list);

    if (list.length) {
      const { data: sh } = await supabase
        .from("runner_shifts")
        .select("*")
        .in(
          "runner_id",
          list.map((x) => x.id),
        )
        .gte("shift_date", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10))
        .order("shift_date", { ascending: false });
      setShifts((sh ?? []) as Shift[]);

      // Load messages for this restaurant
      const { data: msgs } = await supabase
        .from("runner_messages")
        .select("*")
        .eq("restaurant_id", r.id)
        .order("sent_at", { ascending: false })
        .limit(100);
      if (msgs) {
        const enriched = (msgs as RunnerMessage[]).map((m) => ({
          ...m,
          runner_name: list.find((rn) => rn.id === m.runner_id)?.name,
        }));
        setMessages(enriched);
      }
    }
    setBusy(false);
  };

  useEffect(() => {
    if (user && isRestaurantOwner) load();
  }, [user, isRestaurantOwner]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel("runner-messages-" + restaurantId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "runner_messages", filter: `restaurant_id=eq.${restaurantId}` },
        () => {
          load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const today = new Date().toISOString().slice(0, 10);
  const todayShift = useMemo(
    () => shifts.find((s) => s.shift_date === today && s.status !== "completed"),
    [shifts, today],
  );
  const todayRunner = useMemo(() => runners.find((r) => r.id === todayShift?.runner_id), [runners, todayShift]);

  const shiftsThisMonth = (runnerId: string) => {
    const start = new Date();
    start.setDate(1);
    const startStr = start.toISOString().slice(0, 10);
    return shifts.filter((s) => s.runner_id === runnerId && s.shift_date >= startStr).length;
  };

  const registerShift = async () => {
    if (!shiftRunner) {
      toast.error("Selecciona un runner");
      return;
    }
    const { error } = await supabase.from("runner_shifts").insert({
      runner_id: shiftRunner,
      shift_date: shiftDate,
      status: "scheduled",
    });
    if (error) toast.error("❌ " + error.message);
    else {
      toast.success("✓ Turno registrado");
      setShiftRunner("");
      load();
    }
  };

  const checkIn = async () => {
    if (!todayShift) return;
    await supabase
      .from("runner_shifts")
      .update({ check_in: new Date().toISOString(), status: "active" })
      .eq("id", todayShift.id);
    toast.success("✓ Check-in");
    load();
  };
  const checkOut = async () => {
    if (!todayShift) return;
    await supabase
      .from("runner_shifts")
      .update({ check_out: new Date().toISOString(), status: "completed" })
      .eq("id", todayShift.id);
    toast.success("✓ Salida marcada");
    load();
  };

  const toggleActive = async (r: Runner) => {
    await supabase.from("food_runners").update({ is_active: !r.is_active }).eq("id", r.id);
    load();
  };

  if (busy)
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/restaurant">
              <ArrowLeft className="h-3 w-3" /> Volver
            </Link>
          </Button>
          <h1 className="mt-2 font-heading text-3xl font-bold">Food Runners</h1>
          <p className="text-sm text-muted-foreground">Gestiona repartidores, mensajes y turnos.</p>
        </div>

        <Tabs defaultValue="operaciones">
          <TabsList className="mb-4">
            <TabsTrigger value="operaciones">
              <Bike className="mr-1 h-4 w-4" /> Operaciones
            </TabsTrigger>
            <TabsTrigger value="mensajes">
              <MessageSquare className="mr-1 h-4 w-4" /> Mensajes
            </TabsTrigger>
            <TabsTrigger value="radio">
              <Radio className="mr-1 h-4 w-4" /> Radio
            </TabsTrigger>
          </TabsList>

          {/* ─── TAB 1: OPERACIONES ──────────────────────────────────────────── */}
          <TabsContent value="operaciones" className="space-y-6">
            {/* Runner de hoy */}
            <section className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/5 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-widest text-gold">
                  🏃 Runner de hoy
                  {todayShift?.status === "active" && (
                    <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-400">ACTIVO 🟢</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString("es-VE")}</div>
              </div>
              {!todayRunner ? (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">No hay runner asignado hoy</p>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <Select value={shiftRunner} onValueChange={setShiftRunner}>
                      <SelectTrigger className="w-60">
                        <SelectValue placeholder="Asignar runner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {runners
                          .filter((r) => r.is_active)
                          .map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => {
                        setShiftDate(today);
                        registerShift();
                      }}
                      className="bg-gold text-primary-foreground hover:bg-gold/90"
                    >
                      Asignar runner para hoy
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <div className="font-heading text-2xl font-bold">{todayRunner.name}</div>
                  <div className="text-sm text-muted-foreground">📱 {todayRunner.phone || "—"}</div>
                  {todayShift?.check_in && (
                    <div className="text-sm">
                      Entrada:{" "}
                      {new Date(todayShift.check_in).toLocaleTimeString("es-VE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                  {todayShift?.check_out && (
                    <div className="text-sm">
                      Salida:{" "}
                      {new Date(todayShift.check_out).toLocaleTimeString("es-VE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    {!todayShift?.check_in && (
                      <Button size="sm" onClick={checkIn}>
                        Marcar entrada
                      </Button>
                    )}
                    {todayShift?.check_in && !todayShift?.check_out && (
                      <Button size="sm" onClick={checkOut}>
                        Marcar salida
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Registrar turno */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-heading text-lg font-bold">Registrar turno</h2>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Fecha</Label>
                  <Input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} />
                </div>
                <div className="flex-1 min-w-[200px] space-y-1">
                  <Label className="text-xs">Runner</Label>
                  <Select value={shiftRunner} onValueChange={setShiftRunner}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar runner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {runners
                        .filter((r) => r.is_active)
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={registerShift} className="bg-gold text-primary-foreground hover:bg-gold/90">
                  <Plus className="h-4 w-4" /> Registrar turno
                </Button>
              </div>
            </section>

            {/* Roster */}
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold">
                  <Bike className="mr-2 inline h-5 w-5 text-gold" /> Todos los food runners
                </h2>
                <Button
                  onClick={() => {
                    setEditing(null);
                    setAddOpen(true);
                  }}
                  className="bg-gold text-primary-foreground hover:bg-gold/90"
                >
                  <Plus className="h-4 w-4" /> Agregar Runner
                </Button>
              </div>
              {runners.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay runners registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="py-2">Nombre</th>
                        <th className="py-2">Teléfono</th>
                        <th className="py-2">Horario</th>
                        <th className="py-2">Estado</th>
                        <th className="py-2 text-right">Turnos mes</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {runners.map((r) => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="py-2 font-medium">{r.name}</td>
                          <td className="py-2 text-muted-foreground">{r.phone || "—"}</td>
                          <td className="py-2 text-muted-foreground">{r.schedule || "—"}</td>
                          <td className="py-2">
                            <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                          </td>
                          <td className="py-2 text-right font-mono">{shiftsThisMonth(r.id)}</td>
                          <td className="py-2 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditing(r);
                                setAddOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Shift history */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 font-heading text-lg font-bold">Historial de turnos (30 días)</h2>
              {shifts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin turnos registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="py-2">Fecha</th>
                        <th className="py-2">Runner</th>
                        <th className="py-2">Entrada</th>
                        <th className="py-2">Salida</th>
                        <th className="py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((s) => {
                        const rn = runners.find((r) => r.id === s.runner_id);
                        return (
                          <tr key={s.id} className="border-b border-border/50">
                            <td className="py-2">{new Date(s.shift_date).toLocaleDateString("es-VE")}</td>
                            <td className="py-2">{rn?.name ?? "—"}</td>
                            <td className="py-2 text-muted-foreground">
                              {s.check_in
                                ? new Date(s.check_in).toLocaleTimeString("es-VE", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </td>
                            <td className="py-2 text-muted-foreground">
                              {s.check_out
                                ? new Date(s.check_out).toLocaleTimeString("es-VE", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </td>
                            <td className="py-2 text-xs uppercase tracking-wider">{s.status}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </TabsContent>

          {/* ─── TAB 2: MENSAJES ──────────────────────────────────────────────── */}
          <TabsContent value="mensajes">
            <MessagingPanel
              runners={runners}
              messages={messages}
              restaurantId={restaurantId}
              restaurantName={restaurantName}
              senderUserId={user?.id ?? ""}
              onSent={load}
            />
          </TabsContent>

          {/* ─── TAB 3: RADIO ─────────────────────────────────────────────────── */}
          <TabsContent value="radio">
            <RadioPanel
              runners={runners}
              restaurantId={restaurantId}
              restaurantName={restaurantName}
              senderUserId={user?.id ?? ""}
              onSent={load}
            />
          </TabsContent>
        </Tabs>
      </div>

      <RunnerDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        runner={editing}
        restaurantId={restaurantId}
        onSaved={() => {
          setAddOpen(false);
          load();
        }}
      />
    </div>
  );
}

// ─── MESSAGING PANEL ─────────────────────────────────────────────────────────
function MessagingPanel({
  runners,
  messages,
  restaurantId,
  restaurantName,
  senderUserId,
  onSent,
}: {
  runners: Runner[];
  messages: RunnerMessage[];
  restaurantId: string | null;
  restaurantName: string;
  senderUserId: string;
  onSent: () => void;
}) {
  const [selectedRunner, setSelectedRunner] = useState<string>("all");
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredMessages = useMemo(() => {
    if (selectedRunner === "all") return messages;
    return messages.filter((m) => m.runner_id === selectedRunner || m.is_broadcast);
  }, [messages, selectedRunner]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  const sendMessage = async () => {
    if (!msgText.trim() || !restaurantId) return;
    setSending(true);
    const isBroadcast = selectedRunner === "all";
    const targetRunners = isBroadcast
      ? runners.filter((r) => r.is_active)
      : runners.filter((r) => r.id === selectedRunner);

    if (isBroadcast) {
      // Insert one broadcast message
      const { error } = await supabase.from("runner_messages").insert({
        runner_id: targetRunners[0]?.id ?? null,
        restaurant_id: restaurantId,
        message: msgText.trim(),
        sent_by: senderUserId,
        is_broadcast: true,
      });
      if (error) {
        toast.error("Error enviando: " + error.message);
        setSending(false);
        return;
      }
      // Notify all active runners
      for (const r of targetRunners) {
        if (r.user_id) {
          await notifyRunner(r.user_id, `📢 ${restaurantName}`, msgText.trim());
        }
      }
      toast.success("📢 Mensaje enviado a todos los runners activos");
    } else {
      const runner = targetRunners[0];
      const { error } = await supabase.from("runner_messages").insert({
        runner_id: runner?.id,
        restaurant_id: restaurantId,
        message: msgText.trim(),
        sent_by: senderUserId,
        is_broadcast: false,
      });
      if (error) {
        toast.error("Error: " + error.message);
        setSending(false);
        return;
      }
      if (runner?.user_id) {
        await notifyRunner(runner.user_id, `🍔 ${restaurantName}`, msgText.trim());
      }
      toast.success(`✓ Mensaje enviado a ${runner?.name}`);
    }

    setMsgText("");
    setSending(false);
    onSent();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gold" /> Portal de Mensajes
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Destinatario:</Label>
            <Select value={selectedRunner} onValueChange={setSelectedRunner}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">📢 Todos los runners activos</SelectItem>
                {runners
                  .filter((r) => r.is_active)
                  .map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Message feed */}
        <div className="h-72 overflow-y-auto rounded-lg border border-border/50 bg-background/50 p-3 space-y-2">
          {filteredMessages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-10">No hay mensajes aún.</p>
          ) : (
            [...filteredMessages].reverse().map((m) => (
              <div key={m.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  {m.is_broadcast ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 border-gold/40 text-gold">
                      📢 BROADCAST
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {m.runner_name ?? "Runner"}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.sent_at).toLocaleString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="rounded-lg bg-card border border-border/40 px-3 py-2 text-sm">{m.message}</p>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-3 flex gap-2">
          <Textarea
            rows={2}
            className="flex-1 resize-none"
            placeholder={
              selectedRunner === "all" ? "Escribe un mensaje para todos los runners..." : "Escribe un mensaje..."
            }
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={handleKey}
          />
          <Button
            className="self-end bg-gold text-primary-foreground hover:bg-gold/90"
            onClick={sendMessage}
            disabled={sending || !msgText.trim()}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Enter para enviar · Shift+Enter para nueva línea · El runner recibe notificación en su app
        </p>
      </div>

      {/* Notification info */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3 items-start">
        <Bell className="mt-0.5 h-4 w-4 text-emerald-400 shrink-0" />
        <div className="text-sm text-emerald-300/80">
          <span className="font-semibold text-emerald-400">Notificaciones push activas.</span> Cuando el runner tenga su
          cuenta creada y esté logueado en la app, recibirá cada mensaje como notificación en su teléfono en tiempo
          real.
        </div>
      </div>
    </div>
  );
}

// ─── RADIO PANEL ─────────────────────────────────────────────────────────────
function RadioPanel({
  runners,
  restaurantId,
  restaurantName,
  senderUserId,
  onSent,
}: {
  runners: Runner[];
  restaurantId: string | null;
  restaurantName: string;
  senderUserId: string;
  onSent: () => void;
}) {
  const QUICK_MESSAGES = [
    { label: "🛵 Delivery listo", text: "Tu pedido está listo para entrega. Dirígete al restaurante." },
    { label: "⏳ Espera 5 min", text: "Hay un retraso de 5 minutos. Por favor espera en el área de pickup." },
    { label: "📍 Confirma ubicación", text: "Confirma tu ubicación actual, por favor." },
    { label: "✅ Pedido entregado", text: "Confirma que el pedido fue entregado correctamente." },
    { label: "🚨 Urgente - Regresa", text: "URGENTE: Regresa al restaurante de inmediato." },
    { label: "🎉 Fin de turno", text: "Tu turno ha finalizado. Gracias por tu trabajo hoy." },
  ];

  const [sending, setSending] = useState<string | null>(null);

  const sendQuick = async (text: string, label: string) => {
    if (!restaurantId) return;
    setSending(label);
    const activeRunners = runners.filter((r) => r.is_active);
    const { error } = await supabase.from("runner_messages").insert({
      runner_id: activeRunners[0]?.id ?? null,
      restaurant_id: restaurantId,
      message: text,
      sent_by: senderUserId,
      is_broadcast: true,
    });
    if (error) {
      toast.error("Error: " + error.message);
      setSending(null);
      return;
    }
    for (const r of activeRunners) {
      if (r.user_id) await notifyRunner(r.user_id, `📻 ${restaurantName}`, text);
    }
    toast.success(`📻 ${label} enviado a ${activeRunners.length} runner(s)`);
    setSending(null);
    onSent();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 font-heading text-lg font-bold flex items-center gap-2">
          <Radio className="h-5 w-5 text-gold" /> Radio — Mensajes Rápidos
        </h2>
        <p className="text-xs text-muted-foreground mb-5">
          Envía mensajes instantáneos a todos los runners activos con un solo toque. Ideal para coordinación en tiempo
          real.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_MESSAGES.map((qm) => (
            <button
              key={qm.label}
              onClick={() => sendQuick(qm.text, qm.label)}
              disabled={sending === qm.label || runners.filter((r) => r.is_active).length === 0}
              className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-4 text-left transition-all hover:border-gold/40 hover:bg-gold/5 disabled:opacity-50"
            >
              {sending === qm.label ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold shrink-0" />
              ) : (
                <span className="text-xl">{qm.label.split(" ")[0]}</span>
              )}
              <div>
                <div className="text-sm font-semibold">{qm.label.split(" ").slice(1).join(" ")}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{qm.text}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2 font-semibold text-foreground/80">
          <Radio className="h-3.5 w-3.5" /> Cómo funciona
        </div>
        <p>
          Los mensajes de radio se envían como broadcast a todos los runners activos simultáneamente. Cada runner recibe
          una notificación push en su teléfono. El historial completo está disponible en la pestaña{" "}
          <strong>Mensajes</strong>.
        </p>
      </div>
    </div>
  );
}

// ─── RUNNER DIALOG ───────────────────────────────────────────────────────────
function RunnerDialog({
  open,
  onClose,
  runner,
  restaurantId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  runner: Runner | null;
  restaurantId: string | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [schedule, setSchedule] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(runner?.name ?? "");
    setPhone(runner?.phone ?? "");
    setSchedule(runner?.schedule ?? "");
    setNotes(runner?.notes ?? "");
  }, [runner, open]);

  const save = async () => {
    if (!restaurantId || !name.trim() || !phone.trim()) {
      toast.error("Nombre y teléfono requeridos");
      return;
    }
    setSaving(true);
    if (runner) {
      await supabase.from("food_runners").update({ name, phone, schedule, notes }).eq("id", runner.id);
    } else {
      await supabase.from("food_runners").insert({ restaurant_id: restaurantId, name, phone, schedule, notes });
    }
    setSaving(false);
    toast.success("✓ Guardado");
    onSaved();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{runner ? "Editar runner" : "Agregar Runner"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nombre completo *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Teléfono/WhatsApp *</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0414-123-4567" />
          </div>
          <div className="space-y-1">
            <Label>Horario</Label>
            <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Lun-Vie 11am-4pm" />
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="bg-gold text-primary-foreground hover:bg-gold/90" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {runner ? "Guardar" : "Agregar Runner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
