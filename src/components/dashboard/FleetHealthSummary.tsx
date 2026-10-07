import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CircleGauge, DatabaseZap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ChartTooltip from "@/components/dashboard/ChartTooltip";
import { axisProps, gridProps } from "@/components/dashboard/chartTheme";
import type { DeadlineGroup } from "@/components/dashboard/DeadlinesCard";
import {
  computeLeasingMileage,
  deriveCurrentMileage,
  type LeasingMileageInput,
  type MileageSource,
  type TripLogMileage,
} from "@/lib/leasing/mileage";

export type MonitoringFocus = "overdue" | "soon" | "risk" | "missing" | null;

interface Props {
  deadlineGroups: DeadlineGroup[];
  focus: MonitoringFocus;
  onFocusChange: (focus: MonitoringFocus) => void;
}

const STATUS_LABELS = {
  ok: "V pořádku",
  watch: "Sledovat",
  warning: "Varování",
  critical: "Kritické",
  "no-data": "Bez dat",
} as const;

const STATUS_COLORS = {
  ok: "hsl(var(--success))",
  watch: "hsl(var(--info))",
  warning: "hsl(var(--warning))",
  critical: "hsl(var(--destructive))",
  "no-data": "hsl(var(--muted-foreground))",
} as const;

export default function FleetHealthSummary({ deadlineGroups, focus, onFocusChange }: Props) {
  const [leaseStatuses, setLeaseStatuses] = useState<Array<keyof typeof STATUS_LABELS>>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("vehicles").select("id, typ_vlastnictvi, najezd_za_rok, datum_zahajeni_leasingu, datum_ukonceni_leasingu, vychozi_stav_tachometru").eq("status", "aktivní"),
      supabase.from("vehicle_mileage").select("vehicle_id, km, recorded_at"),
      supabase.from("trip_logs").select("vehicle_id, km_end, date").not("km_end", "is", null),
    ]).then(([vehicleRes, mileageRes, tripRes]) => {
      const mileage = ((mileageRes.data || []) as Array<{ vehicle_id: string; km: number; recorded_at: string }>).map((row) => ({
        ...row,
        source: "vehicle_mileage" as const,
      })) satisfies MileageSource[];
      const trips = (tripRes.data || []) as TripLogMileage[];
      const statuses = ((vehicleRes.data || []) as Array<LeasingMileageInput & { id: string }>)
        .filter((vehicle) => vehicle.typ_vlastnictvi === "operativni_leasing" || vehicle.typ_vlastnictvi === "financni_leasing")
        .map((vehicle) => computeLeasingMileage(vehicle, deriveCurrentMileage(vehicle.id, vehicle, mileage, trips)).status);
      setLeaseStatuses(statuses);
    });
  }, []);

  const deadlineItems = deadlineGroups.flatMap((group) => group.items);
  const overdue = deadlineItems.filter((item) => item.overdue || (item.days !== null && item.days < 0)).length;
  const soon = deadlineItems.filter((item) => !item.overdue && item.days !== null && item.days >= 0 && item.days <= 30).length;
  const risk = leaseStatuses.filter((status) => status === "warning" || status === "critical").length;
  const missing = leaseStatuses.filter((status) => status === "no-data").length;

  const termChart = useMemo(() => {
    const windows = [30, 60, 90, 180];
    return windows.map((limit) => ({
      name: `${limit} dní`,
      STK: deadlineGroups.find((group) => group.key === "stk")?.items.filter((item) => item.days !== null && item.days >= 0 && item.days <= limit).length ?? 0,
      Pojištění: deadlineGroups.find((group) => group.key === "pojisteni")?.items.filter((item) => item.days !== null && item.days >= 0 && item.days <= limit).length ?? 0,
      Leasing: deadlineGroups.find((group) => group.key === "leasing")?.items.filter((item) => item.days !== null && item.days >= 0 && item.days <= limit).length ?? 0,
      Servis: deadlineGroups.find((group) => group.key === "servis")?.items.filter((item) => item.overdue || item.days === null).length ?? 0,
    }));
  }, [deadlineGroups]);

  const mileageChart = (Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((status) => ({
    name: STATUS_LABELS[status],
    value: leaseStatuses.filter((item) => item === status).length,
    fill: STATUS_COLORS[status],
  }));

  const metrics = [
    { key: "overdue" as const, label: "Po termínu", value: overdue, icon: AlertTriangle, tone: "text-destructive", surface: "bg-destructive/10" },
    { key: "soon" as const, label: "Do 30 dní", value: soon, icon: CalendarClock, tone: "text-warning", surface: "bg-warning/10" },
    { key: "risk" as const, label: "Rizikový nájezd", value: risk, icon: CircleGauge, tone: "text-primary", surface: "bg-primary/10" },
    { key: "missing" as const, label: "Chybějící údaje", value: missing, icon: DatabaseZap, tone: "text-muted-foreground", surface: "bg-muted" },
  ];

  return (
    <div className="contents">
      <div className="order-1 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const active = focus === metric.key;
          return (
            <Button
              key={metric.key}
              type="button"
              variant="outline"
              aria-pressed={active}
              onClick={() => onFocusChange(active ? null : metric.key)}
              className={cn(
                "h-auto min-h-16 justify-start gap-3 bg-card px-3 py-2 text-left font-normal shadow-card hover:bg-muted/40",
                active && "border-primary ring-1 ring-primary/20",
              )}
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", metric.surface)}>
                <Icon className={cn("h-4 w-4", metric.tone)} />
              </span>
              <span className="min-w-0">
                <span className={cn("block text-xl font-bold tabular-nums", metric.tone)}>{metric.value}</span>
                <span className="block truncate text-xs text-muted-foreground">{metric.label}</span>
              </span>
            </Button>
          );
        })}
      </div>

      <div className="order-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="text-sm">Termíny v následujících měsících</CardTitle>
          </CardHeader>
          <CardContent className="h-48 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={termChart} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="STK" stackId="deadlines" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pojištění" stackId="deadlines" fill="hsl(var(--chart-3))" />
                <Bar dataKey="Leasing" stackId="deadlines" fill="hsl(var(--chart-2))" />
                <Bar dataKey="Servis" stackId="deadlines" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="border-b border-border/60 px-4 py-3">
            <CardTitle className="text-sm">Stav leasingového nájezdu</CardTitle>
          </CardHeader>
          <CardContent className="grid h-48 grid-cols-[minmax(0,1fr)_minmax(120px,0.8fr)] items-center gap-2 p-3">
            {leaseStatuses.length === 0 ? (
              <p className="col-span-2 text-center text-xs text-muted-foreground">Žádná leasingová vozidla</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={mileageChart} dataKey="value" nameKey="name" innerRadius={42} outerRadius={66} paddingAngle={2} stroke="hsl(var(--card))" strokeWidth={2}>
                      {mileageChart.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {mileageChart.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <strong className="tabular-nums">{entry.value}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}