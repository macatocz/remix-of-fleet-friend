import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface Reservation {
  id: string;
  date_from: string;
  date_to: string;
  time_from: string | null;
  time_to: string | null;
  driver_name: string;
  status: string;
  purpose: string | null;
}

interface Props {
  vehicleId: string;
  days?: number;
}

function fmtDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("cs-CZ", { weekday: "short" }).replace(".", "");
}

export default function SpravceCalendarStrip({ vehicleId, days = 14 }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const arr: Date[] = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [days]);

  useEffect(() => {
    if (!vehicleId) return;
    (async () => {
      setLoading(true);
      const from = fmtDate(range[0]);
      const to = fmtDate(range[range.length - 1]);
      const { data } = await supabase
        .from("reservations")
        .select("id, date_from, date_to, time_from, time_to, driver_name, status, purpose")
        .eq("vehicle_id", vehicleId)
        .in("status", ["čeká", "schváleno"])
        .lte("date_from", to)
        .gte("date_to", from)
        .order("date_from", { ascending: true });
      setReservations((data as Reservation[]) || []);
      setLoading(false);
    })();
  }, [vehicleId, days]);

  const byDay = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const d of range) {
      const key = fmtDate(d);
      const items = reservations.filter(r => r.date_from <= key && r.date_to >= key);
      map.set(key, items);
    }
    return map;
  }, [reservations, range]);

  const status = (key: string): "free" | "partial" | "full" => {
    const items = byDay.get(key) || [];
    if (items.length === 0) return "free";
    const fullDay = items.some(r => {
      const tf = r.time_from || "00:00:00";
      const tt = r.time_to || "23:59:59";
      return tf <= "08:00:00" && tt >= "17:00:00";
    });
    return fullDay ? "full" : "partial";
  };

  const selectedItems = selected ? byDay.get(selected) || [] : [];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {range.map((d) => {
          const key = fmtDate(d);
          const st = status(key);
          const isSel = selected === key;
          const isToday = key === fmtDate(new Date());
          return (
            <button
              key={key}
              onClick={() => setSelected(isSel ? null : key)}
              className={cn(
                "shrink-0 w-14 rounded-xl border py-2 flex flex-col items-center transition-all active:scale-95",
                isSel ? "ring-2 ring-primary border-primary" : "border-border",
                st === "free" && "bg-emerald-500/10",
                st === "partial" && "bg-amber-500/15",
                st === "full" && "bg-primary/15",
              )}
            >
              <span className="text-[10px] uppercase text-muted-foreground">{dayLabel(d)}</span>
              <span className={cn("text-lg font-semibold leading-tight", isToday && "text-primary")}>
                {d.getDate()}
              </span>
              <span
                className={cn(
                  "mt-1 h-1.5 w-1.5 rounded-full",
                  st === "free" && "bg-emerald-500",
                  st === "partial" && "bg-amber-500",
                  st === "full" && "bg-primary",
                )}
              />
            </button>
          );
        })}
      </div>

      {loading && <p className="text-xs text-muted-foreground">Načítání…</p>}

      {selected && (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <p className="text-sm font-medium">
            {new Date(selected).toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {selectedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Volné – žádné rezervace.</p>
          ) : (
            selectedItems.map(r => (
              <div key={r.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.driver_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {r.time_from?.slice(0, 5) || "—"} – {r.time_to?.slice(0, 5) || "—"}
                  </p>
                  {r.purpose && <p className="text-xs text-muted-foreground truncate">{r.purpose}</p>}
                </div>
                <Badge variant={r.status === "schváleno" ? "default" : "secondary"} className="shrink-0">
                  {r.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Volno</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Částečně</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />Obsazeno</span>
      </div>
    </div>
  );
}