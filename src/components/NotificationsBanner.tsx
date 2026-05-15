import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationsBanner() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(10);
    setNotifs((data ?? []) as Notification[]);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`notifs-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setNotifs((xs) => xs.filter((n) => n.id !== id));
  };

  if (notifs.length === 0) return null;

  return (
    <div className="space-y-2">
      {notifs.map((n) => (
        <div key={n.id} className="flex items-start justify-between gap-3 rounded-xl border border-gold/40 bg-gold/5 p-4">
          <div className="flex items-start gap-3">
            <Bell className="mt-0.5 h-4 w-4 text-gold" />
            <div>
              <div className="font-semibold">{n.title}</div>
              {n.body && <div className="text-sm text-muted-foreground">{n.body}</div>}
              {n.link && (
                <Button asChild variant="link" className="h-auto p-0 text-gold">
                  <Link to={n.link as never}>Ver detalles →</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="sm" onClick={() => markRead(n.id)} title="Marcar como leído">
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
