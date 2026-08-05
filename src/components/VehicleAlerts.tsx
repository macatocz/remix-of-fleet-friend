import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { computeLeasingMileage, deriveCurrentMileage, LeasingMileageInput } from "@/lib/leasing/mileage";

interface Props {
  vehicle: any;
  mileageRecords?: { vehicle_id: string; km: number; recorded_at: string; source: "vehicle_mileage" | "trip_log" }[];
  tripLogs?: { vehicle_id: string; km_end: number | null; date: string | null }[];
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

interface Alert {
  message: string;
  type: "critical" | "warning" | "info";
}

export default function VehicleAlerts({ vehicle, mileageRecords = [], tripLogs = [] }: Props) {
  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const v = vehicle;

    // STK
    const stkDate = parseDateString(v.stk);
    if (stkDate) {
      const days = daysDiff(stkDate);
      if (days <= 180) {
        result.push({
          message: days < 0
            ? `STK expirovala před ${Math.abs(days)} dny!`
            : `STK vyprší za ${days} dní (${stkDate.toLocaleDateString("cs-CZ")})`,
          type: days <= 30 ? "critical" : days <= 60 ? "warning" : "info",
        });
      }
    }

    // Zelená karta
    const zkDate = parseDateString(v.zelena_karta);
    if (zkDate) {
      const days = daysDiff(zkDate);
      if (days <= 180) {
        result.push({
          message: days < 0
            ? `Zelená karta expirovala před ${Math.abs(days)} dny!`
            : `Zelená karta vyprší za ${days} dní (${zkDate.toLocaleDateString("cs-CZ")})`,
          type: days <= 30 ? "critical" : days <= 60 ? "warning" : "info",
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
            message: days < 0
              ? `Leasing vypršel před ${Math.abs(days)} dny!`
              : `Leasing vyprší za ${days} dní (${lDate.toLocaleDateString("cs-CZ")})`,
            type: days <= 30 ? "critical" : days <= 60 ? "warning" : "info",
          });
        }
      }

      // Mileage
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
        result.push({
          message: m.percentageUsed > 95
            ? `Překročení smluvního nájezdu! (${m.percentageUsed}% – ${(m.currentKm! - m.startKm!).toLocaleString("cs-CZ")} km)`
            : `Čerpání nájezdu ${m.percentageUsed}% (${(m.currentKm! - m.startKm!).toLocaleString("cs-CZ")} km)`,
          type: m.percentageUsed > 95 ? "critical" : m.percentageUsed >= 80 ? "warning" : "info",
        });
      }
    }

    return result;
  }, [vehicle, mileageRecords, tripLogs]);

  if (alerts.length === 0) return null;

  const critical = alerts.filter(a => a.type === "critical");
  const warning = alerts.filter(a => a.type === "warning");
  const info = alerts.filter(a => a.type === "info");

  return (
    <div className="space-y-2">
      {critical.map((a, i) => (
        <div key={`c${i}`} className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm">{a.message}</span>
          <Badge variant="destructive" className="ml-auto text-[10px] shrink-0">Kritické</Badge>
        </div>
      ))}
      {warning.map((a, i) => (
        <div key={`w${i}`} className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <span className="text-sm">{a.message}</span>
          <Badge variant="secondary" className="ml-auto text-[10px] shrink-0">Varování</Badge>
        </div>
      ))}
      {info.map((a, i) => (
        <div key={`i${i}`} className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/5 px-3 py-2">
          <Info className="h-4 w-4 text-info shrink-0" />
          <span className="text-sm">{a.message}</span>
          <Badge variant="outline" className="ml-auto text-[10px] shrink-0">Info</Badge>
        </div>
      ))}
    </div>
  );
}
