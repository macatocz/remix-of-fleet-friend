import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, CheckCircle, Wrench, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from "recharts";

const stats = [
  { label: "Celkem vozidel", value: 47, icon: Car, color: "text-primary" },
  { label: "Aktivních", value: 38, icon: CheckCircle, color: "text-success" },
  { label: "V servisu", value: 6, icon: Wrench, color: "text-warning" },
  { label: "Upozornění", value: 3, icon: AlertTriangle, color: "text-destructive" },
];

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

const alerts = [
  { text: "STK expiruje: Škoda Octavia (1AB 2345)", type: "destructive" as const },
  { text: "Pojištění expiruje: VW Passat (2CD 6789)", type: "warning" as const },
  { text: "Plánovaný servis: Ford Transit (3EF 1234)", type: "info" as const },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upozornění</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-md p-3 ${
                  a.type === "destructive" ? "bg-destructive/10 text-destructive" :
                  a.type === "warning" ? "bg-warning/10 text-warning" :
                  "bg-info/10 text-info"
                }`}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm">{a.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
