import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Plus, Wrench, Shield, FileCheck, Loader2, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Service() {
  const [activeTab, setActiveTab] = useState("service");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [serviceRecords, setServiceRecords] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"service" | "inspection" | "insurance">("service");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form states
  const [serviceForm, setServiceForm] = useState({ vehicle_id: "", type: "", date: new Date().toISOString().split("T")[0], cost: "", description: "", status: "dokončeno" });
  const [inspectionForm, setInspectionForm] = useState({ vehicle_id: "", type: "STK", date: "", valid_until: "", result: "platná", notes: "" });
  const [insuranceForm, setInsuranceForm] = useState({ vehicle_id: "", insurer: "", type: "POV", policy_number: "", valid_from: "", valid_until: "", annual_cost: "", notes: "" });

  const fetchData = async () => {
    setLoading(true);
    const [vRes, sRes, iRes, insRes] = await Promise.all([
      supabase.from("vehicles").select("id, znacka, rz").order("znacka"),
      supabase.from("service_records").select("*, vehicles(znacka, rz)").order("date", { ascending: false }),
      supabase.from("inspections").select("*, vehicles(znacka, rz)").order("valid_until", { ascending: true }),
      supabase.from("insurance").select("*, vehicles(znacka, rz)").order("valid_until", { ascending: true }),
    ]);
    setVehicles(vRes.data || []);
    setServiceRecords(sRes.data || []);
    setInspections(iRes.data || []);
    setInsurances(insRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const vLabel = (v: any) => v ? `${v.znacka || "?"} (${v.rz || "?"})` : "—";

  const openCreate = (type: "service" | "inspection" | "insurance") => {
    setDialogType(type);
    setEditingId(null);
    if (type === "service") setServiceForm({ vehicle_id: "", type: "", date: new Date().toISOString().split("T")[0], cost: "", description: "", status: "dokončeno" });
    if (type === "inspection") setInspectionForm({ vehicle_id: "", type: "STK", date: "", valid_until: "", result: "platná", notes: "" });
    if (type === "insurance") setInsuranceForm({ vehicle_id: "", insurer: "", type: "POV", policy_number: "", valid_from: "", valid_until: "", annual_cost: "", notes: "" });
    setDialogOpen(true);
  };

  const openEditService = (r: any) => {
    setDialogType("service");
    setEditingId(r.id);
    setServiceForm({ vehicle_id: r.vehicle_id, type: r.type, date: r.date, cost: String(r.cost || ""), description: r.description || "", status: r.status });
    setDialogOpen(true);
  };

  const openEditInspection = (r: any) => {
    setDialogType("inspection");
    setEditingId(r.id);
    setInspectionForm({ vehicle_id: r.vehicle_id, type: r.type, date: r.date, valid_until: r.valid_until, result: r.result || "platná", notes: r.notes || "" });
    setDialogOpen(true);
  };

  const openEditInsurance = (r: any) => {
    setDialogType("insurance");
    setEditingId(r.id);
    setInsuranceForm({ vehicle_id: r.vehicle_id, insurer: r.insurer, type: r.type, policy_number: r.policy_number || "", valid_from: r.valid_from || "", valid_until: r.valid_until, annual_cost: String(r.annual_cost || ""), notes: r.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let error: any = null;

    if (dialogType === "service") {
      if (!serviceForm.vehicle_id || !serviceForm.type || !serviceForm.date) {
        toast({ title: "Vyplňte povinná pole", variant: "destructive" }); setSaving(false); return;
      }
      const payload = { vehicle_id: serviceForm.vehicle_id, type: serviceForm.type, date: serviceForm.date, cost: serviceForm.cost ? Number(serviceForm.cost) : 0, description: serviceForm.description || null, status: serviceForm.status };
      ({ error } = editingId
        ? await supabase.from("service_records").update(payload).eq("id", editingId)
        : await supabase.from("service_records").insert([payload]));
    }

    if (dialogType === "inspection") {
      if (!inspectionForm.vehicle_id || !inspectionForm.date || !inspectionForm.valid_until) {
        toast({ title: "Vyplňte povinná pole", variant: "destructive" }); setSaving(false); return;
      }
      const payload = { vehicle_id: inspectionForm.vehicle_id, type: inspectionForm.type, date: inspectionForm.date, valid_until: inspectionForm.valid_until, result: inspectionForm.result, notes: inspectionForm.notes || null };
      ({ error } = editingId
        ? await supabase.from("inspections").update(payload).eq("id", editingId)
        : await supabase.from("inspections").insert([payload]));
    }

    if (dialogType === "insurance") {
      if (!insuranceForm.vehicle_id || !insuranceForm.insurer || !insuranceForm.valid_until) {
        toast({ title: "Vyplňte povinná pole", variant: "destructive" }); setSaving(false); return;
      }
      const payload = { vehicle_id: insuranceForm.vehicle_id, insurer: insuranceForm.insurer, type: insuranceForm.type, policy_number: insuranceForm.policy_number || null, valid_from: insuranceForm.valid_from || null, valid_until: insuranceForm.valid_until, annual_cost: insuranceForm.annual_cost ? Number(insuranceForm.annual_cost) : null, notes: insuranceForm.notes || null };
      ({ error } = editingId
        ? await supabase.from("insurance").update(payload).eq("id", editingId)
        : await supabase.from("insurance").insert([payload]));
    }

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Záznam upraven" : "Záznam přidán" });
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast({ title: "Chyba při mazání", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Záznam smazán" });
      fetchData();
    }
  };

  const inspectionStatus = (validUntil: string) => {
    const days = Math.round((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <Badge variant="destructive">Expirováno</Badge>;
    if (days < 30) return <Badge className="bg-destructive/80 text-destructive-foreground">Kritické</Badge>;
    if (days < 90) return <Badge className="bg-warning text-warning-foreground">Brzy expiruje</Badge>;
    return <Badge className="bg-success text-success-foreground">Platná</Badge>;
  };

  const VehicleSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <Label>Vozidlo *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
        <SelectContent>
          {vehicles.map(v => (
            <SelectItem key={v.id} value={v.id}>{v.znacka || "?"} ({v.rz || "?"})</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const DeleteButton = ({ table, id, label }: { table: string; id: string; label: string }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat záznam?</AlertDialogTitle>
          <AlertDialogDescription>{label} bude trvale odstraněn.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDelete(table, id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Smazat</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Servis a údržba</h1>
        <Button onClick={() => openCreate(activeTab as any)}>
          <Plus className="mr-2 h-4 w-4" />Nový záznam
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Upravit" : "Nový"} {dialogType === "service" ? "servisní záznam" : dialogType === "inspection" ? "STK záznam" : "pojištění"}
            </DialogTitle>
            <DialogDescription>Vyplňte údaje záznamu.</DialogDescription>
          </DialogHeader>

          {dialogType === "service" && (
            <div className="grid gap-4 py-4">
              <VehicleSelect value={serviceForm.vehicle_id} onChange={v => setServiceForm(p => ({ ...p, vehicle_id: v }))} />
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Typ servisu *</Label><Input value={serviceForm.type} onChange={e => setServiceForm(p => ({ ...p, type: e.target.value }))} placeholder="Výměna oleje" /></div>
                <div><Label>Datum *</Label><Input type="date" value={serviceForm.date} onChange={e => setServiceForm(p => ({ ...p, date: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Náklady (Kč)</Label><Input type="number" value={serviceForm.cost} onChange={e => setServiceForm(p => ({ ...p, cost: e.target.value }))} placeholder="0" /></div>
                <div>
                  <Label>Stav</Label>
                  <Select value={serviceForm.status} onValueChange={v => setServiceForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dokončeno">Dokončeno</SelectItem>
                      <SelectItem value="plánováno">Plánováno</SelectItem>
                      <SelectItem value="probíhá">Probíhá</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Popis</Label><Textarea value={serviceForm.description} onChange={e => setServiceForm(p => ({ ...p, description: e.target.value }))} placeholder="Popis prací..." /></div>
            </div>
          )}

          {dialogType === "inspection" && (
            <div className="grid gap-4 py-4">
              <VehicleSelect value={inspectionForm.vehicle_id} onChange={v => setInspectionForm(p => ({ ...p, vehicle_id: v }))} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Typ *</Label>
                  <Select value={inspectionForm.type} onValueChange={v => setInspectionForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STK">STK</SelectItem>
                      <SelectItem value="Emise">Emise</SelectItem>
                      <SelectItem value="STK + Emise">STK + Emise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Výsledek</Label>
                  <Select value={inspectionForm.result} onValueChange={v => setInspectionForm(p => ({ ...p, result: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platná">Platná</SelectItem>
                      <SelectItem value="podmíněně platná">Podmíněně platná</SelectItem>
                      <SelectItem value="neplatná">Neplatná</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Datum provedení *</Label><Input type="date" value={inspectionForm.date} onChange={e => setInspectionForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div><Label>Platnost do *</Label><Input type="date" value={inspectionForm.valid_until} onChange={e => setInspectionForm(p => ({ ...p, valid_until: e.target.value }))} /></div>
              </div>
              <div><Label>Poznámky</Label><Textarea value={inspectionForm.notes} onChange={e => setInspectionForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
          )}

          {dialogType === "insurance" && (
            <div className="grid gap-4 py-4">
              <VehicleSelect value={insuranceForm.vehicle_id} onChange={v => setInsuranceForm(p => ({ ...p, vehicle_id: v }))} />
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Pojišťovna *</Label><Input value={insuranceForm.insurer} onChange={e => setInsuranceForm(p => ({ ...p, insurer: e.target.value }))} placeholder="Česká pojišťovna" /></div>
                <div>
                  <Label>Typ</Label>
                  <Select value={insuranceForm.type} onValueChange={v => setInsuranceForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POV">POV</SelectItem>
                      <SelectItem value="Havarijní">Havarijní</SelectItem>
                      <SelectItem value="Havarijní + POV">Havarijní + POV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Platnost od</Label><Input type="date" value={insuranceForm.valid_from} onChange={e => setInsuranceForm(p => ({ ...p, valid_from: e.target.value }))} /></div>
                <div><Label>Platnost do *</Label><Input type="date" value={insuranceForm.valid_until} onChange={e => setInsuranceForm(p => ({ ...p, valid_until: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Číslo smlouvy</Label><Input value={insuranceForm.policy_number} onChange={e => setInsuranceForm(p => ({ ...p, policy_number: e.target.value }))} /></div>
                <div><Label>Roční náklad (Kč)</Label><Input type="number" value={insuranceForm.annual_cost} onChange={e => setInsuranceForm(p => ({ ...p, annual_cost: e.target.value }))} /></div>
              </div>
              <div><Label>Poznámky</Label><Textarea value={insuranceForm.notes} onChange={e => setInsuranceForm(p => ({ ...p, notes: e.target.value }))} /></div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Uložit" : "Přidat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="service" className="gap-2"><Wrench className="h-4 w-4" />Servis ({serviceRecords.length})</TabsTrigger>
          <TabsTrigger value="inspection" className="gap-2"><FileCheck className="h-4 w-4" />STK ({inspections.length})</TabsTrigger>
          <TabsTrigger value="insurance" className="gap-2"><Shield className="h-4 w-4" />Pojištění ({insurances.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="service">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : serviceRecords.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Žádné servisní záznamy. Přidejte první.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vozidlo</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Náklady</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead>Popis</TableHead>
                      <TableHead className="w-[80px]">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceRecords.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{vLabel(s.vehicles)}</TableCell>
                        <TableCell>{s.type}</TableCell>
                        <TableCell>{new Date(s.date).toLocaleDateString("cs-CZ")}</TableCell>
                        <TableCell>{Number(s.cost).toLocaleString("cs-CZ")} Kč</TableCell>
                        <TableCell>
                          <Badge variant={s.status === "dokončeno" ? "default" : s.status === "plánováno" ? "secondary" : "outline"}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{s.description || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditService(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <DeleteButton table="service_records" id={s.id} label="Servisní záznam" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspection">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : inspections.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Žádné STK záznamy. Přidejte první.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vozidlo</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Platnost do</TableHead>
                      <TableHead>Výsledek</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead className="w-[80px]">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{vLabel(i.vehicles)}</TableCell>
                        <TableCell>{i.type}</TableCell>
                        <TableCell>{new Date(i.date).toLocaleDateString("cs-CZ")}</TableCell>
                        <TableCell>{new Date(i.valid_until).toLocaleDateString("cs-CZ")}</TableCell>
                        <TableCell>{i.result}</TableCell>
                        <TableCell>{inspectionStatus(i.valid_until)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditInspection(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <DeleteButton table="inspections" id={i.id} label="STK záznam" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : insurances.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">Žádné pojistné smlouvy. Přidejte první.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vozidlo</TableHead>
                      <TableHead>Pojišťovna</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Č. smlouvy</TableHead>
                      <TableHead>Platnost do</TableHead>
                      <TableHead>Roční náklad</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead className="w-[80px]">Akce</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insurances.map(ins => (
                      <TableRow key={ins.id}>
                        <TableCell className="font-medium">{vLabel(ins.vehicles)}</TableCell>
                        <TableCell>{ins.insurer}</TableCell>
                        <TableCell>{ins.type}</TableCell>
                        <TableCell>{ins.policy_number || "—"}</TableCell>
                        <TableCell>{new Date(ins.valid_until).toLocaleDateString("cs-CZ")}</TableCell>
                        <TableCell>{ins.annual_cost ? `${Number(ins.annual_cost).toLocaleString("cs-CZ")} Kč` : "—"}</TableCell>
                        <TableCell>{inspectionStatus(ins.valid_until)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditInsurance(ins)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <DeleteButton table="insurance" id={ins.id} label="Pojistná smlouva" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
