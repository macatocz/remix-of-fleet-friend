import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    const admin = createClient(url, service, { auth: { persistSession: false } });

    const { data: adminRole, error: roleError } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) return json({ error: "Nepodařilo se ověřit oprávnění" }, 500);
    if (!adminRole) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? "invite";
    const email: string = (body.email ?? "").trim().toLowerCase();
    const redirectTo: string = body.redirectTo || "";

    if (!email) return json({ error: "Chybí e-mail" }, 400);

    if (action === "resend") {
      const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, resent: true });
    }

    const firstName: string = (body.first_name ?? "").trim();
    const lastName: string = (body.last_name ?? "").trim();
    const role: string = body.role ?? "ridic";
    if (!["admin", "dispatcer", "ridic"].includes(role)) {
      return json({ error: "Neplatná role" }, 400);
    }

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { first_name: firstName, last_name: lastName },
    });
    if (inviteError) return json({ error: inviteError.message }, 400);

    const newUserId = invited?.user?.id;
    if (newUserId) {
      const { error: roleInsertError } = await admin
        .from("user_roles")
        .insert({ user_id: newUserId, role });
      // duplicate role (e.g. auto-assigned admin) is not an error worth failing on
      if (roleInsertError && !roleInsertError.message.includes("duplicate")) {
        return json({ ok: true, warning: roleInsertError.message, user_id: newUserId });
      }
    }

    return json({ ok: true, user_id: newUserId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Neznámá chyba" }, 500);
  }
});
