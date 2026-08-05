import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Gauge, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeLeasingMileage,
  deriveCurrentMileage,
  statusColor,
  LeasingMileageInput,
  MileageSource,
  TripLogMileage,
} from "@/lib/leasing/mileage";

const PREVIEW_COUNT = 5;

export default function LeasingMileageWidget() {
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

  const visibleRows = expanded ? rows : rows.slice(0, PREVIEW_COUNT);
  const hasMore = rows.length > PREVIEW_COUNT;


  return (
    <Card>
      <CardHeader className="border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Čerpání nájezdu leasingových vozů
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
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Žádná aktivní leasingová vozidla s údaji o nájezdu.</div>
        ) : (
          <div className="space-y-1.5">
            {visibleRows.map((row) => (
              <div
                key={row.id}
                className="group cursor-pointer rounded-md border p-2 hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/vozidla/${row.id}`)}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium truncate">{row.label}</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 tabular-nums">
                    {row.percentage}%
                    <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full transition-all", statusColor(row.result.status))}
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
                  <span>{row.result.totalContractKm?.toLocaleString("cs-CZ") ?? "—"} km</span>
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
                    Zobrazit vše ({rows.length})
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

