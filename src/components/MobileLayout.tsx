import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Car, CalendarDays, Plus, Route, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import QuickTripDialog from "@/components/mobile/QuickTripDialog";
import QuickIncidentDialog from "@/components/mobile/QuickIncidentDialog";

const navItems = [
  { url: "/m", label: "Domů", icon: Home, end: true },
  { url: "/m/vozidlo", label: "Vozidlo", icon: Car },
  { url: "/m/rezervace", label: "Rezervace", icon: CalendarDays },
];

export function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex flex-col border-b bg-card sticky top-0 z-30">
        <div className="h-safe-top" />
        <div className="h-16 flex items-center justify-between px-4">
          <h1 className="font-semibold text-base">🚗 Vozový park</h1>
          <UserMenu />
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-32 overflow-auto">
        <Outlet />
      </main>

      {/* Floating Action Button */}
      <button
        onClick={() => setFabOpen(true)}
        className="fixed right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: `calc(env(safe-area-inset-bottom) + 5rem)` }}
        aria-label="Rychlá akce"
      >
        <Plus className="h-7 w-7" />
      </button>

      <Drawer open={fabOpen} onOpenChange={setFabOpen}>
        <DrawerContent className="pb-safe">
          <DrawerHeader>
            <DrawerTitle>Rychlá akce</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-3 px-4 pb-6">
            <Button
              variant="outline"
              className="h-28 flex-col gap-2 text-base"
              onClick={() => { setFabOpen(false); setTripOpen(true); }}
            >
              <Route className="h-7 w-7" />
              <span>Zápis jízdy</span>
            </Button>
            <Button
              variant="outline"
              className="h-28 flex-col gap-2 text-base"
              onClick={() => { setFabOpen(false); setIncidentOpen(true); }}
            >
              <AlertTriangle className="h-7 w-7 text-destructive" />
              <span>Hlásit škodu</span>
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-card border-t flex items-stretch justify-around z-30 pb-safe"
      >
        {navItems.map((item) => {
          const active = item.end
            ? location.pathname === item.url
            : location.pathname.startsWith(item.url);
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors active:bg-accent/40",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-12 rounded-full transition-colors",
                active && "bg-primary/10"
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <QuickTripDialog open={tripOpen} onOpenChange={setTripOpen} />
      <QuickIncidentDialog open={incidentOpen} onOpenChange={setIncidentOpen} />
    </div>
  );
}
