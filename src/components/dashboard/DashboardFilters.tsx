import { useEffect, useState } from "react";
import { Car, Users, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PeriodKey = "1" | "3" | "6" | "12";

export const PERIODS: { key: PeriodKey; label: string; title: string }[] = [
  { key: "1", label: "Měsíc", title: "Tento měsíc" },
  { key: "3", label: "3M", title: "Poslední 3 měsíce" },
  { key: "6", label: "6M", title: "Posledních 6 měsíců" },
  { key: "12", label: "12M", title: "Posledních 12 měsíců" },
];

interface Props {
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  vehicleId: string;
  onVehicleChange: (id: string) => void;
  driverId: string;
  onDriverChange: (id: string) => void;
}

export default function DashboardFilters({
  period, onPeriodChange, vehicleId, onVehicleChange, driverId, onDriverChange,
}: Props) {
  const [vehicles, setVehicles] = useState<{ id: string; label: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    supabase.from("vehicles").select("id, nazev_vozu, znacka, rz").then(({ data }) => {
      setVehicles((data || []).map((v: any) => ({
        id: v.id,
        label: v.nazev_vozu || `${v.znacka || "?"} (${v.rz || "?"})`,
      })).sort((a, b) => a.label.localeCompare(b.label, "cs")));
    });
    supabase.from("drivers").select("id, first_name, last_name").then(({ data }) => {
      setDrivers((data || []).map((d: any) => ({
        id: d.id,
        label: `${d.first_name || ""} ${d.last_name || ""}`.trim() || "?",
      })).sort((a, b) => a.label.localeCompare(b.label, "cs")));
    });
  }, []);

  const isFiltered = vehicleId !== "all" || driverId !== "all" || period !== "6";

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card/60 p-3 shadow-card">
      <div className="inline-flex rounded-md border bg-background p-0.5">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriodChange(p.key)}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition-colors",
              period === p.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Car className="h-4 w-4 text-muted-foreground" />
        <Select value={vehicleId} onValueChange={onVehicleChange}>
          <SelectTrigger className="h-9 w-[200px] text-sm">
            <SelectValue placeholder="Všechna vozidla" />
          </SelectTrigger>
          <SelectContent className="max-h-72 bg-popover">
            <SelectItem value="all">Všechna vozidla</SelectItem>
            {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Select value={driverId} onValueChange={onDriverChange}>
          <SelectTrigger className="h-9 w-[200px] text-sm">
            <SelectValue placeholder="Všichni řidiči" />
          </SelectTrigger>
          <SelectContent className="max-h-72 bg-popover">
            <SelectItem value="all">Všichni řidiči</SelectItem>
            {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground"
          onClick={() => { onPeriodChange("6"); onVehicleChange("all"); onDriverChange("all"); }}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Zrušit filtry
        </Button>
      )}
    </div>
  );
}
