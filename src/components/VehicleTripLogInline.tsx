import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Loader2, Trash2, Save, TrendingUp, Fuel, Route, DollarSign, Filter, CalendarDays, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

interface TripRow {
  id?: string;
  vehicle_id: string;
  driver_id: string | null;
  date: string;
  time: string | null;
  break_minutes: number | null;
  description: string | null;
  purpose: string | null;
  route_from: string | null;
  route_to: string | null;
  km_start: number | null;
  km_end: number | null;
  km_total: number | null;
  fuel_quantity: number | null;
  fuel_price: number | null;
  other_quantity: number | null;
  other_price: number | null;
  _dirty?: boolean;
  _new?: boolean;
}

const COLUMNS = [
  { key: "date", label: "Datum", type: "date", minW: "min-w-[120px]" },
  { key: "time", label: "Čas", type: "time", minW: "min-w-[90px]" },
  { key: "break_minutes", label: "Přest.", type: "number", minW: "min-w-[60px]" },
  { key: "driver_id", label: "Řidič", type: "select", minW: "min-w-[140px]" },
  { key: "description", label: "Popis", type: "text", minW: "min-w-[110px]" },
  { key: "purpose", label: "Účel", type: "text", minW: "min-w-[100px]" },
  { key: "route_from", label: "Z", type: "text", minW: "min-w-[90px]" },
  { key: "route_to", label: "Do", type: "text", minW: "min-w-[90px]" },
  { key: "km_start", label: "Poč. km", type: "number", minW: "min-w-[100px]" },
  { key: "km_end", label: "Kon. km", type: "number", minW: "min-w-[100px]" },
  { key: "km_total", label: "Km", type: "computed", minW: "min-w-[70px]" },
  { key: "fuel_quantity", label: "PHM (l)", type: "number", minW: "min-w-[80px]" },
  { key: "fuel_price", label: "PHM (Kč)", type: "number", minW: "min-w-[90px]" },
  { key: "other_quantity", label: "Ost. mn.", type: "number", minW: "min-w-[80px]" },
  { key: "other_price", label: "Ost. (Kč)", type: "number", minW: "min-w-[90px]" },
] as const;

// Calendar view uses fewer columns for cleaner layout
const CAL_COLUMNS = COLUMNS.filter(c => c.key !== "date");

interface Props {
  vehicleId: string;
}

