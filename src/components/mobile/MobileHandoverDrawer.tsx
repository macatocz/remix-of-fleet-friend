import { useState } from "react";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, X, Loader2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import InAppCamera from "@/components/camera/InAppCamera";
import { compressImage } from "@/lib/compressImage";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 3;

export default function MobileHandoverDrawer({ vehicleId, onSaved }: { vehicleId: string; onSaved?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"predani" | "prevzeti">("predani");
  const [driverName, setDriverName] = useState("");
  const [km, setKm] = useState("");
  const [fuel, setFuel] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [camOpen, setCamOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  let fileInput: HTMLInputElement | null = null;

  const addPhoto = async (f: File) => setPhotos((p) => [...p, f].slice(0, MAX_PHOTOS));
  const reset = () => { setDriverName(""); setKm(""); setFuel(""); setNotes(""); setPhotos([]); };

  const save = async () => {
    if (!km) { toast.error("Vyplňte stav tachometru"); return; }
    setSaving(true);
    try {
      const { data: p, error } = await supabase.from("handover_protocols").insert({
        vehicle_id: vehicleId, type, date: new Date().toISOString(),
        driver_name: driverName || null, handover_by: user?.email || null,
        km: parseInt(km), fuel_percent: fuel ? parseInt(fuel) : null, notes: notes || null,
      }).select().single();
      if (error) throw error;
      for (const raw of photos) {
        const file = await compressImage(raw);
        const path = `${vehicleId}/${p.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("handover-photos").upload(path, file);
        if (upErr) throw upErr;
        await supabase.from("handover_photos").insert({ protocol_id: p.id, file_path: path });
      }
      toast.success(type === "predani" ? "Předání uloženo" : "Převzetí uloženo");
      reset(); setOpen(false); onSaved?.();
    } catch (e: any) {
      toast.error("Uložení selhalo", { description: e?.message });
    } finally { setSaving(false); }
  };

  return (
    <>
      <Button className="w-full h-12" variant="outline" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="mr-2 h-4 w-4" />Předat / převzít vůz
      </Button>
      <Drawer open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DrawerContent>
          <DrawerHeader><DrawerTitle>Předávací protokol</DrawerTitle></DrawerHeader>
          <div className="px-4 space-y-4 overflow-y-auto max-h-[65vh]">
            <div className="grid grid-cols-2 gap-2">
              {(["predani", "prevzeti"] as const).map((t) => (
                <Button key={t} type="button" variant={type === t ? "default" : "outline"} className="h-11" onClick={() => setType(t)}>
                  {t === "predani" ? "Předávám" : "Přebírám"}
                </Button>
              ))}
            </div>
            <div className="space-y-1"><Label htmlFor="ho-driver">{type === "predani" ? "Komu" : "Od koho"}</Label><Input id="ho-driver" value={driverName} onChange={(e) => setDriverName(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="ho-km">Tachometr (km)</Label><Input id="ho-km" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} /></div>
              <div className="space-y-1"><Label htmlFor="ho-fuel">Palivo (%)</Label><Input id="ho-fuel" inputMode="numeric" value={fuel} onChange={(e) => setFuel(e.target.value.replace(/\D/g, "").slice(0, 3))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Fotky ({photos.length}/{MAX_PHOTOS})</Label>
              <div className="flex gap-2 flex-wrap">
                {photos.map((f, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border">
                    <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    <button type="button" aria-label="Odebrat fotku" className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5" onClick={() => setPhotos((p) => p.filter((_, k) => k !== i))}><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button type="button" onClick={() => setCamOpen(true)} className={cn("flex h-20 w-20 flex-col items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground")}>
                    <Camera className="h-5 w-5 mb-1" />Vyfotit
                  </button>
                )}
              </div>
              <input ref={(el) => (fileInput = el)} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = ""; }} />
            </div>
            <div className="space-y-1"><Label htmlFor="ho-notes">Poznámka (stav, škrábance…)</Label><Textarea id="ho-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <DrawerFooter>
            <Button className="h-12" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Uložit protokol"}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <InAppCamera open={camOpen} onOpenChange={setCamOpen} onCapture={(f) => { addPhoto(f); setCamOpen(false); }} onFallback={() => { setCamOpen(false); fileInput?.click(); }} />
    </>
  );
}
