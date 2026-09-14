import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Search, Plus, ChevronRight, MapPin, CalendarDays } from "lucide-react";
import { vehicleLabel } from "@/lib/vehicleName";
import { localDateStr } from "@/lib/utils";

interface Row {
  id: string;
  vehicle_id: string;
  date: string;
  location: string | null;
  description: string | null;
  estimated_cost: number | null;
  status: string;
  vehicles?: { znacka: string | null; rz: string | null; nazev_vozu?: string | null };
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  nahlaseno: { label: "Nahlášeno", className: "bg-warning/15 text-warning border-warning/30" },
  v_reseni: { label: "V řešení", className: "bg-primary/15 text-primary border-primary/30" },
  uzavreno: { label: "Uzavřeno", className: "bg-muted text-muted-foreground border-border" },
};

export default function MobileIncidents() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    vehicle_id: "",
    date: localDateStr(),
    location: "",
    description: "",
    estimated_cost: "",
    status: "nahlaseno",
  };
  const [form, setForm] = useState(emptyForm);

  const fetchRows = async () => {
    const { data } = await supabase
      .from("incidents")
      .select("*, vehicles(znacka, rz, nazev_vozu)")
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
    if (search) {
      const s = search.toLowerCase();
      if (
        !(r.location || "").toLowerCase().includes(s) &&
        !(r.description || "").toLowerCase().includes(s) &&
        !(`${r.vehicles?.nazev_vozu || ""} ${r.vehicles?.znacka || ""}`).toLowerCase().includes(s) &&
        !(r.vehicles?.rz || "").toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  const totalCost = filtered.reduce((s, r) => s + Number(r.estimated_cost || 0), 0);
  const openCount = rows.filter((r) => r.status !== "uzavreno").length;

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <span className="truncate">Škody</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Nehody a pojistné události</p>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nová
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 min-w-0">
          <div className="text-[11px] text-muted-foreground truncate">Celkem</div>
          <div className="text-lg font-bold">{rows.length}</div>
        </Card>
        <Card className="p-3 min-w-0">
          <div className="text-[11px] text-muted-foreground truncate">Otevřené</div>
          <div className="text-lg font-bold text-warning">{openCount}</div>
        </Card>
        <Card className="p-3 min-w-0">
          <div className="text-[11px] text-muted-foreground truncate">Náklady</div>
          <div className="text-sm font-bold truncate">{totalCost.toLocaleString("cs-CZ")} Kč</div>
        </Card>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Hledat..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            <SelectItem value="nahlaseno">Nahlášeno</SelectItem>
            <SelectItem value="v_reseni">V řešení</SelectItem>
            <SelectItem value="uzavreno">Uzavřeno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Žádné záznamy.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const sl = STATUS_LABEL[r.status] || { label: r.status, className: "bg-muted text-muted-foreground border-border" };
            return (
              <Card
                key={r.id}
                className="p-3 min-w-0 active:bg-accent/40 transition-colors"
                onClick={() => navigate(`/m/skody/${r.id}`)}
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm break-words">{vehicleLabel(r.vehicles)}</div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(r.date).toLocaleDateString("cs-CZ")}
                      </span>
                      {r.location && (
                        <span className="inline-flex items-center gap-1 min-w-0">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{r.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>

                {r.description && (
                  <p className="text-xs text-muted-foreground mt-2 break-words line-clamp-3">{r.description}</p>
                )}

                <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className={sl.className}>{sl.label}</Badge>
                  <span className="text-sm font-semibold">
                    {r.estimated_cost ? `${Number(r.estimated_cost).toLocaleString("cs-CZ")} Kč` : "—"}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-lg">
          <DialogHeader>
            <DialogTitle>Nová škoda</DialogTitle>
            <DialogDescription>Zaznamenejte novou škodní událost.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div>
              <Label>Vozidlo *</Label>
              <Select value={form.vehicle_id} onValueChange={(v) => setForm((p) => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{vehicleLabel(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <Label>Odhad nákladů (Kč)</Label>
              <Input type="number" inputMode="numeric" value={form.estimated_cost} onChange={(e) => setForm((p) => ({ ...p, estimated_cost: e.target.value }))} />
            </div>
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
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button className="flex-1" onClick={saveIncident} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}