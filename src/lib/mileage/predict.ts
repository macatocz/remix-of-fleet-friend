import { supabase } from "@/integrations/supabase/client";

/**
 * Predict next km for a vehicle.
 * Strategy:
 * 1) Return the latest known km from trip_logs (km_end) — the next trip's km_start.
 * 2) Optionally project forward by avg daily km × days since last entry.
 */
export interface KmPrediction {
  lastKm: number | null;
  lastDate: string | null;
  avgDailyKm: number;
  projected: number | null;
}

function parseKm(v: any): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export async function predictKm(vehicleId: string, targetDate: Date = new Date()): Promise<KmPrediction> {
  if (!vehicleId) return { lastKm: null, lastDate: null, avgDailyKm: 0, projected: null };

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: rows } = await supabase
    .from("trip_logs")
    .select("datum, km_start, km_end")
    .eq("vehicle_id", vehicleId)
    .order("datum", { ascending: false })
    .limit(60);

  if (!rows || rows.length === 0) return { lastKm: null, lastDate: null, avgDailyKm: 0, projected: null };

  // Latest km
  const sorted = [...rows].sort((a: any, b: any) => (a.datum < b.datum ? 1 : -1));
  const latest = sorted[0] as any;
  const lastKm = parseKm(latest.km_end) ?? parseKm(latest.km_start);
  const lastDate = latest.datum as string;

  // Avg daily km over last 30 days
  const recent = sorted.filter((r: any) => r.datum >= since.toISOString().slice(0, 10));
  let totalKm = 0;
  for (const r of recent as any[]) {
    const s = parseKm(r.km_start);
    const e = parseKm(r.km_end);
    if (s != null && e != null && e >= s) totalKm += e - s;
  }
  const days = Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86400000));
  const avgDailyKm = Math.round(totalKm / days);

  let projected: number | null = null;
  if (lastKm != null) {
    const elapsedDays = Math.max(
      0,
      Math.floor((targetDate.getTime() - new Date(lastDate + "T00:00:00").getTime()) / 86400000),
    );
    projected = lastKm + Math.round(avgDailyKm * elapsedDays);
  }

  return { lastKm, lastDate, avgDailyKm, projected };
}