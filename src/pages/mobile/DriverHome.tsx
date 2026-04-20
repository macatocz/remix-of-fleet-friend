import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, CalendarDays, ChevronRight, Search, Plus, Clock } from "lucide-react";
import { useDriverContext } from "@/hooks/useDriverContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SpravceCalendarStrip from "@/components/mobile/SpravceCalendarStrip";
import FindVehicleSheet from "@/components/mobile/FindVehicleSheet";
import NewReservationDialog from "@/components/mobile/NewReservationDialog";
import PendingApprovalCard, { PendingReservation } from "@/components/mobile/PendingApprovalCard";

interface UpcomingReservation {
  id: string;
  date_from: string;
  date_to: string;
  time_from: string | null;
  time_to: string | null;
  status: string;
  driver_name: string;
  vehicle_id: string;
  vehicle?: { rz: string | null; znacka: string | null };
}

function daysUntil(date?: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export default function DriverHome() {
  const navigate = useNavigate();
  const { driver, myVehicles, isSpravce, loading } = useDriverContext();
  const { user, roles } = useAuth();

  const greeting = driver?.fullName || user?.email || "Řidič";
  const isPrivileged = roles.includes("admin") || roles.includes("dispatcer");

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground py-8">Načítání…</p>;
  }

  if (!driver) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">Vítejte zpět</p>
          <h2 className="text-2xl font-semibold">{greeting}</h2>
        </div>
        {isPrivileged && <PendingApprovalsSection scope="all" greetingHidden />}
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground text-center">
            Váš účet zatím není propojen s žádným řidičem. Kontaktujte správce.
          </CardContent>
        </Card>
      </div>
    );
  }

  return isSpravce
    ? <SpravceHome greeting={greeting} isPrivileged={isPrivileged} />
    : <DriverOnlyHome greeting={greeting} isPrivileged={isPrivileged} />;
}

/* ---------------- PENDING APPROVALS SECTION ---------------- */

function PendingApprovalsSection({
  scope,
  vehicleIds,
  greetingHidden,
}: {
  scope: "all" | "vehicles";
  vehicleIds?: string[];
  greetingHidden?: boolean;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<PendingReservation[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (scope === "vehicles" && (!vehicleIds || vehicleIds.length === 0)) {
      setItems([]);
      return;
    }
    (async () => {
      let q = supabase
        .from("reservations")
        .select("id, vehicle_id, driver_name, date_from, date_to, time_from, time_to, purpose")
        .eq("status", "čeká")
        .order("date_from", { ascending: true })
        .limit(10);
      if (scope === "vehicles" && vehicleIds) q = q.in("vehicle_id", vehicleIds);
      const { data } = await q;
      const list = (data as PendingReservation[]) || [];
      const ids = Array.from(new Set(list.map(r => r.vehicle_id)));
      if (ids.length) {
        const { data: vs } = await supabase.from("vehicles").select("id, rz, znacka").in("id", ids);
        const map = new Map((vs || []).map((v: any) => [v.id, v]));
        list.forEach(r => { r.vehicle = map.get(r.vehicle_id); });
      }
      setItems(list);
    })();
  }, [scope, vehicleIds?.join(","), reloadKey]);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          Žádosti ke schválení
          <Badge variant="secondary" className="text-[10px] py-0">{items.length}</Badge>
        </CardTitle>
        <button
          onClick={() => navigate("/m/rezervace")}
          className="text-xs text-primary flex items-center gap-0.5"
        >
          Vše <ChevronRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {items.map(r => (
          <PendingApprovalCard key={r.id} reservation={r} onChanged={() => setReloadKey(k => k + 1)} />
        ))}
      </CardContent>
    </Card>
  );
}

/* ---------------- SPRÁVCE ---------------- */

