import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, CalendarDays, ChevronRight } from "lucide-react";
import { useDriverContext } from "@/hooks/useDriverContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UpcomingReservation {
  id: string;
  date_from: string;
  date_to: string;
  time_from: string | null;
  status: string;
  vehicle?: { rz: string | null; znacka: string | null };
}

export default function DriverHome() {
  const navigate = useNavigate();
  const { driver, myVehicles, loading } = useDriverContext();
  const { user } = useAuth();
  const [reservationCount, setReservationCount] = useState(0);
  const [upcoming, setUpcoming] = useState<UpcomingReservation[]>([]);

  useEffect(() => {
    if (!driver) return;
    const today = new Date().toISOString().split("T")[0];
    (async () => {
      const { data, count } = await supabase
        .from("reservations")
        .select("id, vehicle_id, date_from, date_to, time_from, status", { count: "exact" })
        .eq("driver_name", driver.fullName)
        .gte("date_to", today)
        .order("date_from", { ascending: true })
        .limit(3);
      setReservationCount(count || 0);
      const list = (data as any[]) || [];
      const ids = Array.from(new Set(list.map(r => r.vehicle_id)));
      if (ids.length) {
        const { data: vs } = await supabase.from("vehicles").select("id, rz, znacka").in("id", ids);
        const map = new Map((vs || []).map((v: any) => [v.id, v]));
        list.forEach(r => { r.vehicle = map.get(r.vehicle_id); });
      }
      setUpcoming(list);
    })();
  }, [driver]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Vítejte zpět</p>
        <h2 className="text-2xl font-semibold">
          {driver?.fullName || user?.email || "Řidič"}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card
          className="cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate("/m/vozidlo")}
        >
          <CardContent className="p-5 text-center">
            <Car className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{myVehicles.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Moje vozidla</p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate("/m/rezervace")}
        >
          <CardContent className="p-5 text-center">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold">{reservationCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Aktivní rezervace</p>
          </CardContent>
        </Card>
      </div>

      {upcoming.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Nadcházející rezervace</CardTitle>
            <button
              onClick={() => navigate("/m/rezervace")}
              className="text-xs text-primary flex items-center gap-0.5"
            >
              Vše <ChevronRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {upcoming.map(r => (
              <div
                key={r.id}
                onClick={() => navigate("/m/rezervace")}
                className="flex items-center justify-between py-2 border-b last:border-0 active:bg-accent/30 -mx-2 px-2 rounded"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {r.vehicle?.rz || "?"} – {r.vehicle?.znacka || "?"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.date_from} {r.time_from?.slice(0, 5) || ""}
                  </p>
                </div>
                <Badge variant={r.status === "schváleno" ? "default" : "secondary"} className="shrink-0">
                  {r.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Rychlé akce</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Použijte tlačítko <span className="inline-flex h-6 w-6 rounded-full bg-primary text-primary-foreground items-center justify-center text-sm font-bold">+</span> v pravém dolním rohu pro zápis jízdy nebo nahlášení škody.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-4">Načítání…</p>
      ) : !driver ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground text-center">
            Váš účet zatím není propojen s žádným řidičem. Kontaktujte správce.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
