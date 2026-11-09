import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { localDateStr } from "@/lib/utils";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DriverSidebar } from "@/components/DriverSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileUserMenu } from "@/components/mobile/MobileUserMenu";
import QuickIncidentDialog from "@/components/mobile/QuickIncidentDialog";
import FuelReceiptDialog from "@/components/fuel/FuelReceiptDialog";
import { useDriverContext } from "@/hooks/useDriverContext";

export function DriverLayout() {
  const { myVehicles, driver } = useDriverContext();
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [borrowed, setBorrowed] = useState<any | null>(null);
  const primary = myVehicles[0] as any | undefined;

  useEffect(() => {
    if (!driver || primary) { setBorrowed(null); return; }
    const today = localDateStr();
    (async () => {
      const { data } = await supabase
        .from("reservations")
        .select("vehicle_id")
        .eq("driver_name", driver.fullName)
        .eq("status", "schváleno")
        .lte("date_from", today)
        .gte("date_to", today)
        .order("date_from", { ascending: true })
        .limit(1);
      const vid = data?.[0]?.vehicle_id;
      if (!vid) { setBorrowed(null); return; }
      const { data: v } = await supabase
        .from("vehicles_basic").select("id, znacka, rz, nazev_vozu").eq("id", vid).maybeSingle();
      setBorrowed(v || null);
    })();
  }, [driver?.id, primary?.id]);

  const sideVehicle = primary || borrowed;
  const sideLabel = primary
    ? primary.nazev_vozu || primary.znacka || null
    : borrowed
      ? `Vypůjčený: ${borrowed.nazev_vozu || borrowed.znacka || ""} ${borrowed.rz || ""}`.trim()
      : null;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <DriverSidebar
          primaryVehicleId={sideVehicle?.id ?? null}
          primaryVehicleLabel={sideLabel}
          onIncident={() => setIncidentOpen(true)}
          onFuel={() => setFuelOpen(true)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b bg-card sticky top-0 z-30">
            <div className="h-16 flex items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="font-semibold text-base flex items-center gap-2"><img src="/logo-smart-car.png" alt="" className="h-7 w-7 rounded-md object-cover" />Vozový park</h1>
              </div>
              <div className="flex items-center gap-1">
                <NotificationBell />
                <MobileUserMenu />
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-8 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
      <QuickIncidentDialog open={incidentOpen} onOpenChange={setIncidentOpen} />
      <FuelReceiptDialog open={fuelOpen} onOpenChange={setFuelOpen} vehicleId={sideVehicle?.id} />
    </SidebarProvider>
  );
}
