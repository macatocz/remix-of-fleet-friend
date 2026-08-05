// Denní cron: ráno připomene řidičům rezervace, které dnes začínají.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, vehicle_id, driver_name, date_from, date_to, time_from, time_to")
    .eq("status", "schváleno")
    .eq("date_from", today);

  if (!reservations?.length) {
    return new Response(JSON.stringify({ scanned: 0, sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: drivers } = await supabase
    .from("drivers").select("id, first_name, last_name, user_id");
  const byName = new Map(
    (drivers || []).map((d: any) => [`${d.first_name} ${d.last_name}`.trim(), d]),
  );

  const vIds = Array.from(new Set(reservations.map((r: any) => r.vehicle_id)));
  const { data: vehicles } = await supabase
    .from("vehicles").select("id, rz, znacka, nazev_vozu").in("id", vIds);
  const vMap = new Map((vehicles || []).map((v: any) => [v.id, v]));

  let sent = 0;
  for (const r of reservations as any[]) {
    const d = byName.get((r.driver_name || "").trim());
    if (!d?.user_id) continue;

    // De-dupe: stejná připomínka během posledních 20 hodin
    const { data: recent } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", d.user_id)
      .eq("type", "reservation_starting")
      .eq("reservation_id", r.id)
      .gte("created_at", new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
      .limit(1);
    if (recent && recent.length) continue;

    const v = vMap.get(r.vehicle_id);
    const label = v ? `${v.nazev_vozu || v.znacka || ""} ${v.rz ? `· ${v.rz}` : ""}`.trim() : "";

    try {
      await supabase.functions.invoke("notify-send", {
        body: {
          user_ids: [d.user_id],
          type: "reservation_starting",
          title: "Dnes vám začíná rezervace",
          body: `${label} ${(r.time_from || "").slice(0, 5)}–${(r.time_to || "").slice(0, 5)}`.trim(),
          link: "/rezervace",
          vehicle_id: r.vehicle_id,
          reservation_id: r.id,
        },
      });
      sent++;
    } catch (_) { /* ignore */ }
  }

  return new Response(JSON.stringify({ scanned: reservations.length, sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
