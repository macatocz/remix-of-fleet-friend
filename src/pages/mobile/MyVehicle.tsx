import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, ChevronRight, Route, AlertTriangle, CalendarDays, Clock, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDriverContext } from "@/hooks/useDriverContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import QuickTripDialog from "@/components/mobile/QuickTripDialog";
import QuickIncidentDialog from "@/components/mobile/QuickIncidentDialog";
import SpravceCalendarStrip from "@/components/mobile/SpravceCalendarStrip";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { localDateStr } from "@/lib/utils";

interface MiniRes {
  id: string;
  vehicle_id: string;
  date_from: string;
  time_from: string | null;
  driver_name: string;
  status: string;
}

export default function MyVehicle() {
  const { myVehicles, loading } = useDriverContext();
  const navigate = useNavigate();
  const [tripOpen, setTripOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [calendarFor, setCalendarFor] = useState<string | null>(null);
  const [resByVehicle, setResByVehicle] = useState<Record<string, MiniRes[]>>({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (myVehicles.length === 0) return;
    const today = localDateStr();
    (async () => {
      const ids = myVehicles.map(v => v.id);
      const { data } = await supabase
        .from("reservations")
        .select("id, vehicle_id, date_from, time_from, driver_name, status")
        .in("vehicle_id", ids)
        .in("status", ["čeká", "schváleno"])
        .gte("date_to", today)
        .order("date_from", { ascending: true });
      const grouped: Record<string, MiniRes[]> = {};
      ((data as MiniRes[]) || []).forEach(r => {
        (grouped[r.vehicle_id] = grouped[r.vehicle_id] || []).push(r);
      });
      setResByVehicle(grouped);
    })();
  }, [myVehicles.map(v => v.id).join(","), reloadKey]);

  const setStatus = async (id: string, status: "schváleno" | "zamítnuto") => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) { toast.error("Chyba: " + error.message); return; }
    toast.success(status === "schváleno" ? "Rezervace schválena" : "Rezervace zamítnuta");
    setReloadKey(k => k + 1);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Moje vozidla</h2>

      {loading && <p className="text-sm text-muted-foreground">Načítání…</p>}

      {!loading && myVehicles.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nejste vedeni jako správce žádného vozidla. Pro zápis jízdy si můžete vybrat libovolné vozidlo z firmy.
          </CardContent>
        </Card>
      )}

      {myVehicles.map((v) => (
        <Card key={v.id} className="overflow-hidden">
          <button
            onClick={() => navigate(`/vozidla/${v.id}`)}
            className="w-full text-left active:bg-accent/30 transition-colors"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate">{(v as any).nazev_vozu || v.znacka || "—"}</p>
                <p className="text-sm text-muted-foreground">{v.rz || "bez RZ"}</p>
              </div>
              <Badge variant="outline" className="shrink-0">{v.status}</Badge>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </button>

          {(resByVehicle[v.id]?.length ?? 0) > 0 && (
            <div className="px-4 pb-2 space-y-1.5 border-t pt-2">
              <p className="text-[11px] uppercase text-muted-foreground font-medium">Nadcházející</p>
              {resByVehicle[v.id].slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs gap-2">
                  <span className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {r.date_from} {r.time_from?.slice(0, 5) || ""} · {r.driver_name}
                    </span>
                  </span>
                  {r.status === "čeká" ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-primary hover:text-primary"
                        onClick={() => setStatus(r.id, "schváleno")}
                        aria-label="Schválit"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            aria-label="Zamítnout"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Zamítnout rezervaci?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {r.driver_name} bude vidět status „zamítnuto".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Ne</AlertDialogCancel>
                            <AlertDialogAction onClick={() => setStatus(r.id, "zamítnuto")}>
                              Ano, zamítnout
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <Badge variant="default" className="shrink-0 text-[10px] py-0">
                      {r.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-1 border-t">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setTripOpen(true)}
            >
              <Route className="h-4 w-4 mr-2" /> Zápis jízdy
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setIncidentOpen(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2 text-destructive" /> Hlásit škodu
            </Button>
          </div>
          <div className="px-3 pb-3">
            <Button
              variant="ghost"
              className="w-full h-10"
              onClick={() => setCalendarFor(v.id)}
            >
              <CalendarDays className="h-4 w-4 mr-2" /> Kalendář vytížení
            </Button>
          </div>
        </Card>
      ))}

      <QuickTripDialog open={tripOpen} onOpenChange={setTripOpen} />
      <QuickIncidentDialog open={incidentOpen} onOpenChange={setIncidentOpen} />

      <Drawer open={!!calendarFor} onOpenChange={(o) => !o && setCalendarFor(null)}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader>
            <DrawerTitle>Kalendář vytížení (30 dní)</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {calendarFor && <SpravceCalendarStrip vehicleId={calendarFor} days={30} />}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
