import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, CheckCircle, Wrench, CalendarDays, DollarSign, Fuel, TrendingUp, Route, PieChart as PieIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import VehicleNotifications from "@/components/VehicleNotifications";
import LeasingMileageWidget from "@/components/leasing/LeasingMileageWidget";
import DashboardExtraWidgets from "@/components/DashboardExtraWidgets";
import PendingReservationsWidget from "@/components/PendingReservationsWidget";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import ChartTooltip from "@/components/dashboard/ChartTooltip";
import EmptyState from "@/components/dashboard/EmptyState";
import DeadlinesCard, { DeadlineGroup } from "@/components/dashboard/DeadlinesCard";
import DashboardFilters, { PeriodKey, PERIODS } from "@/components/dashboard/DashboardFilters";
import { CHART_COLORS, axisProps, gridProps, formatCzk } from "@/components/dashboard/chartTheme";

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
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("6");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const periodTitle = PERIODS.find((p) => p.key === period)?.title || "";
  const months = period === "all" ? 0 : Number(period);

  useEffect(() => {
    // Fetch vehicles
    supabase.from("vehicles").select("id, znacka, rz, spravce, stk, status, datum_ukonceni_leasingu, typ_vlastnictvi").then(({ data }) => {
      setLoading(false);
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

  }, []);

  // Period / vehicle / driver filtered data
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      let driverName: string | null = null;
      if (driverFilter !== "all") {
        const { data } = await supabase.from("drivers").select("first_name, last_name").eq("id", driverFilter).maybeSingle();
        if (data) driverName = `${data.first_name || ""} ${data.last_name || ""}`.trim();
      }

      const now = new Date();
      const allTime = months === 0;
      const rangeStart = new Date(now.getFullYear(), now.getMonth() - (Math.max(months, 1) - 1), 1);
      const startStr = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, "0")}-01`;
      const endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

      // trips in range
      let tripQ = supabase.from("trip_logs").select("date, km_total, fuel_price, other_price, driver_id, vehicle_id");
      if (!allTime) tripQ = tripQ.gte("date", startStr).lte("date", endStr);
      if (vehicleFilter !== "all") tripQ = tripQ.eq("vehicle_id", vehicleFilter);
      if (driverFilter !== "all") tripQ = tripQ.eq("driver_id", driverFilter);

      let svcQ = supabase.from("service_records").select("date, cost, vehicle_id");
      if (!allTime) svcQ = svcQ.gte("date", startStr).lte("date", endStr);
      if (vehicleFilter !== "all") svcQ = svcQ.eq("vehicle_id", vehicleFilter);

      let resQ = supabase.from("reservations").select("id, status, date_from, date_to, vehicle_id, driver_name, vehicles(znacka, rz, nazev_vozu)")
        .in("status", ["čeká", "schváleno"]);
      if (vehicleFilter !== "all") resQ = resQ.eq("vehicle_id", vehicleFilter);
      if (driverName) resQ = resQ.eq("driver_name", driverName);

      const [tripRes, svcRes, resRes] = await Promise.all([tripQ, svcQ, resQ]);
      if (cancelled) return;

      const trips = (tripRes.data || []) as any[];
      const svcs = (svcRes.data || []) as any[];

      setMonthlyKpi({
        fuelCost: Math.round(trips.reduce((s, r) => s + (Number(r.fuel_price) || 0), 0)),
        serviceCost: Math.round(svcs.reduce((s, r) => s + (Number(r.cost) || 0), 0)),
        totalKm: trips.reduce((s, r) => s + (r.km_total || 0), 0),
        tripCount: trips.filter((r) => r.km_total && r.km_total > 0).length,
      });

      // trend by month over the selected range (min 6 buckets for readability)
      let buckets = Math.max(months, 6);
      if (allTime) {
        const dates = [...trips, ...svcs].map((r) => r.date).filter(Boolean).sort();
        if (dates.length) {
          const first = new Date(dates[0]);
          const span = (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth()) + 1;
          buckets = Math.min(Math.max(span, 6), 36);
        }
      }
      const results: any[] = [];
      for (let i = buckets - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const inMonth = (rows: any[]) => rows.filter((r) => (r.date || "").startsWith(key));
        const mt = inMonth(trips);
        const ms = inMonth(svcs);
        results.push({
          month: `${d.getMonth() + 1}/${d.getFullYear()}`,
          PHM: Math.round(mt.reduce((s, r) => s + (Number(r.fuel_price) || 0) + (Number(r.other_price) || 0), 0)),
          Servis: Math.round(ms.reduce((s, r) => s + (Number(r.cost) || 0), 0)),
          Km: mt.reduce((s, r) => s + (r.km_total || 0), 0),
        });
      }
      setMonthlyCostTrend(results);

      const reservations = (resRes.data || []) as any[];
      const todayStr = new Date().toISOString().split("T")[0];
      setReservationStats({
        active: reservations.filter((r) => r.status === "schváleno").length,
        pending: reservations.filter((r) => r.status === "čeká").length,
        today: reservations.filter((r) => r.date_from <= todayStr && r.date_to >= todayStr && r.status === "schváleno").length,
      });
      const byVehicle: Record<string, { name: string; value: number }> = {};
      reservations.forEach((r) => {
        const v = r.vehicles;
        const label = v ? (v.nazev_vozu || `${v.znacka || "?"} (${v.rz || "?"})`) : r.vehicle_id;
        if (!byVehicle[r.vehicle_id]) byVehicle[r.vehicle_id] = { name: label, value: 0 };
        byVehicle[r.vehicle_id].value++;
      });
      setReservationsByVehicle(Object.values(byVehicle).sort((a, b) => b.value - a.value).slice(0, 6));
    };

    run();
    return () => { cancelled = true; };
  }, [months, vehicleFilter, driverFilter]);


  const kmSpark = monthlyCostTrend.map((m) => m.Km || 0);
  const phmSpark = monthlyCostTrend.map((m) => m.PHM || 0);
  const servisSpark = monthlyCostTrend.map((m) => m.Servis || 0);

  const deadlineGroups: DeadlineGroup[] = [
    {
      key: "stk",
      label: "STK",
      emptyText: "Žádné STK v nejbližších 90 dnech",
      items: stkSoon.map((s) => ({
        id: s.id,
        label: s.label,
        tag: s.date,
        days: s.days,
        badge: s.days < 0 ? `${Math.abs(s.days)} d po` : `${s.days} d`,
        onClick: () => navigate(`/vozidla/${s.id}`),
      })),
    },
    {
      key: "pojisteni",
      label: "Pojištění",
      emptyText: "Žádné pojištění neexpiruje do 90 dnů",
      items: insuranceSoon.map((s) => ({
        id: s.id,
        label: s.label,
        tag: s.type,
        days: s.days,
        badge: s.days < 0 ? `${Math.abs(s.days)} d po` : `${s.days} d`,
      })),
    },
    {
      key: "leasing",
      label: "Leasing",
      emptyText: "Žádný leasing nekončí",
      items: leasingSoon.map((s) => ({
        id: s.id,
        label: s.label,
        days: s.days,
        badge: s.days < 0 ? `${Math.abs(s.days)} d po` : `${s.days} d`,
        onClick: () => navigate(`/vozidla/${s.id}`),
      })),
    },
    {
      key: "servis",
      label: "Servis",
      emptyText: "Žádný plánovaný servis se neblíží",
      items: serviceSoon.map((s) => ({
        id: s.id,
        label: s.label,
        tag: s.type,
        days: null,
        overdue: s.overdue,
        badge: s.daysOrKm,
        onClick: () => navigate(`/vozidla/${s.vehicleId}`),
      })),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Přehled vozového parku, statistiky a notifikace.
        </p>
      </div>

      {/* ---------- Notifikace ---------- */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifikace</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <VehicleNotifications />
      </section>

      {/* ---------- Termíny, leasing a rezervace ---------- */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Termíny, leasing a rezervace</h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <DeadlinesCard groups={deadlineGroups} />
          <LeasingMileageWidget />
          <PendingReservationsWidget />
        </div>
      </section>

      <DashboardFilters
        period={period}
        onPeriodChange={setPeriod}
        vehicleId={vehicleFilter}
        onVehicleChange={setVehicleFilter}
        driverId={driverFilter}
        onDriverChange={setDriverFilter}
      />

      {/* ---------- Přehled ---------- */}
      <section className="space-y-3">

        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Přehled</h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[104px] rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Celkem vozidel"
              value={vehicleStats.total}
              hint={`${vehicleStats.active} aktivních`}
              icon={Car}
              tone="primary"
              delay={0}
              onClick={() => navigate("/vozidla")}
            />
            <StatCard
              label="Aktivních"
              value={vehicleStats.active}
              hint={vehicleStats.decommissioned > 0 ? `${vehicleStats.decommissioned} vyřazeno` : "v provozu"}
              icon={CheckCircle}
              tone="success"
              delay={60}
            />
            <StatCard
              label="V servisu"
              value={vehicleStats.service}
              hint={serviceSoon.length > 0 ? `${serviceSoon.length} blížících se úkonů` : "bez odstávek"}
              icon={Wrench}
              tone="warning"
              delay={120}
            />
            <StatCard
              label="Rezervace dnes"
              value={reservationStats.today}
              hint={`${reservationStats.pending} čeká na schválení`}
              icon={CalendarDays}
              tone="info"
              delay={180}
              onClick={() => navigate("/rezervace")}
            />
          </div>
        )}
      </section>

      {/* ---------- Náklady a provoz ---------- */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Náklady a provoz</h2>
          <span className="text-xs text-muted-foreground">{periodTitle}</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Najeté km" value={monthlyKpi.totalKm.toLocaleString("cs-CZ")} hint={periodTitle} icon={Route} tone="primary" spark={kmSpark} />
          <StatCard label="PHM" value={`${monthlyKpi.fuelCost.toLocaleString("cs-CZ")} Kč`} hint={periodTitle} icon={Fuel} tone="warning" spark={phmSpark} delay={60} />
          <StatCard label="Servis" value={`${monthlyKpi.serviceCost.toLocaleString("cs-CZ")} Kč`} hint={driverFilter !== "all" ? "bez filtru řidiče" : periodTitle} icon={Wrench} tone="destructive" spark={servisSpark} delay={120} />
          <StatCard label="Počet jízd" value={monthlyKpi.tripCount} hint="záznamů v knize jízd" icon={TrendingUp} tone="success" delay={180} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title="Vývoj nákladů"
            subtitle="PHM a servis podle měsíců"
            icon={DollarSign}
            className="lg:col-span-2"
          >
            {monthlyCostTrend.length === 0 ? (
              <EmptyState icon={DollarSign} title="Zatím žádné náklady" hint="Data se objeví po zápisu jízd a servisů." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyCostTrend} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPhm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0.45} />
                    </linearGradient>
                    <linearGradient id="gradServis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.45} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="month" {...axisProps} />
                  <YAxis {...axisProps} width={64} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)} tis.`} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} content={<ChartTooltip formatter={formatCzk} />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />
                  <Bar dataKey="PHM" name="PHM" fill="url(#gradPhm)" radius={[6, 6, 0, 0]} maxBarSize={38} />
                  <Bar dataKey="Servis" name="Servis" fill="url(#gradServis)" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Aktivní rezervace podle vozidel" subtitle="Rozložení napříč vozovým parkem" icon={PieIcon} iconClass="text-info">
            {reservationsByVehicle.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Žádné aktivní rezervace" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={reservationsByVehicle}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  >
                    {reservationsByVehicle.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <DashboardExtraWidgets />
      </section>

      {/* ---------- Termíny a rezervace ---------- */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Termíny, leasing a rezervace</h2>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <DeadlinesCard groups={deadlineGroups} />
          <LeasingMileageWidget />
          <PendingReservationsWidget />
        </div>
      </section>

      {reservationStats.today > 0 && (
        <Card className="border-info/30 bg-info/5 shadow-card">
          <CardContent className="flex items-center gap-3 py-4">
            <CalendarDays className="h-5 w-5 text-info" />
            <span className="text-sm">
              Dnes je <strong>{reservationStats.today}</strong> {reservationStats.today === 1 ? "aktivní rezervace" : "aktivních rezervací"}.
            </span>
            <button onClick={() => navigate("/rezervace")} className="ml-auto text-sm text-info underline hover:no-underline">
              Zobrazit rezervace →
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
