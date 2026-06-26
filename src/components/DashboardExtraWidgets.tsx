import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Route, MapPin } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
];

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Vytíženost vozidel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Vytíženost vozidel (30 dní)
            {utilization.length > 0 && <Badge variant="secondary">{utilization.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {utilization.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Žádná data za posledních 30 dní</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={utilization} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={200}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value: string) => value.length > 30 ? value.slice(0, 27) + "…" : value}
                />
                <Tooltip />
                <Bar dataKey="value" name="Rezervace" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Rozložení po lokalitách */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-info" />
            Rozložení po lokalitách
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byLocation.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Žádná data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={byLocation} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ value }) => value}>
                  {byLocation.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top náklady */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-destructive" />
            Top 5 nákladů (servis + pojištění)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topCosts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Žádná data</p>
          ) : (
            <div className="space-y-2">
              {topCosts.map((r, i) => (
                <div key={r.name + i} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 justify-center">{i + 1}</Badge>
                    <span className="text-sm font-medium">{r.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{r.value.toLocaleString("cs-CZ")} Kč</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top nájezd */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Route className="h-5 w-5 text-success" />
            Top 5 nájezdů (30 dní)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topKm.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Žádná data</p>
          ) : (
            <div className="space-y-2">
              {topKm.map((r, i) => (
                <div key={r.name + i} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 justify-center">{i + 1}</Badge>
                    <span className="text-sm font-medium">{r.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{r.value.toLocaleString("cs-CZ")} km</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
