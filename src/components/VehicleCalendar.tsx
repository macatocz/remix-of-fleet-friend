import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Loader2, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  format, addDays, startOfWeek, endOfWeek, isToday, isSameDay, parseISO,
  isWithinInterval, addWeeks, subWeeks
} from "date-fns";
import { cs } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Reservation {
  id: string;
  driver_name: string;
  date_from: string;
  date_to: string;
  time_from: string | null;
  time_to: string | null;
  purpose: string | null;
  status: string;
}

const statusColor: Record<string, string> = {
  "čeká": "bg-warning/80 border-warning text-warning-foreground",
  "schváleno": "bg-success/80 border-success text-success-foreground",
  "zamítnuto": "bg-destructive/20 border-destructive/40 text-destructive line-through",
  "dokončeno": "bg-secondary border-secondary text-secondary-foreground",
};

const statusLabel: Record<string, string> = {
  "čeká": "Čeká",
  "schváleno": "Schváleno",
  "zamítnuto": "Zamítnuto",
  "dokončeno": "Dokončeno",
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7:00 - 18:00
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  return [`${h}:00`, `${h}:30`];
}).flat();

function parseTime(t: string | null): number {
  if (!t) return 8;
  const [h, m] = t.split(":").map(Number);
  return h + (m || 0) / 60;
}

