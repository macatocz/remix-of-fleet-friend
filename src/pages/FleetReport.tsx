import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Download, FileText, Route, DollarSign, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { vehicleLabel } from "@/lib/vehicleName";
import {
  buildQuarterSummary, previousQuarter, quarterRange, pctChange,
  type QuarterSummary, type ReservationRow, type ServiceRow, type TripRow,
} from "@/lib/report/quarterly";
import { toast } from "sonner";

const czk = (n: number) => `${Math.round(n).toLocaleString("cs-CZ")} Kč`;
const num = (n: number) => Math.round(n).toLocaleString("cs-CZ");
const MONTH_LABELS = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čer", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

export default function FleetReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [current, setCurrent] = useState<QuarterSummary | null>(null);
  const [previous, setPrevious] = useState<QuarterSummary | null>(null);

  const range = useMemo(() => quarterRange(year, quarter), [year, quarter]);
  const prevRange = useMemo(() => previousQuarter(year, quarter), [year, quarter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, quarter]);

  const load = async () => {
    setLoading(true);
    try {
      const from = prevRange.from;
      const to = range.to;
      const [{ data: veh }, { data: trips }, { data: services }, { data: reservations }] = await Promise.all([
        supabase.from("vehicles").select("id, znacka, rz, nazev_vozu, status, lokalita").order("znacka"),
        supabase.from("trip_logs")
          .select("vehicle_id, date, km_total, km_start, km_end, fuel_quantity, fuel_price, other_price, purpose_type")
          .gte("date", from).lte("date", to),
        supabase.from("service_records").select("vehicle_id, date, cost").gte("date", from).lte("date", to),
        supabase.from("reservations")
          .select("vehicle_id, date_from, date_to, purpose_type, status")
          .lte("date_from", to).gte("date_to", from),
      ]);

      const ids = (veh || []).map((v: any) => v.id);
      setVehicles(veh || []);
      setCurrent(buildQuarterSummary(range, ids, (trips || []) as TripRow[], (services || []) as ServiceRow[], (reservations || []) as ReservationRow[]));
      setPrevious(buildQuarterSummary(prevRange, ids, (trips || []) as TripRow[], (services || []) as ServiceRow[], (reservations || []) as ReservationRow[]));
    } catch (e: any) {
      toast.error("Nepodařilo se načíst data reportu");
    } finally {
      setLoading(false);
    }
  };

  const vehMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const rows = useMemo(() => {
    if (!current) return [];
    return current.byVehicle
      .filter((s) => s.km > 0 || s.totalCost > 0 || s.reservations > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [current]);

  const chartData = useMemo(
    () =>
      (current?.byMonth || []).map((m) => ({
        name: MONTH_LABELS[Number(m.month.slice(5, 7)) - 1],
        PHM: Math.round(m.fuel),
        Servis: Math.round(m.service),
        km: Math.round(m.km),
      })),
    [current]
  );

  const exportCsv = () => {
    if (!current) return;
    const header = ["Vozidlo", "RZ", "Km", "Jízd", "PHM (Kč)", "Servis (Kč)", "Celkem (Kč)", "Kč/km", "Rezervací", "Obsazenost (%)"];
    const lines = rows.map((s) => {
      const v = vehMap.get(s.vehicle_id);
      return [
        v?.nazev_vozu || v?.znacka || "",
        v?.rz || "",
        Math.round(s.km),
        s.trips,
        Math.round(s.fuelCost),
        Math.round(s.serviceCost),
        Math.round(s.totalCost),
        s.costPerKm ? s.costPerKm.toFixed(2) : "",
        s.reservations,
        s.utilization ?? "",
      ].join(";");
    });
    const csv = "\uFEFF" + [header.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${range.label.replace(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!current) return;
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const { ensurePdfFont } = await import("@/lib/travel/pdfFont");
    const doc = new jsPDF({ orientation: "landscape" });
    const font = await ensurePdfFont(doc);

    doc.setFont(font, "bold");
    doc.setFontSize(16);
    doc.text(`Report vozového parku – ${range.label}`, 14, 16);
    doc.setFont(font, "normal");
    doc.setFontSize(10);
    doc.text(`Období: ${range.from} – ${range.to}`, 14, 23);

    autoTable(doc, {
      startY: 30,
      styles: { font, fontSize: 9 },
      headStyles: { font, fontStyle: "bold" },
      head: [["Ukazatel", range.label, prevRange.label]],
      body: [
        ["Najeté km", num(current.km), num(previous?.km || 0)],
        ["Náklady PHM", czk(current.fuelCost), czk(previous?.fuelCost || 0)],
        ["Náklady servis", czk(current.serviceCost), czk(previous?.serviceCost || 0)],
        ["Náklady celkem", czk(current.totalCost), czk(previous?.totalCost || 0)],
        ["Náklad na km", current.costPerKm ? `${current.costPerKm.toFixed(2)} Kč` : "–", previous?.costPerKm ? `${previous.costPerKm.toFixed(2)} Kč` : "–"],
        ["Rezervací", String(current.reservations), String(previous?.reservations || 0)],
        ["Dny pracovní / soukromé", `${current.workDays} / ${current.privateDays}`, `${previous?.workDays || 0} / ${previous?.privateDays || 0}`],
      ],
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 8,
      styles: { font, fontSize: 8 },
      headStyles: { font, fontStyle: "bold" },
      head: [["Vozidlo", "Km", "Jízd", "PHM", "Servis", "Celkem", "Kč/km", "Rezervací", "Obsazenost"]],
      body: rows.map((s) => {
        const v = vehMap.get(s.vehicle_id);
        return [
          vehicleLabel(v),
          num(s.km),
          String(s.trips),
          czk(s.fuelCost),
          czk(s.serviceCost),
          czk(s.totalCost),
          s.costPerKm ? s.costPerKm.toFixed(2) : "–",
          String(s.reservations),
          s.utilization !== null ? `${s.utilization} %` : "–",
        ];
      }),
    });

    doc.save(`report-${range.label.replace(" ", "-")}.pdf`);
  };

  const Delta = ({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) => {
    const p = pctChange(cur, prev);
    if (p === null) return <span className="text-xs text-muted-foreground">nové</span>;
    const up = p > 0;
    const good = invert ? !up : up;
    if (Math.abs(p) < 0.5) return <span className="text-xs text-muted-foreground">beze změny</span>;
    return (
      <span className={`text-xs inline-flex items-center gap-0.5 ${good ? "text-success" : "text-destructive"}`}>
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(p).toFixed(0)} % vs {prevRange.label}
      </span>
    );
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kvartální report</h1>
          <p className="text-sm text-muted-foreground">Souhrn nákladů, nájezdu a vytížení vozového parku</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((q) => <SelectItem key={q} value={String(q)}>{`Q${q}`}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />CSV</Button>
          <Button size="sm" onClick={exportPdf}><FileText className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      </div>

      {loading || !current ? (
        <p className="text-sm text-muted-foreground">Načítám…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Route className="h-3.5 w-3.5" />Najeté km</div>
                <div className="mt-1 text-2xl font-bold">{num(current.km)}</div>
                <Delta cur={current.km} prev={previous?.km || 0} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><DollarSign className="h-3.5 w-3.5" />Náklady celkem</div>
                <div className="mt-1 text-2xl font-bold">{czk(current.totalCost)}</div>
                <Delta cur={current.totalCost} prev={previous?.totalCost || 0} invert />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Náklad na km</div>
                <div className="mt-1 text-2xl font-bold">{current.costPerKm ? `${current.costPerKm.toFixed(2)} Kč` : "–"}</div>
                <Delta cur={current.costPerKm || 0} prev={previous?.costPerKm || 0} invert />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarCheck className="h-3.5 w-3.5" />Rezervací</div>
                <div className="mt-1 text-2xl font-bold">{current.reservations}</div>
                <div className="text-xs text-muted-foreground">
                  {current.workDays} prac. / {current.privateDays} soukr. dní
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Náklady po měsících</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => czk(v)} />
                  <Legend />
                  <Bar dataKey="PHM" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Servis" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Podle vozidel</span>
                <Badge variant="secondary">{rows.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozidlo</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead className="text-right">Jízd</TableHead>
                    <TableHead className="text-right">PHM</TableHead>
                    <TableHead className="text-right">Servis</TableHead>
                    <TableHead className="text-right">Celkem</TableHead>
                    <TableHead className="text-right">Kč/km</TableHead>
                    <TableHead className="text-right">Obsazenost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Za období nejsou žádná data</TableCell></TableRow>
                  )}
                  {rows.map((s) => (
                    <TableRow key={s.vehicle_id}>
                      <TableCell className="font-medium">{vehicleLabel(vehMap.get(s.vehicle_id))}</TableCell>
                      <TableCell className="text-right">{num(s.km)}</TableCell>
                      <TableCell className="text-right">{s.trips}</TableCell>
                      <TableCell className="text-right">{czk(s.fuelCost)}</TableCell>
                      <TableCell className="text-right">{czk(s.serviceCost)}</TableCell>
                      <TableCell className="text-right font-semibold">{czk(s.totalCost)}</TableCell>
                      <TableCell className="text-right">{s.costPerKm ? s.costPerKm.toFixed(2) : "–"}</TableCell>
                      <TableCell className="text-right">{s.utilization !== null ? `${s.utilization} %` : "–"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
