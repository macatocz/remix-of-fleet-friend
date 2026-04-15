import { useState, useEffect } from "react";
import { useSortableTable } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { Fuel, Receipt, TrendingUp, DollarSign, Route } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PIE_COLORS = ["hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(217, 71%, 45%)", "hsl(142, 71%, 45%)", "hsl(280, 60%, 50%)"];

interface MonthData {
  month: string;
  phm: number;
  servis: number;
  celkem: number;
  km: number;
}

export default function Costs() {
  const [vehicles, setVehicles] = useState<{ id: string; znacka: string; rz: string }[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [serviceLogs, setServiceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fuelSort = useSortableTable("date", "desc");
  const serviceLogSort = useSortableTable("date", "desc");

  useEffect(() => {
    supabase.from("vehicles").select("id, znacka, rz").order("znacka")
      .then(({ data }) => setVehicles(data || []));
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedVehicle, year]);

  const fetchData = async () => {
    setLoading(true);
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let tripQ = supabase.from("trip_logs")
      .select("*, vehicles(znacka, rz), drivers(first_name, last_name)")
      .gte("date", startDate).lte("date", endDate)
      .order("date", { ascending: false });

    let serviceQ = supabase.from("service_records")
      .select("*, vehicles(znacka, rz)")
      .gte("date", startDate).lte("date", endDate)
      .order("date", { ascending: false });

    if (selectedVehicle !== "all") {
      tripQ = tripQ.eq("vehicle_id", selectedVehicle);
      serviceQ = serviceQ.eq("vehicle_id", selectedVehicle);
    }

    const [tripRes, serviceRes] = await Promise.all([tripQ, serviceQ]);

    const trips = (tripRes.data as any[]) || [];
    const services = (serviceRes.data as any[]) || [];

    // Fuel logs = trips that have fuel data
    setFuelLogs(trips.filter(t => t.fuel_quantity || t.fuel_price));
    setServiceLogs(services);

    // Build monthly data
    const months: MonthData[] = [];
    const monthNames = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čer", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];
    for (let m = 0; m < 12; m++) {
      const mStr = String(m + 1).padStart(2, "0");
      const mTrips = trips.filter(t => t.date.startsWith(`${year}-${mStr}`));
      const mServices = services.filter(s => s.date.startsWith(`${year}-${mStr}`));

      const phm = mTrips.reduce((s, t) => s + (Number(t.fuel_price) || 0) + (Number(t.other_price) || 0), 0);
      const servis = mServices.reduce((s, sr) => s + (Number(sr.cost) || 0), 0);
      const km = mTrips.reduce((s, t) => s + (t.km_total || 0), 0);

      months.push({
        month: monthNames[m],
        phm: Math.round(phm),
        servis: Math.round(servis),
        celkem: Math.round(phm + servis),
        km,
      });
    }
    setMonthlyData(months);
    setLoading(false);
  };

  const totalPhm = monthlyData.reduce((s, m) => s + m.phm, 0);
  const totalServis = monthlyData.reduce((s, m) => s + m.servis, 0);
  const totalKm = monthlyData.reduce((s, m) => s + m.km, 0);
  const totalCelkem = totalPhm + totalServis;

  const pieData = [
    { name: "PHM", value: totalPhm },
    { name: "Servis", value: totalServis },
  ].filter(d => d.value > 0);

  // Top vehicles by cost
  const vehicleCostMap: Record<string, { name: string; cost: number }> = {};
  fuelLogs.forEach(l => {
    const vid = l.vehicle_id;
    const label = l.vehicles ? `${l.vehicles.znacka} (${l.vehicles.rz})` : vid;
    if (!vehicleCostMap[vid]) vehicleCostMap[vid] = { name: label, cost: 0 };
    vehicleCostMap[vid].cost += (Number(l.fuel_price) || 0) + (Number(l.other_price) || 0);
  });
  serviceLogs.forEach(s => {
    const vid = s.vehicle_id;
    const label = s.vehicles ? `${s.vehicles.znacka} (${s.vehicles.rz})` : vid;
    if (!vehicleCostMap[vid]) vehicleCostMap[vid] = { name: label, cost: 0 };
    vehicleCostMap[vid].cost += Number(s.cost) || 0;
  });
  const topVehicles = Object.values(vehicleCostMap).sort((a, b) => b.cost - a.cost).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Náklady a PHM</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm">Rok:</Label>
            <Input type="number" className="w-24 h-9" value={year} onChange={e => setYear(Number(e.target.value))} min={2020} max={2030} />
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-sm">Vozidlo:</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechna vozidla</SelectItem>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.znacka} ({v.rz})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Fuel className="h-5 w-5 text-warning" />
          <div><p className="text-xs text-muted-foreground">PHM celkem</p><p className="text-lg font-bold">{totalPhm.toLocaleString("cs-CZ")} Kč</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Receipt className="h-5 w-5 text-destructive" />
          <div><p className="text-xs text-muted-foreground">Servis celkem</p><p className="text-lg font-bold">{totalServis.toLocaleString("cs-CZ")} Kč</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-primary" />
          <div><p className="text-xs text-muted-foreground">Celkové náklady</p><p className="text-lg font-bold">{totalCelkem.toLocaleString("cs-CZ")} Kč</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Route className="h-5 w-5 text-success" />
          <div><p className="text-xs text-muted-foreground">Celkem km</p><p className="text-lg font-bold">{totalKm.toLocaleString("cs-CZ")}</p></div>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Měsíční přehled nákladů</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number) => `${v.toLocaleString("cs-CZ")} Kč`} />
                <Legend />
                <Bar dataKey="phm" name="PHM" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="servis" name="Servis" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Rozložení nákladů</CardTitle></CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Žádná data</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value.toLocaleString("cs-CZ")} Kč`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v.toLocaleString("cs-CZ")} Kč`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top vehicles by cost */}
      {selectedVehicle === "all" && topVehicles.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Nejnákladnější vozidla</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topVehicles} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v.toLocaleString("cs-CZ")} Kč`} />
                <Bar dataKey="cost" name="Náklady" fill="hsl(217, 71%, 45%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Km trend */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Měsíční nájezd (km)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: number) => `${v.toLocaleString("cs-CZ")} km`} />
              <Line type="monotone" dataKey="km" stroke="hsl(var(--primary))" strokeWidth={2} name="Km" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="fuel">
        <TabsList>
          <TabsTrigger value="fuel" className="gap-2"><Fuel className="h-4 w-4" />Tankování</TabsTrigger>
          <TabsTrigger value="service" className="gap-2"><Receipt className="h-4 w-4" />Servisní záznamy</TabsTrigger>
        </TabsList>

        <TabsContent value="fuel">
          <Card>
            <CardContent className="pt-6">
              {fuelLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Žádné záznamy o tankování</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead sortKey="date" currentSortKey={fuelSort.sortKey} sortDirection={fuelSort.sortDirection} onSort={fuelSort.handleSort}>Datum</SortableTableHead>
                        {selectedVehicle === "all" && <SortableTableHead sortKey="vehicle" currentSortKey={fuelSort.sortKey} sortDirection={fuelSort.sortDirection} onSort={fuelSort.handleSort}>Vozidlo</SortableTableHead>}
                        <SortableTableHead sortKey="driver" currentSortKey={fuelSort.sortKey} sortDirection={fuelSort.sortDirection} onSort={fuelSort.handleSort}>Řidič</SortableTableHead>
                        <TableHead>Trasa</TableHead>
                        <SortableTableHead sortKey="fuel_quantity" currentSortKey={fuelSort.sortKey} sortDirection={fuelSort.sortDirection} onSort={fuelSort.handleSort} className="text-right">Litry</SortableTableHead>
                        <SortableTableHead sortKey="fuel_price" currentSortKey={fuelSort.sortKey} sortDirection={fuelSort.sortDirection} onSort={fuelSort.handleSort} className="text-right">Cena PHM</SortableTableHead>
                        <SortableTableHead sortKey="km_total" currentSortKey={fuelSort.sortKey} sortDirection={fuelSort.sortDirection} onSort={fuelSort.handleSort} className="text-right">Km</SortableTableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fuelSort.sortData(fuelLogs, (item: any, key: string) => {
                        if (key === "vehicle") return item.vehicles?.znacka || "";
                        if (key === "driver") return item.drivers ? `${item.drivers.last_name} ${item.drivers.first_name}` : "";
                        return item[key];
                      }).slice(0, 50).map((f: any) => (
                        <TableRow key={f.id}>
                          <TableCell className="whitespace-nowrap">{new Date(f.date).toLocaleDateString("cs-CZ")}</TableCell>
                          {selectedVehicle === "all" && <TableCell className="whitespace-nowrap">{f.vehicles ? `${f.vehicles.znacka} (${f.vehicles.rz})` : "—"}</TableCell>}
                          <TableCell>{f.drivers ? `${f.drivers.first_name} ${f.drivers.last_name}` : "—"}</TableCell>
                          <TableCell>{f.route_from && f.route_to ? `${f.route_from} → ${f.route_to}` : "—"}</TableCell>
                          <TableCell className="text-right">{f.fuel_quantity ? Number(f.fuel_quantity).toLocaleString("cs-CZ", { minimumFractionDigits: 1 }) : "—"} l</TableCell>
                          <TableCell className="text-right">{f.fuel_price ? `${Number(f.fuel_price).toLocaleString("cs-CZ")} Kč` : "—"}</TableCell>
                          <TableCell className="text-right">{f.km_total ? f.km_total.toLocaleString("cs-CZ") : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {fuelLogs.length > 50 && <p className="text-xs text-muted-foreground mt-2">Zobrazeno prvních 50 z {fuelLogs.length} záznamů</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service">
          <Card>
            <CardContent className="pt-6">
              {serviceLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Žádné servisní záznamy</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead sortKey="date" currentSortKey={serviceLogSort.sortKey} sortDirection={serviceLogSort.sortDirection} onSort={serviceLogSort.handleSort}>Datum</SortableTableHead>
                        {selectedVehicle === "all" && <SortableTableHead sortKey="vehicle" currentSortKey={serviceLogSort.sortKey} sortDirection={serviceLogSort.sortDirection} onSort={serviceLogSort.handleSort}>Vozidlo</SortableTableHead>}
                        <SortableTableHead sortKey="type" currentSortKey={serviceLogSort.sortKey} sortDirection={serviceLogSort.sortDirection} onSort={serviceLogSort.handleSort}>Typ</SortableTableHead>
                        <TableHead>Popis</TableHead>
                        <SortableTableHead sortKey="status" currentSortKey={serviceLogSort.sortKey} sortDirection={serviceLogSort.sortDirection} onSort={serviceLogSort.handleSort}>Stav</SortableTableHead>
                        <SortableTableHead sortKey="cost" currentSortKey={serviceLogSort.sortKey} sortDirection={serviceLogSort.sortDirection} onSort={serviceLogSort.handleSort} className="text-right">Náklady</SortableTableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceLogSort.sortData(serviceLogs, (item: any, key: string) => {
                        if (key === "vehicle") return item.vehicles?.znacka || "";
                        return item[key];
                      }).map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="whitespace-nowrap">{new Date(s.date).toLocaleDateString("cs-CZ")}</TableCell>
                          {selectedVehicle === "all" && <TableCell className="whitespace-nowrap">{s.vehicles ? `${s.vehicles.znacka} (${s.vehicles.rz})` : "—"}</TableCell>}
                          <TableCell>{s.type}</TableCell>
                          <TableCell>{s.description || "—"}</TableCell>
                          <TableCell><Badge variant={s.status === "dokončeno" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                          <TableCell className="text-right font-medium">{s.cost ? `${Number(s.cost).toLocaleString("cs-CZ")} Kč` : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
