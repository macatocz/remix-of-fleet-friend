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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {critical.map((a, i) => (
        <div key={`c${i}`} className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <p className="flex-1 text-sm font-medium text-destructive">{a.message}</p>
          <Badge variant="destructive" className="shrink-0 text-[10px]">Kritické</Badge>
        </div>
      ))}
      {warning.map((a, i) => (
        <div key={`w${i}`} className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <p className="flex-1 text-sm font-medium text-warning">{a.message}</p>
          <Badge className="shrink-0 bg-warning text-warning-foreground text-[10px]">Varování</Badge>
        </div>
      ))}
      {info.map((a, i) => (
        <div key={`i${i}`} className="flex items-center gap-3 rounded-xl border border-info/30 bg-info/10 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info/20 text-info">
            <Info className="h-5 w-5" />
          </span>
          <p className="flex-1 text-sm font-medium text-info">{a.message}</p>
          <Badge variant="outline" className="shrink-0 text-[10px] border-info/50 text-info">Info</Badge>
        </div>
      ))}
    </div>
  );
}
