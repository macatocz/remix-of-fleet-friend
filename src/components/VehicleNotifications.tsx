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

export default function VehicleNotifications() {
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
      if (stkDate) {
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
      if (v.typ_vlastnictvi && v.typ_vlastnictvi !== "majetek") {
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
      if (v.typ_vlastnictvi && v.typ_vlastnictvi !== "majetek") {
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
  }, [vehicles, mileageRecords, tripLogs]);

  const critical = alerts.filter(a => a.type === "critical");
  const warning = alerts.filter(a => a.type === "warning");
  const info = alerts.filter(a => a.type === "info");
  const totalCount = alerts.length;

  const INITIAL_SHOW = 3;

  const renderColumn = (
    title: string,
    items: Alert[],
    key: string,
    bgClass: string,
    borderClass: string,
    badgeBg: string,
    dotColor: string,
  ) => {
    const showAll = expanded[key];
    const visible = showAll ? items : items.slice(0, INITIAL_SHOW);
    const remaining = items.length - INITIAL_SHOW;

    return (
      <div className={`rounded-lg border ${borderClass} ${bgClass} p-4 flex-1 min-w-[280px]`}>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant="secondary" className={badgeBg}>{items.length}</Badge>
        </div>
        <div className="space-y-2">
          {visible.map((a, i) => (
            <div key={i} className="flex items-start gap-2 bg-background/60 rounded-md p-2.5 cursor-pointer hover:bg-background/90 transition-colors" onClick={() => navigate(`/vozidla/${a.vehicleId}`)}>
              <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium truncate flex items-center gap-1">
                    <Car className="h-3 w-3 shrink-0" />
                    {a.vehicleLabel}
                  </p>
                  {a.daysLeft < 0 ? (
                    <Badge variant="destructive" className="text-[10px] shrink-0">Expirováno</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] shrink-0">{a.daysLeft} dní</Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{a.message}</p>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Žádná upozornění</p>
          )}
        </div>
        {remaining > 0 && (
          <button
            onClick={() => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
            className="text-xs text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1"
          >
            {showAll ? (
              <><ChevronUp className="h-3 w-3" />Skrýt</>
            ) : (
              <><ChevronDown className="h-3 w-3" />+ Zobrazit dalších {remaining}</>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <span className="text-sm text-muted-foreground">{totalCount} upozornění</span>
      </div>
      <div className="flex flex-col lg:flex-row gap-4">

        {renderColumn("Kritické", critical, "critical",
          "bg-destructive/5", "border-destructive/20", "bg-destructive/20 text-destructive", "bg-destructive")}
        {renderColumn("Varování", warning, "warning",
          "bg-warning/5", "border-warning/20", "bg-warning/20 text-warning", "bg-warning")}
        {renderColumn("Informace", info, "info",
          "bg-info/5", "border-info/20", "bg-info/20 text-info", "bg-info")}
      </div>
    </div>
  );
}
