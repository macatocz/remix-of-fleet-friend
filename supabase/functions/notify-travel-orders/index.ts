// Daily cron: notifies drivers to fill in a travel order (cesťák) for approved
// reservations longer than the configured threshold that start tomorrow.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOURS_THRESHOLD = 5;

function hoursOf(dateFrom: string, dateTo: string, timeFrom?: string | null, timeTo?: string | null) {
  const from = new Date(`${dateFrom}T${(timeFrom || "08:00").slice(0, 5)}:00`).getTime();
  const to = new Date(`${dateTo}T${(timeTo || "17:00").slice(0, 5)}:00`).getTime();
  return Math.max(0, (to - from) / 3_600_000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, vehicle_id, driver_name, date_from, date_to, time_from, time_to, status")
    .eq("status", "schváleno")
    .eq("date_from", tomorrow);

  const candidates = (reservations || []).filter((r: any) =>
    hoursOf(r.date_from, r.date_to, r.time_from, r.time_to) > HOURS_THRESHOLD
  );

  if (!candidates.length) {
    return new Response(JSON.stringify({ scanned: 0, inserted: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: drivers } = await supabase.from("drivers").select("id, first_name, last_name, user_id");
  const byName = new Map(
    (drivers || []).map((d: any) => [`${d.first_name} ${d.last_name}`.trim(), d]),
  );

  const vIds = Array.from(new Set(candidates.map((r: any) => r.vehicle_id)));
  const { data: vehicles } = await supabase
    .from("vehicles").select("id, rz, znacka, nazev_vozu").in("id", vIds);
  const vMap = new Map((vehicles || []).map((v: any) => [v.id, v]));

  let inserted = 0;
  for (const r of candidates as any[]) {
    const d = byName.get((r.driver_name || "").trim());
    if (!d?.user_id) continue;

    // Skip if a travel order already exists for this driver and date
    const { data: existing } = await supabase
      .from("travel_orders")
      .select("id")
      .eq("driver_id", d.id)
      .eq("date_from", r.date_from)
      .limit(1);
    if (existing && existing.length) continue;

    // De-dupe notification within 20 hours
    const { data: recent } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", d.user_id)
      .eq("type", "travel_order_required")
      .eq("reservation_id", r.id)
      .gte("created_at", new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
      .limit(1);
    if (recent && recent.length) continue;

    const v = vMap.get(r.vehicle_id);
    const label = v ? `${v.nazev_vozu || v.znacka || ""} ${v.rz || ""}`.trim() : "";
    const payload = {
      user_ids: [d.user_id],
      type: "travel_order_required",
      title: "Vyplňte cestovní příkaz",
      body: `Rezervace ${label} (${r.date_from} ${(r.time_from || "").slice(0, 5)} → ${r.date_to} ${(r.time_to || "").slice(0, 5)}) přesahuje ${HOURS_THRESHOLD} hodin.`,
      link: "/cestovni-prikazy",
      vehicle_id: r.vehicle_id,
      reservation_id: r.id,
    };

    try {
      await supabase.functions.invoke("notify-send", { body: payload });
      inserted++;
    } catch (_) { /* ignore */ }
  }

  return new Response(JSON.stringify({ scanned: candidates.length, inserted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});