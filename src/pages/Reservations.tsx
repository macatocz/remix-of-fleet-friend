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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, CalendarDays, Loader2 } from "lucide-react";
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
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    if (!form.vehicle_id || !form.driver_name || !form.date_from || !form.date_to) {
      toast({ title: "Vyplňte povinná pole", description: "Vozidlo, řidič a data jsou povinná.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reservations").insert([{
      vehicle_id: form.vehicle_id,
      driver_name: form.driver_name,
      date_from: form.date_from,
      date_to: form.date_to,
      purpose: form.purpose || null,
    }]);
    if (error) {
      toast({ title: "Chyba při ukládání", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rezervace vytvořena" });
      setForm(emptyForm);
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nová rezervace</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nová rezervace</DialogTitle>
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
              <div>
                <Label>Účel</Label>
                <Textarea placeholder="Účel cesty..." value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vytvořit rezervaci
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5" />
            Přehled rezervací
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Zatím žádné rezervace. Vytvořte první kliknutím na „Nová rezervace".</div>
          ) : (
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
                    <TableCell>{new Date(r.date_from).toLocaleDateString("cs-CZ")}</TableCell>
                    <TableCell>{new Date(r.date_to).toLocaleDateString("cs-CZ")}</TableCell>
                    <TableCell>{r.purpose || "—"}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      {r.status === "čeká" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(r.id, "schváleno")}>Schválit</Button>
                          <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => updateStatus(r.id, "zamítnuto")}>Zamítnout</Button>
                        </div>
                      )}
                      {r.status === "schváleno" && (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus(r.id, "dokončeno")}>Dokončit</Button>
                      )}
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
