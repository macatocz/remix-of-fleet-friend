import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Wrench, Shield, FileCheck, Loader2, Search, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { vehicleLabel } from "@/lib/vehicleName";

const czk = (n: any) => (n || n === 0 ? `${Number(n).toLocaleString("cs-CZ")} Kč` : "—");
const d = (s?: string | null) => (s ? new Date(s).toLocaleDateString("cs-CZ") : "—");

export default function MobileService() {
  const [activeTab, setActiveTab] = useState<"service" | "inspection" | "insurance">("service");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [serviceRecords, setServiceRecords] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [serviceForm, setServiceForm] = useState({ vehicle_id: "", type: "", date: new Date().toISOString().split("T")[0], cost: "", description: "", status: "dokončeno" });
  const [inspectionForm, setInspectionForm] = useState({ vehicle_id: "", type: "STK", date: "", valid_until: "", result: "platná", notes: "" });
  const [insuranceForm, setInsuranceForm] = useState({ vehicle_id: "", insurer: "", type: "POV", policy_number: "", valid_from: "", valid_until: "", annual_cost: "", notes: "" });

  const fetchData = async () => {
    setLoading(true);
    const [vRes, sRes, iRes, insRes] = await Promise.all([
      supabase.from("vehicles").select("id, znacka, rz, nazev_vozu").order("znacka"),
      supabase.from("service_records").select("*, vehicles(znacka, rz, nazev_vozu)").order("date", { ascending: false }),
      supabase.from("inspections").select("*, vehicles(znacka, rz, nazev_vozu)").order("valid_until", { ascending: true }),
      supabase.from("insurance").select("*, vehicles(znacka, rz, nazev_vozu)").order("valid_until", { ascending: true }),
    ]);
    setVehicles(vRes.data || []);
    setServiceRecords(sRes.data || []);
    setInspections(iRes.data || []);
    setInsurances(insRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const matches = (r: any, extra: string[]) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return [vehicleLabel(r.vehicles), ...extra].some((v) => (v || "").toLowerCase().includes(s));
  };

  const fService = useMemo(() => serviceRecords.filter((r) => matches(r, [r.type, r.description, r.status])), [serviceRecords, search]);
  const fInspections = useMemo(() => inspections.filter((r) => matches(r, [r.type, r.result, r.notes])), [inspections, search]);
  const fInsurances = useMemo(() => insurances.filter((r) => matches(r, [r.insurer, r.type, r.policy_number])), [insurances, search]);

  const validityBadge = (validUntil: string) => {
    const days = Math.round((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <Badge variant="destructive">Expirováno</Badge>;
    if (days < 30) return <Badge className="bg-destructive/80 text-destructive-foreground">Kritické</Badge>;
    if (days < 90) return <Badge className="bg-warning text-warning-foreground">Brzy expiruje</Badge>;
    return <Badge className="bg-success text-success-foreground">Platná</Badge>;
  };

  const openCreate = () => {
    if (activeTab === "service") setServiceForm({ vehicle_id: "", type: "", date: new Date().toISOString().split("T")[0], cost: "", description: "", status: "dokončeno" });
    if (activeTab === "inspection") setInspectionForm({ vehicle_id: "", type: "STK", date: "", valid_until: "", result: "platná", notes: "" });
    if (activeTab === "insurance") setInsuranceForm({ vehicle_id: "", insurer: "", type: "POV", policy_number: "", valid_from: "", valid_until: "", annual_cost: "", notes: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let error: any = null;

    if (activeTab === "service") {
      if (!serviceForm.vehicle_id || !serviceForm.type || !serviceForm.date) {
        toast({ title: "Vyplňte povinná pole", variant: "destructive" }); setSaving(false); return;
      }
      ({ error } = await supabase.from("service_records").insert([{
        vehicle_id: serviceForm.vehicle_id, type: serviceForm.type, date: serviceForm.date,
        cost: serviceForm.cost ? Number(serviceForm.cost) : 0,
        description: serviceForm.description || null, status: serviceForm.status,
      }]));
    }

    if (activeTab === "inspection") {
      if (!inspectionForm.vehicle_id || !inspectionForm.date || !inspectionForm.valid_until) {
        toast({ title: "Vyplňte povinná pole", variant: "destructive" }); setSaving(false); return;
      }
      ({ error } = await supabase.from("inspections").insert([{
        vehicle_id: inspectionForm.vehicle_id, type: inspectionForm.type, date: inspectionForm.date,
        valid_until: inspectionForm.valid_until, result: inspectionForm.result, notes: inspectionForm.notes || null,
      }]));
    }

    if (activeTab === "insurance") {
      if (!insuranceForm.vehicle_id || !insuranceForm.insurer || !insuranceForm.valid_until) {
        toast({ title: "Vyplňte povinná pole", variant: "destructive" }); setSaving(false); return;
      }
      ({ error } = await supabase.from("insurance").insert([{
        vehicle_id: insuranceForm.vehicle_id, insurer: insuranceForm.insurer, type: insuranceForm.type,
        policy_number: insuranceForm.policy_number || null, valid_from: insuranceForm.valid_from || null,
        valid_until: insuranceForm.valid_until,
        annual_cost: insuranceForm.annual_cost ? Number(insuranceForm.annual_cost) : null,
        notes: insuranceForm.notes || null,
      }]));
    }

    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Záznam přidán" });
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const VehicleSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <Label>Vozidlo *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
        <SelectContent>
          {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{vehicleLabel(v)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const Empty = ({ text }: { text: string }) => (
    <div className="text-center py-12 text-sm text-muted-foreground">{text}</div>
  );

  const Loading = () => (
    <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
  );

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">Servis a údržba</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Servis, STK a pojištění</p>
        </div>
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Nový
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Hledat..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="-mx-4 px-4 overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="service" className="gap-1.5 text-xs"><Wrench className="h-3.5 w-3.5" />Servis ({serviceRecords.length})</TabsTrigger>
            <TabsTrigger value="inspection" className="gap-1.5 text-xs"><FileCheck className="h-3.5 w-3.5" />STK ({inspections.length})</TabsTrigger>
            <TabsTrigger value="insurance" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" />Pojištění ({insurances.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="service" className="mt-3 space-y-2">
          {loading ? <Loading /> : fService.length === 0 ? <Empty text="Žádné servisní záznamy." /> : fService.map((r) => (
            <Card key={r.id} className="p-3 min-w-0">
              <div className="font-medium text-sm break-words">{vehicleLabel(r.vehicles)}</div>
              <div className="text-xs text-muted-foreground mt-1 break-words">{r.type}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{d(r.date)}</span>
              </div>
              {r.description && <p className="text-xs text-muted-foreground mt-2 break-words line-clamp-3">{r.description}</p>}
              <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                <Badge variant="outline">{r.status}</Badge>
                <span className="text-sm font-semibold">{czk(r.cost)}</span>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="inspection" className="mt-3 space-y-2">
          {loading ? <Loading /> : fInspections.length === 0 ? <Empty text="Žádné STK záznamy." /> : fInspections.map((r) => (
            <Card key={r.id} className="p-3 min-w-0">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="font-medium text-sm break-words">{vehicleLabel(r.vehicles)}</div>
                  <div className="text-xs text-muted-foreground mt-1 break-words">{r.type} · {r.result || "—"}</div>
                </div>
                <div className="shrink-0">{validityBadge(r.valid_until)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="min-w-0">
                  <div className="text-muted-foreground">Provedeno</div>
                  <div className="font-medium">{d(r.date)}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground">Platnost do</div>
                  <div className="font-medium">{d(r.valid_until)}</div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="insurance" className="mt-3 space-y-2">
          {loading ? <Loading /> : fInsurances.length === 0 ? <Empty text="Žádná pojištění." /> : fInsurances.map((r) => (
            <Card key={r.id} className="p-3 min-w-0">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="font-medium text-sm break-words">{vehicleLabel(r.vehicles)}</div>
                  <div className="text-xs text-muted-foreground mt-1 break-words">{r.insurer} · {r.type}</div>
                </div>
                <div className="shrink-0">{validityBadge(r.valid_until)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div className="min-w-0">
                  <div className="text-muted-foreground">Č. smlouvy</div>
                  <div className="font-medium break-words">{r.policy_number || "—"}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-muted-foreground">Platnost do</div>
                  <div className="font-medium">{d(r.valid_until)}</div>
                </div>
              </div>
              <div className="text-sm font-semibold mt-2">{czk(r.annual_cost)}<span className="text-xs font-normal text-muted-foreground"> / rok</span></div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nový {activeTab === "service" ? "servisní záznam" : activeTab === "inspection" ? "STK záznam" : "pojištění"}
            </DialogTitle>
            <DialogDescription>Vyplňte údaje záznamu.</DialogDescription>
          </DialogHeader>

          {activeTab === "service" && (
            <div className="grid gap-3">
              <VehicleSelect value={serviceForm.vehicle_id} onChange={(v) => setServiceForm((p) => ({ ...p, vehicle_id: v }))} />
              <div><Label>Typ servisu *</Label><Input value={serviceForm.type} onChange={(e) => setServiceForm((p) => ({ ...p, type: e.target.value }))} placeholder="Výměna oleje" /></div>
              <div><Label>Datum *</Label><Input type="date" value={serviceForm.date} onChange={(e) => setServiceForm((p) => ({ ...p, date: e.target.value }))} /></div>
              <div><Label>Náklady (Kč)</Label><Input type="number" inputMode="numeric" value={serviceForm.cost} onChange={(e) => setServiceForm((p) => ({ ...p, cost: e.target.value }))} /></div>
              <div>
                <Label>Stav</Label>
                <Select value={serviceForm.status} onValueChange={(v) => setServiceForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dokončeno">Dokončeno</SelectItem>
                    <SelectItem value="plánováno">Plánováno</SelectItem>
                    <SelectItem value="probíhá">Probíhá</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Popis</Label><Textarea rows={3} value={serviceForm.description} onChange={(e) => setServiceForm((p) => ({ ...p, description: e.target.value }))} /></div>
            </div>
          )}

          {activeTab === "inspection" && (
            <div className="grid gap-3">
              <VehicleSelect value={inspectionForm.vehicle_id} onChange={(v) => setInspectionForm((p) => ({ ...p, vehicle_id: v }))} />
              <div>
                <Label>Typ *</Label>
                <Select value={inspectionForm.type} onValueChange={(v) => setInspectionForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STK">STK</SelectItem>
                    <SelectItem value="Emise">Emise</SelectItem>
                    <SelectItem value="STK + Emise">STK + Emise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Výsledek</Label>
                <Select value={inspectionForm.result} onValueChange={(v) => setInspectionForm((p) => ({ ...p, result: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platná">Platná</SelectItem>
                    <SelectItem value="podmíněně platná">Podmíněně platná</SelectItem>
                    <SelectItem value="neplatná">Neplatná</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Datum provedení *</Label><Input type="date" value={inspectionForm.date} onChange={(e) => setInspectionForm((p) => ({ ...p, date: e.target.value }))} /></div>
              <div><Label>Platnost do *</Label><Input type="date" value={inspectionForm.valid_until} onChange={(e) => setInspectionForm((p) => ({ ...p, valid_until: e.target.value }))} /></div>
              <div><Label>Poznámky</Label><Textarea rows={3} value={inspectionForm.notes} onChange={(e) => setInspectionForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            </div>
          )}

          {activeTab === "insurance" && (
            <div className="grid gap-3">
              <VehicleSelect value={insuranceForm.vehicle_id} onChange={(v) => setInsuranceForm((p) => ({ ...p, vehicle_id: v }))} />
              <div><Label>Pojišťovna *</Label><Input value={insuranceForm.insurer} onChange={(e) => setInsuranceForm((p) => ({ ...p, insurer: e.target.value }))} /></div>
              <div>
                <Label>Typ</Label>
                <Select value={insuranceForm.type} onValueChange={(v) => setInsuranceForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POV">POV</SelectItem>
                    <SelectItem value="Havarijní">Havarijní</SelectItem>
                    <SelectItem value="Havarijní + POV">Havarijní + POV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Platnost od</Label><Input type="date" value={insuranceForm.valid_from} onChange={(e) => setInsuranceForm((p) => ({ ...p, valid_from: e.target.value }))} /></div>
              <div><Label>Platnost do *</Label><Input type="date" value={insuranceForm.valid_until} onChange={(e) => setInsuranceForm((p) => ({ ...p, valid_until: e.target.value }))} /></div>
              <div><Label>Číslo smlouvy</Label><Input value={insuranceForm.policy_number} onChange={(e) => setInsuranceForm((p) => ({ ...p, policy_number: e.target.value }))} /></div>
              <div><Label>Roční náklad (Kč)</Label><Input type="number" inputMode="numeric" value={insuranceForm.annual_cost} onChange={(e) => setInsuranceForm((p) => ({ ...p, annual_cost: e.target.value }))} /></div>
              <div><Label>Poznámky</Label><Textarea rows={3} value={insuranceForm.notes} onChange={(e) => setInsuranceForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            </div>
          )}

          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Přidat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}