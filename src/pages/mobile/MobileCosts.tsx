import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { Fuel, Receipt, DollarSign, Route } from "lucide-react";
import { vehicleLabel } from "@/lib/vehicleName";

interface MonthData {
  month: string;
  phm: number;
  servis: number;
  celkem: number;
  km: number;
}

const MONTHS = ["L", "Ú", "B", "D", "K", "Č", "7", "S", "Z", "Ř", "L", "P"];
const MONTH_NAMES = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čer", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

const czk = (n: number) => `${Math.round(n).toLocaleString("cs-CZ")} Kč`;

export default function MobileCosts() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [serviceLogs, setServiceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fuelLimit, setFuelLimit] = useState(20);
  const [serviceLimit, setServiceLimit] = useState(20);

  useEffect(() => {
    supabase.from("vehicles").select("id, znacka, rz, nazev_vozu").order("znacka")
      .then(({ data }) => setVehicles(data || []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setFuelLimit(20);
      setServiceLimit(20);
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      let tripQ = supabase.from("trip_logs")
        .select("*, vehicles(znacka, rz, nazev_vozu), drivers(first_name, last_name)")
        .gte("date", startDate).lte("date", endDate)
        .order("date", { ascending: false });
      let serviceQ = supabase.from("service_records")
        .select("*, vehicles(znacka, rz, nazev_vozu)")
        .gte("date", startDate).lte("date", endDate)
        .order("date", { ascending: false });

      if (selectedVehicle !== "all") {
        tripQ = tripQ.eq("vehicle_id", selectedVehicle);
        serviceQ = serviceQ.eq("vehicle_id", selectedVehicle);
      }

      const [tripRes, serviceRes] = await Promise.all([tripQ, serviceQ]);
      if (cancelled) return;

      const trips = (tripRes.data as any[]) || [];
      const services = (serviceRes.data as any[]) || [];
      setFuelLogs(trips.filter(t => t.fuel_quantity || t.fuel_price));
      setServiceLogs(services);

      const months: MonthData[] = [];
      for (let m = 0; m < 12; m++) {
        const mStr = String(m + 1).padStart(2, "0");
        const mTrips = trips.filter(t => t.date?.startsWith(`${year}-${mStr}`));
        const mServices = services.filter(s => s.date?.startsWith(`${year}-${mStr}`));
        const phm = mTrips.reduce((s, t) => s + (Number(t.fuel_price) || 0) + (Number(t.other_price) || 0), 0);
        const servis = mServices.reduce((s, sr) => s + (Number(sr.cost) || 0), 0);
        const km = mTrips.reduce((s, t) => s + (t.km_total || 0), 0);
        months.push({ month: MONTHS[m], phm: Math.round(phm), servis: Math.round(servis), celkem: Math.round(phm + servis), km });
      }
      setMonthlyData(months);
      setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [selectedVehicle, year]);

  const totalPhm = monthlyData.reduce((s, m) => s + m.phm, 0);
  const totalServis = monthlyData.reduce((s, m) => s + m.servis, 0);
  const totalKm = monthlyData.reduce((s, m) => s + m.km, 0);
  const totalCelkem = totalPhm + totalServis;

  const topVehicles = useMemo(() => {
    const map: Record<string, { name: string; cost: number }> = {};
    const add = (vid: string, label: string, cost: number) => {
      if (!map[vid]) map[vid] = { name: label, cost: 0 };
      map[vid].cost += cost;
    };
    fuelLogs.forEach(l => add(l.vehicle_id, l.vehicles ? vehicleLabel(l.vehicles) : "—",
      (Number(l.fuel_price) || 0) + (Number(l.other_price) || 0)));
    serviceLogs.forEach(s => add(s.vehicle_id, s.vehicles ? vehicleLabel(s.vehicles) : "—", Number(s.cost) || 0));
    return Object.values(map).filter(v => v.cost > 0).sort((a, b) => b.cost - a.cost).slice(0, 6);
  }, [fuelLogs, serviceLogs]);

  const maxTop = topVehicles[0]?.cost || 1;
  const tickStyle = { fontSize: 10, fill: "hsl(var(--muted-foreground))" };
  const kFmt = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

  const tiles = [
    { icon: Fuel, cls: "text-warning", label: "PHM celkem", value: czk(totalPhm) },
    { icon: Receipt, cls: "text-destructive", label: "Servis celkem", value: czk(totalServis) },
    { icon: DollarSign, cls: "text-primary", label: "Celkem", value: czk(totalCelkem) },
    { icon: Route, cls: "text-success", label: "Celkem km", value: totalKm.toLocaleString("cs-CZ") },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-4 pb-6">
      <div>
        <h1 className="text-xl font-bold">Náklady a PHM</h1>
        <p className="text-xs text-muted-foreground">Provozní náklady a spotřeba PHM.</p>
      </div>

      {/* Filtry */}
      <div className="grid grid-cols-[5rem_1fr] gap-2">
        <Input
          type="number" inputMode="numeric" className="h-10"
          value={year} min={2020} max={2030}
          onChange={e => setYear(Number(e.target.value))}
        />
        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
          <SelectTrigger className="h-10 w-full min-w-0"><SelectValue /></SelectTrigger>
          <SelectContent className="max-w-[85vw]">
            <SelectItem value="all">Všechna vozidla</SelectItem>
            {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{vehicleLabel(v)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* Souhrn 2x2 */}
          <div className="grid grid-cols-2 gap-2">
            {tiles.map(t => (
              <Card key={t.label} className="min-w-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <t.icon className={`h-4 w-4 shrink-0 ${t.cls}`} />
                    <span className="text-[11px] truncate">{t.label}</span>
                  </div>
                  <p className="mt-1 text-base font-bold break-words leading-tight">{t.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Měsíční náklady */}
          <Card className="min-w-0">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-semibold">Měsíční náklady</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "hsl(var(--chart-2))" }} />PHM</span>
                  <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "hsl(var(--chart-1))" }} />Servis</span>
                </div>
              </div>
              <div className="w-full">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={38} tickFormatter={kFmt} />
                    <Tooltip
                      formatter={(v: number, n: string) => [czk(v), n === "phm" ? "PHM" : "Servis"]}
                      labelFormatter={(l: string, p: any) => MONTH_NAMES[monthlyData.findIndex(m => m === p?.[0]?.payload)] || l}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="phm" stackId="a" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="servis" stackId="a" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Rozložení nákladů */}
          <Card className="min-w-0">
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-semibold">Rozložení nákladů</p>
              {totalCelkem === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Žádná data</p>
              ) : (
                [
                  { name: "PHM", value: totalPhm, color: "hsl(var(--chart-2))" },
                  { name: "Servis", value: totalServis, color: "hsl(var(--chart-1))" },
                ].map(d => (
                  <div key={d.name} className="min-w-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate">{d.name}</span>
                      <span className="font-medium shrink-0 ml-2">
                        {czk(d.value)} · {Math.round((d.value / totalCelkem) * 100)} %
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(d.value / totalCelkem) * 100}%`, background: d.color }} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Nejnákladnější vozidla */}
          {selectedVehicle === "all" && topVehicles.length > 0 && (
            <Card className="min-w-0">
              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-semibold">Nejnákladnější vozidla</p>
                {topVehicles.map(v => (
                  <div key={v.name} className="min-w-0">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="truncate">{v.name}</span>
                      <span className="font-medium shrink-0">{czk(v.cost)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(v.cost / maxTop) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Nájezd km */}
          <Card className="min-w-0">
            <CardContent className="p-3">
              <p className="text-sm font-semibold mb-2">Měsíční nájezd (km)</p>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={tickStyle} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={38} tickFormatter={kFmt} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString("cs-CZ")} km`, "Km"]} contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="km" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Záznamy */}
          <Tabs defaultValue="fuel" className="w-full min-w-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fuel" className="text-xs gap-1"><Fuel className="h-3.5 w-3.5" />Tankování</TabsTrigger>
              <TabsTrigger value="service" className="text-xs gap-1"><Receipt className="h-3.5 w-3.5" />Servis</TabsTrigger>
            </TabsList>

            <TabsContent value="fuel" className="mt-3 space-y-2">
              {fuelLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Žádné záznamy o tankování</p>
              ) : (
                <>
                  {fuelLogs.slice(0, fuelLimit).map((f: any) => (
                    <Card key={f.id} className="min-w-0">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {f.vehicles ? vehicleLabel(f.vehicles) : "—"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(f.date).toLocaleDateString("cs-CZ")}
                              {f.drivers ? ` · ${f.drivers.first_name} ${f.drivers.last_name}` : ""}
                            </p>
                            {f.route_from && f.route_to && (
                              <p className="text-[11px] text-muted-foreground truncate">{f.route_from} → {f.route_to}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold">{f.fuel_price ? czk(Number(f.fuel_price)) : "—"}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {f.fuel_quantity ? `${Number(f.fuel_quantity).toLocaleString("cs-CZ", { minimumFractionDigits: 1 })} l` : "—"}
                              {f.km_total ? ` · ${f.km_total.toLocaleString("cs-CZ")} km` : ""}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {fuelLogs.length > fuelLimit && (
                    <Button variant="outline" className="w-full" onClick={() => setFuelLimit(l => l + 20)}>
                      Načíst další ({fuelLogs.length - fuelLimit})
                    </Button>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="service" className="mt-3 space-y-2">
              {serviceLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Žádné servisní záznamy</p>
              ) : (
                <>
                  {serviceLogs.slice(0, serviceLimit).map((s: any) => (
                    <Card key={s.id} className="min-w-0">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {s.vehicles ? vehicleLabel(s.vehicles) : "—"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(s.date).toLocaleDateString("cs-CZ")} · {s.type}
                            </p>
                            {s.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 break-words">{s.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <p className="text-sm font-semibold">{s.cost ? czk(Number(s.cost)) : "—"}</p>
                            <Badge variant={s.status === "dokončeno" ? "default" : "secondary"} className="text-[10px]">
                              {s.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {serviceLogs.length > serviceLimit && (
                    <Button variant="outline" className="w-full" onClick={() => setServiceLimit(l => l + 20)}>
                      Načíst další ({serviceLogs.length - serviceLimit})
                    </Button>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
