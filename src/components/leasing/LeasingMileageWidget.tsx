import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Gauge, ArrowRight, ChevronDown, ChevronUp, DatabaseZap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeLeasingMileage,
  deriveCurrentMileage,
  LeasingMileageInput,
  MileageSource,
  TripLogMileage,
} from "@/lib/leasing/mileage";
import type { MonitoringFocus } from "@/components/dashboard/FleetHealthSummary";

const PREVIEW_COUNT = 5;

// Gradient fill per status (semantic tokens), stronger than flat statusColor
const BAR_GRAD: Record<string, string> = {
  ok: "stripe-success",
  watch: "stripe-info",
  warning: "stripe-warning",
  critical: "stripe-destructive",
  "no-data": "stripe-muted",
};

const STATUS_TEXT: Record<string, string> = {
  critical: "text-destructive font-bold",
  warning: "text-warning font-semibold",
  ok: "text-success font-semibold",
  watch: "text-info font-medium",
  "no-data": "text-muted-foreground",
};

export default function LeasingMileageWidget({ focus }: { focus?: MonitoringFocus }) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [records, setRecords] = useState<MileageSource[]>([]);
  const [tripLogs, setTripLogs] = useState<TripLogMileage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);


  useEffect(() => {
    Promise.all([
      supabase.from("vehicles").select("id, nazev_vozu, znacka, rz, typ_vlastnictvi, najezd_za_rok, datum_zahajeni_leasingu, datum_ukonceni_leasingu, vychozi_stav_tachometru").eq("status", "aktivní"),
      supabase.from("vehicle_mileage").select("vehicle_id, km, recorded_at"),
      supabase.from("trip_logs").select("vehicle_id, km_end, date").not("km_end", "is", null),
    ]).then(([vRes, mRes, tRes]) => {
      setVehicles((vRes.data as any[]) || []);
      setRecords(
        ((mRes.data as any[]) || []).map((r) => ({
          vehicle_id: r.vehicle_id,
          km: r.km,
          recorded_at: r.recorded_at,
          source: "vehicle_mileage" as const,
        }))
      );
      setTripLogs(
        ((tRes.data as any[]) || []).map((r) => ({
          vehicle_id: r.vehicle_id,
          km_end: r.km_end,
          date: r.date,
        }))
      );
      setLoading(false);
    });
  }, []);

  const rows = useMemo(() => {
    return vehicles
      .map((v) => {
        const input: LeasingMileageInput = {
          typ_vlastnictvi: v.typ_vlastnictvi ?? null,
          najezd_za_rok: v.najezd_za_rok ?? null,
          datum_zahajeni_leasingu: v.datum_zahajeni_leasingu ?? null,
          datum_ukonceni_leasingu: v.datum_ukonceni_leasingu ?? null,
          vychozi_stav_tachometru: v.vychozi_stav_tachometru ?? null,
        };
        const current = deriveCurrentMileage(v.id, input, records, tripLogs);
        const result = computeLeasingMileage(input, current);
        return {
          id: v.id,
          label: v.nazev_vozu || `${v.znacka || "?"} (${v.rz || "?"})`,
          result,
          percentage: result.percentageUsed ?? 0,
        };
      })
      .filter((r) => r.result.status !== "no-data" || r.result.totalContractKm !== null)
      .sort((a, b) => b.percentage - a.percentage);
  }, [vehicles, records, tripLogs]);

  const filteredRows = rows.filter((row) => {
    if (focus === "risk") return row.result.status === "warning" || row.result.status === "critical";
    if (focus === "missing") return row.result.status === "no-data";
    return true;
  });
  const visibleRows = expanded ? filteredRows : filteredRows.slice(0, PREVIEW_COUNT);
  const hasMore = filteredRows.length > PREVIEW_COUNT;


  return (
    <Card className="h-full overflow-hidden shadow-card">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10"><Gauge className="h-4 w-4 text-info" /></span>
            Čerpání nájezdu leasingu
          </span>
          {!loading && rows.length > 0 && (
            <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {rows.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Načítání…</div>
        ) : filteredRows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Žádná aktivní leasingová vozidla s údaji o nájezdu.</div>
        ) : (
          <div className="space-y-1.5">
            {visibleRows.map((row) => (
              <div
                key={row.id}
                className="group cursor-pointer rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/vozidla/${row.id}`)}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium truncate">{row.label}</span>
                  <span className={cn("text-[11px] flex items-center gap-1 tabular-nums", STATUS_TEXT[row.result.status] ?? "text-muted-foreground")}>
                    {row.result.status === "no-data" ? <DatabaseZap className="h-3 w-3" /> : `${row.percentage}% plánu`}
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", BAR_GRAD[row.result.status] ?? "stripe-muted")}
                    style={{ width: `${Math.min(100, row.percentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>
                    {row.result.currentKm !== null ? row.result.currentKm.toLocaleString("cs-CZ") : "—"} km
                    {row.result.differenceKm !== null && (
                      <span className={cn("ml-1", row.result.differenceKm > 0 ? "text-destructive" : "text-success")}>
                        ({row.result.differenceKm > 0 ? "+" : ""}
                        {row.result.differenceKm.toLocaleString("cs-CZ")})
                      </span>
                    )}
                  </span>
                   <span>
                     {row.result.projectedOverrun !== null
                       ? `${row.result.projectedOverrun > 0 ? "+" : ""}${row.result.projectedOverrun.toLocaleString("cs-CZ")} km odhad`
                       : `limit ${row.result.totalContractKm?.toLocaleString("cs-CZ") ?? "—"} km`}
                   </span>
                </div>
              </div>
            ))}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                    Zobrazit méně
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                     Zobrazit vše ({filteredRows.length})
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

