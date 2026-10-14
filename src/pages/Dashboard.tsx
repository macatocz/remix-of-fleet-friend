import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, CheckCircle, Wrench, CalendarDays, DollarSign, Fuel, TrendingUp, Route } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import AttentionStrip from "@/components/dashboard/AttentionStrip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import RankList from "@/components/dashboard/RankList";
import LeasingMileageWidget from "@/components/leasing/LeasingMileageWidget";

import PendingReservationsWidget from "@/components/PendingReservationsWidget";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import ChartTooltip from "@/components/dashboard/ChartTooltip";
import EmptyState from "@/components/dashboard/EmptyState";
import DeadlinesCard, { DeadlineGroup } from "@/components/dashboard/DeadlinesCard";
import FleetHealthSummary, { MonitoringFocus } from "@/components/dashboard/FleetHealthSummary";
import DashboardFilters, { PeriodKey, PERIODS } from "@/components/dashboard/DashboardFilters";
import { axisProps, gridProps, formatCzk } from "@/components/dashboard/chartTheme";

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
  const [todayReservations, setTodayReservations] = useState<Array<{ id: string; driver_name: string; label: string; time: string | null }>>([]);
  const [topCosts, setTopCosts] = useState<Array<{ name: string; value: number }>>([]);
  const [topKm, setTopKm] = useState<Array<{ name: string; value: number }>>([]);
  const [greenCardsSoon, setGreenCardsSoon] = useState<Array<{ id: string; label: string; days: number; date: string }>>([]);
  const [monthlyKpi, setMonthlyKpi] = useState({ fuelCost: 0, serviceCost: 0, totalKm: 0, tripCount: 0 });
  const [monthlyCostTrend, setMonthlyCostTrend] = useState<any[]>([]);
  const [insuranceSoon, setInsuranceSoon] = useState<{ id: string; label: string; days: number; type: string; total: number | null; vehicleId: string; date: string }[]>([]);
  const [leasingSoon, setLeasingSoon] = useState<{ id: string; label: string; days: number; total: number | null; date: string }[]>([]);
  const [serviceSoon, setServiceSoon] = useState<{ id: string; vehicleId: string; label: string; type: string; daysOrKm: string; overdue: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("6");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [driverFilter, setDriverFilter] = useState("all");
  const [monitoringFocus, setMonitoringFocus] = useState<MonitoringFocus>(null);
  const periodTitle = PERIODS.find((p) => p.key === period)?.title || "";
  const months = period === "all" ? 0 : Number(period);

  useEffect(() => {
    // Fetch vehicles
    supabase.from("vehicles").select("id, znacka, rz, spravce, stk, zelena_karta, status, typ_vlastnictvi, datum_zahajeni_leasingu, datum_ukonceni_leasingu, doba_leasingu").then(({ data }) => {
      setLoading(false);
      if (!data) return;
      setVehicleStats({
        total: data.length,
        active: data.filter(v => v.status === "aktivní").length,
        service: data.filter(v => v.status === "v_servisu").length,
        decommissioned: data.filter(v => v.status === "vyřazeno").length,
      });

      setGreenCardsSoon(data.filter(v => v.status === "aktivní").flatMap(v => {
        const date = parseDateString(v.zelena_karta);
        if (!date || !Number.isFinite(date.getTime())) return [];
        const days = daysDiff(date);
        return days <= 180 ? [{ id: v.id, label: `${v.rz || "?"} – ${v.znacka || "?"}`, days, date: date.toLocaleDateString("cs-CZ") }] : [];
      }).sort((a, b) => a.days - b.days));
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
          if (days > 180) return null;
          const start = parseDateString(v.datum_zahajeni_leasingu);
          const total = start
            ? Math.round((d.getTime() - start.getTime()) / 86400000)
            : v.doba_leasingu ? Math.round(Number(v.doba_leasingu) * 30.44) : null;
          return { id: v.id, label: `${v.rz || "?"} – ${v.znacka || "?"}`, days, total, date: d.toLocaleDateString("cs-CZ") };
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
    supabase.from("insurance").select("id, vehicle_id, type, valid_from, valid_until, vehicles(znacka, rz)").then(({ data }) => {
      if (!data) return;
      const ins = data.map((i: any) => {
        const d = new Date(i.valid_until);
        const days = daysDiff(d);
        if (days > 90) return null;
        const start = i.valid_from ? new Date(i.valid_from) : null;
        const total = start ? Math.round((d.getTime() - start.getTime()) / 86400000) : null;
        const label = i.vehicles ? `${i.vehicles.rz || "?"} – ${i.vehicles.znacka || "?"}` : "?";
        return { id: i.id, vehicleId: i.vehicle_id, label, days, type: i.type, total, date: d.toLocaleDateString("cs-CZ") };
      }).filter(Boolean) as any[];
      setInsuranceSoon(ins.sort((a, b) => a.days - b.days));
    });

    const loadReservations = async () => {
      const { data } = await supabase.from("reservations").select("id, status, date_from, date_to, time_from, vehicle_id, driver_name, vehicles(znacka, rz)").in("status", ["čeká", "schváleno"]);
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const rows = data || [];
      const current = rows.filter(r => r.status === "schváleno" && r.date_from <= today && r.date_to >= today);
      setReservationStats({ active: rows.filter(r => r.status === "schváleno").length, pending: rows.filter(r => r.status === "čeká").length, today: current.length });
      setTodayReservations(current.map(r => ({ id: r.id, driver_name: r.driver_name, label: `${r.vehicles?.rz || "?"} – ${r.vehicles?.znacka || "?"}`, time: r.time_from })));
    };
    loadReservations();
    const refresh = () => { loadReservations(); };
    window.addEventListener("dashboard-reservations-changed", refresh);
    return () => window.removeEventListener("dashboard-reservations-changed", refresh);
  }, []);

  // Period / vehicle / driver filtered data
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const now = new Date();
      const allTime = months === 0;
      const rangeStart = new Date(now.getFullYear(), now.getMonth() - (Math.max(months, 1) - 1), 1);
      const startStr = `${rangeStart.getFullYear()}-${String(rangeStart.getMonth() + 1).padStart(2, "0")}-01`;
      const endStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

      // trips in range
      let tripQ = supabase.from("trip_logs").select("date, km_total, fuel_price, other_price, driver_id, vehicle_id");
      if (!allTime) tripQ = tripQ.gte("date", startStr).lte("date", endStr);
      if (vehicleFilter !== "all") tripQ = tripQ.eq("vehicle_id", vehicleFilter);
      if (driverFilter !== "all") tripQ = tripQ.eq("driver_id", driverFilter);

      let svcQ = supabase.from("service_records").select("date, cost, vehicle_id");
      if (!allTime) svcQ = svcQ.gte("date", startStr).lte("date", endStr);
      if (vehicleFilter !== "all") svcQ = svcQ.eq("vehicle_id", vehicleFilter);

      const [tripRes, svcRes, vehicleRes] = await Promise.all([tripQ, svcQ, supabase.from("vehicles").select("id, znacka, rz, nazev_vozu")]);
      if (cancelled) return;

      const trips = (tripRes.data || []) as any[];
      const svcs = (svcRes.data || []) as any[];

      setMonthlyKpi({
        fuelCost: Math.round(trips.reduce((s, r) => s + (Number(r.fuel_price) || 0), 0)),
        serviceCost: Math.round(svcs.reduce((s, r) => s + (Number(r.cost) || 0), 0)),
        totalKm: trips.reduce((s, r) => s + (r.km_total || 0), 0),
        tripCount: trips.filter((r) => r.km_total && r.km_total > 0).length,
      });

      // Trend uses the same selected period as summaries and rankings.
      let buckets = Math.max(months, 1);
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
          PHM: Math.round(mt.reduce((s, r) => s + (Number(r.fuel_price) || 0) , 0)),
          Servis: Math.round(ms.reduce((s, r) => s + (Number(r.cost) || 0), 0)),
          Km: mt.reduce((s, r) => s + (r.km_total || 0), 0),
        });
      }
      setMonthlyCostTrend(results);

      const labels = new Map((vehicleRes.data || []).map(v => [v.id, `${v.nazev_vozu || v.znacka || "?"} (${v.rz || "?"})`]));
      const costs: Record<string, number> = {};
      const kms: Record<string, number> = {};
      trips.forEach(r => { costs[r.vehicle_id] = (costs[r.vehicle_id] || 0) + (Number(r.fuel_price) || 0); kms[r.vehicle_id] = (kms[r.vehicle_id] || 0) + (Number(r.km_total) || 0); });
      svcs.forEach(r => { costs[r.vehicle_id] = (costs[r.vehicle_id] || 0) + (Number(r.cost) || 0); });
      const rank = (values: Record<string, number>) => Object.entries(values).filter(([, value]) => value > 0).map(([id, value]) => ({ name: labels.get(id) || "?", value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 5);
      setTopCosts(rank(costs));
      setTopKm(rank(kms));
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
      key: "zelena-karta",
      label: "Zelené karty",
      emptyText: "Žádná zelená karta nekončí do 180 dní",
      items: greenCardsSoon.map(s => ({ id: s.id, label: s.label, tag: s.date, days: s.days, criticalDays: 60, badge: `${s.days} d`, onClick: () => navigate(`/vozidla/${s.id}`) })),
    },
    {
      key: "pojisteni",
      label: "Pojištění",
      emptyText: "Žádné pojištění neexpiruje do 90 dnů",
      items: insuranceSoon.map((s) => ({
        id: s.id,
        label: s.label,
        tag: `${s.type} · ${s.date}`,
        onClick: () => navigate(`/vozidla/${s.vehicleId}`),
        days: s.days,
        totalDays: s.total,
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
        totalDays: s.total,
        tag: s.date,
        criticalDays: 90,
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

  const totalCost = monthlyKpi.fuelCost + monthlyKpi.serviceCost;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Dashboard</h1>
      <AttentionStrip groups={deadlineGroups} loading={loading} />
      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="operations" className="gap-2 whitespace-normal py-2"><CalendarDays className="hidden h-4 w-4 sm:block" />Operativa a termíny</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 whitespace-normal py-2"><TrendingUp className="hidden h-4 w-4 sm:block" />Náklady a analytika</TabsTrigger>
        </TabsList>
        <TabsContent value="operations" className="space-y-4">
          {loading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div> :
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Celkem vozidel" value={vehicleStats.total} hint={`${vehicleStats.decommissioned} vyřazených`} icon={Car} tone="primary" onClick={() => navigate("/vozidla")} />
              <StatCard label="Aktivní vozidla" value={vehicleStats.active} hint="v provozu" icon={CheckCircle} tone="success" />
              <StatCard label="V servisu" value={vehicleStats.service} hint="vozidel" icon={Wrench} tone="warning" />
              <StatCard label="Ke schválení" value={reservationStats.pending} hint={`${reservationStats.today} rezervací dnes`} icon={CalendarDays} tone="info" onClick={() => navigate("/rezervace")} />
            </div>}
          <FleetHealthSummary compact deadlineGroups={deadlineGroups} focus={monitoringFocus} onFocusChange={setMonitoringFocus} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <DeadlinesCard groups={deadlineGroups} focus={monitoringFocus} />
            <LeasingMileageWidget focus={monitoringFocus} />
            <div className="flex flex-col gap-3 md:col-span-2 xl:col-span-1 [&>*]:flex-1">
              <PendingReservationsWidget />
              <ChartCard title="Dnešní výpůjčky" icon={CalendarDays} count={todayReservations.length}>
                {todayReservations.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">Dnes nejsou žádné schválené rezervace.</p> :
                  <div className="max-h-48 space-y-2 overflow-y-auto">{todayReservations.map(r => <Button key={r.id} variant="ghost" className="h-auto w-full justify-start py-2 text-left whitespace-normal" onClick={() => navigate("/rezervace")}><span><span className="block text-xs font-medium">{r.driver_name} · {r.time?.slice(0, 5) || "Celý den"}</span><span className="block text-[11px] font-normal text-muted-foreground">{r.label}</span></span></Button>)}</div>}
                <Button variant="link" size="sm" className="mt-2 h-7 px-0 text-xs" onClick={() => navigate("/rezervace")}>Kalendář rezervací →</Button>
              </ChartCard>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <DashboardFilters period={period} onPeriodChange={setPeriod} vehicleId={vehicleFilter} onVehicleChange={setVehicleFilter} driverId={driverFilter} onDriverChange={setDriverFilter} />
          {driverFilter !== "all" && <p className="text-xs text-muted-foreground">Filtr řidiče platí pro jízdy a PHM. Servisní náklady se řídí obdobím a vozidlem.</p>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Celkové náklady" value={`${totalCost.toLocaleString("cs-CZ")} Kč`} hint={monthlyKpi.totalKm > 0 ? `${(totalCost / monthlyKpi.totalKm).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} Kč/km` : "PHM + servis"} icon={DollarSign} tone="primary" />
            <StatCard label="PHM" value={`${monthlyKpi.fuelCost.toLocaleString("cs-CZ")} Kč`} hint={periodTitle} icon={Fuel} tone="warning" spark={phmSpark} />
            <StatCard label="Servis" value={`${monthlyKpi.serviceCost.toLocaleString("cs-CZ")} Kč`} hint={periodTitle} icon={Wrench} tone="destructive" spark={servisSpark} />
            <StatCard label="Najeté kilometry" value={monthlyKpi.totalKm.toLocaleString("cs-CZ")} hint={`${monthlyKpi.tripCount} jízd · km`} icon={Route} tone="success" spark={kmSpark} />
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ChartCard title="Vývoj nákladů" subtitle={periodTitle} icon={DollarSign} className="lg:col-span-2">
              {monthlyCostTrend.every(m => !m.PHM && !m.Servis) ? <EmptyState icon={DollarSign} title="Žádné náklady v tomto období" /> :
                <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyCostTrend} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barServis" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="barPhm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} /><XAxis dataKey="month" {...axisProps} /><YAxis {...axisProps} width={48} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)} tis.`} />
                  <Tooltip content={<ChartTooltip formatter={formatCzk} />} cursor={{ fill: "hsl(var(--muted) / 0.4)" }} /><Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="PHM" fill="url(#barPhm)" radius={[6, 6, 0, 0]} maxBarSize={38} /><Bar dataKey="Servis" fill="url(#barServis)" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart></ResponsiveContainer></div>}
            </ChartCard>
            <div className="space-y-3">
              <ChartCard title="Top 5 nákladů" subtitle={periodTitle} icon={DollarSign}>{topCosts.length ? <RankList items={topCosts} suffix="Kč" tone="destructive" /> : <p className="py-4 text-center text-xs text-muted-foreground">Žádné náklady</p>}</ChartCard>
              <ChartCard title="Top 5 nájezdů" subtitle={periodTitle} icon={Route}>{topKm.length ? <RankList items={topKm} suffix="km" tone="success" /> : <p className="py-4 text-center text-xs text-muted-foreground">Žádné jízdy</p>}</ChartCard>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
