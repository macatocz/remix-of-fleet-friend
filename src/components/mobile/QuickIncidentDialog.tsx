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
}

export default function QuickIncidentDialog({ open, onOpenChange }: Props) {
  const { driver, myVehicles, allVehicles } = useDriverContext();
  const [vehicleId, setVehicleId] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [saving, setSaving] = useState(false);

  const vehicles = myVehicles.length ? myVehicles : allVehicles;

  const submit = async () => {
    if (!vehicleId || !description) {
      toast.error("Vyplňte vozidlo a popis");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("incidents").insert({
      vehicle_id: vehicleId,
      driver_id: driver?.id || null,
      date: new Date().toISOString().split("T")[0],
      location: location || null,
      description,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : 0,
      status: "nahlaseno",
    });
    setSaving(false);
    if (error) { toast.error("Chyba: " + error.message); return; }
    toast.success("Škoda nahlášena");
    setVehicleId(""); setLocation(""); setDescription(""); setEstimatedCost("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nahlásit škodu</DialogTitle></DialogHeader>
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
          <div>
            <Label>Místo</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Praha 5, parkoviště" />
          </div>
          <div>
            <Label>Popis škody *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Odhadovaná škoda (Kč)</Label>
            <Input type="number" inputMode="numeric" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Ukládám…" : "Nahlásit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
