import { useState } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

export default function QuickTripDialog({ open, onOpenChange }: Props) {
  const { driver, myVehicles, allVehicles } = useDriverContext();
  const [vehicleId, setVehicleId] = useState("");
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);

  const vehicles = myVehicles.length ? myVehicles : allVehicles;

  const reset = () => {
    setVehicleId(""); setKmStart(""); setKmEnd("");
    setRouteFrom(""); setRouteTo(""); setPurpose("");
  };

  const submit = async () => {
    if (!vehicleId || !kmStart || !kmEnd) {
      toast.error("Vyplňte vozidlo a stav km");
      return;
    }
    const start = parseInt(kmStart);
    const end = parseInt(kmEnd);
    if (end < start) { toast.error("Konečný stav km musí být ≥ počáteční"); return; }

    setSaving(true);
    const { error } = await supabase.from("trip_logs").insert({
      vehicle_id: vehicleId,
      driver_id: driver?.id || null,
      date: new Date().toISOString().split("T")[0],
      km_start: start,
      km_end: end,
      km_total: end - start,
      route_from: routeFrom || null,
      route_to: routeTo || null,
      purpose: purpose || null,
    });
    setSaving(false);

    if (error) { toast.error("Chyba: " + error.message); return; }
    toast.success("Jízda zapsána");
    reset();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Zápis jízdy</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <Label>Vozidlo</Label>
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
              <Label>Km od</Label>
              <Input className="h-12" type="number" inputMode="numeric" value={kmStart} onChange={e => setKmStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Km do</Label>
              <Input className="h-12" type="number" inputMode="numeric" value={kmEnd} onChange={e => setKmEnd(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Odkud</Label>
            <Input className="h-12" value={routeFrom} onChange={e => setRouteFrom(e.target.value)} placeholder="Praha" />
          </div>
          <div className="space-y-1.5">
            <Label>Kam</Label>
            <Input className="h-12" value={routeTo} onChange={e => setRouteTo(e.target.value)} placeholder="Brno" />
          </div>
          <div className="space-y-1.5">
            <Label>Účel</Label>
            <Input className="h-12" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Služební jednání" />
          </div>
        </div>
        <DrawerFooter className="pb-safe gap-2">
          <Button className="w-full h-12 text-base" onClick={submit} disabled={saving}>
            {saving ? "Ukládám…" : "Uložit jízdu"}
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
