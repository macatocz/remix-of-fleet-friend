import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Plus, Loader2, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  { key: "date", label: "Datum", type: "date", width: "w-28" },
  { key: "time", label: "Čas", type: "time", width: "w-20" },
  { key: "break_minutes", label: "Přest.", type: "number", width: "w-16" },
  { key: "driver_id", label: "Řidič", type: "select", width: "w-36" },
  { key: "description", label: "Popis", type: "text", width: "w-32" },
  { key: "purpose", label: "Účel", type: "text", width: "w-28" },
  { key: "route_from", label: "Z", type: "text", width: "w-24" },
  { key: "route_to", label: "Do", type: "text", width: "w-24" },
  { key: "km_start", label: "Poč. km", type: "number", width: "w-22" },
  { key: "km_end", label: "Kon. km", type: "number", width: "w-22" },
  { key: "km_total", label: "Km", type: "computed", width: "w-18" },
  { key: "fuel_quantity", label: "PHM (l)", type: "number", width: "w-20" },
  { key: "fuel_price", label: "PHM (Kč)", type: "number", width: "w-22" },
  { key: "other_quantity", label: "Ost. mn.", type: "number", width: "w-20" },
  { key: "other_price", label: "Ost. (Kč)", type: "number", width: "w-22" },
] as const;

