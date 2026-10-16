import { supabase } from "@/integrations/supabase/client";
import type { FuelStop } from "@/lib/tripGen/types";

export interface FuelMilestone {
  id: string;
  date: string; // YYYY-MM-DD (local)
  time: string | null; // HH:MM
  place: string;
  liters: number | null;
  price: number | null;
  km: number | null;
  driver_id: string | null;
}

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Real fuel receipts (fuel_records) of a vehicle in a month — fixed milestones for the trip log. */
export async function loadFuelMilestones(vehicleId: string, month: string): Promise<FuelMilestone[]> {
  const { start, end } = monthRange(month);
  const { data, error } = await supabase
    .from("fuel_records")
    .select("id, fueled_at, location, liters, total_price, km, driver_id")
    .eq("vehicle_id", vehicleId)
    .gte("fueled_at", start.toISOString())
    .lt("fueled_at", end.toISOString())
    .order("fueled_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((r) => {
    const d = new Date(r.fueled_at);
    return {
      id: r.id,
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      place: r.location || "Čerpací stanice",
      liters: r.liters != null ? Number(r.liters) : null,
      price: r.total_price != null ? Number(r.total_price) : null,
      km: r.km,
      driver_id: r.driver_id,
    };
  });
}

export function milestonesToFuelStops(ms: FuelMilestone[]): FuelStop[] {
  return ms.map((m) => ({ date: m.date, place: m.place, liters: m.liters || 0, price: m.price || 0 }));
}

/**
 * Writes fuel receipts into the trip log: attaches liters/price to a business trip
 * of the same day, or creates a business trip ending at the station. Idempotent.
 */
export async function syncFuelIntoTrips(vehicleId: string, month: string) {
  const ms = await loadFuelMilestones(vehicleId, month);
  const [y, m] = month.split("-").map(Number);
  const startDate = `${y}-${pad(m)}-01`;
  const endDate = `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`;
  const { data: trips, error } = await supabase
    .from("trip_logs")
    .select("id, date, time, route_to, purpose_type, fuel_quantity, fuel_price")
    .eq("vehicle_id", vehicleId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("time", { ascending: true });
  if (error) throw error;
  const list = [...(trips || [])];
  let attached = 0, created = 0, skipped = 0;

  for (const f of ms) {
    const sameDay = list.filter((t) => t.date === f.date);
    const already = sameDay.find((t) => t.fuel_quantity != null && f.liters != null && Math.abs(Number(t.fuel_quantity) - f.liters) < 0.05);
    if (already) { skipped++; continue; }
    const target = sameDay.find((t) => t.fuel_quantity == null && t.purpose_type !== "soukrome")
      || sameDay.find((t) => t.fuel_quantity == null);
    if (target) {
      const patch: any = { fuel_quantity: f.liters, fuel_price: f.price };
      if (!target.route_to) patch.route_to = f.place;
      const { error: e } = await supabase.from("trip_logs").update(patch).eq("id", target.id);
      if (e) throw e;
      target.fuel_quantity = f.liters as any;
      attached++;
    } else {
      const { data: ins, error: e } = await supabase.from("trip_logs").insert({
        vehicle_id: vehicleId,
        driver_id: f.driver_id,
        date: f.date,
        time: f.time,
        route_to: f.place,
        purpose: "Služební jízda – tankování",
        purpose_type: "pracovne",
        km_end: f.km,
        fuel_quantity: f.liters,
        fuel_price: f.price,
      }).select("id, date, time, route_to, purpose_type, fuel_quantity, fuel_price").single();
      if (e) throw e;
      if (ins) list.push(ins);
      created++;
    }
  }
  return { total: ms.length, attached, created, skipped };
}

/**
 * Official view: business trips stay as entered; private trips keep date/km
 * (odometer continuity) but get a business route/purpose. Data in DB is untouched.
 */
export function officializeTrips<T extends { purpose_type?: string | null; route_from?: string | null; route_to?: string | null; purpose?: string | null; description?: string | null; date: string; km_total?: number | null }>(
  rows: T[],
  opts: { base: string; destinations: string[]; purposes: string[] },
): T[] {
  let di = 0, pi = 0;
  const dest = opts.destinations.length ? opts.destinations : ["Zákazník"];
  const purp = opts.purposes.length ? opts.purposes : ["Obchodní jednání"];
  return rows.map((r) => {
    if (r.purpose_type === "pracovne") return r;
    const d = dest[di++ % dest.length];
    return {
      ...r,
      purpose_type: "pracovne",
      route_from: opts.base,
      route_to: `${d} – ${opts.base}`,
      purpose: purp[pi++ % purp.length],
      description: null,
    };
  });
}
