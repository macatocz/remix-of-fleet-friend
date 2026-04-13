import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Reservation {
  id: string;
  driver_name: string;
  date_from: string;
  date_to: string;
  purpose: string | null;
  status: string;
}

const statusLabel: Record<string, string> = {
  "čeká": "Čeká",
  "schváleno": "Schváleno",
  "zamítnuto": "Zamítnuto",
  "dokončeno": "Dokončeno",
};

const statusColor: Record<string, string> = {
  "čeká": "bg-warning text-warning-foreground",
  "schváleno": "bg-success text-success-foreground",
  "zamítnuto": "bg-destructive text-destructive-foreground",
  "dokončeno": "bg-secondary text-secondary-foreground",
};

export default function VehicleCalendar({ vehicleId }: { vehicleId: string }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDriver, setFormDriver] = useState("");
  const [formDateFrom, setFormDateFrom] = useState("");
  const [formDateTo, setFormDateTo] = useState("");
  const [formPurpose, setFormPurpose] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchReservations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("id, driver_name, date_from, date_to, purpose, status")
      .eq("vehicle_id", vehicleId)
      .order("date_from");
    setReservations(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchReservations(); }, [vehicleId]);

  const reservedDays = useMemo(() => {
    const days: Date[] = [];
    reservations
      .filter(r => r.status !== "zamítnuto")
      .forEach(r => {
        const start = parseISO(r.date_from);
        const end = parseISO(r.date_to);
        const d = new Date(start);
        while (d <= end) {
          days.push(new Date(d));
          d.setDate(d.getDate() + 1);
        }
      });
    return days;
  }, [reservations]);

  const selectedReservations = useMemo(() => {
    if (!selectedDate) return [];
    return reservations.filter(r => {
      const start = parseISO(r.date_from);
      const end = parseISO(r.date_to);
      return isWithinInterval(selectedDate, { start, end });
    });
  }, [selectedDate, reservations]);

  const openNewReservation = (date?: Date) => {
    const d = date || selectedDate || new Date();
    const dateStr = format(d, "yyyy-MM-dd");
    setFormDateFrom(dateStr);
    setFormDateTo(dateStr);
    setFormDriver("");
    setFormPurpose("");
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formDriver.trim() || !formDateFrom || !formDateTo) {
      toast({ title: "Vyplňte povinná pole", description: "Řidič a data jsou povinná.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("reservations").insert([{
      vehicle_id: vehicleId,
      driver_name: formDriver.trim(),
      date_from: formDateFrom,
      date_to: formDateTo,
      purpose: formPurpose.trim() || null,
    }]);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Rezervace vytvořena" });
      setDialogOpen(false);
      fetchReservations();
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Kalendář rezervací</h4>
        <Button size="sm" variant="outline" onClick={() => openNewReservation()}>
          <Plus className="mr-2 h-4 w-4" />Nová rezervace
        </Button>
      </div>

      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        locale={cs}
        className={cn("p-3 pointer-events-auto rounded-md border mx-auto")}
        modifiers={{ reserved: reservedDays }}
        modifiersClassNames={{ reserved: "bg-primary/20 text-primary font-semibold rounded-full" }}
      />

      {selectedDate && selectedReservations.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Rezervace na {format(selectedDate, "d. MMMM yyyy", { locale: cs })}:
            </h4>
            <Button size="sm" variant="ghost" onClick={() => openNewReservation(selectedDate)}>
              <Plus className="mr-1 h-3 w-3" />Přidat
            </Button>
          </div>
          {selectedReservations.map(r => (
            <div key={r.id} className="rounded-lg border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.driver_name}</span>
                <Badge className={statusColor[r.status] || ""}>{statusLabel[r.status] || r.status}</Badge>
              </div>
              <div className="text-muted-foreground">
                {format(parseISO(r.date_from), "d.M.yyyy")} – {format(parseISO(r.date_to), "d.M.yyyy")}
              </div>
              {r.purpose && <div className="text-muted-foreground">{r.purpose}</div>}
            </div>
          ))}
        </div>
      )}

      {selectedDate && selectedReservations.length === 0 && (
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Na {format(selectedDate, "d. MMMM yyyy", { locale: cs })} žádná rezervace.
          </p>
          <Button size="sm" variant="outline" onClick={() => openNewReservation(selectedDate)}>
            <Plus className="mr-2 h-4 w-4" />Vytvořit rezervaci na tento den
          </Button>
        </div>
      )}

      {!selectedDate && reservations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Všechny rezervace ({reservations.length}):</h4>
          {reservations.map(r => (
            <div key={r.id} className="rounded-lg border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.driver_name}</span>
                <Badge className={statusColor[r.status] || ""}>{statusLabel[r.status] || r.status}</Badge>
              </div>
              <div className="text-muted-foreground">
                {format(parseISO(r.date_from), "d.M.yyyy")} – {format(parseISO(r.date_to), "d.M.yyyy")}
              </div>
              {r.purpose && <div className="text-muted-foreground">{r.purpose}</div>}
            </div>
          ))}
        </div>
      )}

      {!selectedDate && reservations.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Toto vozidlo nemá žádné rezervace.</p>
      )}

      {/* New reservation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nová rezervace</DialogTitle>
            <DialogDescription>Vytvořte rezervaci pro toto vozidlo.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Řidič *</Label>
              <Input placeholder="Jméno řidiče" value={formDriver} onChange={e => setFormDriver(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Od *</Label>
                <Input type="date" value={formDateFrom} onChange={e => setFormDateFrom(e.target.value)} />
              </div>
              <div>
                <Label>Do *</Label>
                <Input type="date" value={formDateTo} onChange={e => setFormDateTo(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Účel</Label>
              <Textarea placeholder="Účel cesty..." value={formPurpose} onChange={e => setFormPurpose(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vytvořit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
