import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, Route, MapPin } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import ChartCard from "@/components/dashboard/ChartCard";
import ChartTooltip from "@/components/dashboard/ChartTooltip";
import EmptyState from "@/components/dashboard/EmptyState";
import RankList from "@/components/dashboard/RankList";
import { CHART_COLORS, axisProps, gridProps, formatCzk } from "@/components/dashboard/chartTheme";

export default function DashboardExtraWidgets() {
  const [utilization, setUtilization] = useState<{ name: string; value: number }[]>([]);
  const [topCosts, setTopCosts] = useState<{ name: string; value: number }[]>([]);
  const [topKm, setTopKm] = useState<{ name: string; value: number }[]>([]);
  const [byLocation, setByLocation] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().slice(0, 10);

    // Vehicles map for labels + locations
    supabase.from("vehicles").select("id, znacka, rz, lokalita").then(({ data: vehicles }) => {
      if (!vehicles) return;
      const labelOf = (id: string) => {
        const v = vehicles.find(v => v.id === id);
        return v ? `${v.rz || "?"} – ${v.znacka || "?"}` : "?";
      };

      // Lokality rozložení
      const locMap: Record<string, number> = {};
      vehicles.forEach(v => {
        const loc = v.lokalita || "Neuvedeno";
        locMap[loc] = (locMap[loc] || 0) + 1;
      });
      setByLocation(
        Object.entries(locMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      // Vytíženost: počet rezervací posledních 30 dní per vozidlo
      supabase.from("reservations").select("vehicle_id").gte("date_from", sinceStr).then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        data.forEach((r: any) => { counts[r.vehicle_id] = (counts[r.vehicle_id] || 0) + 1; });
        setUtilization(
          Object.entries(counts)
            .map(([id, value]) => ({ name: labelOf(id), value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7)
        );
      });

      // Top náklady (servis + roční pojištění)
      Promise.all([
        supabase.from("service_records").select("vehicle_id, cost"),
        supabase.from("insurance").select("vehicle_id, annual_cost"),
      ]).then(([sr, ins]) => {
        const sums: Record<string, number> = {};
        (sr.data || []).forEach((r: any) => {
          sums[r.vehicle_id] = (sums[r.vehicle_id] || 0) + (Number(r.cost) || 0);
        });
        (ins.data || []).forEach((r: any) => {
          sums[r.vehicle_id] = (sums[r.vehicle_id] || 0) + (Number(r.annual_cost) || 0);
        });
        setTopCosts(
          Object.entries(sums)
            .map(([id, value]) => ({ name: labelOf(id), value: Math.round(value) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
        );
      });

      // Top nájezd posledních 30 dní
      supabase.from("trip_logs").select("vehicle_id, km_total").gte("date", sinceStr).then(({ data }) => {
        if (!data) return;
        const sums: Record<string, number> = {};
        data.forEach((r: any) => { sums[r.vehicle_id] = (sums[r.vehicle_id] || 0) + (Number(r.km_total) || 0); });
        setTopKm(
          Object.entries(sums)
            .map(([id, value]) => ({ name: labelOf(id), value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
        );
      });
    });
  }, []);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <ChartCard
        title="Vytíženost vozidel"
        subtitle="Počet rezervací za posledních 30 dní"
        icon={TrendingUp}
        count={utilization.length}
      >
        {utilization.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Žádná data za posledních 30 dní" />
        ) : (
          <div className="h-[220px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={utilization} layout="vertical" margin={{ left: 0, right: 16, top: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="gradUtil" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} vertical horizontal={false} />
              <XAxis type="number" allowDecimals={false} {...axisProps} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                {...axisProps}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value: string) => (value.length > 18 ? value.slice(0, 16) + "…" : value)}
              />
              <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} content={<ChartTooltip />} />
              <Bar dataKey="value" name="Rezervace" fill="url(#gradUtil)" radius={[0, 6, 6, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Rozložení po lokalitách" subtitle="Počet vozidel podle lokality" icon={MapPin} iconClass="text-info">
        {byLocation.length === 0 ? (
          <EmptyState icon={MapPin} title="Žádná data" />
        ) : (
          <div className="h-[220px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byLocation}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={42}
                outerRadius={70}
                paddingAngle={2}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              >
                {byLocation.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px" }} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Top 5 nákladů" subtitle="Servis a roční pojištění" icon={DollarSign} iconClass="text-destructive">
        {topCosts.length === 0 ? (
          <EmptyState icon={DollarSign} title="Žádná data" />
        ) : (
          <RankList items={topCosts} suffix="Kč" tone="destructive" />
        )}
      </ChartCard>

      <ChartCard title="Top 5 nájezdů" subtitle="Posledních 30 dní" icon={Route} iconClass="text-success">
        {topKm.length === 0 ? (
          <EmptyState icon={Route} title="Žádná data" />
        ) : (
          <RankList items={topKm} suffix="km" tone="success" />
        )}
      </ChartCard>
    </div>
  );
}
