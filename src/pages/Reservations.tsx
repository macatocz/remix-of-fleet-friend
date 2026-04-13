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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, CalendarDays, Loader2, Pencil, Trash2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusBadge = (status: string) => {
  switch (status) {
    case "schváleno": return <Badge className="bg-success text-success-foreground">Schváleno</Badge>;
    case "čeká": return <Badge className="bg-warning text-warning-foreground">Čeká na schválení</Badge>;
    case "dokončeno": return <Badge variant="secondary">Dokončeno</Badge>;
    case "zamítnuto": return <Badge variant="destructive">Zamítnuto</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  return [`${h}:00`, `${h}:30`];
}).flat();

interface ReservationForm {
  vehicle_id: string;
  driver_name: string;
  date_from: string;
  date_to: string;
  time_from: string;
  time_to: string;
  purpose: string;
}

const emptyForm: ReservationForm = {
  vehicle_id: "",
  driver_name: "",
  date_from: "",
  date_to: "",
  time_from: "08:00",
  time_to: "17:00",
  purpose: "",
};

export default function Reservations() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ReservationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterVehicle, setFilterVehicle] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const [resResult, vehResult] = await Promise.all([
      supabase.from("reservations").select("*, vehicles(znacka, rz)").order("date_from", { ascending: false }),
      supabase.from("vehicles").select("id, znacka, rz").eq("status", "aktivní").order("znacka"),
    ]);
    if (resResult.error) {
      toast({ title: "Chyba", description: resResult.error.message, variant: "destructive" });
    } else {
      setReservations(resResult.data || []);
    }
    setVehicles(vehResult.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const checkCollision = async (vehicleId: string, dateFrom: string, dateTo: string, timeFrom: string, timeTo: string, excludeId?: string): Promise<boolean> => {
    let query = supabase
      .from("reservations")
      .select("id, time_from, time_to")
      .eq("vehicle_id", vehicleId)
      .in("status", ["čeká", "schváleno"])
      .lte("date_from", dateTo)
      .gte("date_to", dateFrom);

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data } = await query;
    if (!data || data.length === 0) return false;

    return data.some(r => {
      const existFrom = r.time_from?.slice(0, 5) || "08:00";
      const existTo = r.time_to?.slice(0, 5) || "17:00";
      return timeFrom < existTo && timeTo > existFrom;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingId(r.id);
    setForm({
      vehicle_id: r.vehicle_id,
      driver_name: r.driver_name,
      date_from: r.date_from,
      date_to: r.date_to,
      time_from: r.time_from?.slice(0, 5) || "08:00",
      time_to: r.time_to?.slice(0, 5) || "17:00",
      purpose: r.purpose || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.vehicle_id || !form.driver_name || !form.date_from || !form.date_to) {
      toast({ title: "Vyplňte povinná pole", description: "Vozidlo, řidič a data jsou povinná.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const hasCollision = await checkCollision(
      form.vehicle_id, form.date_from, form.date_to,
      form.time_from || "08:00", form.time_to || "17:00",
      editingId || undefined
    );
    if (hasCollision) {
      toast({ title: "Kolize rezervací", description: "Vozidlo je v tomto období a čase již rezervováno.", variant: "destructive" });
      setSaving(false);
      return;
    }

    const payload = {
      vehicle_id: form.vehicle_id,
      driver_name: form.driver_name,
      date_from: form.date_from,
      date_to: form.date_to,
      time_from: form.time_from || "08:00",
      time_to: form.time_to || "17:00",
      purpose: form.purpose || null,
    };

    const { error } = editingId
      ? await supabase.from("reservations").update(payload).eq("id", editingId)
      : await supabase.from("reservations").insert([payload]);

    if (error) {
      toast({ title: "Chyba při ukládání", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Rezervace upravena" : "Rezervace vytvořena" });
      setForm(emptyForm);
      setEditingId(null);
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) {
      toast({ title: "Chyba při mazání", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rezervace smazána" });
      fetchData();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rezervace</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nová rezervace</Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Upravit rezervaci" : "Nová rezervace"}</DialogTitle>
            <DialogDescription>Vyplňte údaje pro rezervaci vozidla.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Vozidlo *</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.znacka || "—"} ({v.rz || "—"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Řidič *</Label>
              <Input placeholder="Jméno řidiče" value={form.driver_name} onChange={e => setForm(p => ({ ...p, driver_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Od *</Label>
                <Input type="date" value={form.date_from} onChange={e => setForm(p => ({ ...p, date_from: e.target.value }))} />
              </div>
              <div>
                <Label>Do *</Label>
                <Input type="date" value={form.date_to} onChange={e => setForm(p => ({ ...p, date_to: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Čas od</Label>
                <Select value={form.time_from} onValueChange={v => setForm(p => ({ ...p, time_from: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Čas do</Label>
                <Select value={form.time_to} onValueChange={v => setForm(p => ({ ...p, time_to: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Účel</Label>
              <Textarea placeholder="Účel cesty..." value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Uložit změny" : "Vytvořit rezervaci"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5" />
            Přehled rezervací
          </CardTitle>
          <div className="flex flex-wrap gap-3 pt-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Hledat řidiče nebo účel…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchText && (
                <button onClick={() => setSearchText("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={filterVehicle} onValueChange={setFilterVehicle}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Všechna vozidla" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechna vozidla</SelectItem>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.znacka || "—"} ({v.rz || "—"})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Všechny stavy" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="čeká">Čeká na schválení</SelectItem>
                <SelectItem value="schváleno">Schváleno</SelectItem>
                <SelectItem value="zamítnuto">Zamítnuto</SelectItem>
                <SelectItem value="dokončeno">Dokončeno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (() => {
            const filtered = reservations.filter(r => {
              if (filterVehicle !== "all" && r.vehicle_id !== filterVehicle) return false;
              if (filterStatus !== "all" && r.status !== filterStatus) return false;
              if (searchText) {
                const s = searchText.toLowerCase();
                const match = (r.driver_name || "").toLowerCase().includes(s)
                  || (r.purpose || "").toLowerCase().includes(s)
                  || (r.vehicles?.znacka || "").toLowerCase().includes(s)
                  || (r.vehicles?.rz || "").toLowerCase().includes(s);
                if (!match) return false;
              }
              return true;
            });
            if (filtered.length === 0) return (
              <div className="text-center py-12 text-muted-foreground">
                {reservations.length === 0 ? "Zatím žádné rezervace. Vytvořte první kliknutím na „Nová rezervace"." : "Žádné rezervace neodpovídají filtru."}
              </div>
            );
            return (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vozidlo</TableHead>
                  <TableHead>Řidič</TableHead>
                  <TableHead>Od</TableHead>
                  <TableHead>Do</TableHead>
                  <TableHead>Účel</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead>Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.vehicles?.znacka || "—"} ({r.vehicles?.rz || "—"})
                    </TableCell>
                    <TableCell>{r.driver_name}</TableCell>
                    <TableCell>{new Date(r.date_from).toLocaleDateString("cs-CZ")} {r.time_from?.slice(0, 5) || ""}</TableCell>
                    <TableCell>{new Date(r.date_to).toLocaleDateString("cs-CZ")} {r.time_to?.slice(0, 5) || ""}</TableCell>
                    <TableCell>{r.purpose || "—"}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {r.status === "čeká" && (
                          <>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(r.id, "schváleno")}>Schválit</Button>
                            <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => updateStatus(r.id, "zamítnuto")}>Zamítnout</Button>
                          </>
                        )}
                        {r.status === "schváleno" && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(r.id, "dokončeno")}>Dokončit</Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)}>
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
                              <AlertDialogTitle>Smazat rezervaci?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tato akce je nevratná. Rezervace pro {r.driver_name} bude trvale odstraněna.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Zrušit</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
