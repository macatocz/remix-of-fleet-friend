import { useState } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DriverSidebar } from "@/components/DriverSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { MobileUserMenu } from "@/components/mobile/MobileUserMenu";
import QuickIncidentDialog from "@/components/mobile/QuickIncidentDialog";
import { useDriverContext } from "@/hooks/useDriverContext";

export function DriverLayout() {
  const { myVehicles } = useDriverContext();
  const [incidentOpen, setIncidentOpen] = useState(false);
  const primary = myVehicles[0] as any | undefined;

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <DriverSidebar
          primaryVehicleId={primary?.id ?? null}
          primaryVehicleLabel={primary?.nazev_vozu || primary?.znacka || null}
          onIncident={() => setIncidentOpen(true)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b bg-card sticky top-0 z-30">
            <div className="h-16 flex items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <SidebarTrigger />
                <h1 className="font-semibold text-base">🚗 Vozový park</h1>
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
    </SidebarProvider>
  );
}
