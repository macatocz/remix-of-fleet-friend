import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Car, CalendarDays, Plus, Route, AlertTriangle, MoreHorizontal, Wrench, CreditCard, Coins, Settings as SettingsIcon, BookOpen, Search, FileText, Zap, ClipboardCheck, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverContext } from "@/hooks/useDriverContext";
import { MobileUserMenu } from "@/components/mobile/MobileUserMenu";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import QuickTripDialog from "@/components/mobile/QuickTripDialog";
import QuickIncidentDialog from "@/components/mobile/QuickIncidentDialog";
import FindVehicleSheet from "@/components/mobile/FindVehicleSheet";
import NewReservationDialog from "@/components/mobile/NewReservationDialog";
import QuickNowReservation from "@/components/mobile/QuickNowReservation";
import ChecklistDialog from "@/components/mobile/ChecklistDialog";
import KeyHandoverDialog from "@/components/mobile/KeyHandoverDialog";
import { startOfflineSync } from "@/lib/offline/tripQueue";

type NavItem = { url: string; label: string; icon: any; end?: boolean; action?: "find" };

const spravceNav: NavItem[] = [
  { url: "/m", label: "Domů", icon: Home, end: true },
  { url: "/m/vozidlo", label: "Vozidlo", icon: Car },
  { url: "/m/rezervace", label: "Rezervace", icon: CalendarDays },
];

const driverNav: NavItem[] = [
  { url: "/m", label: "Domů", icon: Home, end: true },
  { url: "__find__", label: "Najít vůz", icon: Search, action: "find" },
  { url: "/m/rezervace", label: "Rezervace", icon: CalendarDays },
];

const adminNav: NavItem[] = [
  { url: "/m", label: "Domů", icon: Home, end: true },
  { url: "/m/vozidla", label: "Vozidla", icon: Car },
  { url: "/m/rezervace", label: "Rezervace", icon: CalendarDays },
];

const moreItems = [
  { url: "/m/servis", label: "Servis", icon: Wrench },
  { url: "/m/kniha-jizd", label: "Kniha jízd", icon: BookOpen },
  { url: "/m/skody", label: "Škody", icon: AlertTriangle },
  { url: "/m/naklady", label: "Náklady", icon: Coins },
  { url: "/m/tankovaci-karty", label: "Karty", icon: CreditCard },
  { url: "/m/cestovni-prikazy", label: "Cestovní příkazy", icon: FileText },
  { url: "/m/nastaveni", label: "Nastavení", icon: SettingsIcon },
];

export function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { isSpravce, myVehicles, allVehicles } = useDriverContext();
  const [fabOpen, setFabOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [newResOpen, setNewResOpen] = useState(false);
  const [nowResOpen, setNowResOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [presetReservation, setPresetReservation] = useState<{
    vehicleId: string; dateFrom: string; dateTo: string; timeFrom: string; timeTo: string;
  } | null>(null);

  useEffect(() => { startOfflineSync(); }, []);

  const primaryVehicle = (myVehicles[0] || allVehicles[0]) as any | undefined;

  const isAdminOrDispatcher = roles.includes("admin") || roles.includes("dispatcer");
  const baseNav = isAdminOrDispatcher ? adminNav : (isSpravce ? spravceNav : driverNav);
  const navItems: NavItem[] = isAdminOrDispatcher
    ? [...baseNav, { url: "__more__", label: "Více", icon: MoreHorizontal }]
    : baseNav;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex flex-col border-b bg-card sticky top-0 z-30">
        <div className="h-safe-top" />
        <div className="h-16 flex items-center justify-between px-4">
          <h1 className="font-semibold text-base">🚗 Vozový park</h1>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <MobileUserMenu />
          </div>
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
            <Button
              variant="outline"
              className="h-28 flex-col gap-2 text-base"
              onClick={() => { setFabOpen(false); setNowResOpen(true); }}
            >
              <Zap className="h-7 w-7 text-primary" />
              <span>Rezervace teď</span>
            </Button>
            <Button
              variant="outline"
              className="h-28 flex-col gap-2 text-base"
              onClick={() => { setFabOpen(false); setChecklistOpen(true); }}
              disabled={!primaryVehicle}
            >
              <ClipboardCheck className="h-7 w-7" />
              <span>Kontrola vozu</span>
            </Button>
            <Button
              variant="outline"
              className="h-28 flex-col gap-2 text-base col-span-2"
              onClick={() => { setFabOpen(false); setKeysOpen(true); }}
              disabled={!primaryVehicle}
            >
              <Key className="h-7 w-7" />
              <span>Klíče (vyzvednout / vrátit)</span>
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* "Více" drawer pro admina/dispečera */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="pb-safe">
          <DrawerHeader>
            <DrawerTitle>Další sekce</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-3 gap-3 px-4 pb-6">
            {moreItems.map((item) => (
              <button
                key={item.url}
                onClick={() => { setMoreOpen(false); navigate(item.url); }}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border bg-card active:bg-accent transition-colors"
              >
                <item.icon className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-center">{item.label}</span>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-card border-t flex items-stretch justify-around z-30 pb-safe"
      >
        {navItems.map((item) => {
          const isMore = item.url === "__more__";
          const isFind = item.action === "find";
          const active = isMore
            ? false
            : isFind
              ? false
              : item.end
              ? location.pathname === item.url
              : location.pathname.startsWith(item.url);
          return (
            <button
              key={item.url}
              onClick={() => isMore ? setMoreOpen(true) : isFind ? setFindOpen(true) : navigate(item.url)}
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
      <QuickNowReservation open={nowResOpen} onOpenChange={setNowResOpen} />
      {primaryVehicle && (
        <>
          <ChecklistDialog
            open={checklistOpen}
            onOpenChange={setChecklistOpen}
            vehicleId={primaryVehicle.id}
            vehicleLabel={`${primaryVehicle.znacka || ""} ${primaryVehicle.rz || ""}`.trim()}
          />
          <KeyHandoverDialog
            open={keysOpen}
            onOpenChange={setKeysOpen}
            vehicleId={primaryVehicle.id}
            vehicleLabel={`${primaryVehicle.znacka || ""} ${primaryVehicle.rz || ""}`.trim()}
          />
        </>
      )}
      <FindVehicleSheet
        open={findOpen}
        onOpenChange={setFindOpen}
        onPick={(vehicleId, dateFrom, dateTo, timeFrom, timeTo) => {
          setPresetReservation({ vehicleId, dateFrom, dateTo, timeFrom, timeTo });
          setNewResOpen(true);
        }}
      />
      <NewReservationDialog
        open={newResOpen}
        onOpenChange={(o) => { setNewResOpen(o); if (!o) setPresetReservation(null); }}
        initialVehicleId={presetReservation?.vehicleId}
        initialDateFrom={presetReservation?.dateFrom}
        initialDateTo={presetReservation?.dateTo}
        initialTimeFrom={presetReservation?.timeFrom}
        initialTimeTo={presetReservation?.timeTo}
        onCreated={() => navigate("/m/rezervace")}
      />
    </div>
  );
}
