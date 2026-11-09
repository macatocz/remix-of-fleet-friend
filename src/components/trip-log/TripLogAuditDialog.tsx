import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { auditTrips, type AuditIssue } from "@/lib/tripLog/audit";

export default function TripLogAuditDialog({ vehicleId, selectedMonth }: { vehicleId: string; selectedMonth: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [count, setCount] = useState(0);

  const run = async () => {
    setOpen(true); setLoading(true);
    const [y, m] = selectedMonth.split("-").map(Number);
    const from = `${selectedMonth}-01`;
    const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const [{ data: trips }, { data: fuel }] = await Promise.all([
      supabase.from("trip_logs").select("id, date, time, km_start, km_end, km_total, purpose_type, break_minutes").eq("vehicle_id", vehicleId).gte("date", from).lte("date", to),
      supabase.from("fuel_records").select("fueled_at, liters, location").eq("vehicle_id", vehicleId).gte("fueled_at", from).lte("fueled_at", to + "T23:59:59"),
    ]);
    setCount(trips?.length || 0);
    setIssues(auditTrips((trips || []) as any, (fuel || []) as any));
    setLoading(false);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={run}><ShieldCheck className="mr-1 h-4 w-4" />Zkontrolovat</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kontrola knihy jízd</DialogTitle>
            <DialogDescription>Upozornění na místa, kterých si při kontrole může všimnout finanční úřad. Nic se automaticky neupravuje.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            : issues.length === 0 ? (
              <div className="flex items-center gap-2 text-sm py-4"><CheckCircle2 className="h-5 w-5 text-primary" />{count === 0 ? "V tomto měsíci nejsou žádné jízdy." : `Zkontrolováno ${count} jízd, bez upozornění.`}</div>
            ) : (
              <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                <li className="text-sm text-muted-foreground">{issues.length} upozornění z {count} jízd</li>
                {issues.map((i, k) => (
                  <li key={k} className="flex gap-2 rounded-md border p-2 text-sm"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />{i.message}</li>
                ))}
              </ul>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
