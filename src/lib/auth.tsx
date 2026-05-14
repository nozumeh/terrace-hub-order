import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Role = "worker" | "supervisor" | "restaurant_owner" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  name: string;
  store_name: string | null;
  store_floor: string | null;
  is_employee: boolean;
}

interface AuthCtx {
  user: User | null;
  profile: Profile | null;
  roles: Role[];
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, profile: null, roles: [], loading: true,
  signOut: async () => {}, refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadExtras = async (u: User | null) => {
    if (!u) { setProfile(null); setRoles([]); return; }
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.id),
    ]);
    setProfile(p as Profile | null);
    setRoles(((r as { role: Role }[] | null) ?? []).map((x) => x.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setTimeout(() => { loadExtras(session?.user ?? null); }, 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      loadExtras(data.session?.user ?? null).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => { await supabase.auth.signOut(); };
  const refresh = async () => { await loadExtras(user); };

  return <Ctx.Provider value={{ user, profile, roles, loading, signOut, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
export const isEmployee = (p: Profile | null, roles: Role[]) =>
  !!p?.is_employee && (roles.includes("worker") || roles.includes("supervisor"));