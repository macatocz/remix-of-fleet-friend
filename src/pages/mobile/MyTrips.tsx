import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDriverContext } from "@/hooks/useDriverContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { PURPOSE_TYPES } from "@/lib/reservationRules";
import { vehicleLabel } from "@/lib/vehicleName";
import QuickTripDialog from "@/components/mobile/QuickTripDialog";

interface Trip {
  id: string;
  vehicle_id: string;
  date: string;
  time: string | null;
  route_from: string | null;
  route_to: string | null;
  km_start: number | null;
  km_end: number | null;
  km_total: number | null;
  purpose: string | null;
  purpose_type: string;
  break_minutes: number | null;
  vehicles?: { znacka: string | null; rz: string | null; nazev_vozu?: string | null } | null;
}

const purposeLabel = (v: string) =>
  PURPOSE_TYPES.find((p) => p.value === v)?.label || v;

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function MyTrips() {
  const { driver, loading: drvLoading } = useDriverContext();
  const [month, setMonth] = useState(() => new Date());
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!driver) return;
    let active = true;
    (async () => {
      setLoading(true);
      const mk = monthKey(month);
      const from = `${mk}-01`;
      const toDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const to = `${monthKey(toDate)}-${String(toDate.getDate()).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("trip_logs")
        .select("id, vehicle_id, date, time, route_from, route_to, km_start, km_end, km_total, purpose, purpose_type, break_minutes, vehicles(znacka, rz, nazev_vozu)")
        .eq("driver_id", driver.id)
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false })
        .order("time", { ascending: false });
      if (!active) return;
      if (error) toast.error("Chyba načítání jízd: " + error.message);
      setTrips((data as Trip[]) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [driver?.id, monthKey(month), reloadKey]);

  const kmSum = useMemo(
    () => trips.reduce((s, t) => s + (t.km_total || 0), 0),
    [trips]
  );

  const monthLabel = month.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });

  const remove = async (id: string) => {
    const { error } = await supabase.from("trip_logs").delete().eq("id", id);
    if (error) { toast.error("Chyba: " + error.message); return; }
    toast.success("Jízda smazána");
    setReloadKey((k) => k + 1);
  };

  if (drvLoading) {
    return <p className="text-center text-sm text-muted-foreground py-8">Načítání…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Moje jízdy</h2>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Zapsat jízdu
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost" size="icon"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          aria-label="Předchozí měsíc"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <p className="font-medium capitalize">{monthLabel}</p>
        <Button
          variant="ghost" size="icon"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          aria-label="Další měsíc"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <RouteIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Celkem v měsíci</p>
              <p className="font-semibold">{trips.length} jízd · {kmSum.toLocaleString("cs-CZ")} km</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-6">Načítání…</p>
      ) : trips.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            V tomto měsíci nemáte žádné jízdy.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {trips.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.route_from || "?"} → {t.route_to || "?"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(`${t.date}T00:00:00`).toLocaleDateString("cs-CZ")}
                      {t.time ? ` ${t.time.slice(0, 5)}` : ""} · {vehicleLabel(t.vehicles)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {(t.km_total || 0).toLocaleString("cs-CZ")} km
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Badge variant="outline" className="text-[10px]">{purposeLabel(t.purpose_type)}</Badge>
                    {t.purpose && (
                      <span className="text-xs text-muted-foreground truncate">{t.purpose}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(t)} aria-label="Upravit jízdu">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Smazat jízdu">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Smazat jízdu?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t.route_from || "?"} → {t.route_to || "?"}, {t.km_total || 0} km. Akci nelze vrátit.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Zrušit</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(t.id)}>Smazat</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QuickTripDialog
        open={newOpen}
        onOpenChange={(o) => { setNewOpen(o); if (!o) setReloadKey((k) => k + 1); }}
      />
      <EditTripDrawer
        trip={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); setReloadKey((k) => k + 1); }}
      />
    </div>
  );
}

function EditTripDrawer({
  trip, onClose, onSaved,
}: { trip: Trip | null; onClose: () => void; onSaved: () => void }) {
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [purposeType, setPurposeType] = useState("pracovne");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!trip) return;
    setKmStart(trip.km_start != null ? String(trip.km_start) : "");
    setKmEnd(trip.km_end != null ? String(trip.km_end) : "");
    setRouteFrom(trip.route_from || "");
    setRouteTo(trip.route_to || "");
    setPurpose(trip.purpose || "");
    setPurposeType(trip.purpose_type || "pracovne");
    setBreakMinutes(trip.break_minutes != null ? String(trip.break_minutes) : "0");
  }, [trip?.id]);

  const save = async () => {
    if (!trip) return;
    const start = parseInt(kmStart);
    const end = parseInt(kmEnd);
    if (isNaN(start) || isNaN(end) || end < start) {
      toast.error("Zkontrolujte stavy km");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("trip_logs")
      .update({
        km_start: start,
        km_end: end,
        km_total: end - start,
        route_from: routeFrom || null,
        route_to: routeTo || null,
        purpose: purpose || null,
        purpose_type: purposeType,
        break_minutes: breakMinutes ? parseInt(breakMinutes) : 0,
      })
      .eq("id", trip.id);
    setSaving(false);
    if (error) { toast.error("Chyba: " + error.message); return; }
    toast.success("Jízda upravena");
    onSaved();
  };

  return (
    <Drawer open={!!trip} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Upravit jízdu</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Km od</Label>
              <Input className="h-12" type="number" inputMode="numeric" value={kmStart} onChange={(e) => setKmStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Km do</Label>
              <Input className="h-12" type="number" inputMode="numeric" value={kmEnd} onChange={(e) => setKmEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Odkud</Label>
            <Input className="h-12" value={routeFrom} onChange={(e) => setRouteFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Kam</Label>
            <Input className="h-12" value={routeTo} onChange={(e) => setRouteTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Účel</Label>
            <Input className="h-12" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Typ jízdy</Label>
            <Select value={purposeType} onValueChange={setPurposeType}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PURPOSE_TYPES.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="py-3">{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Přestávka (min)</Label>
            <Input className="h-12" type="number" inputMode="numeric" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
          </div>
        </div>
        <DrawerFooter className="pb-safe gap-2">
          <Button className="w-full h-12 text-base" onClick={save} disabled={saving}>
            {saving ? "Ukládám…" : "Uložit změny"}
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={onClose}>Zrušit</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
