import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_BCV_RATE = 517.96;

export interface BcvRate {
  rate: number;
  date: string;
  notes?: string | null;
}

export function formatBs(usd: number, rate: number): string {
  const bs = Number(usd) * Number(rate);
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(bs);
}

export function formatBsLabel(usd: number, rate: number): string {
  return `Bs. ${formatBs(usd, rate)}`;
}

export async function fetchCurrentBcvRate(): Promise<BcvRate> {
  const { data, error } = await supabase
    .from("bcv_rates")
    .select("rate,date,notes")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("[bcv] fetch error", error);
  if (data) return { rate: Number(data.rate), date: data.date, notes: data.notes };
  return { rate: DEFAULT_BCV_RATE, date: new Date().toISOString().slice(0, 10) };
}

export function useBcvRate() {
  const [rate, setRate] = useState<BcvRate>({ rate: DEFAULT_BCV_RATE, date: new Date().toISOString().slice(0, 10) });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const r = await fetchCurrentBcvRate();
    setRate(r);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("bcv-rates")
      .on("postgres_changes", { event: "*", schema: "public", table: "bcv_rates" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return { rate: rate.rate, date: rate.date, notes: rate.notes, loading, refresh };
}