import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDriverContext } from "@/hooks/useDriverContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, MapPin, X, Loader2, WifiOff, Image as ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/compressImage";
import InAppCamera from "@/components/camera/InAppCamera";
import { saveDraftPhotos, loadDraftPhotos, clearDraftPhotos } from "@/lib/draftPhotos";

export const RECEIPT_FOLDER = "Účtenky – tankování";
const MAX_PHOTOS = 4;
const DRAFT_KEY = "fuel-draft";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicleId?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const localDT = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

export default function FuelReceiptDialog({ open, onOpenChange, vehicleId: presetId }: Props) {
  const { driver, myVehicles, allVehicles } = useDriverContext();
  const vehicles = myVehicles.length ? myVehicles : allVehicles;
  const [vehicleId, setVehicleId] = useState("");
  const [when, setWhen] = useState(localDT());
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("");
  const [km, setKm] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const [camOpen, setCamOpen] = useState(false);
  const [photosLoaded, setPhotosLoaded] = useState(false);

  useEffect(() => {
    if (!open) { setPhotosLoaded(false); return; }
    let d: any = null;
    try { d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); } catch {}
    if (d) {
      setWhen(d.when || localDT()); setVehicleId(d.vehicleId || presetId || vehicles[0]?.id || "");
      setLocation(d.location || ""); setCoords(d.coords || null);
      setLiters(d.liters || ""); setPrice(d.price || ""); setKm(d.km || "");
    } else {
      setWhen(localDT());
      setVehicleId(presetId || vehicles[0]?.id || "");
    }
    loadDraftPhotos(DRAFT_KEY).then((p) => { if (p.length) setPhotos(p); setPhotosLoaded(true); });
  }, [open, presetId, vehicles.length]);

  useEffect(() => {
    if (open && photosLoaded) saveDraftPhotos(DRAFT_KEY, photos);
  }, [open, photosLoaded, photos]);

  useEffect(() => {
    if (!open) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ vehicleId, when, location, coords, liters, price, km }));
    } catch {}
  }, [open, vehicleId, when, location, coords, liters, price, km]);

  const reset = () => {
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    clearDraftPhotos(DRAFT_KEY);
    setLocation(""); setCoords(null); setLiters(""); setPrice(""); setKm(""); setPhotos([]);
  };

  const addPhoto = (f: File) => setPhotos((prev) => [...prev, f].slice(0, MAX_PHOTOS));

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (!files.length) return;
    const small = await Promise.all(files.map((f) => compressImage(f)));
    setPhotos((prev) => [...prev, ...small].slice(0, MAX_PHOTOS));
  };

  const cancel = () => { reset(); onOpenChange(false); };

  const locate = () => {
    if (!navigator.geolocation) { toast.error("Zařízení nepodporuje zjištění polohy"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=cs`);
          const j = await r.json();
          const a = j.address || {};
          const place = [j.name, a.road, a.city || a.town || a.village].filter(Boolean).join(", ");
          setLocation(place || j.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setLocating(false);
      },
      () => { setLocating(false); toast.error("Polohu se nepodařilo zjistit – zadejte místo ručně"); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async () => {
    if (!vehicleId) { toast.error("Vyberte vozidlo"); return; }
    if (photos.length === 0) { toast.error("Vyfoťte účtenku"); return; }
    if (!navigator.onLine) { toast.error("Jste offline – tankování s fotkou lze uložit jen online"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nejste přihlášen");

      // ensure folder
      const { data: folder } = await supabase.from("document_folders").select("id")
        .eq("vehicle_id", vehicleId).eq("name", RECEIPT_FOLDER).maybeSingle();
      if (!folder) {
        await supabase.from("document_folders").insert({ vehicle_id: vehicleId, name: RECEIPT_FOLDER, sort_order: 50 } as any);
      }

      const dt = new Date(when);
      const base = `${when.slice(0, 10)} ${pad(dt.getHours())}-${pad(dt.getMinutes())}${location ? " " + safeName(location) : ""}`;
      let firstDocId: string | null = null;
      for (let i = 0; i < photos.length; i++) {
        const f = photos[i];
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const name = `${base}${photos.length > 1 ? ` (${i + 1})` : ""}.${ext}`;
        const path = `${vehicleId}/uctenky/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage.from("vehicle-documents").upload(path, f, { contentType: f.type });
        if (upErr) throw upErr;
        const { data: doc, error: docErr } = await supabase.from("vehicle_documents").insert({
          vehicle_id: vehicleId, name, file_path: path, file_size: f.size, mime_type: f.type, category: RECEIPT_FOLDER,
        }).select("id").single();
        if (docErr) throw docErr;
        if (!firstDocId) firstDocId = doc.id;
      }

      const kmNum = km ? parseInt(km, 10) : null;
      const { error } = await supabase.from("fuel_records").insert({
        vehicle_id: vehicleId,
        driver_id: driver?.id || null,
        user_id: user.id,
        fueled_at: dt.toISOString(),
        location: location || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        liters: liters ? parseFloat(liters.replace(",", ".")) : null,
        total_price: price ? parseFloat(price.replace(",", ".")) : null,
        km: kmNum,
        document_id: firstDocId,
      });
      if (error) throw error;
      if (kmNum) {
        await supabase.from("vehicle_mileage").insert({
          vehicle_id: vehicleId, km: kmNum, recorded_at: when.slice(0, 10), note: "Tankování",
        });
      }
      toast.success("Tankování uloženo");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Uložení selhalo: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={false}>
      <DrawerContent className="max-h-[92vh] md:mx-auto md:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DrawerHeader><DrawerTitle>Tankování</DrawerTitle></DrawerHeader>
        <div className="px-4 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <Label>Vozidlo</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
              <SelectContent>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.id} className="py-3">
                    {v.nazev_vozu || v.znacka || "?"} · {v.rz || "?"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Datum a čas</Label>
            <Input type="datetime-local" className="h-12" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Místo</Label>
            <div className="flex gap-2">
              <Input className="h-12" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Shell Brno, Vídeňská" />
              <Button type="button" variant="outline" className="h-12 shrink-0" onClick={locate} disabled={locating} aria-label="Použít moji polohu">
                {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Účtenka *</Label>
            <input id="fuel-receipt-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
            <input id="fuel-receipt-gallery" type="file" accept="image/*" className="hidden" onChange={onPick} />
            <div className="flex flex-wrap gap-2">
              {photos.map((f, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border bg-muted">
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-background/80 text-foreground" aria-label="Odebrat fotku">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <>
                  <button type="button" onClick={() => setCamOpen(true)} className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground active:bg-accent">
                    <Camera className="h-5 w-5" /><span className="text-[10px]">Vyfotit</span>
                  </button>
                  <label htmlFor="fuel-receipt-gallery" className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground active:bg-accent">
                    <ImageIcon className="h-5 w-5" /><span className="text-[10px]">Z galerie</span>
                  </label>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5"><Label className="text-xs">Litry</Label>
              <Input className="h-12" inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Cena Kč</Label>
              <Input className="h-12" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Tachometr</Label>
              <Input className="h-12" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} /></div>
          </div>
          {typeof navigator !== "undefined" && !navigator.onLine && (
            <div className="flex items-center gap-2 rounded border border-warning/30 bg-warning/10 p-2 text-xs text-warning">
              <WifiOff className="h-4 w-4" /> Offline – tankování s fotkou lze uložit až po připojení.
            </div>
          )}
        </div>
        <DrawerFooter className="pb-safe gap-2">
          <Button className="h-12 w-full text-base" onClick={submit} disabled={saving}>{saving ? "Ukládám…" : "Uložit tankování"}</Button>
          <Button variant="outline" className="h-12 w-full" onClick={cancel}>Zrušit</Button>
        </DrawerFooter>
      </DrawerContent>
      <InAppCamera open={camOpen} onOpenChange={setCamOpen} onCapture={addPhoto}
        onFallback={() => document.getElementById("fuel-receipt-camera")?.click()} />
    </Drawer>
  );
}
