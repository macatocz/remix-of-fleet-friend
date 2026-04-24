import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Stáhne denní kurzovní lístek ČNB a uloží/aktualizuje záznamy v currency_rates.
 * Vrací JSON: { date, rates: { EUR: 24.535, USD: ... } }
 * Volitelný query param ?date=YYYY-MM-DD pro historický kurz.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date"); // YYYY-MM-DD
    let cnbUrl = "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt";
    if (dateParam) {
      // ČNB očekává DD.MM.YYYY
      const [y, m, d] = dateParam.split("-");
      cnbUrl += `?date=${d}.${m}.${y}`;
    }

    const res = await fetch(cnbUrl);
    if (!res.ok) throw new Error(`ČNB ${res.status}`);
    const text = await res.text();

    // První řádek: "24.04.2026 #80"
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const headerDate = lines[0]?.split(" ")[0]; // DD.MM.YYYY
    const [dd, mm, yyyy] = headerDate.split(".");
    const isoDate = `${yyyy}-${mm}-${dd}`;

    // Datový řádek: "země|měna|množství|kód|kurz"
    const rates: Record<string, number> = {};
    for (let i = 2; i < lines.length; i++) {
      const parts = lines[i].split("|");
      if (parts.length < 5) continue;
      const amount = Number(parts[2].replace(",", "."));
      const code = parts[3].trim();
      const rate = Number(parts[4].replace(",", "."));
      if (!code || !rate || !amount) continue;
      rates[code] = rate / amount; // kurz za 1 jednotku
    }

    // Upsert do DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const rows = Object.entries(rates).map(([currency, rate_to_czk]) => ({
      date: isoDate, currency, rate_to_czk, source: "CNB",
    }));
    if (rows.length) {
      await supabase.from("currency_rates").upsert(rows, { onConflict: "date,currency" });
    }

    return new Response(JSON.stringify({ date: isoDate, rates }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});