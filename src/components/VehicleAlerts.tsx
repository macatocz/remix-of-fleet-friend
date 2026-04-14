import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

interface Props {
  vehicle: any;
  mileageRecords?: { km: number; recorded_at: string }[];
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

export default function VehicleAlerts({ vehicle, mileageRecords = [] }: Props) {
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
      const contractKm = v.najezd_za_rok ? parseInt((v.najezd_za_rok || "").replace(/\D/g, "")) : 0;
      if (contractKm > 0 && mileageRecords.length >= 2 && v.datum_zahajeni_leasingu) {
        const sorted = [...mileageRecords].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
        const oldest = sorted[0];
        const latest = sorted[sorted.length - 1];
        const totalDriven = latest.km - oldest.km;
        const startDate = parseDateString(v.datum_zahajeni_leasingu);
        const endDate = parseDateString(v.datum_ukonceni_leasingu);
        if (startDate) {
          const now = new Date();
          const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          const totalLeasingDays = endDate ? (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) : 365;
          const totalContractKm = (contractKm / 365) * totalLeasingDays;
          const expectedKmNow = (elapsedDays / totalLeasingDays) * totalContractKm;
          const percentage = expectedKmNow > 0 ? Math.round((totalDriven / expectedKmNow) * 100) : 0;

          if (percentage >= 70) {
            result.push({
              message: percentage > 95
                ? `Překročení smluvního nájezdu! (${percentage}% – ${totalDriven.toLocaleString("cs-CZ")} km)`
                : `Čerpání nájezdu ${percentage}% (${totalDriven.toLocaleString("cs-CZ")} km)`,
              type: percentage > 95 ? "critical" : percentage >= 80 ? "warning" : "info",
            });
          }
        }
      }
    }

    return result;
  }, [vehicle, mileageRecords]);

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