interface Props {
  vehicleId: string;
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
  const { toast } = useToast();
  const tableRef = useRef<HTMLDivElement>(null);

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
    setRows((data as any[] || []).map((r: any) => ({ ...r, _dirty: false, _new: false })));
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [vehicleId, selectedMonth]);

  useEffect(() => {
    supabase.from("drivers").select("id, first_name, last_name").eq("status", "aktivní")
      .then(({ data }) => setDrivers((data as any[]) || []));
  }, []);

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    const newRow: TripRow = {
      vehicle_id: vehicleId,
      driver_id: lastRow?.driver_id || null,
      date: new Date().toISOString().split("T")[0],
      time: null,
      break_minutes: null,
      description: null,
      purpose: null,
      route_from: null,
      route_to: null,
      km_start: lastRow?.km_end || null,
      km_end: null,
      km_total: null,
      fuel_quantity: null,
      fuel_price: null,
      other_quantity: null,
      other_price: null,
      _dirty: true,
      _new: true,
    };
    setRows(prev => [...prev, newRow]);
    // Focus first cell of new row after render
    setTimeout(() => {
      const inputs = tableRef.current?.querySelectorAll(`[data-row="${rows.length}"]`);
      if (inputs?.[0]) (inputs[0] as HTMLElement).focus();
    }, 50);
  };

  const updateCell = (rowIdx: number, key: string, value: string) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[rowIdx], _dirty: true };

      if (["km_start", "km_end", "break_minutes"].includes(key)) {
        (row as any)[key] = value ? parseInt(value) : null;
      } else if (["fuel_quantity", "fuel_price", "other_quantity", "other_price"].includes(key)) {
        (row as any)[key] = value ? parseFloat(value) : null;
      } else {
        (row as any)[key] = value || null;
      }

      // Auto-calculate km_total
      if (key === "km_start" || key === "km_end") {
        if (row.km_start != null && row.km_end != null) {
          row.km_total = row.km_end - row.km_start;
        } else {
          row.km_total = null;
        }
      }

      updated[rowIdx] = row;
      return updated;
    });
  };

  const saveAll = async () => {
    const dirtyRows = rows.filter(r => r._dirty);
    if (dirtyRows.length === 0) {
      toast({ title: "Žádné změny k uložení" });
      return;
    }

    setSaving(true);
    let hasError = false;

    for (const row of dirtyRows) {
      const payload: any = {
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
      };

      if (row._new) {
        const { error } = await supabase.from("trip_logs").insert(payload);
        if (error) { hasError = true; toast({ title: "Chyba", description: error.message, variant: "destructive" }); }
      } else if (row.id) {
        const { error } = await supabase.from("trip_logs").update(payload).eq("id", row.id);
        if (error) { hasError = true; toast({ title: "Chyba", description: error.message, variant: "destructive" }); }
      }
    }

    if (!hasError) {
      toast({ title: `Uloženo (${dirtyRows.length} ${dirtyRows.length === 1 ? "záznam" : "záznamů"})` });
    }
    await fetchLogs();
    setSaving(false);
  };

  const deleteRow = async (rowIdx: number) => {
    const row = rows[rowIdx];
    if (row._new) {
      setRows(prev => prev.filter((_, i) => i !== rowIdx));
      return;
    }
    if (!row.id) return;
    const { error } = await supabase.from("trip_logs").delete().eq("id", row.id);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else { toast({ title: "Smazáno" }); fetchLogs(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    if (e.key === "Tab" && !e.shiftKey && rowIdx === rows.length - 1 && colIdx === COLUMNS.length - 1) {
      e.preventDefault();
      addRow();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      // Move to same column next row
      const next = tableRef.current?.querySelector(`[data-row="${rowIdx + 1}"][data-col="${colIdx}"]`) as HTMLElement;
      if (next) next.focus();
      else addRow();
    }
  };

  const dirtyCount = rows.filter(r => r._dirty).length;

  // Summaries
  const totalKm = rows.reduce((s, r) => s + (r.km_total || 0), 0);
  const totalFuelQty = rows.reduce((s, r) => s + (Number(r.fuel_quantity) || 0), 0);
  const totalFuelPrice = rows.reduce((s, r) => s + (Number(r.fuel_price) || 0), 0);
  const totalOtherPrice = rows.reduce((s, r) => s + (Number(r.other_price) || 0), 0);

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return "";
    const d = drivers.find(d => d.id === driverId);
    return d ? `${d.first_name} ${d.last_name}` : "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Měsíc:</Label>
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-44 h-8" />
        </div>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <span className="text-xs text-muted-foreground">{dirtyCount} neuložených změn</span>
          )}
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="mr-1 h-4 w-4" />Řádek
          </Button>
          <Button size="sm" onClick={saveAll} disabled={saving || dirtyCount === 0}>
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Uložit
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="overflow-x-auto border rounded-md" ref={tableRef}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {COLUMNS.map(col => (
                  <th key={col.key} className={`px-1 py-1.5 text-left text-xs font-medium text-muted-foreground ${col.width}`}>
                    {col.label}
                  </th>
                ))}
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="text-center text-muted-foreground py-8 text-sm">
                    Žádné záznamy — klikněte „Řádek" pro přidání
                  </td>
                </tr>
              ) : rows.map((row, rowIdx) => (
                <tr key={row.id || `new-${rowIdx}`} className={`border-b hover:bg-muted/30 ${row._dirty ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                  {COLUMNS.map((col, colIdx) => (
                    <td key={col.key} className="px-0.5 py-0.5">
                      {col.type === "computed" ? (
                        <span className="px-1 font-medium text-right block">
                          {row.km_total != null ? row.km_total.toLocaleString("cs-CZ") : "—"}
                        </span>
                      ) : col.type === "select" && col.key === "driver_id" ? (
                        <Select
                          value={row.driver_id || ""}
                          onValueChange={v => updateCell(rowIdx, "driver_id", v)}
                        >
                          <SelectTrigger className="h-7 text-xs border-0 bg-transparent shadow-none focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map(d => (
                              <SelectItem key={d.id} value={d.id} className="text-xs">
                                {d.first_name} {d.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <input
                          data-row={rowIdx}
                          data-col={colIdx}
                          type={col.type === "number" ? "number" : col.type === "date" ? "date" : col.type === "time" ? "time" : "text"}
                          step={["fuel_quantity", "fuel_price", "other_quantity", "other_price"].includes(col.key) ? "0.01" : undefined}
                          className="w-full h-7 px-1 text-xs bg-transparent border-0 outline-none focus:ring-1 focus:ring-primary rounded-sm"
                          value={(row as any)[col.key] ?? ""}
                          onChange={e => updateCell(rowIdx, col.key, e.target.value)}
                          onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-0.5 py-0.5">
                    <button
                      className="h-7 w-7 flex items-center justify-center text-destructive/60 hover:text-destructive rounded-sm hover:bg-destructive/10"
                      onClick={() => deleteRow(rowIdx)}
                      title="Smazat"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/30 font-medium text-xs">
                  <td colSpan={8} className="px-1 py-1.5 text-right">Celkem:</td>
                  <td className="px-1 py-1.5"></td>
                  <td className="px-1 py-1.5"></td>
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
      )}
    </div>
  );
}
