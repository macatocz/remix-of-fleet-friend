import { useState } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDriverContext } from "@/hooks/useDriverContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}

export default function NewReservationDialog({ open, onOpenChange, onCreated }: Props) {
  const { driver, myVehicles, allVehicles } = useDriverContext();
  const today = new Date().toISOString().split("T")[0];

  const [vehicleId, setVehicleId] = useState("");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [timeFrom, setTimeFrom] = useState("08:00");
  const [timeTo, setTimeTo] = useState("17:00");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);

  const vehicles = myVehicles.length ? [...myVehicles, ...allVehicles.filter(a => !myVehicles.find(m => m.id === a.id))] : allVehicles;

  const reset = () => {
    setVehicleId(""); setDateFrom(today); setDateTo(today);
    setTimeFrom("08:00"); setTimeTo("17:00"); setPurpose("");
  };

  const submit = async () => {
    if (!vehicleId || !dateFrom || !dateTo) {
      toast.error("Vyplňte vozidlo a datum");
      return;
    }
    if (dateTo < dateFrom) { toast.error("Datum do musí být ≥ datum od"); return; }
    if (!driver) { toast.error("Váš účet není propojen s řidičem"); return; }

    setSaving(true);

    const { data: conflicts, error: confErr } = await supabase
      .from("reservations")
      .select("id, date_from, date_to, time_from, time_to, driver_name, status")
      .eq("vehicle_id", vehicleId)
      .in("status", ["čeká", "schváleno"])
      .lte("date_from", dateTo)
      .gte("date_to", dateFrom);

    if (confErr) {
      setSaving(false);
      toast.error("Chyba při kontrole dostupnosti: " + confErr.message);
      return;
    }

    const overlapping = (conflicts || []).filter((c) => {
      if (c.date_from !== c.date_to || dateFrom !== dateTo || c.date_from !== dateFrom) {
        return true;
      }
      const cFrom = c.time_from || "00:00:00";
      const cTo = c.time_to || "23:59:59";
      const nFrom = (timeFrom || "00:00") + ":00";
      const nTo = (timeTo || "23:59") + ":00";
      return cFrom < nTo && nFrom < cTo;
    });

    if (overlapping.length > 0) {
      setSaving(false);
      const c = overlapping[0];
      toast.error(
        `Vozidlo je v daném termínu obsazené (${c.driver_name}, ${c.date_from} → ${c.date_to}, stav: ${c.status}). Zvolte jiný termín nebo vozidlo.`,
        { duration: 6000 }
      );
      return;
    }

    const { error } = await supabase.from("reservations").insert({
      vehicle_id: vehicleId,
      driver_name: driver.fullName,
      date_from: dateFrom,
      date_to: dateTo,
      time_from: timeFrom,
      time_to: timeTo,
      purpose: purpose || null,
      status: "čeká",
    });
    setSaving(false);
    if (error) { toast.error("Chyba: " + error.message); return; }
    toast.success("Žádost odeslána ke schválení");
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Nová žádost o vozidlo</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <Label>Vozidlo *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id} className="py-3">
                    {v.rz || "?"} – {v.znacka || "?"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Datum od *</Label>
              <Input className="h-12" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Datum do *</Label>
              <Input className="h-12" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Čas od</Label>
              <Input className="h-12" type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Čas do</Label>
              <Input className="h-12" type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Účel cesty</Label>
            <Textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={3} placeholder="Služební jednání v Brně" className="text-base" />
          </div>
          <p className="text-xs text-muted-foreground">
            Žádost bude odeslána ke schválení správci nebo dispečerovi.
          </p>
        </div>
        <DrawerFooter className="pb-safe gap-2">
          <Button className="w-full h-12 text-base" onClick={submit} disabled={saving}>
            {saving ? "Odesílám…" : "Odeslat žádost"}
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
