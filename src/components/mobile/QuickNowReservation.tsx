import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDriverContext } from "@/hooks/useDriverContext";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { insertOrQueue } from "@/lib/offline/tripQueue";
import { PURPOSE_TYPES, checkPrivateLimit } from "@/lib/reservationRules";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

function pad(n: number) { return String(n).padStart(2, "0"); }
function roundUp30(d: Date) {
  const m = d.getMinutes();
  d.setMinutes(m <= 30 ? 30 : 60, 0, 0);
  return d;
}

/**
 * "Teď hned" — quick reservation: now → now+duration, on a free vehicle.
 * Lists vehicles that have no overlapping approved/pending reservation in the target window.
 */
export default function QuickNowReservation({ open, onOpenChange }: Props) {
  const { driver, myVehicles, allVehicles } = useDriverContext();
  const [duration, setDuration] = useState(60); // minutes
  const [purpose, setPurpose] = useState("");
  const [purposeType, setPurposeType] = useState("pracovne");
  const [vehicleId, setVehicleId] = useState("");
  const [free, setFree] = useState<{ id: string; rz: string | null; znacka: string | null; nazev_vozu?: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const startStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const endDate = new Date(now.getTime() + duration * 60000);
  const endStr = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
  const dateStr = now.toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const candidates = (myVehicles.length ? myVehicles : allVehicles).map((v: any) => v);
      const ids = candidates.map((v) => v.id);
      if (!ids.length) { setFree([]); setLoading(false); return; }
      // Pull today's reservations for those vehicles
      const { data: res } = await supabase
        .from("reservations")
        .select("vehicle_id, date_from, date_to, time_from, time_to, status")
        .in("vehicle_id", ids)
        .neq("status", "zamítnuto")
        .lte("date_from", dateStr)
        .gte("date_to", dateStr);
      const startMs = now.getTime();
      const endMs = endDate.getTime();
      const conflicts = new Set<string>();
      for (const r of (res || []) as any[]) {
        const rFrom = new Date(`${r.date_from}T${r.time_from || "00:00"}:00`).getTime();
        const rTo = new Date(`${r.date_to}T${r.time_to || "23:59"}:00`).getTime();
        if (rFrom < endMs && rTo > startMs) conflicts.add(r.vehicle_id);
      }
      const available = candidates.filter((v: any) => !conflicts.has(v.id));
      setFree(available);
      setVehicleId(available[0]?.id || "");
      setLoading(false);
    };
    load();
  }, [open, duration]);

  const submit = async () => {
    if (!vehicleId) { toast.error("Žádné volné vozidlo"); return; }
    if (purposeType === "jine" && !purpose.trim()) {
      toast.error("U účelu „Jiné“ prosím doplňte popis.");
      return;
    }
    setSaving(true);
    const driverName = driver ? `${driver.first_name} ${driver.last_name}` : "Řidič";
    if (purposeType === "soukrome") {
      const limitErr = await checkPrivateLimit(driverName, dateStr, dateStr);
      if (limitErr) {
        setSaving(false);
        toast.error(limitErr);
        return;
      }
    }
    const res = await insertOrQueue("reservations", {
      vehicle_id: vehicleId,
      driver_name: driverName,
      date_from: dateStr,
      date_to: dateStr,
      time_from: `${startStr}:00`,
      time_to: `${endStr}:00`,
      purpose: purpose || "Okamžitá rezervace",
      purpose_type: purposeType,
      status: "schváleno",
    });
    setSaving(false);
    if (res.status === "error") { toast.error(res.message); return; }
    toast.success(res.status === "queued" ? "Offline – rezervace se odešle po obnovení sítě" : "Rezervováno");
    setPurpose("");
    setPurposeType("pracovne");
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" />Rezervace teď</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            {startStr} – {endStr} ({duration} min)
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[30, 60, 120, 240].map((d) => (
              <Button key={d} variant={duration === d ? "default" : "outline"} className="h-11" onClick={() => setDuration(d)}>
                {d < 60 ? `${d} min` : `${d / 60} h`}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Volné vozidlo</Label>
            {loading ? (
              <div className="text-sm text-muted-foreground">Hledám volné vozidlo…</div>
            ) : free.length === 0 ? (
              <div className="text-sm text-destructive">Žádné volné vozidlo v tomto čase.</div>
            ) : (
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {free.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="py-3">{v.nazev_vozu || v.znacka || "?"} · {v.rz || "?"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Účel jízdy</Label>
            <Select value={purposeType} onValueChange={setPurposeType}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PURPOSE_TYPES.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="py-3">{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{purposeType === "jine" ? "Upřesnění účelu" : "Poznámka (nepovinné)"}</Label>
            <Input className="h-12" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Krátká cesta…" />
          </div>
        </div>
        <DrawerFooter className="pb-safe gap-2">
          <Button className="w-full h-12" onClick={submit} disabled={saving || !vehicleId}>{saving ? "Rezervuji…" : "Rezervovat"}</Button>
          <Button variant="outline" className="w-full h-12" onClick={() => onOpenChange(false)}>Zrušit</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}