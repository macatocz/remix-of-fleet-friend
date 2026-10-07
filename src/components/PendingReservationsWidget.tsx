import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Loader2 } from "lucide-react";
import { notify } from "@/lib/notify";

interface Row {
  id: string;
  vehicle_id: string;
  driver_name: string;
  date_from: string;
  date_to: string;
  time_from: string | null;
  time_to: string | null;
  purpose: string | null;
  vehicles?: { znacka: string | null; rz: string | null };
}

export default function PendingReservationsWidget() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("id, vehicle_id, driver_name, date_from, date_to, time_from, time_to, purpose, vehicles(znacka, rz)")
      .eq("status", "čeká")
      .order("date_from", { ascending: true })
      .limit(8);
    setRows((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    const row = rows.find((r) => r.id === id);
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: status === "schváleno" ? "Schváleno" : "Zamítnuto" });
      // Best-effort notify the requesting driver
      try {
        if (row?.driver_name) {
          // Split "Jméno Příjmení" and search both orders
          const parts = row.driver_name.trim().split(/\s+/);
          const first = parts[0] || "";
          const last = parts.slice(1).join(" ") || first;
          const { data: drv } = await supabase
            .from("drivers")
            .select("user_id, first_name, last_name")
            .or(`and(first_name.ilike.${first},last_name.ilike.${last}),and(first_name.ilike.${last},last_name.ilike.${first})`)
            .not("user_id", "is", null)
            .limit(1)
            .maybeSingle();
          if (drv?.user_id) {
            const vlabel = `${row.vehicles?.znacka || ""} ${row.vehicles?.rz || ""}`.trim();
            await notify({
              user_ids: [drv.user_id],
              type: status === "schváleno" ? "reservation_approved" : "reservation_rejected",
              title: status === "schváleno" ? "Rezervace schválena" : "Rezervace zamítnuta",
              body: `${vlabel} · ${new Date(row.date_from).toLocaleDateString("cs-CZ")} – ${new Date(row.date_to).toLocaleDateString("cs-CZ")}`,
              link: "/m/rezervace",
              vehicle_id: row.vehicle_id,
              reservation_id: row.id,
            });
          }
        }
      } catch (_) { /* ignore */ }
      load();
    }
  };

  return (
    <Card className="h-full overflow-hidden shadow-card">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10"><CalendarDays className="h-4 w-4 text-primary" /></span>
          Čekající rezervace
          {rows.length > 0 && <Badge variant="secondary" className="text-[10px]">{rows.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center"><p className="text-xs font-medium">Žádné nové žádosti</p><p className="mt-1 text-[11px] text-muted-foreground">Všechny rezervace jsou vyřízené.</p></div>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r) => (
              <div key={r.id} className="rounded-lg border bg-muted/30 p-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {r.vehicles?.znacka || "—"} ({r.vehicles?.rz || "—"}) • {r.driver_name}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {new Date(r.date_from).toLocaleDateString("cs-CZ")} {r.time_from?.slice(0, 5) || ""}
                    {" – "}
                    {new Date(r.date_to).toLocaleDateString("cs-CZ")} {r.time_to?.slice(0, 5) || ""}
                    {r.purpose && ` • ${r.purpose}`}
                  </div>
                </div>
                <div className="mt-2 flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => update(r.id, "schváleno")}>Schválit</Button>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] text-destructive" onClick={() => update(r.id, "zamítnuto")}>Zamítnout</Button>
                </div>
              </div>
            ))}
            <div className="pt-1">
              <Link to="/rezervace" className="text-[11px] text-primary hover:underline">Všechny rezervace →</Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
