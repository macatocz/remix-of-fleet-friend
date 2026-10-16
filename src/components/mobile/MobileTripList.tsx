import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Route, Plus } from "lucide-react";
import QuickTripDialog from "@/components/mobile/QuickTripDialog";

interface Trip {
  id: string; date: string; time: string | null; route_from: string | null; route_to: string | null;
  km_total: number | null; km_start: number | null; km_end: number | null; purpose: string | null; purpose_type: string;
}

const typeLabel = (t: string) =>
  t === "soukroma" || t === "soukromá" ? "Soukromá" : t === "jine" || t === "jiné" ? "Jiná" : "Služební";

export default function MobileTripList({ vehicleId }: { vehicleId: string }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trip_logs")
      .select("id,date,time,route_from,route_to,km_total,km_start,km_end,purpose,purpose_type")
      .eq("vehicle_id", vehicleId)
      .order("date", { ascending: false })
      .order("time", { ascending: false, nullsFirst: false })
      .limit(20);
    setTrips((data as Trip[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [vehicleId]);

  return (
    <div className="space-y-3 min-w-0">
      <Button className="w-full h-11" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> Zapsat jízdu
      </Button>
      <p className="text-xs text-muted-foreground">Posledních 20 jízd. Úplnou knihu jízd najdete na počítači.</p>
      {loading && <p className="text-sm text-muted-foreground">Načítání…</p>}
      {!loading && trips.length === 0 && <p className="text-sm text-muted-foreground">Zatím žádné jízdy.</p>}
      {trips.map((t) => {
        const km = t.km_total ?? (t.km_end != null && t.km_start != null ? t.km_end - t.km_start : null);
        return (
          <Card key={t.id}>
            <CardContent className="p-3 space-y-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {new Date(t.date).toLocaleDateString("cs-CZ")} {t.time?.slice(0, 5) || ""}
                </span>
                <Badge variant={typeLabel(t.purpose_type) === "Služební" ? "secondary" : "outline"} className="shrink-0">
                  {typeLabel(t.purpose_type)}
                </Badge>
              </div>
              <p className="text-sm flex items-start gap-1.5 break-words min-w-0">
                <Route className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-words">{t.route_from || "—"} → {t.route_to || "—"}</span>
              </p>
              <div className="flex justify-between text-xs text-muted-foreground gap-2">
                <span className="truncate">{t.purpose || ""}</span>
                <span className="shrink-0 font-medium text-foreground">{km != null ? `${km.toLocaleString("cs-CZ")} km` : "—"}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <QuickTripDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) load(); }} />
    </div>
  );
}
