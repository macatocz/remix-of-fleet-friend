import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Search, Plus } from "lucide-react";
import { vehicleLabel } from "@/lib/vehicleName";
import ReporterSelect, { reporterName, useActiveDrivers } from "@/components/incidents/ReporterSelect";

interface Row {
  id: string;
  vehicle_id: string;
  date: string;
  location: string | null;
  description: string | null;
  estimated_cost: number | null;
  status: string;
  driver_id?: string | null;
  drivers?: { first_name: string; last_name: string } | null;
  vehicles?: { znacka: string | null; rz: string | null; nazev_vozu?: string | null };
}

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  nahlaseno: { label: "Nahlášeno", variant: "default" },
  v_reseni: { label: "V řešení", variant: "secondary" },
  uzavreno: { label: "Uzavřeno", variant: "outline" },
};

export default function Incidents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const drivers = useActiveDrivers();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    vehicle_id: "",
    date: new Date().toISOString().slice(0, 10),
    location: "",
    description: "",
    estimated_cost: "",
    status: "nahlaseno",
    driver_id: "",
  };
  const [form, setForm] = useState(emptyForm);

  const fetchRows = async () => {
    const { data } = await supabase
      .from("incidents")
      .select("*, vehicles(znacka, rz, nazev_vozu), drivers(first_name, last_name)")
      .order("date", { ascending: false });
    setRows((data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    supabase
      .from("vehicles")
      .select("id, znacka, rz, nazev_vozu")
      .eq("status", "aktivní")
      .order("nazev_vozu")
      .then(({ data }) => setVehicles(data || []));
  }, []);

  const saveIncident = async () => {
    if (!form.vehicle_id || !form.date) {
      toast.error("Vyberte vozidlo a datum");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("incidents").insert({
      vehicle_id: form.vehicle_id,
      date: form.date,
      location: form.location || null,
      description: form.description || null,
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
      status: form.status,
      driver_id: form.driver_id || null,
    });
    setSaving(false);
    if (error) { toast.error("Chyba: " + error.message); return; }
    toast.success("Škoda zaznamenána");
    setForm(emptyForm);
    setDialogOpen(false);
    fetchRows();
  };

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (driverFilter === "none" && r.driver_id) return false;
    if (driverFilter !== "all" && driverFilter !== "none" && r.driver_id !== driverFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !(r.location || "").toLowerCase().includes(s) &&
        !(r.description || "").toLowerCase().includes(s) &&
        !(`${r.vehicles?.nazev_vozu || ""} ${r.vehicles?.znacka || ""}`).toLowerCase().includes(s) &&
        !(r.vehicles?.rz || "").toLowerCase().includes(s) &&
        !(r.drivers ? reporterName(r.drivers) : "").toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  const totalCost = filtered.reduce((s, r) => s + Number(r.estimated_cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-6 w-6 text-warning mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Škody a pojistné události</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Evidence nehod a pojistných událostí včetně fotodokumentace.
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nová škoda
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nová škoda</DialogTitle>
            <DialogDescription>Zaznamenejte novou škodní / pojistnou událost.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Vozidlo *</Label>
              <Select value={form.vehicle_id} onValueChange={(v) => setForm((p) => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {vehicleLabel(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Datum *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <Label>Odhad nákladů (Kč)</Label>
                <Input type="number" value={form.estimated_cost} onChange={(e) => setForm((p) => ({ ...p, estimated_cost: e.target.value }))} />
              </div>
            </div>
            <ReporterSelect value={form.driver_id} onChange={(v) => setForm((p) => ({ ...p, driver_id: v }))} />
            <div>
              <Label>Místo</Label>
              <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Praha, parkoviště…" />
            </div>
            <div>
              <Label>Popis</Label>
              <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Stav</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nahlaseno">Nahlášeno</SelectItem>
                  <SelectItem value="v_reseni">V řešení</SelectItem>
                  <SelectItem value="uzavreno">Uzavřeno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={saveIncident} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Celkem záznamů</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{rows.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Otevřené</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.filter((r) => r.status !== "uzavreno").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Odhadované náklady (filtr)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCost.toLocaleString("cs-CZ")} Kč</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Hledat..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="nahlaseno">Nahlášeno</SelectItem>
                <SelectItem value="v_reseni">V řešení</SelectItem>
                <SelectItem value="uzavreno">Uzavřeno</SelectItem>
              </SelectContent>
            </Select>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všichni řidiči</SelectItem>
                <SelectItem value="none">Neuvedeno</SelectItem>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{reporterName(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Žádné záznamy.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Vozidlo</TableHead>
                  <TableHead>Nahlásil</TableHead>
                  <TableHead>Místo</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Odhad (Kč)</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const sl = STATUS_LABEL[r.status] || { label: r.status, variant: "outline" };
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.date).toLocaleDateString("cs-CZ")}</TableCell>
                      <TableCell className="font-medium">{vehicleLabel(r.vehicles)}</TableCell>
                      <TableCell>{reporterName(r.drivers)}</TableCell>
                      <TableCell>{r.location || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{r.description || "—"}</TableCell>
                      <TableCell>{r.estimated_cost ? Number(r.estimated_cost).toLocaleString("cs-CZ") : "—"}</TableCell>
                      <TableCell><Badge variant={sl.variant}>{sl.label}</Badge></TableCell>
                      <TableCell>
                        <Link to={`/vozidla/${r.vehicle_id}`}>
                          <Button size="sm" variant="outline">Detail vozidla</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
