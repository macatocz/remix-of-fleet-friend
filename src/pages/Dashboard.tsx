import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, CheckCircle, Wrench, AlertTriangle, CalendarDays, Clock, Shield } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import VehicleNotifications from "@/components/VehicleNotifications";

function parseDateString(s: string | null): Date | null {
  if (!s) return null;
  const cleaned = s.replace(/^do\s+/i, "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return new Date(cleaned);
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

const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(217, 71%, 45%)"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [vehicleStats, setVehicleStats] = useState({ total: 0, active: 0, service: 0, decommissioned: 0 });
  const [reservationStats, setReservationStats] = useState({ active: 0, pending: 0, today: 0 });
  const [stkSoon, setStkSoon] = useState<{ id: string; label: string; days: number; date: string }[]>([]);
  const [reservationsByVehicle, setReservationsByVehicle] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    // Fetch vehicles
    supabase.from("vehicles").select("id, znacka, rz, spravce, stk, status").then(({ data }) => {
      if (!data) return;
      setVehicleStats({
        total: data.length,
        active: data.filter(v => v.status === "aktivní").length,
        service: data.filter(v => v.status === "v_servisu").length,
        decommissioned: data.filter(v => v.status === "vyřazeno").length,
      });

      // STK approaching (within 90 days)
      const stks = data
        .filter(v => v.status === "aktivní" && v.stk)
        .map(v => {
          const d = parseDateString(v.stk);
          if (!d) return null;
          const days = daysDiff(d);
          if (days > 90) return null;
          return {
            id: v.id,
            label: `${v.rz || "?"} – ${v.znacka || "?"}`,
            days,
            date: d.toLocaleDateString("cs-CZ"),
          };
        })
        .filter(Boolean) as { id: string; label: string; days: number; date: string }[];
      setStkSoon(stks.sort((a, b) => a.days - b.days));
    });

    // Fetch reservations
    const todayStr = new Date().toISOString().split("T")[0];
    supabase.from("reservations").select("id, status, date_from, date_to, vehicle_id, vehicles(znacka, rz)")
      .in("status", ["čeká", "schváleno"])
      .then(({ data }) => {
        if (!data) return;
        const active = data.filter(r => r.status === "schváleno").length;
        const pending = data.filter(r => r.status === "čeká").length;
        const today = data.filter(r => r.date_from <= todayStr && r.date_to >= todayStr && r.status === "schváleno").length;
        setReservationStats({ active, pending, today });

        // Group by vehicle for pie chart
        const byVehicle: Record<string, { name: string; value: number }> = {};
        data.forEach(r => {
          const vid = r.vehicle_id;
          const vLabel = r.vehicles ? `${(r.vehicles as any).znacka || "?"} (${(r.vehicles as any).rz || "?"})` : vid;
          if (!byVehicle[vid]) byVehicle[vid] = { name: vLabel, value: 0 };
          byVehicle[vid].value++;
        });
        setReservationsByVehicle(Object.values(byVehicle).sort((a, b) => b.value - a.value).slice(0, 6));
      });
  }, []);

  const statCards = [
    { label: "Celkem vozidel", value: vehicleStats.total, icon: Car, color: "text-primary" },
    { label: "Aktivních", value: vehicleStats.active, icon: CheckCircle, color: "text-success" },
    { label: "Aktivní rezervace", value: reservationStats.active, icon: CalendarDays, color: "text-info" },
    { label: "Čeká na schválení", value: reservationStats.pending, icon: Clock, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat cards */}
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

      {/* Quick info row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* STK soon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-warning" />
              Blížící se STK
              {stkSoon.length > 0 && <Badge variant="secondary">{stkSoon.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stkSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Žádné STK v nejbližších 90 dnech 🎉</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {stkSoon.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`/vozidla/${s.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{s.date}</span>
                      <Badge variant={s.days < 0 ? "destructive" : s.days <= 30 ? "destructive" : "secondary"} className="text-xs">
                        {s.days < 0 ? `${Math.abs(s.days)}d po` : `${s.days}d`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reservations by vehicle pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-info" />
              Aktivní rezervace podle vozidel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reservationsByVehicle.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Žádné aktivní rezervace</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={reservationsByVehicle}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${value}`}
                  >
                    {reservationsByVehicle.map((_, i) => (
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
      </div>

      {/* Notifications */}
      <VehicleNotifications />

      {/* Today's summary */}
      {reservationStats.today > 0 && (
        <Card className="border-info/30 bg-info/5">
          <CardContent className="py-4 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-info" />
            <span className="text-sm">
              Dnes je <strong>{reservationStats.today}</strong> {reservationStats.today === 1 ? "aktivní rezervace" : "aktivních rezervací"}.
            </span>
            <button onClick={() => navigate("/rezervace")} className="text-sm text-info underline ml-auto hover:no-underline">
              Zobrazit rezervace →
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
