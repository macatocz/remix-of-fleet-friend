import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverContext } from "@/hooks/useDriverContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Car, ChevronRight, Search, Plus, AlertTriangle, Route as RouteIcon, Clock,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { DriverSidebar } from "@/components/DriverSidebar";
import { MobileUserMenu } from "@/components/mobile/MobileUserMenu";
import FindVehicleSheet from "@/components/mobile/FindVehicleSheet";
import NewReservationDialog from "@/components/mobile/NewReservationDialog";
import QuickTripDialog from "@/components/mobile/QuickTripDialog";
import QuickIncidentDialog from "@/components/mobile/QuickIncidentDialog";
import ReservationFuelCardWidget from "@/components/mobile/ReservationFuelCardWidget";
import VehicleParkingWidget from "@/components/mobile/VehicleParkingWidget";
import { localDateStr } from "@/lib/utils";
import { reservationEnd, reservationStart } from "@/lib/reservationRules";

interface Res {
  id: string;
  date_from: string;
  date_to: string;
  time_from: string | null;
  time_to: string | null;
  status: string;
  vehicle_id: string;
  vehicle?: { rz: string | null; znacka: string | null; nazev_vozu?: string | null };
}

export default function DriverDesktopHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { driver, myVehicles, loading } = useDriverContext();

  const [reservations, setReservations] = useState<Res[]>([]);
  const [tripStats, setTripStats] = useState<{ count: number; km: number }>({ count: 0, km: 0 });
  const [findOpen, setFindOpen] = useState(false);
  const [newResOpen, setNewResOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [preset, setPreset] = useState<{
    vehicleId: string; dateFrom: string; dateTo: string; timeFrom: string; timeTo: string;
  } | null>(null);

  const greeting = driver?.fullName || user?.email || "Řidič";
  const primary = myVehicles[0] as any | undefined;

  useEffect(() => {
    if (!driver) return;
    const today = localDateStr();
    (async () => {
      const { data } = await supabase
        .from("reservations")
        .select("id, date_from, date_to, time_from, time_to, status, vehicle_id")
        .eq("driver_name", driver.fullName)
        .in("status", ["čeká", "schváleno"])
        .gte("date_to", today)
        .order("date_from", { ascending: true })
        .limit(6);
      const list = (data as Res[]) || [];
      const ids = Array.from(new Set(list.map((r) => r.vehicle_id)));
      if (ids.length) {
        const { data: vs } = await supabase
          .from("vehicles_basic").select("id, rz, znacka, nazev_vozu").in("id", ids);
        const map = new Map((vs || []).map((v: any) => [v.id, v]));
        list.forEach((r) => { r.vehicle = map.get(r.vehicle_id); });
      }
      setReservations(list);

      const now = new Date();
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const { data: trips } = await supabase
        .from("trip_logs")
        .select("km_total")
        .eq("driver_id", driver.id)
        .gte("date", from);
      const rows = (trips as { km_total: number | null }[]) || [];
      setTripStats({
        count: rows.length,
        km: rows.reduce((s, t) => s + (t.km_total || 0), 0),
      });
    })();
  }, [driver?.id, newResOpen, tripOpen]);

  const currentReservation = reservations.find(
    (r) => r.status === "schváleno" && reservationEnd(r.date_to, r.time_to) > new Date()
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
        <div>
          <p className="text-sm text-muted-foreground">Vítejte zpět</p>
          <h2 className="text-3xl font-semibold">{greeting}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Můj vůz */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Můj vůz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {primary ? (
                <>
                  <button
                    onClick={() => navigate(`/vozidla/${primary.id}`)}
                    className="w-full flex items-center gap-3 text-left rounded-lg p-2 -m-2 hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Car className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{primary.nazev_vozu || primary.znacka || "—"}</p>
                      <p className="text-sm text-muted-foreground">{primary.rz || "—"}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">{primary.status}</Badge>
                  </button>
                  <VehicleParkingWidget vehicleId={primary.id} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2">
                  Nemáte přiřazené vlastní vozidlo.
                </p>
              )}
              {currentReservation && (
                <div className="space-y-4 pt-1">
                  <ReservationFuelCardWidget
                    vehicleId={currentReservation.vehicle_id}
                    startsAt={reservationStart(currentReservation.date_from, currentReservation.time_from)}
                  />
                  {!primary && <VehicleParkingWidget vehicleId={currentReservation.vehicle_id} />}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nadcházející rezervace */}
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Nadcházející rezervace</CardTitle>
              <button
                onClick={() => navigate("/m/rezervace")}
                className="text-xs text-primary flex items-center gap-0.5"
              >
                Vše <ChevronRight className="h-3 w-3" />
              </button>
            </CardHeader>
            <CardContent className="space-y-1">
              {reservations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nemáte žádné nadcházející rezervace.</p>
              ) : reservations.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate("/m/rezervace")}
                  className="w-full flex items-center justify-between py-2 border-b last:border-0 hover:bg-accent/40 -mx-2 px-2 rounded text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {r.vehicle?.nazev_vozu || r.vehicle?.znacka || "?"} · {r.vehicle?.rz || "?"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {r.date_from} {r.time_from?.slice(0, 5) || ""}
                      {r.date_to !== r.date_from ? ` – ${r.date_to}` : ""} {r.time_to?.slice(0, 5) || ""}
                    </p>
                  </div>
                  <Badge variant={r.status === "schváleno" ? "default" : "secondary"} className="shrink-0">
                    {r.status}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Rychlé akce */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="default" className="h-16 text-base" onClick={() => setFindOpen(true)}>
            <Search className="h-5 w-5 mr-2" /> Najít volný vůz
          </Button>
          <Button variant="outline" className="h-16 text-base" onClick={() => { setPreset(null); setNewResOpen(true); }}>
            <Plus className="h-5 w-5 mr-2" /> Nová rezervace
          </Button>
          <Button variant="outline" className="h-16 text-base" onClick={() => setIncidentOpen(true)}>
            <AlertTriangle className="h-5 w-5 mr-2 text-destructive" /> Nahlásit závadu
          </Button>
          <Button variant="outline" className="h-16 text-base" onClick={() => setTripOpen(true)}>
            <RouteIcon className="h-5 w-5 mr-2" /> Zapsat jízdu
          </Button>
        </div>

        {/* Moje jízdy */}
        <Card className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => navigate("/m/jizdy")}>
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                <RouteIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Moje jízdy tento měsíc</p>
                <p className="text-sm text-muted-foreground">
                  {tripStats.count} jízd · {tripStats.km.toLocaleString("cs-CZ")} km
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      <FindVehicleSheet
        open={findOpen}
        onOpenChange={setFindOpen}
        onPick={(vehicleId, dateFrom, dateTo, timeFrom, timeTo) => {
          setPreset({ vehicleId, dateFrom, dateTo, timeFrom, timeTo });
          setNewResOpen(true);
        }}
      />
      <NewReservationDialog
        open={newResOpen}
        onOpenChange={(o) => { setNewResOpen(o); if (!o) setPreset(null); }}
        initialVehicleId={preset?.vehicleId}
        initialDateFrom={preset?.dateFrom}
        initialDateTo={preset?.dateTo}
        initialTimeFrom={preset?.timeFrom}
        initialTimeTo={preset?.timeTo}
      />
      <QuickTripDialog open={tripOpen} onOpenChange={setTripOpen} />
      <QuickIncidentDialog open={incidentOpen} onOpenChange={setIncidentOpen} />
    </div>
  );
}
