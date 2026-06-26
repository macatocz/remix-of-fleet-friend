// Daily cron: scans expiring documents and creates notifications for vehicle owners.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THRESHOLDS = [30, 14, 7, 1];

function daysBetween(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00").getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00").getTime();
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Map vehicle -> owner user_id (via drivers.spravce link)
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, rz, znacka, spravce_id, leasing_konec");
  const { data: drivers } = await supabase.from("drivers").select("id, user_id");
  const driverUser = new Map((drivers || []).map((d: any) => [d.id, d.user_id]));

  type Hit = { user_id: string; vehicle_id: string; type: string; title: string; body: string; link: string };
  const hits: Hit[] = [];

  const labelOf = (v: any) => `${v.znacka || ""} ${v.rz || ""}`.trim();

  const sources: Array<{ table: string; field: string; type: string; label: string }> = [
    { table: "inspections", field: "next_inspection", type: "expiration_stk", label: "STK" },
    { table: "insurance", field: "platnost_do", type: "expiration_insurance", label: "Pojištění" },
    { table: "service_plans", field: "next_service_date", type: "expiration_service", label: "Servis" },
    { table: "vehicle_vignettes", field: "valid_to", type: "expiration_vignette", label: "Dálniční známka" },
  ];

  for (const s of sources) {
    const { data } = await supabase.from(s.table).select(`vehicle_id, ${s.field}`).not(s.field, "is", null);
    for (const row of (data || []) as any[]) {
      const d = daysBetween(row[s.field]);
      if (!THRESHOLDS.includes(d)) continue;
      const v = vehicles?.find((x: any) => x.id === row.vehicle_id);
      if (!v) continue;
      const uid = v.spravce_id ? driverUser.get(v.spravce_id) : null;
      if (!uid) continue;
      hits.push({
        user_id: uid,
        vehicle_id: v.id,
        type: s.type,
        title: `${s.label} končí za ${d} ${d === 1 ? "den" : d < 5 ? "dny" : "dní"}`,
        body: `${labelOf(v)} — ${s.label.toLowerCase()} vyprší ${new Date(row[s.field]).toLocaleDateString("cs-CZ")}`,
        link: `/vozidla/${v.id}`,
      });
    }
  }

  // Leasing end from vehicles.leasing_konec
  for (const v of (vehicles || []) as any[]) {
    if (!v.leasing_konec) continue;
    const d = daysBetween(v.leasing_konec);
    if (!THRESHOLDS.includes(d)) continue;
    const uid = v.spravce_id ? driverUser.get(v.spravce_id) : null;
    if (!uid) continue;
    hits.push({
      user_id: uid,
      vehicle_id: v.id,
      type: "expiration_leasing",
      title: `Leasing končí za ${d} ${d === 1 ? "den" : d < 5 ? "dny" : "dní"}`,
      body: `${labelOf(v)} — konec leasingu ${new Date(v.leasing_konec).toLocaleDateString("cs-CZ")}`,
      link: `/vozidla/${v.id}`,
    });
  }

  // De-dupe: skip if same (user_id,type,vehicle_id) inserted in last 20 hours
  let inserted = 0;
  for (const h of hits) {
    const { data: recent } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", h.user_id)
      .eq("type", h.type)
      .eq("vehicle_id", h.vehicle_id)
      .gte("created_at", new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
      .limit(1);
    if (recent && recent.length) continue;
    await supabase.from("notifications").insert(h);
    inserted++;
    // Trigger push
    try {
      await supabase.functions.invoke("notify-send", {
        body: { user_ids: [h.user_id], type: h.type, title: h.title, body: h.body, link: h.link, vehicle_id: h.vehicle_id },
      });
    } catch (_) { /* ignore */ }
  }

  return new Response(JSON.stringify({ scanned: hits.length, inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});