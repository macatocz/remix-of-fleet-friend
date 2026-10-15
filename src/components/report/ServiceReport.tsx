import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Wrench } from "lucide-react";
import { toast } from "sonner";
import { vehicleLabel } from "@/lib/vehicleName";
import { exportTablePdf } from "@/lib/report/tablePdf";

const czk = (n: number) => `${Math.round(n).toLocaleString("cs-CZ")} Kč`;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function ServiceReport() {
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), 0, 1)));
  const [to, setTo] = useState(iso(now));
  const [vehicleId, setVehicleId] = useState("all");
  const [rows, setRows] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: sr, error }, { data: veh }] = await Promise.all([
        supabase.from("service_records").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }),
        supabase.from("vehicles").select("id, znacka, rz, nazev_vozu").order("znacka"),
      ]);
      if (error) toast.error("Nepodařilo se načíst servisy");
      setRows(sr || []);
      setVehicles(veh || []);
      setLoading(false);
    })();
  }, [from, to]);

  const vehMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const filtered = rows.filter((r) => vehicleId === "all" || r.vehicle_id === vehicleId);
  const total = filtered.reduce((a, r) => a + (Number(r.cost) || 0), 0);

  const ranking = useMemo(() => {
    const m = new Map<string, { cost: number; count: number }>();
    filtered.forEach((r) => {
      const e = m.get(r.vehicle_id) || { cost: 0, count: 0 };
      e.cost += Number(r.cost) || 0; e.count += 1;
      m.set(r.vehicle_id, e);
    });
    return [...m.entries()].map(([id, e]) => ({ id, ...e })).sort((a, b) => b.cost - a.cost);
  }, [filtered]);
  const max = ranking[0]?.cost || 1;

  const tableRows = () => filtered.map((r) => {
    const v = vehMap.get(r.vehicle_id);
    return [new Date(r.date + "T00:00:00").toLocaleDateString("cs-CZ"), vehicleLabel(v), v?.rz || "", r.type || "", r.status || "", (r.description || "").replace(/[;\n]/g, " "), Math.round(Number(r.cost) || 0)];
  });
  const head = ["Datum", "Vozidlo", "RZ", "Typ", "Stav", "Popis", "Cena Kč"];

  const exportCsv = () => {
    const csv = "\uFEFF" + [head.join(";"), ...tableRows().map((r) => r.join(";"))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `servisy-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => exportTablePdf({
    title: "Přehled servisů a nákladů na údržbu",
    subtitle: `Období: ${new Date(from).toLocaleDateString("cs-CZ")} – ${new Date(to).toLocaleDateString("cs-CZ")}`,
    summary: [`Počet servisů: ${filtered.length}`, `Náklady celkem: ${czk(total)}`],
    head, body: tableRows().map((r) => { r[6] = czk(Number(r[6])); return r; }),
    filename: `servisy-${from}-${to}.pdf`,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div><label className="text-xs text-muted-foreground">Od</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" /></div>
        <div><label className="text-xs text-muted-foreground">Do</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" /></div>
        <Select value={vehicleId} onValueChange={setVehicleId}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechna vozidla</SelectItem>
            {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{vehicleLabel(v)}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}><Download className="mr-2 h-4 w-4" />CSV</Button>
          <Button size="sm" onClick={exportPdf} disabled={!filtered.length}><FileText className="mr-2 h-4 w-4" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Servisů</div><div className="mt-1 text-2xl font-bold">{filtered.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Náklady celkem</div><div className="mt-1 text-2xl font-bold">{czk(total)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Průměr na servis</div><div className="mt-1 text-2xl font-bold">{filtered.length ? czk(total / filtered.length) : "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Nejdražší vůz</div><div className="mt-1 truncate text-lg font-bold">{ranking[0] ? vehicleLabel(vehMap.get(ranking[0].id)) : "—"}</div></CardContent></Card>
      </div>

      {ranking.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Náklady na údržbu podle vozidel</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {ranking.slice(0, 10).map((r, i) => (
              <div key={r.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{i + 1}. {vehicleLabel(vehMap.get(r.id))} <span className="text-muted-foreground">· {r.count}×</span></span>
                  <span className="tabular-nums font-semibold">{czk(r.cost)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted"><div className="stripe-primary h-2 rounded-full" style={{ width: `${(r.cost / max) * 100}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow>{head.map((h, i) => <TableHead key={h} className={i === 6 ? "text-right" : ""}>{h}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Načítám…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground"><Wrench className="mx-auto mb-1 h-5 w-5" />Za vybrané období žádné servisy</TableCell></TableRow>
              ) : filtered.map((r) => {
                const v = vehMap.get(r.vehicle_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">{new Date(r.date + "T00:00:00").toLocaleDateString("cs-CZ")}</TableCell>
                    <TableCell className="font-medium">{vehicleLabel(v)}</TableCell>
                    <TableCell>{v?.rz || "—"}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{r.description || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.cost ? czk(Number(r.cost)) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
