import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, CheckCircle, Wrench, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import VehicleNotifications from "@/components/VehicleNotifications";

const costData = [
  { month: "Led", servis: 45000, phm: 62000, pojisteni: 18000 },
  { month: "Úno", servis: 32000, phm: 58000, pojisteni: 18000 },
  { month: "Bře", servis: 28000, phm: 65000, pojisteni: 18000 },
  { month: "Dub", servis: 52000, phm: 61000, pojisteni: 18000 },
  { month: "Kvě", servis: 38000, phm: 70000, pojisteni: 18000 },
  { month: "Čvn", servis: 41000, phm: 68000, pojisteni: 18000 },
];

const fuelData = [
  { month: "Led", spotreba: 7.2 },
  { month: "Úno", spotreba: 7.0 },
  { month: "Bře", spotreba: 6.8 },
  { month: "Dub", spotreba: 6.9 },
  { month: "Kvě", spotreba: 7.1 },
  { month: "Čvn", spotreba: 6.7 },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, service: 0, decommissioned: 0 });

  useEffect(() => {
    supabase.from("vehicles").select("status").then(({ data }) => {
      if (!data) return;
      setStats({
        total: data.length,
        active: data.filter(v => v.status === "aktivní").length,
        service: data.filter(v => v.status === "v_servisu").length,
        decommissioned: data.filter(v => v.status === "vyřazeno").length,
      });
    });
  }, []);

  const statCards = [
    { label: "Celkem vozidel", value: stats.total, icon: Car, color: "text-primary" },
    { label: "Aktivních", value: stats.active, icon: CheckCircle, color: "text-success" },
    { label: "V servisu", value: stats.service, icon: Wrench, color: "text-warning" },
    { label: "Vyřazeno", value: stats.decommissioned, icon: AlertTriangle, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <VehicleNotifications />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Náklady za posledních 6 měsíců</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={costData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number) => `${v.toLocaleString("cs-CZ")} Kč`} />
                <Legend />
                <Bar dataKey="servis" name="Servis" fill="hsl(217, 71%, 45%)" />
                <Bar dataKey="phm" name="PHM" fill="hsl(142, 71%, 45%)" />
                <Bar dataKey="pojisteni" name="Pojištění" fill="hsl(38, 92%, 50%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Průměrná spotřeba (l/100km)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={fuelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[6, 8]} />
                <Tooltip />
                <Line type="monotone" dataKey="spotreba" name="Spotřeba" stroke="hsl(217, 71%, 45%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
