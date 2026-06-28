import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, CheckCircle, Wrench, AlertTriangle, CalendarDays, Clock, Shield, DollarSign, Fuel, TrendingUp, Route } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import VehicleNotifications from "@/components/VehicleNotifications";
import DashboardExtraWidgets from "@/components/DashboardExtraWidgets";
import PendingReservationsWidget from "@/components/PendingReservationsWidget";

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

const PIE_COLORS = ["hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(217, 71%, 45%)", "hsl(280, 60%, 50%)", "hsl(190, 70%, 45%)"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [vehicleStats, setVehicleStats] = useState({ total: 0, active: 0, service: 0, decommissioned: 0 });
  const [reservationStats, setReservationStats] = useState({ active: 0, pending: 0, today: 0 });
  const [stkSoon, setStkSoon] = useState<{ id: string; label: string; days: number; date: string }[]>([]);
  const [reservationsByVehicle, setReservationsByVehicle] = useState<{ name: string; value: number }[]>([]);
  const [monthlyKpi, setMonthlyKpi] = useState({ fuelCost: 0, serviceCost: 0, totalKm: 0, tripCount: 0 });
  const [monthlyCostTrend, setMonthlyCostTrend] = useState<any[]>([]);
  const [insuranceSoon, setInsuranceSoon] = useState<{ id: string; label: string; days: number; type: string }[]>([]);
  const [leasingSoon, setLeasingSoon] = useState<{ id: string; label: string; days: number }[]>([]);
  const [serviceSoon, setServiceSoon] = useState<{ id: string; vehicleId: string; label: string; type: string; daysOrKm: string; overdue: boolean }[]>([]);

  useEffect(() => {
    // Fetch vehicles
    supabase.from("vehicles").select("id, znacka, rz, spravce, stk, status, datum_ukonceni_leasingu, typ_vlastnictvi").then(({ data }) => {
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
          return { id: v.id, label: `${v.rz || "?"} – ${v.znacka || "?"}`, days, date: d.toLocaleDateString("cs-CZ") };
        })
        .filter(Boolean) as any[];
      setStkSoon(stks.sort((a, b) => a.days - b.days));

      // Leasing ending soon
      const leasing = data
        .filter(v => v.status === "aktivní" && v.typ_vlastnictvi !== "majetek" && v.datum_ukonceni_leasingu)
        .map(v => {
          const d = parseDateString(v.datum_ukonceni_leasingu);
          if (!d) return null;
          const days = daysDiff(d);
          if (days > 180 || days < -30) return null;
          return { id: v.id, label: `${v.rz || "?"} – ${v.znacka || "?"}`, days };
        })
        .filter(Boolean) as any[];
      setLeasingSoon(leasing.sort((a, b) => a.days - b.days));

      // Service plans approaching (across all active vehicles)
      const vehiclesById: Record<string, any> = {};
      data.forEach(v => { vehiclesById[v.id] = v; });
      Promise.all([
        supabase.from("service_plans").select("id, vehicle_id, type, next_due_date, next_due_km"),
        supabase.from("vehicle_mileage").select("vehicle_id, km, recorded_at").order("recorded_at", { ascending: false }),
        supabase.from("trip_logs").select("vehicle_id, km_end").not("km_end", "is", null),
      ]).then(([planRes, milRes, tripRes]) => {
        const lastKm: Record<string, number> = {};
        (milRes.data || []).forEach((m: any) => {
          if (lastKm[m.vehicle_id] === undefined || m.km > lastKm[m.vehicle_id]) lastKm[m.vehicle_id] = m.km;
        });
        (tripRes.data || []).forEach((t: any) => {
          if (lastKm[t.vehicle_id] === undefined || t.km_end > lastKm[t.vehicle_id]) lastKm[t.vehicle_id] = t.km_end;
        });
        const items = (planRes.data || []).map((p: any) => {
          const v = vehiclesById[p.vehicle_id];
          if (!v) return null;
          const daysToDate = p.next_due_date ? daysDiff(new Date(p.next_due_date)) : null;
          const km = lastKm[p.vehicle_id];
          const kmToDue = p.next_due_km && km !== undefined ? p.next_due_km - km : null;
          const overdue = (daysToDate !== null && daysToDate < 0) || (kmToDue !== null && kmToDue < 0);
          const soon = !overdue && ((daysToDate !== null && daysToDate <= 30) || (kmToDue !== null && kmToDue <= 1000));
          if (!overdue && !soon) return null;
          let badge = "";
          if (overdue) {
            if (daysToDate !== null && daysToDate < 0) badge = `${Math.abs(daysToDate)}d po`;
            else if (kmToDue !== null) badge = `${Math.abs(kmToDue).toLocaleString("cs-CZ")} km po`;
          } else {
            if (daysToDate !== null && daysToDate <= 30) badge = `${daysToDate}d`;
            else if (kmToDue !== null) badge = `${kmToDue.toLocaleString("cs-CZ")} km`;
          }
          return {
            id: p.id,
            vehicleId: p.vehicle_id,
            label: `${v.rz || "?"} – ${v.znacka || "?"}`,
            type: p.type,
            daysOrKm: badge,
            overdue,
          };
        }).filter(Boolean) as any[];
        setServiceSoon(items);
      });
    });

    // Fetch insurance approaching
    supabase.from("insurance").select("id, vehicle_id, type, valid_until, vehicles(znacka, rz)").then(({ data }) => {
      if (!data) return;
      const ins = data.map((i: any) => {
        const d = new Date(i.valid_until);
        const days = daysDiff(d);
        if (days > 90 || days < -30) return null;
        const label = i.vehicles ? `${i.vehicles.rz || "?"} – ${i.vehicles.znacka || "?"}` : "?";
        return { id: i.id, label, days, type: i.type };
      }).filter(Boolean) as any[];
      setInsuranceSoon(ins.sort((a, b) => a.days - b.days));
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

        const byVehicle: Record<string, { name: string; value: number }> = {};
        data.forEach(r => {
          const vid = r.vehicle_id;
          const vLabel = r.vehicles ? `${(r.vehicles as any).znacka || "?"} (${(r.vehicles as any).rz || "?"})` : vid;
          if (!byVehicle[vid]) byVehicle[vid] = { name: vLabel, value: 0 };
          byVehicle[vid].value++;
        });
        setReservationsByVehicle(Object.values(byVehicle).sort((a, b) => b.value - a.value).slice(0, 6));
      });

    // This month KPIs from trip_logs
    const now = new Date();
    const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    supabase.from("trip_logs").select("km_total, fuel_price, other_price, fuel_quantity")
      .gte("date", thisMonthStart).lte("date", thisMonthEnd)
      .then(({ data }) => {
        if (!data) return;
        const fuelCost = data.reduce((s, r: any) => s + (Number(r.fuel_price) || 0), 0);
        const totalKm = data.reduce((s, r: any) => s + (r.km_total || 0), 0);
        const tripCount = data.filter((r: any) => r.km_total && r.km_total > 0).length;
        setMonthlyKpi(prev => ({ ...prev, fuelCost: Math.round(fuelCost), totalKm, tripCount }));
      });

    supabase.from("service_records").select("cost")
      .gte("date", thisMonthStart).lte("date", thisMonthEnd)
      .then(({ data }) => {
        if (!data) return;
        const serviceCost = data.reduce((s, r: any) => s + (Number(r.cost) || 0), 0);
        setMonthlyKpi(prev => ({ ...prev, serviceCost: Math.round(serviceCost) }));
      });

    // Monthly cost trend (last 6 months)
    fetchCostTrend();
  }, []);

  const fetchCostTrend = async () => {
    const now = new Date();
    const results: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const end = new Date(year, month, 0).toISOString().split("T")[0];
      const label = `${month}/${year}`;

      const [tripRes, serviceRes] = await Promise.all([
        supabase.from("trip_logs").select("fuel_price, other_price, km_total").gte("date", start).lte("date", end),
        supabase.from("service_records").select("cost").gte("date", start).lte("date", end),
      ]);

      const fuelCost = (tripRes.data || []).reduce((s, r: any) => s + (Number(r.fuel_price) || 0), 0);
      const otherCost = (tripRes.data || []).reduce((s, r: any) => s + (Number(r.other_price) || 0), 0);
      const km = (tripRes.data || []).reduce((s, r: any) => s + (r.km_total || 0), 0);
      const serviceCost = (serviceRes.data || []).reduce((s, r: any) => s + (Number(r.cost) || 0), 0);

      results.push({
        month: label,
        PHM: Math.round(fuelCost + otherCost),
        Servis: Math.round(serviceCost),
        Km: km,
      });
    }
    setMonthlyCostTrend(results);
  };

  const statCards = [
    { label: "Celkem vozidel", value: vehicleStats.total, icon: Car, color: "text-primary" },
    { label: "Aktivních", value: vehicleStats.active, icon: CheckCircle, color: "text-success" },
    { label: "V servisu", value: vehicleStats.service, icon: Wrench, color: "text-warning" },
    { label: "Rezervace dnes", value: reservationStats.today, icon: CalendarDays, color: "text-info" },
  ];

  const kpiCards = [
    { label: "Tento měsíc km", value: monthlyKpi.totalKm.toLocaleString("cs-CZ"), icon: Route, color: "text-primary" },
    { label: "PHM tento měsíc", value: `${monthlyKpi.fuelCost.toLocaleString("cs-CZ")} Kč`, icon: Fuel, color: "text-warning" },
    { label: "Servis tento měsíc", value: `${monthlyKpi.serviceCost.toLocaleString("cs-CZ")} Kč`, icon: Wrench, color: "text-destructive" },
    { label: "Počet jízd", value: monthlyKpi.tripCount, icon: TrendingUp, color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Přehled vozového parku, statistiky a notifikace.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

      {/* Monthly KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((s) => (
          <Card key={s.label} className="bg-muted/30">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cost trend chart */}
      {monthlyCostTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Náklady za posledních 6 měsíců
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyCostTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number) => `${v.toLocaleString("cs-CZ")} Kč`} />
                <Legend />
                <Bar dataKey="PHM" name="PHM" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Servis" name="Servis" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <PendingReservationsWidget />

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
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors" onClick={() => navigate(`/vozidla/${s.id}`)}>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{s.label}</span>
                    </div>
                    <Badge variant={s.days <= 30 ? "destructive" : "secondary"} className="text-xs">
                      {s.days < 0 ? `${Math.abs(s.days)}d po` : `${s.days}d`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insurance soon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Blížící se expirace pojištění
              {insuranceSoon.length > 0 && <Badge variant="secondary">{insuranceSoon.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insuranceSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Žádné pojištění neexpiruje v 90 dnech 🎉</p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {insuranceSoon.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{s.label}</span>
                      <Badge variant="outline" className="text-xs">{s.type}</Badge>
                    </div>
                    <Badge variant={s.days <= 30 ? "destructive" : "secondary"} className="text-xs">
                      {s.days < 0 ? `${Math.abs(s.days)}d po` : `${s.days}d`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leasing ending */}
        {leasingSoon.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Končící leasing
                <Badge variant="secondary">{leasingSoon.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {leasingSoon.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors" onClick={() => navigate(`/vozidla/${s.id}`)}>
                    <span className="text-sm font-medium">{s.label}</span>
                    <Badge variant={s.days <= 30 ? "destructive" : "secondary"} className="text-xs">
                      {s.days < 0 ? `${Math.abs(s.days)}d po` : `${s.days}d`}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Service plans approaching */}
        {serviceSoon.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5 text-warning" />
                Blížící se plánovaný servis
                <Badge variant="secondary">{serviceSoon.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {serviceSoon.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors" onClick={() => navigate(`/vozidla/${s.vehicleId}`)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{s.label}</span>
                      <Badge variant="outline" className="text-xs shrink-0">{s.type}</Badge>
                    </div>
                    <Badge variant={s.overdue ? "destructive" : "secondary"} className="text-xs shrink-0">
                      {s.daysOrKm}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
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
                  <Pie data={reservationsByVehicle} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ value }) => `${value}`}>
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

      {/* Extra widgety */}
      <DashboardExtraWidgets />

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
