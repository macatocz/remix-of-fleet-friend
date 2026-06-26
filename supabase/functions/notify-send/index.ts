// Sends notifications: inserts rows into public.notifications and pushes Web Push to active subscriptions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  user_ids: string[];
  type: string;
  title: string;
  body?: string;
  link?: string;
  vehicle_id?: string;
  reservation_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const payload = (await req.json()) as Payload;
    if (!payload.user_ids?.length || !payload.title || !payload.type) {
      return new Response(JSON.stringify({ error: "missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load preferences and filter users that opted out for this type
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("user_id, push_enabled, types")
      .in("user_id", payload.user_ids);
    const prefsMap = new Map((prefs || []).map((p: any) => [p.user_id, p]));

    const allowed = payload.user_ids.filter((uid) => {
      const p = prefsMap.get(uid);
      if (!p) return true; // default: notify
      const types = p.types || {};
      return types[payload.type] !== false;
    });

    if (!allowed.length) return new Response(JSON.stringify({ inserted: 0, pushed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Insert notifications
    const rows = allowed.map((uid) => ({
      user_id: uid,
      type: payload.type,
      title: payload.title,
      body: payload.body || null,
      link: payload.link || null,
      vehicle_id: payload.vehicle_id || null,
      reservation_id: payload.reservation_id || null,
    }));
    await supabase.from("notifications").insert(rows);

    // Push
    const pushUsers = allowed.filter((uid) => prefsMap.get(uid)?.push_enabled !== false);
    let pushed = 0;
    if (pushUsers.length) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth")
        .in("user_id", pushUsers);

      webpush.setVapidDetails(
        Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com",
        Deno.env.get("VAPID_PUBLIC_KEY")!,
        Deno.env.get("VAPID_PRIVATE_KEY")!,
      );

      const deadIds: string[] = [];
      await Promise.all((subs || []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: payload.title, body: payload.body, link: payload.link, type: payload.type }),
          );
          pushed++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) deadIds.push(s.id);
        }
      }));
      if (deadIds.length) await supabase.from("push_subscriptions").delete().in("id", deadIds);
    }

    return new Response(JSON.stringify({ inserted: rows.length, pushed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});