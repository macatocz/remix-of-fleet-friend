import { useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Upload, AlertTriangle, FileSpreadsheet, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { parseTripRows, countGaps, ImportedTrip } from "@/lib/tripLog/importParser";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicleId: string;
  drivers: { id: string; first_name: string; last_name: string }[];
  onDone: () => void;
}

const fmt = (n: number) => n.toLocaleString("cs-CZ");
const fmtDate = (d: string) => d.split("-").reverse().map(Number).join(". ");
const key = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

export default function TripLogImportDialog({ open, onOpenChange, vehicleId, drivers, onDone }: Props) {
  const { toast } = useToast();
  const [trips, setTrips] = useState<ImportedTrip[]>([]);
  const [fileName, setFileName] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"skip" | "replace" | "append">("skip");
  const [saving, setSaving] = useState(false);

  const reset = () => { setTrips([]); setFileName(""); setSkipped(0); setError(null); setMode("skip"); };

  const handleFile = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const yearMatch = file.name.match(/20\d{2}/);
      const all: ImportedTrip[] = [];
      let sk = 0;
      for (const name of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: "", raw: true });
        const r = parseTripRows(rows, yearMatch ? Number(yearMatch[0]) : undefined);
        if (r.header) { all.push(...r.trips); sk += r.skipped; }
      }
      all.sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")) || (a.km_start ?? 0) - (b.km_start ?? 0));
      if (!all.length) setError("V souboru jsme nenašli žádné jízdy. Zkontrolujte, že má řádek s nadpisy (Datum, Odkud, Kam, km…), nebo použijte vzorovou šablonu.");
      setTrips(all);
      setSkipped(sk);
    } catch (e: any) {
      setError("Soubor se nepodařilo přečíst: " + e.message);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Datum", "Čas", "Přestávka (min)", "Řidič", "Účel", "Typ (Pracovně/Soukromě/Jiné)", "Odkud", "Kam", "Počáteční km", "Konečné km", "PHM litry", "PHM Kč"],
      ["7.1.2026", "8:00", "", "Jan Novák", "Jednání u klienta", "Pracovně", "Praha", "Brno", 12047, 12252, "", ""],
      ["7.1.2026", "16:00", "30", "Jan Novák", "Návrat", "Pracovně", "Brno", "Praha", 12252, 12457, 42.5, 1700],
    ]);
    ws["!cols"] = [10, 7, 10, 16, 22, 18, 16, 16, 12, 12, 10, 10].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kniha jízd");
    XLSX.writeFile(wb, "sablona-kniha-jizd.xlsx");
  };

  const kmTotal = trips.reduce((s, t) => s + (t.km_start != null && t.km_end != null ? t.km_end - t.km_start : 0), 0);
  const liters = trips.reduce((s, t) => s + (t.fuel_quantity ?? 0), 0);
  const fuelKc = trips.reduce((s, t) => s + (t.fuel_price ?? 0), 0);
  const priv = trips.filter(t => t.purpose_type === "soukrome").length;
  const gaps = countGaps(trips);
  const bad = trips.filter(t => t.km_start != null && t.km_end != null && t.km_end < t.km_start).length;
  const from = trips[0]?.date, to = trips[trips.length - 1]?.date;
  const driverMap = new Map(drivers.flatMap(d => [[key(`${d.first_name} ${d.last_name}`), d.id], [key(`${d.last_name} ${d.first_name}`), d.id]]));
  const unmatched = [...new Set(trips.map(t => t.driver_name).filter((n): n is string => !!n && !driverMap.has(key(n))))];

  const save = async () => {
    if (!trips.length || !from || !to) return;
    setSaving(true);
    try {
      let toInsert = trips;
      if (mode === "replace") {
        const { error } = await supabase.from("trip_logs").delete().eq("vehicle_id", vehicleId).gte("date", from).lte("date", to);
        if (error) throw error;
      } else if (mode === "skip") {
        const { data, error } = await supabase.from("trip_logs").select("date, km_start").eq("vehicle_id", vehicleId).gte("date", from).lte("date", to);
        if (error) throw error;
        const existing = new Set((data ?? []).map(r => `${r.date}|${r.km_start ?? ""}`));
        toInsert = trips.filter(t => !existing.has(`${t.date}|${t.km_start ?? ""}`));
      }
      const rows = toInsert.map(t => {
        const did = t.driver_name ? driverMap.get(key(t.driver_name)) ?? null : null;
        const extra = t.driver_name && !did ? `Řidič: ${t.driver_name}` : null;
        return {
          vehicle_id: vehicleId, driver_id: did, date: t.date, time: t.time, break_minutes: t.break_minutes,
          description: [t.description, extra].filter(Boolean).join(" · ") || null,
          purpose: t.purpose, purpose_type: t.purpose_type, route_from: t.route_from, route_to: t.route_to,
          km_start: t.km_start, km_end: t.km_end, fuel_quantity: t.fuel_quantity, fuel_price: t.fuel_price, other_price: t.other_price,
        };
      });
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from("trip_logs").insert(rows.slice(i, i + 200));
        if (error) throw error;
      }
      const last = [...trips].reverse().find(t => t.km_end != null);
      if (last?.km_end != null) {
        const { data: cur } = await supabase.from("vehicle_mileage").select("km").eq("vehicle_id", vehicleId).order("km", { ascending: false }).limit(1).maybeSingle();
        if (!cur || cur.km < last.km_end) {
          await supabase.from("vehicle_mileage").insert({ vehicle_id: vehicleId, km: last.km_end, recorded_at: last.date, note: "Import knihy jízd z Excelu" });
        }
      }
      toast({ title: "Kniha jízd naimportována", description: `Uloženo ${rows.length} jízd${trips.length - rows.length ? `, přeskočeno ${trips.length - rows.length} již existujících` : ""}.` });
      onDone();
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast({ title: "Import se nezdařil", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import knihy jízd z Excelu</DialogTitle>
          <DialogDescription>Nahrajte .xlsx, .xls nebo .csv. Sloupce rozpoznáme podle nadpisů, projdeme všechny listy (např. jednotlivé měsíce).</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <label className="cursor-pointer">
              <Upload className="mr-1 h-4 w-4" />{fileName ? "Vybrat jiný soubor" : "Vybrat soubor"}
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </label>
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}><Download className="mr-1 h-4 w-4" />Vzorová šablona</Button>
          {fileName && <span className="text-xs text-muted-foreground flex items-center gap-1"><FileSpreadsheet className="h-3.5 w-3.5" />{fileName}</span>}
        </div>

        {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        {trips.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <div className="rounded-md bg-muted/50 p-2"><div className="text-xs text-muted-foreground">Jízd</div><div className="font-semibold">{fmt(trips.length)}</div></div>
              <div className="rounded-md bg-muted/50 p-2"><div className="text-xs text-muted-foreground">Období</div><div className="font-semibold">{fmtDate(from!)} – {fmtDate(to!)}</div></div>
              <div className="rounded-md bg-muted/50 p-2"><div className="text-xs text-muted-foreground">Ujeto</div><div className="font-semibold">{fmt(kmTotal)} km</div></div>
              <div className="rounded-md bg-muted/50 p-2"><div className="text-xs text-muted-foreground">PHM</div><div className="font-semibold">{fmt(Math.round(liters))} l · {fmt(Math.round(fuelKc))} Kč</div></div>
            </div>
            <div className="text-xs text-muted-foreground">Soukromých jízd: {priv}{skipped ? ` · Přeskočeno nečitelných řádků: ${skipped}` : ""}</div>

            {(gaps > 0 || bad > 0 || unmatched.length > 0) && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1 font-medium"><AlertTriangle className="h-3.5 w-3.5 text-primary" />Ke kontrole</div>
                {gaps > 0 && <div>Na {gaps} místech nenavazuje tachometr (začátek jízdy ≠ konec předchozí).</div>}
                {bad > 0 && <div>{bad} jízd má konečný stav menší než počáteční.</div>}
                {unmatched.length > 0 && <div>Řidiče nenalezené v aplikaci ({unmatched.join(", ")}) uložíme jménem do popisu jízdy.</div>}
              </div>
            )}

            <div className="border rounded-md max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>{["Datum", "Čas", "Trasa", "Účel", "Typ", "km od", "km do", "PHM l"].map(h => <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {trips.slice(0, 100).map((t, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1 whitespace-nowrap">{fmtDate(t.date)}</td>
                      <td className="px-2 py-1">{t.time ?? ""}</td>
                      <td className="px-2 py-1">{[t.route_from, t.route_to].filter(Boolean).join(" → ")}</td>
                      <td className="px-2 py-1 max-w-[160px] truncate">{t.purpose ?? ""}</td>
                      <td className="px-2 py-1">{t.purpose_type === "soukrome" ? "Soukr." : t.purpose_type === "jine" ? "Jiné" : "Prac."}</td>
                      <td className="px-2 py-1 text-right">{t.km_start ?? ""}</td>
                      <td className="px-2 py-1 text-right">{t.km_end ?? ""}</td>
                      <td className="px-2 py-1 text-right">{t.fuel_quantity ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {trips.length > 100 && <div className="p-2 text-xs text-muted-foreground">… a dalších {trips.length - 100} jízd</div>}
            </div>

            <div className="space-y-2">
              <Label>Co s jízdami, které už v aplikaci jsou ({fmtDate(from!)} – {fmtDate(to!)})?</Label>
              <RadioGroup value={mode} onValueChange={v => setMode(v as any)} className="text-sm">
                <label className="flex items-center gap-2"><RadioGroupItem value="skip" />Ponechat a přeskočit duplicity (stejný den a stav km)</label>
                <label className="flex items-center gap-2"><RadioGroupItem value="replace" />Smazat jízdy v tomto období a nahradit souborem</label>
                <label className="flex items-center gap-2"><RadioGroupItem value="append" />Jen přidat vše (bez kontroly)</label>
              </RadioGroup>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Zrušit</Button>
          <Button onClick={save} disabled={!trips.length || saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Importovat {trips.length ? `${trips.length} jízd` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
