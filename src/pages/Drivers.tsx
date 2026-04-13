import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Search, X, Pencil, Trash2, Loader2, Users, Car, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DriverForm {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  department: string;
  notes: string;
  vehicle_id: string;
  status: string;
}

const emptyForm: DriverForm = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  department: "",
  notes: "",
  vehicle_id: "none",
  status: "aktivní",
};

export default function Drivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailDriver, setDetailDriver] = useState<any | null>(null);
  const [driverReservations, setDriverReservations] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    const [driversRes, vehiclesRes] = await Promise.all([
      supabase.from("drivers").select("*, vehicles(znacka, rz)").order("last_name"),
      supabase.from("vehicles").select("id, znacka, rz").eq("status", "aktivní").order("znacka"),
    ]);
    if (driversRes.error) {
      toast({ title: "Chyba", description: driversRes.error.message, variant: "destructive" });
    } else {
      setDrivers(driversRes.data || []);
    }
    setVehicles(vehiclesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (d: any) => {
    setEditingId(d.id);
    setForm({
      first_name: d.first_name,
      last_name: d.last_name,
      phone: d.phone || "",
      email: d.email || "",
      department: d.department || "",
      notes: d.notes || "",
      vehicle_id: d.vehicle_id || "none",
      status: d.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast({ title: "Vyplňte povinná pole", description: "Jméno a příjmení jsou povinná.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      department: form.department.trim() || null,
      notes: form.notes.trim() || null,
      vehicle_id: form.vehicle_id === "none" ? null : form.vehicle_id || null,
      status: form.status,
    };

    const { error } = editingId
      ? await supabase.from("drivers").update(payload).eq("id", editingId)
      : await supabase.from("drivers").insert([payload]);

    if (error) {
      toast({ title: "Chyba při ukládání", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Řidič upraven" : "Řidič přidán" });
      setForm(emptyForm);
      setEditingId(null);
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) {
      toast({ title: "Chyba při mazání", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Řidič smazán" });
      if (detailDriver?.id === id) setDetailDriver(null);
      fetchData();
    }
  };

  const openDetail = async (d: any) => {
    setDetailDriver(d);
    // Fetch reservations for this driver
    const fullName = `${d.first_name} ${d.last_name}`;
    const { data } = await supabase
      .from("reservations")
      .select("*, vehicles(znacka, rz)")
      .eq("driver_name", fullName)
      .order("date_from", { ascending: false })
      .limit(20);
    setDriverReservations(data || []);
  };

  const filtered = drivers.filter(d => {
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      const match = `${d.first_name} ${d.last_name}`.toLowerCase().includes(s)
        || (d.email || "").toLowerCase().includes(s)
        || (d.phone || "").toLowerCase().includes(s)
        || (d.department || "").toLowerCase().includes(s)
        || (d.vehicles?.znacka || "").toLowerCase().includes(s)
        || (d.vehicles?.rz || "").toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  });

  const statusBadge = (status: string) => {
    return status === "aktivní"
      ? <Badge className="bg-success text-success-foreground">Aktivní</Badge>
      : <Badge variant="secondary">Neaktivní</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Řidiči</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Přidat řidiče</Button>
      </div>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Upravit řidiče" : "Nový řidič"}</DialogTitle>
            <DialogDescription>Vyplňte údaje o řidiči / zaměstnanci.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Jméno *</Label>
                <Input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="Jan" />
              </div>
              <div>
                <Label>Příjmení *</Label>
                <Input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Novák" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+420 601 234 567" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="novak@firma.cz" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Oddělení / Středisko</Label>
                <Input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="Logistika" />
              </div>
              <div>
                <Label>Stav</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktivní">Aktivní</SelectItem>
                    <SelectItem value="neaktivní">Neaktivní</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Přiřazené vozidlo</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Bez přiřazeného vozidla" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Žádné</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.znacka || "—"} ({v.rz || "—"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Poznámky</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Interní poznámky..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Uložit změny" : "Přidat řidiče"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailDriver} onOpenChange={(open) => { if (!open) setDetailDriver(null); }}>
        <DialogContent className="sm:max-w-2xl">
          {detailDriver && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {detailDriver.first_name} {detailDriver.last_name}
                </DialogTitle>
                <DialogDescription>Detail řidiče a historie rezervací</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4 text-sm">
                <div><span className="text-muted-foreground">Telefon:</span> {detailDriver.phone || "—"}</div>
                <div><span className="text-muted-foreground">Email:</span> {detailDriver.email || "—"}</div>
                <div><span className="text-muted-foreground">Oddělení:</span> {detailDriver.department || "—"}</div>
                <div><span className="text-muted-foreground">Stav:</span> {statusBadge(detailDriver.status)}</div>
                <div className="col-span-2 flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Vozidlo:</span>
                  {detailDriver.vehicles ? (
                    <button
                      className="text-primary underline hover:no-underline"
                      onClick={() => { setDetailDriver(null); navigate(`/vozidla/${detailDriver.vehicle_id}`); }}
                    >
                      {detailDriver.vehicles.znacka} ({detailDriver.vehicles.rz})
                    </button>
                  ) : "—"}
                </div>
                {detailDriver.notes && (
                  <div className="col-span-2"><span className="text-muted-foreground">Poznámky:</span> {detailDriver.notes}</div>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <CalendarDays className="h-4 w-4" />
                  Historie rezervací ({driverReservations.length})
                </h3>
                {driverReservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Žádné rezervace pro tohoto řidiče.</p>
                ) : (
                  <div className="max-h-[250px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vozidlo</TableHead>
                          <TableHead>Od</TableHead>
                          <TableHead>Do</TableHead>
                          <TableHead>Účel</TableHead>
                          <TableHead>Stav</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {driverReservations.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="text-xs">{r.vehicles?.znacka || "?"} ({r.vehicles?.rz || "?"})</TableCell>
                            <TableCell className="text-xs">{new Date(r.date_from).toLocaleDateString("cs-CZ")}</TableCell>
                            <TableCell className="text-xs">{new Date(r.date_to).toLocaleDateString("cs-CZ")}</TableCell>
                            <TableCell className="text-xs">{r.purpose || "—"}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant={r.status === "schváleno" ? "default" : r.status === "čeká" ? "secondary" : "outline"} className="text-[10px]">
                                {r.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Main table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Evidence řidičů
          </CardTitle>
          <div className="flex flex-wrap gap-3 pt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat řidiče…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="aktivní">Aktivní</SelectItem>
                <SelectItem value="neaktivní">Neaktivní</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {drivers.length === 0 ? "Zatím žádní řidiči. Přidejte prvního." : "Žádní řidiči neodpovídají filtru."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Oddělení</TableHead>
                  <TableHead>Vozidlo</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(d => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => openDetail(d)}>
                    <TableCell className="font-medium">{d.first_name} {d.last_name}</TableCell>
                    <TableCell>{d.phone || "—"}</TableCell>
                    <TableCell>{d.email || "—"}</TableCell>
                    <TableCell>{d.department || "—"}</TableCell>
                    <TableCell>
                      {d.vehicles ? `${d.vehicles.znacka || "?"} (${d.vehicles.rz || "?"})` : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(d.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Smazat řidiče?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Řidič {d.first_name} {d.last_name} bude trvale odstraněn.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Zrušit</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(d.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Smazat
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
