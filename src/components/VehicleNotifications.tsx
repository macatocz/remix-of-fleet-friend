import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Car, ChevronDown, ChevronUp } from "lucide-react";

interface Vehicle {
  id: string;
  znacka: string | null;
  rz: string | null;
  spravce: string | null;
  stk: string | null;
  zelena_karta: string | null;
  datum_ukonceni_leasingu: string | null;
  typ_vlastnictvi: string | null;
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
  // Try common formats: "do 19.02.2027", "19.02.2027", "2027-02-19", "1.1.2026"
  const cleaned = s.replace(/^do\s+/i, "").trim();

  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return new Date(cleaned);

  // Czech format d.m.yyyy or dd.mm.yyyy
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
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    critical: false, warning: false, info: false,
  });

  useEffect(() => {
    supabase.from("vehicles").select("id, znacka, rz, spravce, stk, zelena_karta, datum_ukonceni_leasingu, typ_vlastnictvi, status")
      .eq("status", "aktivní")
      .then(({ data }) => setVehicles((data as Vehicle[]) || []));
  }, []);

  const alerts = useMemo(() => {
    const result: Alert[] = [];
    const today = new Date();

    for (const v of vehicles) {
      const label = `${v.rz || "?"} – ${v.znacka || "?"} (${v.spravce || "?"})`;

      // STK check
      const stkDate = parseDateString(v.stk);
      if (stkDate) {
        const days = daysDiff(stkDate);
        if (days <= 180) {
          result.push({
            vehicleLabel: label,
            message: days < 0
              ? `STK expirovala před ${Math.abs(days)} dny!`
              : `STK vyprší za ${days} dní (${formatDate(stkDate)})`,
            daysLeft: days,
            type: days < 0 ? "critical" : days <= 60 ? "warning" : "info",
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
            vehicleLabel: label,
            message: days < 0
              ? `Zelená karta expirovala před ${Math.abs(days)} dny!`
              : `Zelená karta vyprší za ${days} dní (${formatDate(zkDate)})`,
            daysLeft: days,
            type: days < 0 ? "critical" : days <= 60 ? "warning" : "info",
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
              vehicleLabel: label,
              message: days < 0
                ? `Leasing vypršel před ${Math.abs(days)} dny!`
                : `Leasing vyprší za ${days} dní (${formatDate(lDate)})`,
              daysLeft: days,
              type: days < 0 ? "critical" : days <= 60 ? "warning" : "info",
              date: formatDate(lDate),
            });
          }
        }
      }
    }

    return result.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [vehicles]);

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
            <div key={i} className="flex items-start gap-2 bg-background/60 rounded-md p-2.5">
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Notifikace</h2>
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
