import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
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

  // Prefer drivers' own vehicles first, fall back to all active
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Zápis jízdy</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Vozidlo</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.rz || "?"} – {v.znacka || "?"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Km od</Label>
              <Input type="number" inputMode="numeric" value={kmStart} onChange={e => setKmStart(e.target.value)} />
            </div>
            <div>
              <Label>Km do</Label>
              <Input type="number" inputMode="numeric" value={kmEnd} onChange={e => setKmEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Odkud</Label>
            <Input value={routeFrom} onChange={e => setRouteFrom(e.target.value)} placeholder="Praha" />
          </div>
          <div>
            <Label>Kam</Label>
            <Input value={routeTo} onChange={e => setRouteTo(e.target.value)} placeholder="Brno" />
          </div>
          <div>
            <Label>Účel</Label>
            <Input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Služební jednání" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Ukládám…" : "Uložit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