export default function VehicleCalendar({ vehicleId }: { vehicleId: string }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "day">("week");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDriver, setFormDriver] = useState("");
  const [formDateFrom, setFormDateFrom] = useState("");
  const [formDateTo, setFormDateTo] = useState("");
  const [formTimeFrom, setFormTimeFrom] = useState("08:00");
  const [formTimeTo, setFormTimeTo] = useState("17:00");
  const [formPurpose, setFormPurpose] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);
  const { toast } = useToast();

  const fetchReservations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reservations")
      .select("id, driver_name, date_from, date_to, time_from, time_to, purpose, status")
      .eq("vehicle_id", vehicleId)
      .order("date_from");
    setReservations(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchReservations(); }, [vehicleId]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: view === "week" ? 7 : 1 }, (_, i) =>
    addDays(view === "week" ? weekStart : currentDate, i)
  );

  const getReservationsForDay = (day: Date) => {
    return reservations.filter(r => {
      const start = parseISO(r.date_from);
      const end = parseISO(r.date_to);
      return isSameDay(day, start) || isSameDay(day, end) ||
        isWithinInterval(day, { start, end });
    });
  };

  const navigate = (dir: number) => {
    if (view === "week") {
      setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => addDays(prev, dir));
    }
  };

  const openNewReservation = (date?: Date, hour?: number) => {
    const d = date || currentDate;
    const dateStr = format(d, "yyyy-MM-dd");
    setFormDateFrom(dateStr);
    setFormDateTo(dateStr);
    setFormTimeFrom(hour !== undefined ? `${String(hour).padStart(2, "0")}:00` : "08:00");
    setFormTimeTo(hour !== undefined ? `${String(hour + 1).padStart(2, "0")}:00` : "17:00");
    setFormDriver("");
    setFormPurpose("");
    setDialogOpen(true);
  };

  const checkCollision = async (dateFrom: string, dateTo: string, timeFrom: string, timeTo: string): Promise<boolean> => {
    const { data } = await supabase
      .from("reservations")
      .select("id, time_from, time_to")
      .eq("vehicle_id", vehicleId)
      .in("status", ["čeká", "schváleno"])
      .lte("date_from", dateTo)
      .gte("date_to", dateFrom);

    if (!data || data.length === 0) return false;

    return data.some(r => {
      const existFrom = r.time_from?.slice(0, 5) || "08:00";
      const existTo = r.time_to?.slice(0, 5) || "17:00";
      return timeFrom < existTo && timeTo > existFrom;
    });
  };

  const handleCreate = async () => {
    if (!formDriver.trim() || !formDateFrom || !formDateTo) {
      toast({ title: "Vyplňte povinná pole", variant: "destructive" });
      return;
    }
    setSaving(true);

    const hasCollision = await checkCollision(formDateFrom, formDateTo, formTimeFrom, formTimeTo);
    if (hasCollision) {
      toast({ title: "Kolize rezervací", description: "Vozidlo je v tomto období a čase již rezervováno.", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("reservations").insert([{
      vehicle_id: vehicleId,
      driver_name: formDriver.trim(),
      date_from: formDateFrom,
      date_to: formDateTo,
      time_from: formTimeFrom,
      time_to: formTimeTo,
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
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>
            Dnes
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium ml-2">
            {view === "week"
              ? `${format(weekStart, "d. MMM", { locale: cs })} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d. MMM yyyy", { locale: cs })}`
              : format(currentDate, "EEEE d. MMMM yyyy", { locale: cs })
            }
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={cn("px-3 py-1 text-xs font-medium transition-colors", view === "day" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}
              onClick={() => setView("day")}
            >Den</button>
            <button
              className={cn("px-3 py-1 text-xs font-medium transition-colors", view === "week" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}
              onClick={() => setView("week")}
            >Týden</button>
          </div>
          <Button size="sm" onClick={() => openNewReservation()}>
            <Plus className="mr-1 h-4 w-4" />Nová rezervace
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header row with days */}
            <div className={cn("grid border-b bg-muted/50", view === "week" ? "grid-cols-[60px_repeat(7,1fr)]" : "grid-cols-[60px_1fr]")}>
              <div className="p-2 text-xs text-muted-foreground border-r" />
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-2 text-center border-r last:border-r-0 cursor-pointer hover:bg-muted transition-colors",
                    isToday(day) && "bg-primary/10"
                  )}
                  onClick={() => { setCurrentDate(day); setView("day"); }}
                >
                  <div className="text-xs text-muted-foreground">{format(day, "EEE", { locale: cs })}</div>
                  <div className={cn(
                    "text-sm font-medium w-7 h-7 rounded-full flex items-center justify-center mx-auto",
                    isToday(day) && "bg-primary text-primary-foreground"
                  )}>
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative">
              {HOURS.map(hour => (
                <div key={hour} className={cn("grid border-b last:border-b-0", view === "week" ? "grid-cols-[60px_repeat(7,1fr)]" : "grid-cols-[60px_1fr]")}>
                  <div className="p-1 pr-2 text-xs text-muted-foreground text-right border-r h-12 flex items-start justify-end">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {weekDays.map((day, di) => {
                    const dayRes = getReservationsForDay(day);
                    const slotRes = dayRes.filter(r => {
                      const from = parseTime(r.time_from);
                      const to = parseTime(r.time_to);
                      return hour >= from && hour < to;
                    });

                    return (
                      <div
                        key={di}
                        className={cn(
                          "border-r last:border-r-0 h-12 relative cursor-pointer hover:bg-muted/30 transition-colors",
                          isToday(day) && "bg-primary/5"
                        )}
                        onClick={() => {
                          if (slotRes.length === 0) openNewReservation(day, hour);
                        }}
                      >
                        {slotRes.filter(r => {
                          const from = parseTime(r.time_from);
                          return Math.floor(from) === hour || (from < 7 && hour === 7);
                        }).map(r => {
                          const from = parseTime(r.time_from);
                          const to = parseTime(r.time_to);
                          const duration = Math.max(to - from, 0.5);
                          const topOffset = (Math.max(from, 7) - hour) * 48;
                          const height = duration * 48;

                          return (
                            <div
                              key={r.id}
                              className={cn(
                                "absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 text-[10px] leading-tight border cursor-pointer z-10 overflow-hidden",
                                statusColor[r.status] || "bg-primary/20 border-primary/40"
                              )}
                              style={{
                                top: `${Math.max(topOffset, 0)}px`,
                                height: `${Math.min(height, 48 * (19 - hour))}px`,
                                minHeight: "20px",
                              }}
                              onClick={(e) => { e.stopPropagation(); setDetailRes(r); }}
                            >
                              <div className="font-medium truncate">{r.driver_name}</div>
                              {height > 30 && (
                                <div className="truncate opacity-80">
                                  {r.time_from?.slice(0, 5)} – {r.time_to?.slice(0, 5)}
                                </div>
                              )}
                              {height > 50 && r.purpose && (
                                <div className="truncate opacity-70">{r.purpose}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* All-day / multi-day reservations summary */}
      {reservations.filter(r => r.date_from !== r.date_to).length > 0 && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vícedenní rezervace</h4>
          <div className="flex flex-wrap gap-2">
            {reservations.filter(r => r.date_from !== r.date_to && r.status !== "zamítnuto").map(r => (
              <div
                key={r.id}
                className={cn("rounded px-2 py-1 text-xs border cursor-pointer", statusColor[r.status])}
                onClick={() => setDetailRes(r)}
              >
                <span className="font-medium">{r.driver_name}</span>
                {" · "}
                {format(parseISO(r.date_from), "d.M.")} – {format(parseISO(r.date_to), "d.M.")}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservation detail dialog */}
      <Dialog open={!!detailRes} onOpenChange={open => !open && setDetailRes(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Detail rezervace</DialogTitle>
          </DialogHeader>
          {detailRes && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Řidič</span>
                <span className="font-medium">{detailRes.driver_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Datum</span>
                <span className="font-medium">
                  {format(parseISO(detailRes.date_from), "d.M.yyyy")}
                  {detailRes.date_from !== detailRes.date_to && ` – ${format(parseISO(detailRes.date_to), "d.M.yyyy")}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Čas</span>
                <span className="font-medium">{detailRes.time_from?.slice(0, 5) || "08:00"} – {detailRes.time_to?.slice(0, 5) || "17:00"}</span>
              </div>
              {detailRes.purpose && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Účel</span>
                  <span className="font-medium text-right max-w-[180px]">{detailRes.purpose}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Stav</span>
                <Badge className={statusColor[detailRes.status]}>{statusLabel[detailRes.status] || detailRes.status}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Čas od</Label>
                <Select value={formTimeFrom} onValueChange={setFormTimeFrom}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Čas do</Label>
                <Select value={formTimeTo} onValueChange={setFormTimeTo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
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
