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
import { insertOrQueue } from "@/lib/offline/tripQueue";
import { WifiOff, Camera, X } from "lucide-react";
import { localDateStr } from "@/lib/utils";

const MAX_PHOTOS = 5;

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
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const vehicles = myVehicles.length ? myVehicles : allVehicles;

  const submit = async () => {
    if (!vehicleId || !description) {
      toast.error("Vyplňte vozidlo a popis");
      return;
    }
    setSaving(true);
    const payload = {
      vehicle_id: vehicleId,
      driver_id: driver?.id || null,
      date: localDateStr(),
      location: location || null,
      description,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : 0,
      status: "nahlaseno",
    };

    // Offline nebo bez fotek → stávající cesta (fronta / prostý insert)
    if (!navigator.onLine || photos.length === 0) {
      const res = await insertOrQueue("incidents", payload);
      setSaving(false);
      if (res.status === "error") { toast.error("Chyba: " + res.message); return; }
      toast.success(res.status === "queued"
        ? "Offline – uloženo bez fotek, odešle se po obnovení sítě"
        : "Škoda nahlášena");
      reset();
      onOpenChange(false);
      return;
    }

    // Online s fotkami: potřebujeme ID incidentu pro napárování fotek
    const { data: inserted, error: insErr } = await supabase
      .from("incidents")
      .insert(payload)
      .select("id")
      .single();
    if (insErr || !inserted) {
      setSaving(false);
      toast.error("Chyba: " + (insErr?.message || "vložení selhalo"));
      return;
    }

    let uploaded = 0;
    for (const file of photos) {
      const path = `incidents/${vehicleId}/${inserted.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("handover-photos").upload(path, file);
      if (upErr) continue;
      const { error: phErr } = await supabase.from("incident_photos").insert({
        incident_id: inserted.id,
        file_path: path,
      });
      if (!phErr) uploaded++;
    }
    setSaving(false);
    toast.success(uploaded > 0 ? `Škoda nahlášena s ${uploaded} fotkou/fotkami` : "Škoda nahlášena (fotky se nenahrály)");
    reset();
    onOpenChange(false);
  };

  const reset = () => {
    setVehicleId(""); setLocation(""); setDescription(""); setEstimatedCost("");
    setPhotos([]);
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = [...photos, ...Array.from(files)].slice(0, MAX_PHOTOS);
    setPhotos(next);
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
          {typeof navigator !== "undefined" && !navigator.onLine && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded p-2">
              <WifiOff className="h-4 w-4" /> Offline – hlášení se uloží lokálně a odešle při obnovení sítě.
            </div>
          )}
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
