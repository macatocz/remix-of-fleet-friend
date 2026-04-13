import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, parseISO } from "date-fns";
import { cs } from "date-fns/locale";

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

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reservations")
        .select("id, driver_name, date_from, date_to, purpose, status")
        .eq("vehicle_id", vehicleId)
        .order("date_from");
      setReservations(data || []);
      setLoading(false);
    };
    fetch();
  }, [vehicleId]);

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

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        locale={cs}
        className={cn("p-3 pointer-events-auto rounded-md border mx-auto")}
        modifiers={{ reserved: reservedDays }}
        modifiersClassNames={{ reserved: "bg-primary/20 text-primary font-semibold rounded-full" }}
      />

      {reservations.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Toto vozidlo nemá žádné rezervace.</p>
      )}

      {selectedDate && selectedReservations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Rezervace na {format(selectedDate, "d. MMMM yyyy", { locale: cs })}:
          </h4>
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
        <p className="text-center text-sm text-muted-foreground">
          Na {format(selectedDate, "d. MMMM yyyy", { locale: cs })} žádná rezervace.
        </p>
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
    </div>
  );
}