function SpravceHome({ greeting, isPrivileged }: { greeting: string; isPrivileged: boolean }) {
  const navigate = useNavigate();
  const { driver, myVehicles } = useDriverContext();
  const [upcoming, setUpcoming] = useState<UpcomingReservation[]>([]);
  const [myCount, setMyCount] = useState(0);

  const primary = myVehicles[0];
  const stkDays = daysUntil(primary?.stk);
  const greenDays = daysUntil(primary?.zelena_karta);

  useEffect(() => {
    if (!primary || !driver) return;
    const today = new Date().toISOString().split("T")[0];
    (async () => {
      const ids = myVehicles.map(v => v.id);
      const { data } = await supabase
        .from("reservations")
        .select("id, date_from, date_to, time_from, time_to, status, driver_name, vehicle_id")
        .in("vehicle_id", ids)
        .in("status", ["čeká", "schváleno"])
        .gte("date_to", today)
        .order("date_from", { ascending: true })
        .limit(5);
      const list = (data as UpcomingReservation[]) || [];
      const vIds = Array.from(new Set(list.map(r => r.vehicle_id)));
      if (vIds.length) {
        const { data: vs } = await supabase.from("vehicles").select("id, rz, znacka").in("id", vIds);
        const map = new Map((vs || []).map((v: any) => [v.id, v]));
        list.forEach(r => { r.vehicle = map.get(r.vehicle_id); });
      }
      setUpcoming(list);

      const { count } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("driver_name", driver.fullName)
        .gte("date_to", today);
      setMyCount(count || 0);
    })();
  }, [primary?.id, driver?.id]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Vítejte zpět</p>
        <h2 className="text-2xl font-semibold">{greeting}</h2>
      </div>

      {primary && (
        <Card
          className="cursor-pointer active:scale-[0.99] transition-transform overflow-hidden"
          onClick={() => navigate(`/vozidla/${primary.id}`)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Car className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Moje vozidlo</p>
              <p className="font-semibold text-lg truncate">{primary.rz || "—"}</p>
              <p className="text-sm text-muted-foreground truncate">{primary.znacka || "—"}</p>
            </div>
            <Badge variant="outline" className="shrink-0">{primary.status}</Badge>
          </CardContent>
          {((stkDays !== null && stkDays <= 30) || (greenDays !== null && greenDays <= 30)) && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {stkDays !== null && stkDays <= 30 && (
                <Badge variant={stkDays < 0 ? "destructive" : "secondary"} className="text-[11px]">
                  STK {stkDays < 0 ? "propadlá" : `za ${stkDays} dní`}
                </Badge>
              )}
              {greenDays !== null && greenDays <= 30 && (
                <Badge variant={greenDays < 0 ? "destructive" : "secondary"} className="text-[11px]">
                  Zelená karta {greenDays < 0 ? "propadlá" : `za ${greenDays} dní`}
                </Badge>
              )}
            </div>
          )}
        </Card>
      )}

      {myVehicles.length > 1 && (
        <p className="text-xs text-muted-foreground -mt-2">
          Spravujete celkem {myVehicles.length} vozidel. Zobrazeno první: {primary?.rz}.
        </p>
      )}

      {primary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Vytížení vozu (14 dní)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <SpravceCalendarStrip vehicleId={primary.id} days={14} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Nadcházející rezervace mého vozu</CardTitle>
          <button
            onClick={() => navigate("/m/rezervace")}
            className="text-xs text-primary flex items-center gap-0.5"
          >
            Vše <ChevronRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Žádné nadcházející rezervace.</p>
          ) : upcoming.map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.driver_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {r.date_from} {r.time_from?.slice(0, 5) || ""}
                  {r.vehicle?.rz && myVehicles.length > 1 ? ` · ${r.vehicle.rz}` : ""}
                </p>
              </div>
              <Badge variant={r.status === "schváleno" ? "default" : "secondary"} className="shrink-0">
                {r.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {myCount > 0 && (
        <button
          onClick={() => navigate("/m/rezervace")}
          className="w-full text-left"
        >
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mé vlastní rezervace</p>
                <p className="text-xs text-muted-foreground">{myCount} aktivních</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </button>
      )}
    </div>
  );
}

/* ---------------- ŘIDIČ BEZ SPRÁVY ---------------- */

function DriverOnlyHome({ greeting }: { greeting: string }) {
  const navigate = useNavigate();
  const { driver } = useDriverContext();
  const [findOpen, setFindOpen] = useState(false);
  const [newResOpen, setNewResOpen] = useState(false);
  const [preset, setPreset] = useState<{
    vehicleId: string; dateFrom: string; dateTo: string; timeFrom: string; timeTo: string;
  } | null>(null);
  const [active, setActive] = useState<UpcomingReservation[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!driver) return;
    const today = new Date().toISOString().split("T")[0];
    (async () => {
      const { data } = await supabase
        .from("reservations")
        .select("id, date_from, date_to, time_from, time_to, status, driver_name, vehicle_id")
        .eq("driver_name", driver.fullName)
        .gte("date_to", today)
        .order("date_from", { ascending: true })
        .limit(3);
      const list = (data as UpcomingReservation[]) || [];
      const ids = Array.from(new Set(list.map(r => r.vehicle_id)));
      if (ids.length) {
        const { data: vs } = await supabase.from("vehicles").select("id, rz, znacka").in("id", ids);
        const map = new Map((vs || []).map((v: any) => [v.id, v]));
        list.forEach(r => { r.vehicle = map.get(r.vehicle_id); });
      }
      setActive(list);

      const { count } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("driver_name", driver.fullName)
        .eq("status", "čeká");
      setPendingCount(count || 0);
    })();
  }, [driver?.id, newResOpen]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Vítejte zpět</p>
        <h2 className="text-2xl font-semibold">{greeting}</h2>
      </div>

      <div className="space-y-3">
        <Button
          className="w-full h-14 text-base"
          onClick={() => setFindOpen(true)}
        >
          <Search className="h-5 w-5 mr-2" /> Najít volný vůz
        </Button>
        <Button
          variant="outline"
          className="w-full h-14 text-base"
          onClick={() => { setPreset(null); setNewResOpen(true); }}
        >
          <Plus className="h-5 w-5 mr-2" /> Nová rezervace
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Moje aktivní rezervace</CardTitle>
          <button
            onClick={() => navigate("/m/rezervace")}
            className="text-xs text-primary flex items-center gap-0.5"
          >
            Vše <ChevronRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nemáte žádné aktivní rezervace.</p>
          ) : active.map(r => (
            <button
              key={r.id}
              onClick={() => navigate("/m/rezervace")}
              className="w-full flex items-center justify-between py-2 border-b last:border-0 active:bg-accent/30 -mx-2 px-2 rounded text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {r.vehicle?.rz || "?"} – {r.vehicle?.znacka || "?"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {r.date_from} {r.time_from?.slice(0, 5) || ""}
                </p>
              </div>
              <Badge variant={r.status === "schváleno" ? "default" : "secondary"} className="shrink-0">
                {r.status}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>

      {pendingCount > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Máte {pendingCount} {pendingCount === 1 ? "žádost" : "žádosti"} čekající na schválení.
        </p>
      )}

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
    </div>
  );
}