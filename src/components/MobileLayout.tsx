import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Car, CalendarDays, Plus, Route, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
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
      <header className="h-14 flex items-center justify-between border-b bg-card px-4 sticky top-0 z-30">
        <h1 className="font-semibold text-base">🚗 Vozový park</h1>
        <UserMenu />
      </header>

      <main className="flex-1 p-4 pb-24 overflow-auto">
        <Outlet />
      </main>

      {/* Floating Action Button */}
      <Sheet open={fabOpen} onOpenChange={setFabOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            aria-label="Rychlá akce"
          >
            <Plus className="h-6 w-6" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Rychlá akce</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => { setFabOpen(false); setTripOpen(true); }}
            >
              <Route className="h-6 w-6" />
              <span>Zápis jízdy</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2"
              onClick={() => { setFabOpen(false); setIncidentOpen(true); }}
            >
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <span>Hlásit škodu</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around z-30">
        {navItems.map((item) => {
          const active = item.end
            ? location.pathname === item.url
            : location.pathname.startsWith(item.url);
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <QuickTripDialog open={tripOpen} onOpenChange={setTripOpen} />
      <QuickIncidentDialog open={incidentOpen} onOpenChange={setIncidentOpen} />
    </div>
  );
}
