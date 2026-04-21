import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Car, Search, MapPin, User, Tag, AlertTriangle,
  ChevronDown, Check, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  "aktivní": "bg-success/15 text-success border-success/30",
  "servis": "bg-warning/15 text-warning border-warning/30",
  "vyřazené": "bg-muted text-muted-foreground border-border",
  "vyřazeno": "bg-muted text-muted-foreground border-border",
};

const isExpiringSoon = (date: string | null) => {
  if (!date) return false;
  const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
};
const isExpired = (date: string | null) => {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
};

export default function MobileVehicles() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusSheet, setStatusSheet] = useState(false);
  const [categorySheet, setCategorySheet] = useState(false);
  const [locationSheet, setLocationSheet] = useState(false);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicles_mobile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("rz", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ["vehicles_mobile_inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select("vehicle_id, valid_until, type")
        .eq("type", "STK");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: insurance = [] } = useQuery({
    queryKey: ["vehicles_mobile_insurance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance")
        .select("vehicle_id, valid_until");
      if (error) throw error;
      return data as any[];
    },
  });

  const stkByVehicle = useMemo(() => {
    const map: Record<string, string> = {};
    inspections.forEach((i: any) => {
      if (!map[i.vehicle_id] || new Date(i.valid_until) > new Date(map[i.vehicle_id])) {
        map[i.vehicle_id] = i.valid_until;
      }
    });
    return map;
  }, [inspections]);

  const insByVehicle = useMemo(() => {
    const map: Record<string, string> = {};
    insurance.forEach((i: any) => {
      if (!map[i.vehicle_id] || new Date(i.valid_until) > new Date(map[i.vehicle_id])) {
        map[i.vehicle_id] = i.valid_until;
      }
    });
    return map;
  }, [insurance]);

  const categories = useMemo(
    () => Array.from(new Set(vehicles.map((v: any) => v.kategorie).filter(Boolean))) as string[],
    [vehicles]
  );
  const locations = useMemo(
    () => Array.from(new Set(vehicles.map((v: any) => v.lokalita).filter(Boolean))) as string[],
    [vehicles]
  );
  const statuses = useMemo(
    () => Array.from(new Set(vehicles.map((v: any) => v.status).filter(Boolean))) as string[],
    [vehicles]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v: any) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (categoryFilter !== "all" && v.kategorie !== categoryFilter) return false;
      if (locationFilter !== "all" && v.lokalita !== locationFilter) return false;
      if (!q) return true;
      const hay = [v.rz, v.znacka, v.vin, v.spravce].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [vehicles, search, statusFilter, categoryFilter, locationFilter]);

  const FilterChip = ({
    label, value, onClick,
  }: { label: string; value: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        value !== "all"
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-border bg-background text-foreground"
      )}
    >
      <span className="text-muted-foreground text-xs">{label}:</span>
      <span>{value === "all" ? "Vše" : value}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
  );

  const SelectSheet = ({
    open, onOpenChange, title, options, current, onSelect,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    options: string[];
    current: string;
    onSelect: (v: string) => void;
  }) => (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {["all", ...options].map((opt) => (
            <button
              key={opt}
              onClick={() => { onSelect(opt); onOpenChange(false); }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-muted"
            >
              <span className="text-base capitalize">{opt === "all" ? "Vše" : opt}</span>
              {current === opt && <Check className="h-5 w-5 text-primary" />}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  const hasFilters = statusFilter !== "all" || categoryFilter !== "all" || locationFilter !== "all" || !!search;

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Vozidla</h1>
        </div>
        {!isLoading && (
          <Badge variant="secondary" className="rounded-full">
            {filtered.length}
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Hledat RZ, značku, VIN, správce…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        <FilterChip label="Stav" value={statusFilter} onClick={() => setStatusSheet(true)} />
        <FilterChip label="Kategorie" value={categoryFilter} onClick={() => setCategorySheet(true)} />
        <FilterChip label="Lokalita" value={locationFilter} onClick={() => setLocationSheet(true)} />
        {hasFilters && (
          <button
            onClick={() => {
              setStatusFilter("all"); setCategoryFilter("all");
              setLocationFilter("all"); setSearch("");
            }}
            className="shrink-0 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            Vyčistit
          </button>
        )}
      </div>

      <SelectSheet
        open={statusSheet} onOpenChange={setStatusSheet}
        title="Stav vozidla" options={statuses}
        current={statusFilter} onSelect={setStatusFilter}
      />
      <SelectSheet
        open={categorySheet} onOpenChange={setCategorySheet}
        title="Kategorie" options={categories}
        current={categoryFilter} onSelect={setCategoryFilter}
      />
      <SelectSheet
        open={locationSheet} onOpenChange={setLocationSheet}
        title="Lokalita" options={locations}
        current={locationFilter} onSelect={setLocationFilter}
      />

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Car className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Žádná vozidla</p>
          {hasFilters && (
            <p className="text-xs text-muted-foreground mt-1">Zkus změnit filtry</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v: any) => {
            const stk = stkByVehicle[v.id];
            const ins = insByVehicle[v.id];
            const stkAlert = isExpired(stk) || isExpiringSoon(stk);
            const insAlert = isExpired(ins) || isExpiringSoon(ins);
            const isPool = !v.spravce_id && !v.spravce;

            return (
              <Card
                key={v.id}
                onClick={() => navigate(`/m/vozidla/${v.id}`)}
                className="active:scale-[0.99] transition-transform cursor-pointer overflow-hidden"
              >
                <div className="p-4 space-y-2.5">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-base font-mono truncate">
                        {v.rz || "—"}
                      </div>
                      {v.znacka && (
                        <div className="text-xs text-muted-foreground truncate">
                          {v.znacka}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("capitalize shrink-0", statusStyles[v.status])}
                    >
                      {v.status}
                    </Badge>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {v.kategorie && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />{v.kategorie}
                      </span>
                    )}
                    {v.lokalita && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{v.lokalita}
                      </span>
                    )}
                  </div>

                  {/* Manager / pool */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      {isPool ? (
                        <>
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <Badge variant="secondary" className="text-[10px] py-0">POOL</Badge>
                        </>
                      ) : (
                        <>
                          <User className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{v.spravce || "—"}</span>
                        </>
                      )}
                    </div>
                    {(stkAlert || insAlert) && (
                      <div className="flex items-center gap-1 text-warning font-medium shrink-0">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>
                          {stkAlert && insAlert ? "STK & poj." : stkAlert ? "STK" : "Pojištění"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
