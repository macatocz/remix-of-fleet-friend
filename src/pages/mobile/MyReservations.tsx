import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, X, Clock, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDriverContext } from "@/hooks/useDriverContext";
import { useAuth } from "@/contexts/AuthContext";
import NewReservationDialog from "@/components/mobile/NewReservationDialog";
import PendingApprovalCard, { PendingReservation } from "@/components/mobile/PendingApprovalCard";
import ReservationFuelCardWidget from "@/components/mobile/ReservationFuelCardWidget";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Reservation {
  id: string;
  vehicle_id: string;
  date_from: string;
  date_to: string;
  time_from: string | null;
  time_to: string | null;
  purpose: string | null;
  status: string;
  vehicle?: { znacka: string | null; rz: string | null; nazev_vozu?: string | null };
}

export default function MyReservations() {
  const { driver, myVehicles, isSpravce } = useDriverContext();
  const { roles } = useAuth();
  const isPrivileged = roles.includes("admin") || roles.includes("dispatcer");
  const showApprovalsTab = isSpravce || isPrivileged;

  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<PendingReservation[]>([]);

  const load = useCallback(async () => {
    if (!driver) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("id, vehicle_id, date_from, date_to, time_from, time_to, purpose, status")
      .eq("driver_name", driver.fullName)
      .order("date_from", { ascending: false });
    const list = (data as Reservation[]) || [];
    const ids = Array.from(new Set(list.map(r => r.vehicle_id)));
    if (ids.length) {
      const { data: vs } = await supabase
        .from("vehicles").select("id, znacka, rz, nazev_vozu").in("id", ids);
      const map = new Map((vs || []).map((v: any) => [v.id, v]));
      list.forEach(r => { r.vehicle = map.get(r.vehicle_id); });
    }
    setItems(list);
    setLoading(false);
  }, [driver]);

  useEffect(() => { load(); }, [load]);

  const loadPending = useCallback(async () => {
    if (!showApprovalsTab) return;
    let q = supabase
      .from("reservations")
      .select("id, vehicle_id, driver_name, date_from, date_to, time_from, time_to, purpose")
      .eq("status", "čeká")
      .order("date_from", { ascending: true });
    if (!isPrivileged) {
      const ids = myVehicles.map(v => v.id);
      if (ids.length === 0) { setPending([]); return; }
      q = q.in("vehicle_id", ids);
    }
    const { data } = await q;
    const list = (data as PendingReservation[]) || [];
    const ids = Array.from(new Set(list.map(r => r.vehicle_id)));
    if (ids.length) {
        const { data: vs } = await supabase.from("vehicles").select("id, rz, znacka, nazev_vozu").in("id", ids);
      const map = new Map((vs || []).map((v: any) => [v.id, v]));
      list.forEach(r => { r.vehicle = map.get(r.vehicle_id); });
    }
    setPending(list);
  }, [showApprovalsTab, isPrivileged, myVehicles.map(v => v.id).join(",")]);

  useEffect(() => { loadPending(); }, [loadPending]);

  const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" => {
    if (s === "schváleno") return "default";
    if (s === "zamítnuto") return "destructive";
    return "secondary";
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) { toast.error("Chyba: " + error.message); return; }
    toast.success("Žádost zrušena");
    load();
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const activeItems = items.filter(r => r.date_to >= todayStr);
  const pastItems = items.filter(r => r.date_to < todayStr);

  const renderReservations = () => {
    if (loading) {
      return <p className="text-sm text-muted-foreground">Načítání…</p>;
    }
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nemáte žádné rezervace. Vytvořte novou žádost tlačítkem nahoře.
          </CardContent>
        </Card>
      );
    }
    return (
      <>
        {activeItems.length > 0 && (
          <ActiveList items={activeItems} statusVariant={statusVariant} cancel={cancel} />
        )}
        {pastItems.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-2">
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ukončené rezervace
              </p>
            </div>
            <PastList items={pastItems} />
          </>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Moje rezervace</h2>
      </div>

      <Button
        className="w-full h-12 text-base"
        onClick={() => setDialogOpen(true)}
        disabled={!driver}
      >
        <Plus className="h-5 w-5 mr-2" /> Nová žádost
      </Button>

      {showApprovalsTab ? (
        <Tabs defaultValue="mine" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mine">Moje žádosti</TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5">
              Ke schválení
              {pending.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="mine" className="space-y-4 mt-4">
            {renderReservations()}
          </TabsContent>
          <TabsContent value="approvals" className="space-y-3 mt-4">
            {pending.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
                Žádné čekající žádosti ke schválení.
              </CardContent></Card>
            ) : pending.map(p => (
              <PendingApprovalCard key={p.id} reservation={p} onChanged={loadPending} />
            ))}
          </TabsContent>
        </Tabs>
      ) : (
        renderReservations()
      )}

      <NewReservationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => { load(); loadPending(); }}
      />
    </div>
  );
}

function ActiveList({
  items, statusVariant, cancel,
}: {
  items: Reservation[];
  statusVariant: (s: string) => "default" | "secondary" | "outline" | "destructive";
  cancel: (id: string) => void;
}) {
  return (
    <>
      {items.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-base truncate">
                    {r.vehicle?.nazev_vozu || r.vehicle?.znacka || "?"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.vehicle?.rz || "—"}
                  </p>
                </div>
              </div>
              <Badge variant={statusVariant(r.status)} className="shrink-0">{r.status}</Badge>
            </div>

            <div className="flex items-center gap-2 text-sm bg-accent/30 rounded-lg px-3 py-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                {r.date_from} {r.time_from?.slice(0,5)} → {r.date_to} {r.time_to?.slice(0,5)}
              </span>
            </div>

            {r.purpose && (
              <p className="text-sm text-muted-foreground">{r.purpose}</p>
            )}

            {r.status === "schváleno" &&
              r.date_from <= new Date().toISOString().split("T")[0] &&
              r.date_to >= new Date().toISOString().split("T")[0] && (
                <ReservationFuelCardWidget vehicleId={r.vehicle_id} />
              )}

            {r.status === "čeká" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full h-11">
                    <X className="h-4 w-4 mr-2" /> Zrušit žádost
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Zrušit žádost o rezervaci?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tato akce je nevratná. Žádost bude odstraněna.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Ne</AlertDialogCancel>
                    <AlertDialogAction onClick={() => cancel(r.id)}>Ano, zrušit</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

function PastList({ items }: { items: Reservation[] }) {
  return (
    <>
      {items.map((r) => (
        <Card key={r.id} className="bg-muted/40 opacity-90 border-muted">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-base truncate text-muted-foreground">
                    {r.vehicle?.nazev_vozu || r.vehicle?.znacka || "?"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.vehicle?.rz || "—"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-muted-foreground border-muted-foreground/30">
                Ukončeno
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/20 rounded-lg px-3 py-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                {r.date_from} {r.time_from?.slice(0,5)} → {r.date_to} {r.time_to?.slice(0,5)}
              </span>
            </div>
            {r.purpose && (
              <p className="text-sm text-muted-foreground">{r.purpose}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
