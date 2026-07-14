import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateMonth } from "@/lib/tripGen/generateMonth";
import type { FuelStop, GeneratedTrip } from "@/lib/tripGen/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicleId: string;
  month: string; // YYYY-MM
  onSaved?: () => void;
}

type PrefState = {
  base: string;
  purposes: string;
  destinations: string;
  timeOut: string;
  timeBack: string;
  workingDaysOnly: boolean;
};

const prefKey = (vid: string) => `trip-gen:${vid}`;

function loadPrefs(vid: string): PrefState {
  try {
    const raw = localStorage.getItem(prefKey(vid));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    base: "Praha – sídlo",
    purposes: "Obchodní jednání\nServisní návštěva\nDoprava materiálu\nSchůzka se zákazníkem",
    destinations: "Brno\nPlzeň\nOstrava\nHradec Králové\nLiberec",
    timeOut: "07:30",
    timeBack: "16:30",
    workingDaysOnly: true,
  };
}

export default function TripLogGeneratorDialog({ open, onOpenChange, vehicleId, month, onSaved }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<"input" | "preview">("input");
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<PrefState>(loadPrefs(vehicleId));
  const [kmStart, setKmStart] = useState("");
  const [kmEnd, setKmEnd] = useState("");
  const [fuel, setFuel] = useState<FuelStop[]>([]);
  const [trips, setTrips] = useState<GeneratedTrip[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep("input");
    setPrefs(loadPrefs(vehicleId));
    setTrips([]);
    setWarnings([]);
    // Preload km_start from last log up to month start
    (async () => {
      const [y, m] = month.split("-").map(Number);
      const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
      const monthEnd = new Date(y, m, 0).toISOString().split("T")[0];

      const { data: prev } = await supabase
        .from("trip_logs")
        .select("km_end")
        .eq("vehicle_id", vehicleId)
        .lt("date", monthStart)
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(1);
      if (prev && prev[0]?.km_end) setKmStart(String(prev[0].km_end));
      else setKmStart("");

      const { data: last } = await supabase
        .from("trip_logs")
        .select("km_end")
        .eq("vehicle_id", vehicleId)
        .lte("date", monthEnd)
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(1);
      if (last && last[0]?.km_end) setKmEnd(String(last[0].km_end));
      else setKmEnd("");

      // Preload fuel stops from existing month logs (if any)
      const { data: existing } = await supabase
        .from("trip_logs")
        .select("date, route_to, fuel_quantity, fuel_price")
        .eq("vehicle_id", vehicleId)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .not("fuel_quantity", "is", null);
      const fromLogs: FuelStop[] = (existing || [])
        .filter((r: any) => r.fuel_quantity)
        .map((r: any) => ({
          date: r.date,
          place: r.route_to || "",
          liters: Number(r.fuel_quantity) || 0,
          price: Number(r.fuel_price) || 0,
        }));
      setFuel(fromLogs);
    })();
  }, [open, vehicleId, month]);

  const savePrefs = (p: PrefState) => {
    setPrefs(p);
    try { localStorage.setItem(prefKey(vehicleId), JSON.stringify(p)); } catch { /* ignore */ }
  };

  const addFuel = () => setFuel([...fuel, { date: `${month}-01`, place: "", liters: 0, price: 0 }]);
  const updateFuel = (i: number, patch: Partial<FuelStop>) => {
    setFuel(fuel.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  };
  const removeFuel = (i: number) => setFuel(fuel.filter((_, idx) => idx !== i));

  const runGenerate = () => {
    const ks = parseInt(kmStart);
    const ke = parseInt(kmEnd);
    if (!ks || !ke || ke <= ks) {
      toast({ title: "Zkontrolujte km", description: "Cílový stav musí být větší než počáteční.", variant: "destructive" });
      return;
    }
    const { trips, warnings } = generateMonth({
      vehicleId,
      month,
      kmStart: ks,
      kmEnd: ke,
      base: prefs.base.trim() || "Sídlo",
      workingDaysOnly: prefs.workingDaysOnly,
      purposes: prefs.purposes.split("\n").map(s => s.trim()).filter(Boolean),
      destinations: prefs.destinations.split("\n").map(s => s.trim()).filter(Boolean),
      fuelStops: fuel.filter(f => f.date && f.place),
      timeOut: prefs.timeOut,
      timeBack: prefs.timeBack,
    });
    setTrips(trips);
    setWarnings(warnings);
    setStep("preview");
    savePrefs(prefs);
  };

  const totalKm = useMemo(() => trips.reduce((s, t) => s + t.km_total, 0), [trips]);
  const totalLiters = useMemo(() => trips.reduce((s, t) => s + (t.fuel_quantity || 0), 0), [trips]);
  const totalFuelCost = useMemo(() => trips.reduce((s, t) => s + (t.fuel_price || 0), 0), [trips]);

  const handleSave = async () => {
    if (!trips.length) return;
    setSaving(true);
    const payload = trips.map(({ km_total, ...rest }) => rest);
    const { error } = await supabase.from("trip_logs").insert(payload as any);
    setSaving(false);
    if (error) {
      toast({ title: "Chyba ukládání", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Uloženo ${trips.length} jízd` });
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Vygenerovat knihu jízd – {month}
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Počáteční km *</Label>
                <Input type="number" value={kmStart} onChange={e => setKmStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Cílový stav km na konci měsíce *</Label>
                <Input type="number" value={kmEnd} onChange={e => setKmEnd(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Domácí základna</Label>
              <Input value={prefs.base} onChange={e => setPrefs({ ...prefs, base: e.target.value })} />
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <Label className="text-xs">Odjezd (tam)</Label>
                <Input type="time" value={prefs.timeOut} onChange={e => setPrefs({ ...prefs, timeOut: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Návrat (zpět)</Label>
                <Input type="time" value={prefs.timeBack} onChange={e => setPrefs({ ...prefs, timeBack: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <Checkbox
                  checked={prefs.workingDaysOnly}
                  onCheckedChange={(v) => setPrefs({ ...prefs, workingDaysOnly: !!v })}
                />
                Jen pracovní dny (bez víkendů a svátků)
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Účely (jeden na řádek)</Label>
                <Textarea rows={5} value={prefs.purposes} onChange={e => setPrefs({ ...prefs, purposes: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Cíle / města (jeden na řádek)</Label>
                <Textarea rows={5} value={prefs.destinations} onChange={e => setPrefs({ ...prefs, destinations: e.target.value })} />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Tankování v měsíci</Label>
                <Button size="sm" variant="outline" onClick={addFuel}>
                  <Plus className="mr-1 h-3.5 w-3.5" />Přidat
                </Button>
              </div>
              {fuel.length === 0 ? (
                <p className="text-sm text-muted-foreground">Zatím žádné tankování. Přidejte řádky, které se přiřadí k odpovídajícím dnům.</p>
              ) : (
                <div className="space-y-2">
                  {fuel.map((f, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input className="col-span-3" type="date" value={f.date} onChange={e => updateFuel(i, { date: e.target.value })} />
                      <Input className="col-span-4" placeholder="Místo tankování" value={f.place} onChange={e => updateFuel(i, { place: e.target.value })} />
                      <Input className="col-span-2" type="number" step="0.01" placeholder="litrů" value={f.liters || ""} onChange={e => updateFuel(i, { liters: parseFloat(e.target.value) || 0 })} />
                      <Input className="col-span-2" type="number" step="0.01" placeholder="Kč" value={f.price || ""} onChange={e => updateFuel(i, { price: parseFloat(e.target.value) || 0 })} />
                      <Button size="icon" variant="ghost" onClick={() => removeFuel(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-4 text-sm">
              <span><strong>{trips.length}</strong> jízd</span>
              <span>∑ km: <strong>{totalKm.toLocaleString("cs-CZ")}</strong></span>
              <span>∑ litrů: <strong>{totalLiters.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })}</strong></span>
              <span>∑ PHM Kč: <strong>{totalFuelCost.toLocaleString("cs-CZ", { maximumFractionDigits: 0 })}</strong></span>
            </div>
            {warnings.length > 0 && (
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                {warnings.map((w, i) => <div key={i}>• {w}</div>)}
              </div>
            )}
            <div className="max-h-[50vh] overflow-y-auto border rounded">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Čas</TableHead>
                    <TableHead>Z</TableHead>
                    <TableHead>Do</TableHead>
                    <TableHead>Účel</TableHead>
                    <TableHead className="text-right">Poč. km</TableHead>
                    <TableHead className="text-right">Kon. km</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead className="text-right">PHM (l)</TableHead>
                    <TableHead className="text-right">PHM (Kč)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trips.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap">{new Date(t.date).toLocaleDateString("cs-CZ")}</TableCell>
                      <TableCell>{t.time}</TableCell>
                      <TableCell>{t.route_from}</TableCell>
                      <TableCell>{t.route_to}</TableCell>
                      <TableCell>{t.purpose}</TableCell>
                      <TableCell className="text-right">{t.km_start.toLocaleString("cs-CZ")}</TableCell>
                      <TableCell className="text-right">{t.km_end.toLocaleString("cs-CZ")}</TableCell>
                      <TableCell className="text-right font-medium">{t.km_total.toLocaleString("cs-CZ")}</TableCell>
                      <TableCell className="text-right">{t.fuel_quantity ? t.fuel_quantity.toLocaleString("cs-CZ", { minimumFractionDigits: 2 }) : "—"}</TableCell>
                      <TableCell className="text-right">{t.fuel_price ? t.fuel_price.toLocaleString("cs-CZ") : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "input" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
              <Button onClick={runGenerate}>
                <Sparkles className="mr-2 h-4 w-4" />Vygenerovat náhled
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("input")}>
                <RotateCcw className="mr-2 h-4 w-4" />Zpět a upravit
              </Button>
              <Button variant="outline" onClick={runGenerate}>Přegenerovat</Button>
              <Button onClick={handleSave} disabled={saving || trips.length === 0}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Uložit {trips.length} jízd
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}