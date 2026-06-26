import { useEffect, useState } from "react";
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
import { predictKm, type KmPrediction } from "@/lib/mileage/predict";
import { Sparkles, Mic, MicOff, WifiOff } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { enqueueTrip } from "@/lib/offline/tripQueue";

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
  const [pred, setPred] = useState<KmPrediction | null>(null);
  const voice = useVoiceInput("cs-CZ");
  const [voiceTarget, setVoiceTarget] = useState<"routeFrom" | "routeTo" | "purpose" | null>(null);

  // Pipe transcript into the focused field
  useEffect(() => {
    if (!voice.transcript || !voiceTarget) return;
    if (voiceTarget === "routeFrom") setRouteFrom(voice.transcript);
    if (voiceTarget === "routeTo") setRouteTo(voice.transcript);
    if (voiceTarget === "purpose") setPurpose(voice.transcript);
    voice.reset();
  }, [voice.transcript]);

  const startVoice = (target: "routeFrom" | "routeTo" | "purpose") => {
    setVoiceTarget(target);
    voice.start();
  };

  useEffect(() => {
    setPred(null);
    if (!vehicleId) return;
    let alive = true;
    predictKm(vehicleId).then((p) => { if (alive) setPred(p); });
    return () => { alive = false; };
  }, [vehicleId]);

  useEffect(() => {
    if (open && vehicleId && !kmStart && pred?.projected != null) {
      setKmStart(String(pred.projected));
    }
  }, [pred, open]);

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
    const payload = {
      vehicle_id: vehicleId,
      driver_id: driver?.id || null,
      date: new Date().toISOString().split("T")[0],
      km_start: start,
      km_end: end,
      km_total: end - start,
      route_from: routeFrom || null,
      route_to: routeTo || null,
      purpose: purpose || null,
    };

    if (!navigator.onLine) {
      await enqueueTrip(payload);
      setSaving(false);
      toast.success("Offline – uloženo, odešle se po obnovení sítě");
      reset();
      onOpenChange(false);
      return;
    }

    const { error } = await supabase.from("trip_logs").insert(payload);
    setSaving(false);
    if (error) {
      // fall back to offline queue on network errors
      await enqueueTrip(payload);
      toast.message("Uloženo offline, zkusíme znovu později");
    } else {
      toast.success("Jízda zapsána");
    }
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
          {pred?.projected != null && (
            <button
              type="button"
              onClick={() => setKmStart(String(pred.projected))}
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Návrh: {pred.projected.toLocaleString("cs-CZ")} km
              {pred.avgDailyKm > 0 && <span className="text-muted-foreground">(průměr {pred.avgDailyKm} km/den)</span>}
            </button>
          )}
          <div className="space-y-1.5">
            <Label>Odkud</Label>
            <div className="flex gap-2">
              <Input className="h-12 flex-1" value={routeFrom} onChange={e => setRouteFrom(e.target.value)} placeholder="Praha" />
              {voice.supported && (
                <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={() => voice.listening ? voice.stop() : startVoice("routeFrom")}>
                  {voice.listening && voiceTarget === "routeFrom" ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Kam</Label>
            <div className="flex gap-2">
              <Input className="h-12 flex-1" value={routeTo} onChange={e => setRouteTo(e.target.value)} placeholder="Brno" />
              {voice.supported && (
                <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={() => voice.listening ? voice.stop() : startVoice("routeTo")}>
                  {voice.listening && voiceTarget === "routeTo" ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Účel</Label>
            <div className="flex gap-2">
              <Input className="h-12 flex-1" value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Služební jednání" />
              {voice.supported && (
                <Button type="button" variant="outline" size="icon" className="h-12 w-12" onClick={() => voice.listening ? voice.stop() : startVoice("purpose")}>
                  {voice.listening && voiceTarget === "purpose" ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
                </Button>
              )}
            </div>
          </div>
          {!navigator.onLine && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded p-2">
              <WifiOff className="h-4 w-4" /> Offline – jízda se uloží lokálně a odešle při obnovení sítě.
            </div>
          )}
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
