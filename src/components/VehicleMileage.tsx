import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Gauge, TrendingUp, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";

interface MileageRecord {
  id: string;
  km: number;
  recorded_at: string;
  note: string | null;
  created_at: string;
}

interface Props {
  vehicleId: string;
  contractualKmPerYear?: string | null;
  leasingStart?: string | null;
  leasingEnd?: string | null;
}

export default function VehicleMileage({ vehicleId, contractualKmPerYear, leasingStart, leasingEnd }: Props) {
  const [records, setRecords] = useState<MileageRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [km, setKm] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchRecords = async () => {
    const { data } = await supabase
      .from("vehicle_mileage")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("recorded_at", { ascending: false });
    setRecords((data as MileageRecord[]) || []);
  };

  useEffect(() => { fetchRecords(); }, [vehicleId]);

  const handleAdd = async () => {
    if (!km || isNaN(Number(km))) return;
    setSaving(true);
    const { error } = await supabase.from("vehicle_mileage").insert({
      vehicle_id: vehicleId,
      km: Number(km),
      recorded_at: date,
      note: note || null,
    });
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Nájezd zaznamenán" });
      setOpen(false);
      setKm("");
      setNote("");
      fetchRecords();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("vehicle_mileage").delete().eq("id", id);
    fetchRecords();
  };

  // Calculate mileage status vs contract
  const contractKm = contractualKmPerYear ? parseInt(contractualKmPerYear.replace(/\D/g, "")) : null;
  const latest = records[0];
  const oldest = records[records.length - 1];

  let mileageStatus: { percentage: number; message: string; type: "ok" | "warning" | "critical" } | null = null;

  if (contractKm && latest && oldest && records.length >= 2 && leasingStart) {
    const totalDriven = latest.km - oldest.km;
    const startDate = new Date(leasingStart);
    const now = new Date();
    const endDate = leasingEnd ? new Date(leasingEnd) : null;
    const totalLeasingDays = endDate ? (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) : null;
    const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const totalContractKm = totalLeasingDays ? (contractKm / 365) * totalLeasingDays : contractKm;
    const expectedKmNow = totalLeasingDays
      ? (elapsedDays / totalLeasingDays) * totalContractKm
      : (elapsedDays / 365) * contractKm;

    const percentage = expectedKmNow > 0 ? Math.round((totalDriven / expectedKmNow) * 100) : 0;

    if (percentage > 110) {
      mileageStatus = { percentage, message: `Překročení smluvního nájezdu (${percentage}%)`, type: "critical" };
    } else if (percentage > 90) {
      mileageStatus = { percentage, message: `Blížíte se smluvnímu limitu (${percentage}%)`, type: "warning" };
    } else {
      mileageStatus = { percentage, message: `Nájezd v normě (${percentage}% limitu)`, type: "ok" };
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          Evidence nájezdů
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" />Zadat nájezd</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nový záznam nájezdu</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Stav tachometru (km)</Label>
                <Input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="např. 45230" />
              </div>
              <div>
                <Label>Datum</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Poznámka (volitelné)</Label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="např. měsíční odečet" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={saving || !km}>{saving ? "Ukládám..." : "Uložit"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mileage status card */}
      {mileageStatus && (
        <div className={`rounded-lg border p-3 flex items-center gap-3 ${
          mileageStatus.type === "critical" ? "border-destructive/30 bg-destructive/5" :
          mileageStatus.type === "warning" ? "border-warning/30 bg-warning/5" :
          "border-success/30 bg-success/5"
        }`}>
          {mileageStatus.type === "critical" || mileageStatus.type === "warning" ? (
            <AlertTriangle className={`h-5 w-5 shrink-0 ${mileageStatus.type === "critical" ? "text-destructive" : "text-warning"}`} />
          ) : (
            <TrendingUp className="h-5 w-5 shrink-0 text-success" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">{mileageStatus.message}</p>
            {contractKm && (
              <p className="text-xs text-muted-foreground">Smluvní limit: {contractKm.toLocaleString("cs-CZ")} km/rok</p>
            )}
          </div>
          <Badge variant={mileageStatus.type === "critical" ? "destructive" : mileageStatus.type === "warning" ? "secondary" : "secondary"}>
            {mileageStatus.percentage}%
          </Badge>
        </div>
      )}

      {contractKm && !mileageStatus && records.length < 2 && (
        <p className="text-xs text-muted-foreground">Pro vyhodnocení nájezdu je potřeba alespoň 2 záznamy.</p>
      )}

      {/* Records table */}
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Žádné záznamy nájezdů</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Datum</th>
                <th className="text-right px-3 py-2 font-medium">km</th>
                <th className="text-left px-3 py-2 font-medium">Poznámka</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2">{new Date(r.recorded_at).toLocaleDateString("cs-CZ")}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {r.km.toLocaleString("cs-CZ")}
                    {i < records.length - 1 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (+{(r.km - records[i + 1].km).toLocaleString("cs-CZ")})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.note || "—"}</td>
                  <td className="px-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
