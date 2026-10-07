import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { Gauge, Plus, Trash2, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeLeasingMileage,
  deriveCurrentMileage,
  statusColor,
  statusText,
  LeasingMileageInput,
  MileageSource,
  TripLogMileage,
} from "@/lib/leasing/mileage";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface Props {
  vehicleId: string;
  vehicle: any;
}

function CalendarButton({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const date = value ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal h-9">
          {date ? format(date, "d.M.yyyy", { locale: cs }) : "Vyberte datum"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          locale={cs}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export default function LeasingMileagePanel({ vehicleId, vehicle }: Props) {
  const { toast } = useToast();
  const [records, setRecords] = useState<MileageSource[]>([]);
  const [tripLogs, setTripLogs] = useState<TripLogMileage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formKm, setFormKm] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);

  const input: LeasingMileageInput = {
    typ_vlastnictvi: vehicle?.typ_vlastnictvi ?? null,
    najezd_za_rok: vehicle?.najezd_za_rok ?? null,
    datum_zahajeni_leasingu: vehicle?.datum_zahajeni_leasingu ?? null,
    datum_ukonceni_leasingu: vehicle?.datum_ukonceni_leasingu ?? null,
    vychozi_stav_tachometru: vehicle?.vychozi_stav_tachometru ?? null,
  };

  const fetchData = async () => {
    setLoading(true);
    const [milRes, tripRes] = await Promise.all([
      supabase.from("vehicle_mileage").select("id, vehicle_id, km, recorded_at, note").eq("vehicle_id", vehicleId).order("recorded_at", { ascending: false }),
      supabase.from("trip_logs").select("vehicle_id, km_end, date").eq("vehicle_id", vehicleId).not("km_end", "is", null),
    ]);
    setRecords(
      ((milRes.data as any[]) || []).map((r) => ({
        id: r.id,
        vehicle_id: r.vehicle_id,
        km: r.km,
        recorded_at: r.recorded_at,
        source: "vehicle_mileage" as const,
        note: r.note ?? null,
      }))
    );
    setTripLogs(
      ((tripRes.data as any[]) || []).map((r) => ({
        vehicle_id: r.vehicle_id,
        km_end: r.km_end,
        date: r.date,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [vehicleId]);

  const currentMileage = deriveCurrentMileage(vehicleId, input, records, tripLogs);
  const result = computeLeasingMileage(input, currentMileage);

  const handleAddRecord = async () => {
    const km = Number(formKm);
    if (!formDate || isNaN(km) || km < 0) {
      toast({ title: "Chyba", description: "Zadejte platný stav tachometru a datum.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehicle_mileage").insert({
      vehicle_id: vehicleId,
      km,
      recorded_at: formDate,
      note: formNote || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Chyba při ukládání", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Stav tachometru uložen" });
    setFormKm("");
    setFormNote("");
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vehicle_mileage").delete().eq("id", id);
    if (error) {
      toast({ title: "Chyba při mazání", description: error.message, variant: "destructive" });
      return;
    }
    fetchData();
  };

  const chartData = records.length
    ? [...records]
        .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
        .map((r) => ({
          date: format(parseISO(r.recorded_at), "d.M.yyyy", { locale: cs }),
          km: r.km,
          plan: result.expectedKmNow,
        }))
    : [];

  if (!vehicle || vehicle.typ_vlastnictvi === "majetek") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Čerpání nájezdu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="text-sm text-muted-foreground">Načítání…</div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Čerpání plánu k dnešku</span>
                  <span className="font-medium">
                    {result.percentageUsed !== null ? `${result.percentageUsed} %` : "—"}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full transition-all", statusColor(result.status))}
                    style={{ width: `${Math.min(100, result.percentageUsed ?? 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0 %</span>
                  <span>100 % = přesně podle plánu</span>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <div className={cn("h-3 w-3 rounded-full", statusColor(result.status))} />
                <div>
                  <div className="text-sm font-medium">{statusText(result.status)}</div>
                  {result.differenceKm !== null && (
                    <div className={cn("text-xs", result.differenceKm > 0 ? "text-destructive" : "text-success")}>
                      {result.differenceKm > 0 ? "+" : ""}
                      {result.differenceKm.toLocaleString("cs-CZ")} km vůči plánu k dnešku
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(() => {
              const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toLocaleString("cs-CZ")} km`);
              const driven = result.currentKm !== null && result.startKm !== null ? result.currentKm - result.startKm : null;
              const maxOdo = result.startKm !== null && result.totalContractKm !== null ? result.startKm + result.totalContractKm : null;
              const planOdo = result.startKm !== null && result.expectedKmNow !== null ? result.startKm + result.expectedKmNow : null;
              const remaining = maxOdo !== null && result.currentKm !== null ? maxOdo - result.currentKm : null;
              const Tile = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
                <div className="rounded-lg border p-3">
                  <div className="text-muted-foreground text-xs">{label}</div>
                  <div className="font-medium">{value}</div>
                  {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
                </div>
              );
              return (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Stav tachometru</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <Tile label="Počáteční stav (převzetí)" value={fmt(result.startKm)} />
                      <Tile
                        label="Aktuální stav"
                        value={fmt(result.currentKm)}
                        hint={result.currentKmAt ? `k ${format(parseISO(result.currentKmAt), "d.M.yyyy", { locale: cs })}` : undefined}
                      />
                      <Tile label="Plánovaný stav k dnešku" value={fmt(planOdo)} />
                      <Tile label="Max. stav při vrácení" value={fmt(maxOdo)} hint="počáteční + smluvní limit" />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Kilometry v rámci leasingu</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <Tile label="Ujeto v leasingu" value={fmt(driven)} hint="aktuální − počáteční stav" />
                      <Tile label="Smluvní limit celkem" value={fmt(result.totalContractKm)} />
                      <Tile label="Zbývá do limitu" value={fmt(remaining)} />
                      <Tile label="Průměr za měsíc" value={fmt(result.monthlyAverage)} />
                    </div>
                  </div>
                </div>
              );
            })()}

            {result.projectedEndKm !== null && (
              <div className={cn(
                "rounded-lg border p-3 flex items-start gap-3",
                (result.projectedOverrun ?? 0) > 0 ? "bg-destructive/5 border-destructive/20" : "bg-success/5 border-success/20"
              )}>
                {(result.projectedOverrun ?? 0) > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 text-success shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <span className="font-medium">Odhad stavu tachometru při vrácení:</span>{" "}
                  {result.projectedEndKm.toLocaleString("cs-CZ")} km
                  {result.projectedOverrun !== null && result.projectedOverrun !== 0 && (
                    <span className={result.projectedOverrun > 0 ? "text-destructive" : "text-success"}>
                      {" "}({result.projectedOverrun > 0 ? "+" : ""}
                      {result.projectedOverrun.toLocaleString("cs-CZ")} km)
                    </span>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Při současném tempu {result.monthlyAverage?.toLocaleString("cs-CZ") ?? "—"} km/měsíc.
                  </div>
                </div>
              </div>
            )}

            {records.length > 0 && (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={64} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                      formatter={(value: any) => [`${Number(value).toLocaleString("cs-CZ")} km`, "km" ]}
                    />
                    <ReferenceLine y={result.expectedKmNow ?? undefined} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="km" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Historie stavu tachometru</h4>
                <Button variant="outline" size="sm" onClick={() => setShowForm(s => !s)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {showForm ? "Zavřít" : "Přidat záznam"}
                </Button>
              </div>

              {showForm && (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Datum</Label>
                      <CalendarButton value={formDate} onChange={setFormDate} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stav tachometru (km)</Label>
                      <Input type="number" value={formKm} onChange={(e) => setFormKm(e.target.value)} className="h-9" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Poznámka</Label>
                    <Textarea value={formNote} onChange={(e) => setFormNote(e.target.value)} className="min-h-[60px] text-sm" />
                  </div>
                  <Button size="sm" onClick={handleAddRecord} disabled={saving}>
                    {saving ? "Ukládání…" : "Uložit záznam"}
                  </Button>
                </div>
              )}

              <div className="space-y-1">
                {records.length === 0 && tripLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground">Zatím žádné záznamy. Přidejte ruční záznam nebo zapisujte km v knize jízd.</p>
                )}
                {[...records]
                  .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
                  .map((r) => (
                    <div key={`${r.recorded_at}-${r.km}`} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <span className="text-muted-foreground">{format(parseISO(r.recorded_at), "d.M.yyyy", { locale: cs })}</span>
                      <span className="font-medium">{r.km.toLocaleString("cs-CZ")} km</span>
                      <span className="text-xs text-muted-foreground">{r.source === "vehicle_mileage" ? "ruční" : "kniha jízd"}</span>
                    </div>
                  ))}
                {tripLogs.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    + {tripLogs.length} záznamů z knihy jízd
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