const DAY_NAMES = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function isWeekend(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

function getDayName(dateStr: string) {
  return DAY_NAMES[new Date(dateStr + "T00:00:00").getDay()];
}

export default function VehicleTripLogInline({ vehicleId }: Props) {
  const [rows, setRows] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const [filterPurpose, setFilterPurpose] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"free" | "calendar">("free");
  const [calRows, setCalRows] = useState<TripRow[]>([]);
  const [multiMonthData, setMultiMonthData] = useState<any[]>([]);
  const { toast } = useToast();
  const tableRef = useRef<HTMLDivElement>(null);
  const calTableRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("trip_logs")
      .select("*, drivers(first_name, last_name)")
      .eq("vehicle_id", vehicleId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    }
    const loaded = (data as any[] || []).map((r: any) => ({ ...r, _dirty: false, _new: false }));
    setRows(loaded);
    buildCalendarRows(loaded, year, month);
    setLoading(false);
  };

  const buildCalendarRows = (existingRows: TripRow[], year: number, month: number) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const result: TripRow[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const existing = existingRows.find(r => r.date === dateStr);

      if (existing) {
        result.push({ ...existing });
      } else {
        // Find last km_end from previous rows
        let prevKmEnd: number | null = null;
        for (let i = result.length - 1; i >= 0; i--) {
          if (result[i].km_end != null) {
            prevKmEnd = result[i].km_end;
            break;
          }
        }

        result.push({
          vehicle_id: vehicleId,
          driver_id: null,
          date: dateStr,
          time: null,
          break_minutes: null,
          description: null,
          purpose: null,
          route_from: null,
          route_to: null,
          km_start: prevKmEnd,
          km_end: null,
          km_total: null,
          fuel_quantity: null,
          fuel_price: null,
          other_quantity: null,
          other_price: null,
          _dirty: false,
          _new: false,
        });
      }
    }
    setCalRows(result);
  };

  // Fetch multi-month stats (last 12 months)
  const fetchMultiMonth = async () => {
    const now = new Date();
    const months: { label: string; start: string; end: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const end = new Date(year, month, 0).toISOString().split("T")[0];
      const label = `${month}/${year}`;
      months.push({ label, start, end });
    }

    const results = [];
    for (const m of months) {
      const { data } = await supabase
        .from("trip_logs")
        .select("km_total, fuel_quantity, fuel_price, other_price")
        .eq("vehicle_id", vehicleId)
        .gte("date", m.start)
        .lte("date", m.end);

      const rows = data || [];
      const km = rows.reduce((s, r: any) => s + (r.km_total || 0), 0);
      const fuel = rows.reduce((s, r: any) => s + (Number(r.fuel_quantity) || 0), 0);
      const fuelCost = rows.reduce((s, r: any) => s + (Number(r.fuel_price) || 0), 0);
      const otherCost = rows.reduce((s, r: any) => s + (Number(r.other_price) || 0), 0);
      const consumption = km > 0 && fuel > 0 ? Math.round(fuel / km * 1000) / 10 : 0;

      results.push({
        month: m.label,
        km,
        fuel: Math.round(fuel * 10) / 10,
        fuelCost: Math.round(fuelCost),
        otherCost: Math.round(otherCost),
        totalCost: Math.round(fuelCost + otherCost),
        consumption,
        trips: rows.filter((r: any) => r.km_total && r.km_total > 0).length,
      });
    }
    setMultiMonthData(results);
  };

  useEffect(() => { fetchLogs(); }, [vehicleId, selectedMonth]);
  useEffect(() => { fetchMultiMonth(); }, [vehicleId]);

  useEffect(() => {
    supabase.from("drivers").select("id, first_name, last_name").eq("status", "aktivní")
      .then(({ data }) => setDrivers((data as any[]) || []));
  }, []);

  // Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (viewMode === "calendar") saveCalendar();
        else saveAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rows, calRows, viewMode]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (filterDriver && filterDriver !== "all") result = result.filter(r => r.driver_id === filterDriver);
    if (filterPurpose.trim()) {
      const q = filterPurpose.toLowerCase();
      result = result.filter(r => (r.purpose || "").toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q));
    }
    return result;
  }, [rows, filterDriver, filterPurpose]);

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    const newRow: TripRow = {
      vehicle_id: vehicleId,
      driver_id: lastRow?.driver_id || null,
      date: new Date().toISOString().split("T")[0],
      time: null, break_minutes: null, description: null, purpose: null,
      route_from: null, route_to: null,
      km_start: lastRow?.km_end || null, km_end: null, km_total: null,
      fuel_quantity: null, fuel_price: null, other_quantity: null, other_price: null,
      _dirty: true, _new: true,
    };
    setRows(prev => [...prev, newRow]);
    setTimeout(() => {
      const inputs = tableRef.current?.querySelectorAll(`[data-row="${rows.length}"]`);
      if (inputs?.[0]) (inputs[0] as HTMLElement).focus();
    }, 50);
  };

  const updateCell = (rowIdx: number, key: string, value: string, isCal = false) => {
    const setter = isCal ? setCalRows : setRows;
    setter(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIdx], _dirty: true };
      if (["km_start", "km_end", "break_minutes"].includes(key)) {
        (row as any)[key] = value ? parseInt(value) : null;
      } else if (["fuel_quantity", "fuel_price", "other_quantity", "other_price"].includes(key)) {
        (row as any)[key] = value ? parseFloat(value) : null;
      } else {
        (row as any)[key] = value || null;
      }
      if (key === "km_start" || key === "km_end") {
        row.km_total = (row.km_start != null && row.km_end != null) ? row.km_end - row.km_start : null;
      }
      updated[rowIdx] = row;

      // Chain km_start for calendar view
      if (isCal && key === "km_end" && row.km_end != null) {
        for (let i = rowIdx + 1; i < updated.length; i++) {
          if (!updated[i].km_start && !updated[i].km_end && !updated[i]._dirty) {
            updated[i] = { ...updated[i], km_start: row.km_end };
          } else if (!updated[i].id && !updated[i]._dirty) {
            updated[i] = { ...updated[i], km_start: row.km_end };
            break;
          } else {
            break;
          }
        }
      }

      return updated;
    });
  };

  const clearCalRow = async (rowIdx: number) => {
    const row = calRows[rowIdx];
    if (row.id) {
      const { error } = await supabase.from("trip_logs").delete().eq("id", row.id);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Záznam smazán" });
      await fetchLogs();
      return;
    }
    setCalRows(prev => {
      const updated = [...prev];
      updated[rowIdx] = {
        ...updated[rowIdx],
        driver_id: null, time: null, break_minutes: null,
        description: null, purpose: null, route_from: null, route_to: null,
        km_start: null, km_end: null, km_total: null,
        fuel_quantity: null, fuel_price: null, other_quantity: null, other_price: null,
        _dirty: false,
      };
      return updated;
    });
  };

  const buildPayload = (row: TripRow) => ({
    vehicle_id: row.vehicle_id,
    driver_id: row.driver_id || null,
    date: row.date,
    time: row.time || null,
    break_minutes: row.break_minutes ?? 0,
    description: row.description || null,
    purpose: row.purpose || null,
    route_from: row.route_from || null,
    route_to: row.route_to || null,
    km_start: row.km_start,
    km_end: row.km_end,
    fuel_quantity: row.fuel_quantity,
    fuel_price: row.fuel_price,
    other_quantity: row.other_quantity,
    other_price: row.other_price,
  });

  const saveRows = async (dirtyRows: TripRow[]) => {
    let hasError = false;
    for (const row of dirtyRows) {
      const payload = buildPayload(row);
      if (!row.id) {
        // Only save if row has some data
        const hasData = row.km_end || row.km_total || row.route_from || row.route_to || row.description || row.purpose || row.fuel_quantity;
        if (!hasData) continue;
        const { error } = await supabase.from("trip_logs").insert(payload);
        if (error) { hasError = true; toast({ title: "Chyba", description: error.message, variant: "destructive" }); }
      } else {
        const { error } = await supabase.from("trip_logs").update(payload).eq("id", row.id);
        if (error) { hasError = true; toast({ title: "Chyba", description: error.message, variant: "destructive" }); }
      }
    }
    return hasError;
  };

  const saveAll = async () => {
    const dirty = rows.filter(r => r._dirty);
    if (!dirty.length) { toast({ title: "Žádné změny" }); return; }
    setSaving(true);
    const err = await saveRows(dirty);
    if (!err) toast({ title: `Uloženo (${dirty.length} záznamů)` });
    await fetchLogs();
    setSaving(false);
  };

  const saveCalendar = async () => {
    const dirty = calRows.filter(r => r._dirty);
    if (!dirty.length) { toast({ title: "Žádné změny" }); return; }
    setSaving(true);
    const err = await saveRows(dirty);
    if (!err) toast({ title: `Uloženo (${dirty.length} záznamů)` });
    await fetchLogs();
    setSaving(false);
  };

  const deleteRow = async (rowIdx: number) => {
    const row = rows[rowIdx];
    if (row._new) { setRows(prev => prev.filter((_, i) => i !== rowIdx)); return; }
    if (!row.id) return;
    const { error } = await supabase.from("trip_logs").delete().eq("id", row.id);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else { toast({ title: "Smazáno" }); fetchLogs(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, colIdx: number, isCal = false) => {
    const totalRows = isCal ? calRows.length : rows.length;
    const cols = isCal ? CAL_COLUMNS : COLUMNS;
    if (e.key === "Tab" && !e.shiftKey && !isCal && rowIdx === totalRows - 1 && colIdx === cols.length - 1) {
      e.preventDefault();
      addRow();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const ref = isCal ? calTableRef : tableRef;
      const next = ref.current?.querySelector(`[data-row="${rowIdx + 1}"][data-col="${colIdx}"]`) as HTMLElement;
      if (next) next.focus();
      else if (!isCal) addRow();
    }
  };

  const dirtyCount = viewMode === "calendar"
    ? calRows.filter(r => r._dirty).length
    : rows.filter(r => r._dirty).length;

  // Summaries
  const sourceRows = viewMode === "calendar" ? calRows.filter(r => r.id || r._dirty) : filteredRows;
  const totalKm = sourceRows.reduce((s, r) => s + (r.km_total || 0), 0);
  const totalFuelQty = sourceRows.reduce((s, r) => s + (Number(r.fuel_quantity) || 0), 0);
  const totalFuelPrice = sourceRows.reduce((s, r) => s + (Number(r.fuel_price) || 0), 0);
  const totalOtherPrice = sourceRows.reduce((s, r) => s + (Number(r.other_price) || 0), 0);
  const totalCost = totalFuelPrice + totalOtherPrice;
  const tripCount = sourceRows.filter(r => r.km_total && r.km_total > 0).length;
  const avgConsumption = totalKm > 0 && totalFuelQty > 0 ? (totalFuelQty / totalKm * 100) : 0;

  // Daily chart
  const chartData = useMemo(() => {
    const byDay: Record<string, number> = {};
    sourceRows.forEach(r => {
      const day = r.date.split("-")[2];
      byDay[day] = (byDay[day] || 0) + (r.km_total || 0);
    });
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: `${i + 1}.`,
      km: byDay[String(i + 1).padStart(2, "0")] || 0,
    }));
  }, [sourceRows, selectedMonth]);

  const hasChartData = chartData.some(d => d.km > 0);

  const renderCell = (row: TripRow, col: typeof COLUMNS[number], rowIdx: number, colIdx: number, isCal: boolean) => {
    if (col.type === "computed") {
      return (
        <span className="px-1 font-medium text-right block text-xs">
          {row.km_total != null ? row.km_total.toLocaleString("cs-CZ") : "—"}
        </span>
      );
    }
    if (col.type === "select" && col.key === "driver_id") {
      return (
        <Select value={row.driver_id || ""} onValueChange={v => updateCell(rowIdx, "driver_id", v, isCal)}>
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent shadow-none focus:ring-1 focus:ring-primary">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {drivers.map(d => (
              <SelectItem key={d.id} value={d.id} className="text-xs">{d.first_name} {d.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return (
      <input
        data-row={rowIdx}
        data-col={colIdx}
        type={col.type === "number" ? "number" : col.type === "date" ? "date" : col.type === "time" ? "time" : "text"}
        step={["fuel_quantity", "fuel_price", "other_quantity", "other_price"].includes(col.key) ? "0.01" : undefined}
        className="w-full h-7 px-1 text-xs bg-transparent border-0 outline-none focus:ring-1 focus:ring-primary rounded-sm"
        value={(row as any)[col.key] ?? ""}
        onChange={e => updateCell(rowIdx, col.key, e.target.value, isCal)}
        onKeyDown={e => handleKeyDown(e, rowIdx, colIdx, isCal)}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Měsíc:</Label>
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-44 h-8" />
          {viewMode === "free" && (
            <Button size="sm" variant={showFilters ? "secondary" : "ghost"} onClick={() => setShowFilters(!showFilters)}>
              <Filter className="mr-1 h-3.5 w-3.5" />Filtr
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <button
              className={`px-2 py-1 text-xs flex items-center gap-1 ${viewMode === "free" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}
              onClick={() => setViewMode("free")}
            >
              <List className="h-3.5 w-3.5" />Volné
            </button>
            <button
              className={`px-2 py-1 text-xs flex items-center gap-1 ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}
              onClick={() => setViewMode("calendar")}
            >
              <CalendarDays className="h-3.5 w-3.5" />Měsíc
            </button>
          </div>
          {dirtyCount > 0 && <span className="text-xs text-muted-foreground">{dirtyCount} neuložených</span>}
          {viewMode === "free" && (
            <Button size="sm" variant="outline" onClick={addRow}><Plus className="mr-1 h-4 w-4" />Řádek</Button>
          )}
          <Button size="sm" onClick={viewMode === "calendar" ? saveCalendar : saveAll} disabled={saving || dirtyCount === 0}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Uložit
          </Button>
        </div>
      </div>

      {/* Filters (free view only) */}
      {showFilters && viewMode === "free" && (
        <div className="flex items-center gap-3 p-2 rounded-md bg-muted/30 border">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Řidič:</Label>
            <Select value={filterDriver} onValueChange={setFilterDriver}>
              <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Všichni</SelectItem>
                {drivers.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.first_name} {d.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label className="text-xs">Popis/účel:</Label>
            <Input className="h-7 w-40 text-xs" placeholder="Hledat..." value={filterPurpose} onChange={e => setFilterPurpose(e.target.value)} />
          </div>
          {(filterDriver !== "all" || filterPurpose) && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setFilterDriver("all"); setFilterPurpose(""); }}>Zrušit</Button>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Card className="shadow-none"><CardContent className="p-3 flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          <div><p className="text-[10px] text-muted-foreground">Celkem km</p><p className="text-sm font-bold">{totalKm.toLocaleString("cs-CZ")}</p></div>
        </CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-3 flex items-center gap-2">
          <Fuel className="h-4 w-4 text-primary" />
          <div><p className="text-[10px] text-muted-foreground">PHM (l)</p><p className="text-sm font-bold">{totalFuelQty ? totalFuelQty.toLocaleString("cs-CZ", { minimumFractionDigits: 1 }) : "—"}</p></div>
        </CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <div><p className="text-[10px] text-muted-foreground">Spotřeba l/100km</p><p className="text-sm font-bold">{avgConsumption > 0 ? avgConsumption.toFixed(1) : "—"}</p></div>
        </CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <div><p className="text-[10px] text-muted-foreground">Celkové náklady</p><p className="text-sm font-bold">{totalCost ? `${totalCost.toLocaleString("cs-CZ")} Kč` : "—"}</p></div>
        </CardContent></Card>
        <Card className="shadow-none"><CardContent className="p-3 flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">{tripCount}</div>
          <div><p className="text-[10px] text-muted-foreground">Počet jízd</p><p className="text-sm font-bold">{tripCount}</p></div>
        </CardContent></Card>
      </div>

      {/* Daily km chart */}
      {hasChartData && (
        <Card className="shadow-none"><CardContent className="p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Najeté km po dnech</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} interval="preserveStartEnd" stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 9 }} width={35} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v: number) => [`${v} km`, "Km"]} />
              <Bar dataKey="km" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : viewMode === "free" ? (
        /* FREE VIEW */
        <div className="overflow-x-auto border rounded-md" ref={tableRef}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {COLUMNS.map(col => (
                  <th key={col.key} className={`px-1 py-1.5 text-left text-xs font-medium text-muted-foreground ${col.minW}`}>{col.label}</th>
                ))}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr><td colSpan={COLUMNS.length + 1} className="text-center text-muted-foreground py-8 text-sm">Žádné záznamy — klikněte „Řádek"</td></tr>
              ) : filteredRows.map((row, rowIdx) => {
                const realIdx = rows.indexOf(row);
                return (
                  <tr key={row.id || `new-${realIdx}`} className={`border-b hover:bg-muted/30 ${row._dirty ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                    {COLUMNS.map((col, colIdx) => (
                      <td key={col.key} className="px-0.5 py-0.5">{renderCell(row, col, realIdx, colIdx, false)}</td>
                    ))}
                    <td className="px-0.5 py-0.5">
                      <button className="h-7 w-7 flex items-center justify-center text-destructive/60 hover:text-destructive rounded-sm hover:bg-destructive/10" onClick={() => deleteRow(realIdx)} title="Smazat">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/30 font-medium text-xs">
                  <td colSpan={8} className="px-1 py-1.5 text-right">Celkem:</td>
                  <td className="px-1 py-1.5"></td><td className="px-1 py-1.5"></td>
                  <td className="px-1 py-1.5 font-bold">{totalKm.toLocaleString("cs-CZ")}</td>
                  <td className="px-1 py-1.5">{totalFuelQty ? totalFuelQty.toLocaleString("cs-CZ", { minimumFractionDigits: 2 }) : ""}</td>
                  <td className="px-1 py-1.5">{totalFuelPrice ? `${totalFuelPrice.toLocaleString("cs-CZ")} Kč` : ""}</td>
                  <td className="px-1 py-1.5"></td>
                  <td className="px-1 py-1.5">{totalOtherPrice ? `${totalOtherPrice.toLocaleString("cs-CZ")} Kč` : ""}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        /* CALENDAR VIEW */
        <div className="overflow-x-auto border rounded-md" ref={calTableRef}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-1 py-1.5 text-left text-xs font-medium text-muted-foreground min-w-[70px]">Den</th>
                {CAL_COLUMNS.map(col => (
                  <th key={col.key} className={`px-1 py-1.5 text-left text-xs font-medium text-muted-foreground ${col.minW}`}>{col.label}</th>
                ))}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {calRows.map((row, rowIdx) => {
                const weekend = isWeekend(row.date);
                const dayNum = parseInt(row.date.split("-")[2]);
                const dayName = getDayName(row.date);
                const hasData = !!(row.id || row.km_end || row.route_from || row.description || row.purpose || row.fuel_quantity);
                return (
                  <tr
                    key={row.date}
                    className={`border-b ${weekend ? "bg-muted/60" : ""} ${row._dirty ? "bg-amber-50/50 dark:bg-amber-900/10" : ""} hover:bg-muted/30`}
                  >
                    <td className="px-1 py-0.5">
                      <span className={`text-xs font-medium ${weekend ? "text-destructive" : ""}`}>
                        {dayNum}. {dayName}
                      </span>
                    </td>
                    {CAL_COLUMNS.map((col, colIdx) => (
                      <td key={col.key} className="px-0.5 py-0.5">
                        {renderCell(row, col, rowIdx, colIdx, true)}
                      </td>
                    ))}
                    <td className="px-0.5 py-0.5">
                      {hasData && (
                        <button
                          className="h-7 w-7 flex items-center justify-center text-destructive/60 hover:text-destructive rounded-sm hover:bg-destructive/10"
                          onClick={() => clearCalRow(rowIdx)}
                          title="Vymazat řádek"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-medium text-xs">
                <td colSpan={8} className="px-1 py-1.5 text-right">Celkem:</td>
                <td className="px-1 py-1.5"></td><td className="px-1 py-1.5"></td>
                <td className="px-1 py-1.5 font-bold">{totalKm.toLocaleString("cs-CZ")}</td>
                <td className="px-1 py-1.5">{totalFuelQty ? totalFuelQty.toLocaleString("cs-CZ", { minimumFractionDigits: 2 }) : ""}</td>
                <td className="px-1 py-1.5">{totalFuelPrice ? `${totalFuelPrice.toLocaleString("cs-CZ")} Kč` : ""}</td>
                <td className="px-1 py-1.5"></td>
                <td className="px-1 py-1.5">{totalOtherPrice ? `${totalOtherPrice.toLocaleString("cs-CZ")} Kč` : ""}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Multi-month stats */}
      {multiMonthData.length > 0 && (
        <Card className="shadow-none">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Statistiky za poslední 4 měsíce</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {multiMonthData.map(m => (
                <div key={m.month} className="border rounded-md p-2 space-y-1">
                  <p className="font-medium text-sm">{m.month}</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Km:</span><span className="font-medium">{m.km.toLocaleString("cs-CZ")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">PHM:</span><span>{m.fuel} l</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Spotřeba:</span><span>{m.consumption > 0 ? `${m.consumption} l/100` : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Náklady:</span><span className="font-medium">{m.totalCost.toLocaleString("cs-CZ")} Kč</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Jízd:</span><span>{m.trips}</span></div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={multiMonthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="km" tick={{ fontSize: 9 }} width={40} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 9 }} width={50} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="km" type="monotone" dataKey="km" stroke="hsl(var(--primary))" name="Km" strokeWidth={2} />
                <Line yAxisId="cost" type="monotone" dataKey="totalCost" stroke="hsl(var(--destructive))" name="Náklady (Kč)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <p className="text-[10px] text-muted-foreground">Tip: Ctrl+S uložit • Tab další buňka • Enter další řádek</p>
    </div>
  );
}
