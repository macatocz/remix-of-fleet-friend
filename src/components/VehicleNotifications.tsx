import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Car, ChevronDown, ChevronUp } from "lucide-react";
import {
  computeLeasingMileage,
  deriveCurrentMileage,
  LeasingMileageInput,
  MileageSource,
  TripLogMileage,
} from "@/lib/leasing/mileage";

interface Vehicle {
  id: string;
  nazev_vozu: string | null;
  znacka: string | null;
  rz: string | null;
  spravce: string | null;
  stk: string | null;
  zelena_karta: string | null;
  datum_ukonceni_leasingu: string | null;
  datum_zahajeni_leasingu: string | null;
  typ_vlastnictvi: string | null;
  najezd_za_rok: string | null;
  vychozi_stav_tachometru: string | null;
  status: string;
}

interface Alert {
  vehicleId: string;
  vehicleLabel: string;
  message: string;
  daysLeft: number;
  type: "critical" | "warning" | "info";
  date: string;
}

function parseDateString(s: string | null): Date | null {
  if (!s) return null;
  const cleaned = s.replace(/^do\s+/i, "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return new Date(cleaned);
  const match = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  return null;
}

function daysDiff(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function VehicleNotifications({ excludeDashboardMonitoring = false }: { excludeDashboardMonitoring?: boolean }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mileageRecords, setMileageRecords] = useState<MileageSource[]>([]);
  const [tripLogs, setTripLogs] = useState<TripLogMileage[]>([]);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    critical: false, warning: false, info: false,
  });

  useEffect(() => {
    supabase.from("vehicles").select("id, nazev_vozu, znacka, rz, spravce, stk, zelena_karta, datum_ukonceni_leasingu, datum_zahajeni_leasingu, typ_vlastnictvi, najezd_za_rok, vychozi_stav_tachometru, status")
      .eq("status", "aktivní")
      .then(({ data }) => setVehicles((data as Vehicle[]) || []));
    supabase.from("vehicle_mileage").select("vehicle_id, km, recorded_at")
      .then(({ data }) => setMileageRecords(
        ((data as any[]) || []).map(r => ({ vehicle_id: r.vehicle_id, km: r.km, recorded_at: r.recorded_at, source: "vehicle_mileage" as const }))
      ));
    supabase.from("trip_logs").select("vehicle_id, km_end, date")
      .not("km_end", "is", null)
      .then(({ data }) => setTripLogs(
        ((data as any[]) || []).map(r => ({ vehicle_id: r.vehicle_id, km_end: r.km_end, date: r.date }))
      ));
  }, []);

  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const today = new Date();

    for (const v of vehicles) {
      const label = v.nazev_vozu || `${v.rz || "?"} – ${v.znacka || "?"} (${v.spravce || "?"})`;

      // STK check
      const stkDate = parseDateString(v.stk);
      if (stkDate && !excludeDashboardMonitoring) {
        const days = daysDiff(stkDate);
        if (days <= 180) {
          result.push({
            vehicleId: v.id,
            vehicleLabel: label,
            message: days < 0
              ? `STK expirovala před ${Math.abs(days)} dny!`
              : `STK vyprší za ${days} dní (${formatDate(stkDate)})`,
            daysLeft: days,
            type: days <= 30 ? "critical" : days <= 60 ? "warning" : "info",
            date: formatDate(stkDate),
          });
        }
      }

      // Zelená karta
      const zkDate = parseDateString(v.zelena_karta);
      if (zkDate) {
        const days = daysDiff(zkDate);
        if (days <= 180) {
          result.push({
            vehicleId: v.id,
            vehicleLabel: label,
            message: days < 0
              ? `Zelená karta expirovala před ${Math.abs(days)} dny!`
              : `Zelená karta vyprší za ${days} dní (${formatDate(zkDate)})`,
            daysLeft: days,
            type: days <= 60 ? "critical" : days <= 90 ? "warning" : "info",
            date: formatDate(zkDate),
          });
        }
      }

      // Leasing
      if (!excludeDashboardMonitoring && v.typ_vlastnictvi && v.typ_vlastnictvi !== "majetek") {
        const lDate = parseDateString(v.datum_ukonceni_leasingu);
        if (lDate) {
          const days = daysDiff(lDate);
          if (days <= 180) {
            result.push({
              vehicleId: v.id,
              vehicleLabel: label,
              message: days < 0
                ? `Leasing vypršel před ${Math.abs(days)} dny!`
                : `Leasing vyprší za ${days} dní (${formatDate(lDate)})`,
              daysLeft: days,
              type: days <= 30 ? "critical" : days <= 60 ? "warning" : "info",
              date: formatDate(lDate),
            });
          }
        }
      }

      // Mileage check for leasing vehicles
      if (!excludeDashboardMonitoring && v.typ_vlastnictvi && v.typ_vlastnictvi !== "majetek") {
        const input: LeasingMileageInput = {
          typ_vlastnictvi: v.typ_vlastnictvi ?? null,
          najezd_za_rok: v.najezd_za_rok ?? null,
          datum_zahajeni_leasingu: v.datum_zahajeni_leasingu ?? null,
          datum_ukonceni_leasingu: v.datum_ukonceni_leasingu ?? null,
          vychozi_stav_tachometru: v.vychozi_stav_tachometru ?? null,
        };
        const current = deriveCurrentMileage(v.id, input, mileageRecords, tripLogs);
        const m = computeLeasingMileage(input, current);

        if (m.percentageUsed !== null && m.percentageUsed >= 70) {
          const priorityDays = m.percentageUsed > 95 ? -1 : m.percentageUsed >= 80 ? 30 : 90;
          result.push({
            vehicleId: v.id,
            vehicleLabel: label,
            message: m.percentageUsed > 95
              ? `Překročení smluvního nájezdu! (${m.percentageUsed}% – ${(m.currentKm! - m.startKm!).toLocaleString("cs-CZ")} km)`
              : `Čerpání nájezdu ${m.percentageUsed}% (${(m.currentKm! - m.startKm!).toLocaleString("cs-CZ")} km)`,
            daysLeft: priorityDays,
            type: m.percentageUsed > 95 ? "critical" : m.percentageUsed >= 80 ? "warning" : "info",
            date: formatDate(today),
          });
        }
      }
    }

    return result.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [excludeDashboardMonitoring, vehicles, mileageRecords, tripLogs]);

  const critical = alerts.filter(a => a.type === "critical");
  const warning = alerts.filter(a => a.type === "warning");
  const info = alerts.filter(a => a.type === "info");
  const totalCount = alerts.length;

  const SEGMENTS = [
    { key: "critical", title: "Kritické", items: critical, dot: "bg-destructive", active: "border-destructive/40 bg-destructive/10", count: "text-destructive" },
    { key: "warning", title: "Varování", items: warning, dot: "bg-warning", active: "border-warning/40 bg-warning/10", count: "text-warning" },
    { key: "info", title: "Informace", items: info, dot: "bg-info", active: "border-info/40 bg-info/10", count: "text-info" },
  ] as const;

  const openSegment = SEGMENTS.find((s) => expanded[s.key]);

  const toggle = (key: string) =>
    setExpanded((prev) => ({ critical: false, warning: false, info: false, [key]: !prev[key] }));

  return (
    <div className="rounded-lg border bg-card shadow-card">
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => toggle(s.key)}
            disabled={s.items.length === 0}
            className={`flex items-center gap-2 px-3 py-2 text-left transition-colors sm:justify-center sm:py-2.5 ${
              expanded[s.key] ? s.active : "hover:bg-muted/50"
            } ${s.items.length === 0 ? "opacity-50" : ""}`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
            <span className={`text-base font-bold tabular-nums ${s.count}`}>{s.items.length}</span>
            <span className="truncate text-xs text-muted-foreground">{s.title}</span>
            {s.items.length > 0 &&
              (expanded[s.key] ? (
                <ChevronUp className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground sm:ml-0" />
              ) : (
                <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground sm:ml-0" />
              ))}
          </button>
        ))}
      </div>

      {openSegment ? (
        <div className="max-h-[260px] space-y-1 overflow-y-auto border-t p-2">
          {openSegment.items.map((a, i) => (
            <div
              key={i}
              onClick={() => navigate(`/vozidla/${a.vehicleId}`)}
              className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${openSegment.dot}`} />
              <Car className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="max-w-[55%] truncate text-xs font-medium sm:shrink-0 sm:max-w-none">{a.vehicleLabel}</span>
              <Badge
                variant={a.daysLeft < 0 ? "destructive" : "outline"}
                className="ml-auto shrink-0 text-[10px] tabular-nums sm:order-last"
              >
                {a.daysLeft < 0 ? "Expirováno" : `${a.daysLeft} dní`}
              </Badge>
              <span className="w-full truncate text-[11px] text-muted-foreground sm:w-auto sm:flex-1">{a.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-t px-3 py-1.5 text-center text-[11px] text-muted-foreground">
          {totalCount === 0 ? "Žádná upozornění" : `Celkem ${totalCount} upozornění – klikněte pro detail`}
        </div>
      )}
    </div>
  );
}
