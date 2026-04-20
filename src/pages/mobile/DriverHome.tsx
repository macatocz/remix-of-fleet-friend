import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, CalendarDays, Route, AlertTriangle, ChevronRight } from "lucide-react";
import { useDriverContext } from "@/hooks/useDriverContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DriverHome() {
  const navigate = useNavigate();
  const { driver, myVehicles, loading } = useDriverContext();
  const { user } = useAuth();
  const [reservationCount, setReservationCount] = useState(0);

  useEffect(() => {
    if (!driver) return;
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("driver_name", driver.fullName)
      .gte("date_to", new Date().toISOString().split("T")[0])
      .then(({ count }) => setReservationCount(count || 0));
  }, [driver]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Vítejte zpět</p>
        <h2 className="text-xl font-semibold">
          {driver?.fullName || user?.email || "Řidič"}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover:bg-accent/30" onClick={() => navigate("/m/vozidlo")}>
          <CardContent className="p-4 text-center">
            <Car className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{myVehicles.length}</p>
            <p className="text-xs text-muted-foreground">Moje vozidla</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/30" onClick={() => navigate("/m/rezervace")}>
          <CardContent className="p-4 text-center">
            <CalendarDays className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{reservationCount}</p>
            <p className="text-xs text-muted-foreground">Aktivní rezervace</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Rychlé akce</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Použijte tlačítko <span className="inline-flex h-5 w-5 rounded-full bg-primary text-primary-foreground items-center justify-center text-xs">+</span> v pravém dolním rohu pro zápis jízdy nebo nahlášení škody.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Načítání…</p>
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
