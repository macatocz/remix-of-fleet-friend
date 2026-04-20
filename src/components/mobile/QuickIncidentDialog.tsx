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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Nahlásit škodu</DrawerTitle>
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
          <div className="space-y-1.5">
            <Label>Místo</Label>
            <Input className="h-12" value={location} onChange={e => setLocation(e.target.value)} placeholder="Praha 5, parkoviště" />
          </div>
          <div className="space-y-1.5">
            <Label>Popis škody *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="text-base" />
          </div>
          <div className="space-y-1.5">
            <Label>Odhadovaná škoda (Kč)</Label>
            <Input className="h-12" type="number" inputMode="numeric" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} />
          </div>
        </div>
        <DrawerFooter className="pb-safe gap-2">
          <Button className="w-full h-12 text-base" onClick={submit} disabled={saving}>
            {saving ? "Ukládám…" : "Nahlásit škodu"}
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
