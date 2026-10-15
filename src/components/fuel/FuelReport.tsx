import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Receipt, Fuel, FileText } from "lucide-react";
import { toast } from "sonner";
import { vehicleLabel } from "@/lib/vehicleName";
import { exportTablePdf } from "@/lib/report/tablePdf";

const fmt = (n: number, d = 0) => n.toLocaleString("cs-CZ", { maximumFractionDigits: d });
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function FuelReport() {
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(iso(now));
  const [vehicleId, setVehicleId] = useState("all");
  const [driverId, setDriverId] = useState("all");
  const [rows, setRows] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: fr, error }, { data: veh }, { data: drv }] = await Promise.all([
        supabase.from("fuel_records").select("*")
          .gte("fueled_at", `${from}T00:00:00`).lte("fueled_at", `${to}T23:59:59`)
          .order("fueled_at", { ascending: false }),
        supabase.from("vehicles").select("id, znacka, rz, nazev_vozu").order("znacka"),
        supabase.from("drivers").select("id, first_name, last_name").order("last_name"),
      ]);
      if (error) toast.error("Nepodařilo se načíst tankování");
      const list = fr || [];
      setRows(list);
      setVehicles(veh || []);
      setDrivers(drv || []);
      const ids = list.map((r) => r.document_id).filter(Boolean) as string[];
      if (ids.length) {
        const { data: d } = await supabase.from("vehicle_documents").select("id, file_path").in("id", ids);
        setDocs(Object.fromEntries((d || []).map((x) => [x.id, x.file_path])));
      } else setDocs({});
      setLoading(false);
    })();
  }, [from, to]);

  const vehMap = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const drvMap = useMemo(() => new Map(drivers.map((d) => [d.id, `${d.first_name} ${d.last_name}`])), [drivers]);

  const filtered = rows.filter((r) =>
    (vehicleId === "all" || r.vehicle_id === vehicleId) && (driverId === "all" || r.driver_id === driverId));

  const totals = filtered.reduce(
    (a, r) => ({ liters: a.liters + Number(r.liters || 0), price: a.price + Number(r.total_price || 0), missing: a.missing + (r.document_id ? 0 : 1) }),
    { liters: 0, price: 0, missing: 0 });

  const openReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from("vehicle-documents").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Účtenku se nepodařilo otevřít"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const exportCsv = () => {
    const header = ["Datum", "Čas", "Vozidlo", "RZ", "Řidič", "Místo", "Litry", "Cena Kč", "Tachometr", "Účtenka", "Poznámka"];
    const lines = filtered.map((r) => {
      const d = new Date(r.fueled_at);
      const v = vehMap.get(r.vehicle_id);
      return [
        d.toLocaleDateString("cs-CZ"), d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
        vehicleLabel(v), v?.rz || "", drvMap.get(r.driver_id) || "", r.location || "",
        r.liters ?? "", r.total_price ?? "", r.km ?? "", r.document_id ? "ano" : "ne", (r.note || "").replace(/[;\n]/g, " "),
      ].map(String).join(";");
    });
    const csv = "\uFEFF" + [header.join(";"), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `tankovani-${from}-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => exportTablePdf({
    title: "Přehled tankování",
    subtitle: `Období: ${new Date(from).toLocaleDateString("cs-CZ")} – ${new Date(to).toLocaleDateString("cs-CZ")}`,
    summary: [`Tankování: ${filtered.length}`, `Litrů celkem: ${fmt(totals.liters, 1)} l`, `Cena celkem: ${fmt(totals.price)} Kč`, `Bez účtenky: ${totals.missing}`],
    head: ["Datum a čas", "Vozidlo", "RZ", "Řidič", "Místo", "Litry", "Cena Kč", "Tachometr", "Účtenka"],
    body: filtered.map((r) => {
      const v = vehMap.get(r.vehicle_id);
      return [
        new Date(r.fueled_at).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" }),
        vehicleLabel(v), v?.rz || "", drvMap.get(r.driver_id) || "", r.location || "",
        r.liters ? fmt(Number(r.liters), 2) : "", r.total_price ? fmt(Number(r.total_price), 2) : "",
        r.km ? fmt(r.km) : "", r.document_id ? "ano" : "ne",
      ];
    }),
    filename: `tankovani-${from}-${to}.pdf`,
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
        <Select value={driverId} onValueChange={setDriverId}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všichni řidiči</SelectItem>
            {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="ml-auto" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="mr-2 h-4 w-4" />CSV
        </Button>
        <Button size="sm" onClick={exportPdf} disabled={!filtered.length}>
          <FileText className="mr-2 h-4 w-4" />PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tankování</div><div className="mt-1 text-2xl font-bold">{filtered.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Litrů celkem</div><div className="mt-1 text-2xl font-bold">{fmt(totals.liters, 1)} l</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Cena celkem</div><div className="mt-1 text-2xl font-bold">{fmt(totals.price)} Kč</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Bez účtenky</div><div className={`mt-1 text-2xl font-bold ${totals.missing ? "text-destructive" : ""}`}>{totals.missing}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum a čas</TableHead>
                <TableHead>Vozidlo</TableHead>
                <TableHead>Řidič</TableHead>
                <TableHead>Místo</TableHead>
                <TableHead className="text-right">Litry</TableHead>
                <TableHead className="text-right">Cena</TableHead>
                <TableHead className="text-right">Tachometr</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Načítám…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">
                  <Fuel className="mx-auto mb-1 h-5 w-5" />Za vybrané období žádné tankování
                </TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap tabular-nums">{new Date(r.fueled_at).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                  <TableCell className="font-medium">{vehicleLabel(vehMap.get(r.vehicle_id))}</TableCell>
                  <TableCell>{drvMap.get(r.driver_id) || "—"}</TableCell>
                  <TableCell>{r.location || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.liters ? `${fmt(Number(r.liters), 2)} l` : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.total_price ? `${fmt(Number(r.total_price), 2)} Kč` : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.km ? `${fmt(r.km)} km` : "—"}</TableCell>
                  <TableCell className="text-right">
                    {r.document_id && docs[r.document_id] ? (
                      <Button size="sm" variant="outline" className="h-8" onClick={() => openReceipt(docs[r.document_id])}>
                        <Receipt className="mr-1 h-3.5 w-3.5" />Účtenka
                      </Button>
                    ) : <span className="text-xs text-destructive">chybí</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
