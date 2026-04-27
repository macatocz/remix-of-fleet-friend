import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RouteHistoryEntry {
  route_from: string;
  route_to: string;
  km_median: number;
  count: number;
}

/**
 * Loads recent unique route_from/route_to pairs for a vehicle and computes
 * median km_total per route to suggest km when the user picks a known pair.
 */
export function useRouteHistory(vehicleId: string | undefined) {
  const [places, setPlaces] = useState<string[]>([]);
  const [routes, setRoutes] = useState<RouteHistoryEntry[]>([]);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("trip_logs")
        .select("route_from, route_to, km_total")
        .eq("vehicle_id", vehicleId)
        .order("date", { ascending: false })
        .limit(500);
      if (cancelled || !data) return;

      const placeSet = new Set<string>();
      const grouped = new Map<string, number[]>();
      for (const r of data as any[]) {
        if (r.route_from) placeSet.add(r.route_from);
        if (r.route_to) placeSet.add(r.route_to);
        if (r.route_from && r.route_to && r.km_total) {
          const key = `${r.route_from}→${r.route_to}`;
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(Number(r.km_total));
        }
      }
      const entries: RouteHistoryEntry[] = [];
      for (const [key, kms] of grouped.entries()) {
        const [from, to] = key.split("→");
        kms.sort((a, b) => a - b);
        const mid = Math.floor(kms.length / 2);
        const median = kms.length % 2 ? kms[mid] : Math.round((kms[mid - 1] + kms[mid]) / 2);
        entries.push({ route_from: from, route_to: to, km_median: median, count: kms.length });
      }
      entries.sort((a, b) => b.count - a.count);
      setPlaces(Array.from(placeSet).sort());
      setRoutes(entries);
    })();
    return () => { cancelled = true; };
  }, [vehicleId]);

  /** Suggest median km for an exact from/to pair (case-insensitive). */
  const suggestKm = (from: string | null, to: string | null): number | null => {
    if (!from || !to) return null;
    const f = from.trim().toLowerCase();
    const t = to.trim().toLowerCase();
    const hit = routes.find(r => r.route_from.toLowerCase() === f && r.route_to.toLowerCase() === t);
    return hit ? hit.km_median : null;
  };

  return { places, routes, suggestKm };
}