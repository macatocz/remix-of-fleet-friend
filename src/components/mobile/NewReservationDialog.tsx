import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nová žádost o vozidlo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Vozidlo *</Label>
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
              <Label>Datum od *</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Datum do *</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label>Čas od</Label>
              <Input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} />
            </div>
            <div>
              <Label>Čas do</Label>
              <Input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Účel cesty</Label>
            <Textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={2} placeholder="Služební jednání v Brně" />
          </div>
          <p className="text-xs text-muted-foreground">
            Žádost bude odeslána ke schválení správci nebo dispečerovi.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Odesílám…" : "Odeslat žádost"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
