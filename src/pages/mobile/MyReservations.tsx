import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDriverContext } from "@/hooks/useDriverContext";

interface Reservation {
  id: string;
  vehicle_id: string;
  date_from: string;
  date_to: string;
  time_from: string | null;
  time_to: string | null;
  purpose: string | null;
  status: string;
  vehicle?: { znacka: string | null; rz: string | null };
}

export default function MyReservations() {
  const { driver } = useDriverContext();
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driver) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("reservations")
        .select("id, vehicle_id, date_from, date_to, time_from, time_to, purpose, status")
        .eq("driver_name", driver.fullName)
        .order("date_from", { ascending: false });
      const list = (data as Reservation[]) || [];
      const ids = Array.from(new Set(list.map(r => r.vehicle_id)));
      if (ids.length) {
        const { data: vs } = await supabase
          .from("vehicles").select("id, znacka, rz").in("id", ids);
        const map = new Map((vs || []).map((v: any) => [v.id, v]));
        list.forEach(r => { r.vehicle = map.get(r.vehicle_id); });
      }
      setItems(list);
      setLoading(false);
    })();
  }, [driver]);

  const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" => {
    if (s === "schváleno") return "default";
    if (s === "zamítnuto") return "destructive";
    return "secondary";
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Moje rezervace</h2>
      {loading && <p className="text-sm text-muted-foreground">Načítání…</p>}
      {!loading && items.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nemáte žádné rezervace.
        </CardContent></Card>
      )}
      {items.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">
                  {r.vehicle?.rz || "?"} – {r.vehicle?.znacka || "?"}
                </span>
              </div>
              <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {r.date_from} {r.time_from?.slice(0,5)} → {r.date_to} {r.time_to?.slice(0,5)}
            </p>
            {r.purpose && <p className="text-xs mt-1">{r.purpose}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
