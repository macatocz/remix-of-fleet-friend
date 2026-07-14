import { useState, useEffect } from "react";
import { useSortableTable } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Loader2, Pencil, Trash2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import TripLogGeneratorDialog from "@/components/trip-log/TripLogGeneratorDialog";

interface TripLog {
  id: string;
  vehicle_id: string;
  driver_id: string | null;
  date: string;
  time: string | null;
  break_minutes: number | null;
  description: string | null;
  purpose: string | null;
  route_from: string | null;
  route_to: string | null;
  km_start: number | null;
  km_end: number | null;
  km_total: number | null;
  fuel_quantity: number | null;
  fuel_price: number | null;
  other_quantity: number | null;
  other_price: number | null;
}

interface Props {
  vehicleId?: string;
  readOnly?: boolean;
}

const emptyForm = {
  vehicle_id: "",
  driver_id: "",
  date: new Date().toISOString().split("T")[0],
  time: "",
  break_minutes: "",
  description: "",
  purpose: "",
  route_from: "",
  route_to: "",
  km_start: "",
  km_end: "",
  fuel_quantity: "",
  fuel_price: "",
  other_quantity: "",
  other_price: "",
};

export default function VehicleTripLog({ vehicleId, readOnly = false }: Props) {
  const { sortKey, sortDirection, handleSort, sortData } = useSortableTable("date");
  const [logs, setLogs] = useState<TripLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [vehicles, setVehicles] = useState<{ id: string; znacka: string; rz: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    let q = supabase
      .from("trip_logs")
      .select("*, vehicles(znacka, rz)")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });
    if (vehicleId) q = q.eq("vehicle_id", vehicleId);
    else if (filterVehicle !== "all") q = q.eq("vehicle_id", filterVehicle);
    const { data, error } = await q;
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    setLogs((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [vehicleId, selectedMonth, filterVehicle]);

  useEffect(() => {
    if (!vehicleId) {
      supabase.from("vehicles").select("id, znacka, rz").eq("status", "aktivní")
        .then(({ data }) => setVehicles((data as any[]) || []));
    }
    supabase.from("drivers").select("id, first_name, last_name").eq("status", "aktivní")
      .then(({ data }) => setDrivers((data as any[]) || []));
  }, [vehicleId]);

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyForm, vehicle_id: vehicleId || "" });
    setOpen(true);
  };

  const openEdit = (log: TripLog) => {
    setEditId(log.id);
    setForm({
      vehicle_id: log.vehicle_id,
      driver_id: log.driver_id || "",
      date: log.date,
      time: log.time || "",
      break_minutes: log.break_minutes?.toString() || "",
      description: log.description || "",
      purpose: log.purpose || "",
      route_from: log.route_from || "",
      route_to: log.route_to || "",
      km_start: log.km_start?.toString() || "",
      km_end: log.km_end?.toString() || "",
      fuel_quantity: log.fuel_quantity?.toString() || "",
      fuel_price: log.fuel_price?.toString() || "",
      other_quantity: log.other_quantity?.toString() || "",
      other_price: log.other_price?.toString() || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const vid = vehicleId || form.vehicle_id;
    if (!vid || !form.date) {
      toast({ title: "Vyplňte vozidlo a datum", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      vehicle_id: vid,
      driver_id: form.driver_id || null,
      date: form.date,
      time: form.time || null,
      break_minutes: form.break_minutes ? parseInt(form.break_minutes) : 0,
      description: form.description || null,
      purpose: form.purpose || null,
      route_from: form.route_from || null,
      route_to: form.route_to || null,
      km_start: form.km_start ? parseInt(form.km_start) : null,
      km_end: form.km_end ? parseInt(form.km_end) : null,
      fuel_quantity: form.fuel_quantity ? parseFloat(form.fuel_quantity) : null,
      fuel_price: form.fuel_price ? parseFloat(form.fuel_price) : null,
      other_quantity: form.other_quantity ? parseFloat(form.other_quantity) : null,
      other_price: form.other_price ? parseFloat(form.other_price) : null,
    };

    const { error } = editId
      ? await supabase.from("trip_logs").update(payload).eq("id", editId)
      : await supabase.from("trip_logs").insert(payload);

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Záznam upraven" : "Záznam přidán" });
      setOpen(false);
      fetchLogs();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("trip_logs").delete().eq("id", id);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else { toast({ title: "Záznam smazán" }); fetchLogs(); }
  };

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const exportCsv = () => {
    const header = ["Datum","Čas","Vozidlo","RZ","Popis","Účel","Z","Do","Poč. km","Kon. km","Km","PHM (l)","PHM (Kč)","Ostatní (Kč)"];
    const rows = logs.map((l: any) => [
      l.date,
      l.time?.slice(0, 5) || "",
      l.vehicles?.znacka || "",
      l.vehicles?.rz || "",
      l.description || "",
      l.purpose || "",
      l.route_from || "",
      l.route_to || "",
      l.km_start ?? "",
      l.km_end ?? "",
      l.km_total ?? "",
      l.fuel_quantity ?? "",
      l.fuel_price ?? "",
      l.other_price ?? "",
    ]);
    const esc = (v: any) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [header, ...rows].map(r => r.map(esc).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kniha-jizd-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-sm">Měsíc:</Label>
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-44 h-8" />
          {readOnly && !vehicleId && (
            <>
              <Label className="text-sm ml-2">Vozidlo:</Label>
              <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                <SelectTrigger className="w-56 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechna vozidla</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.znacka} ({v.rz})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        {readOnly ? (
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={logs.length === 0}>
            <Download className="mr-2 h-4 w-4" />Export CSV
          </Button>
        ) : (
        <div className="flex items-center gap-2">
          {vehicleId && (
            <Button size="sm" variant="outline" onClick={() => setGenOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />Vygenerovat měsíc
            </Button>
          )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nový záznam</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "Upravit jízdu" : "Nová jízda"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {!vehicleId && (
                  <div>
                    <Label className="text-xs">Vozidlo *</Label>
                    <Select value={form.vehicle_id} onValueChange={v => f("vehicle_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.znacka} ({v.rz})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Řidič</Label>
                  <Select value={form.driver_id} onValueChange={v => f("driver_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Vyberte řidiče" /></SelectTrigger>
                    <SelectContent>
                      {drivers.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs">Datum *</Label><Input type="date" value={form.date} onChange={e => f("date", e.target.value)} /></div>
                <div><Label className="text-xs">Čas</Label><Input type="time" value={form.time} onChange={e => f("time", e.target.value)} /></div>
                <div><Label className="text-xs">Přestávka (min)</Label><Input type="number" value={form.break_minutes} onChange={e => f("break_minutes", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Popis</Label><Input value={form.description} onChange={e => f("description", e.target.value)} /></div>
                <div><Label className="text-xs">Účel</Label><Input value={form.purpose} onChange={e => f("purpose", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Z (odkud)</Label><Input value={form.route_from} onChange={e => f("route_from", e.target.value)} /></div>
                <div><Label className="text-xs">Do (kam)</Label><Input value={form.route_to} onChange={e => f("route_to", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Počáteční km</Label><Input type="number" value={form.km_start} onChange={e => f("km_start", e.target.value)} /></div>
                <div><Label className="text-xs">Konečný km</Label><Input type="number" value={form.km_end} onChange={e => f("km_end", e.target.value)} /></div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Pohonné hmoty</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Množství (l)</Label><Input type="number" step="0.0001" value={form.fuel_quantity} onChange={e => f("fuel_quantity", e.target.value)} /></div>
                  <div><Label className="text-xs">Cena (Kč)</Label><Input type="number" step="0.01" value={form.fuel_price} onChange={e => f("fuel_price", e.target.value)} /></div>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Ostatní náklady</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-xs">Množství</Label><Input type="number" step="0.0001" value={form.other_quantity} onChange={e => f("other_quantity", e.target.value)} /></div>
                  <div><Label className="text-xs">Cena (Kč)</Label><Input type="number" step="0.01" value={form.other_price} onChange={e => f("other_price", e.target.value)} /></div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Zrušit</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editId ? "Uložit" : "Přidat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
        )}
      </div>
      {vehicleId && (
        <TripLogGeneratorDialog
          open={genOpen}
          onOpenChange={setGenOpen}
          vehicleId={vehicleId}
          month={selectedMonth}
          onSaved={fetchLogs}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="date" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>Datum</SortableTableHead>
                <SortableTableHead sortKey="time" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>Čas</SortableTableHead>
                <SortableTableHead sortKey="break_minutes" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>Přestávka</SortableTableHead>
                {!vehicleId && <SortableTableHead sortKey="vehicle" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>Vozidlo</SortableTableHead>}
                <TableHead>Popis</TableHead>
                <TableHead>Účel</TableHead>
                <TableHead>Z – do</TableHead>
                <SortableTableHead sortKey="km_start" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="text-right">Poč. km</SortableTableHead>
                <SortableTableHead sortKey="km_end" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="text-right">Kon. km</SortableTableHead>
                <SortableTableHead sortKey="km_total" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="text-right">Km</SortableTableHead>
                <SortableTableHead sortKey="fuel_quantity" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="text-right">PHM (l)</SortableTableHead>
                <SortableTableHead sortKey="fuel_price" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="text-right">PHM (Kč)</SortableTableHead>
                <SortableTableHead sortKey="other_price" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="text-right">Ost. (Kč)</SortableTableHead>
                {!readOnly && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={(vehicleId ? 13 : 14) - (readOnly ? 1 : 0)} className="text-center text-muted-foreground py-8">Žádné záznamy v tomto měsíci</TableCell></TableRow>
              ) : sortData(logs, (item: any, key: string) => {
                if (key === "vehicle") return (item as any).vehicles?.znacka || "";
                return item[key];
              }).map(log => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">{new Date(log.date).toLocaleDateString("cs-CZ")}</TableCell>
                  <TableCell>{log.time?.slice(0, 5) || "—"}</TableCell>
                  <TableCell>{log.break_minutes ? `${log.break_minutes} min` : "—"}</TableCell>
                  {!vehicleId && <TableCell className="whitespace-nowrap">{(log as any).vehicles ? `${(log as any).vehicles.znacka} (${(log as any).vehicles.rz})` : "—"}</TableCell>}
                  <TableCell>{log.description || "—"}</TableCell>
                  <TableCell>{log.purpose || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{log.route_from && log.route_to ? `${log.route_from} → ${log.route_to}` : log.route_from || log.route_to || "—"}</TableCell>
                  <TableCell className="text-right">{log.km_start?.toLocaleString("cs-CZ") || "—"}</TableCell>
                  <TableCell className="text-right">{log.km_end?.toLocaleString("cs-CZ") || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{log.km_total?.toLocaleString("cs-CZ") || "—"}</TableCell>
                  <TableCell className="text-right">{log.fuel_quantity ? Number(log.fuel_quantity).toLocaleString("cs-CZ", { minimumFractionDigits: 2 }) : "—"}</TableCell>
                  <TableCell className="text-right">{log.fuel_price ? `${Number(log.fuel_price).toLocaleString("cs-CZ")} Kč` : "—"}</TableCell>
                  <TableCell className="text-right">{log.other_price ? `${Number(log.other_price).toLocaleString("cs-CZ")} Kč` : "—"}</TableCell>
                  {!readOnly && <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(log)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(log.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
