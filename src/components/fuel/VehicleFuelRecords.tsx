import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Fuel, Receipt, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import DeleteFuelButton from "@/components/fuel/DeleteFuelButton";
import EditFuelButton from "@/components/fuel/EditFuelButton";
import { canDeleteFuel } from "@/lib/fuel/deleteFuelRecord";

const fmt = (n: number, d = 0) => n.toLocaleString("cs-CZ", { maximumFractionDigits: d, minimumFractionDigits: d });
const dt = (s: string) => new Date(s).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" });

export default function VehicleFuelRecords({ vehicleId }: { vehicleId: string }) {
  const { user, hasRole } = useAuth();
  const isManager = hasRole("admin") || hasRole("dispatcer");
  const [rows, setRows] = useState<any[]>([]);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("fuel_records").select("*").eq("vehicle_id", vehicleId)
        .order("fueled_at", { ascending: false }).limit(100);
      const list = data || [];
      setRows(list);
      const ids = list.map((r) => r.document_id).filter(Boolean) as string[];
      if (ids.length) {
        const { data: d } = await supabase.from("vehicle_documents").select("id, file_path").in("id", ids);
        setDocs(Object.fromEntries((d || []).map((x) => [x.id, x.file_path])));
      }
      setLoading(false);
    })();
  }, [vehicleId]);

  const openReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from("vehicle-documents").createSignedUrl(path, 60);
    if (error || !data) { toast.error("Účtenku se nepodařilo otevřít"); return; }
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Načítání…</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">Zatím žádné tankování. Řidič ho zapíše v aplikaci tlačítkem „Tankování“.</p>;

  const totals = rows.reduce((a, r) => ({ l: a.l + Number(r.liters || 0), p: a.p + Number(r.total_price || 0) }), { l: 0, p: 0 });

  const actions = (r: any, showMissing: boolean) => (
    <div className="flex items-center justify-end gap-1 shrink-0">
      {r.document_id && docs[r.document_id] ? (
        <Button size="sm" variant="outline" className="h-8" onClick={() => openReceipt(docs[r.document_id])}>
          <Receipt className="mr-1 h-3.5 w-3.5" />Účtenka
        </Button>
      ) : showMissing ? <span className="mr-1 text-xs text-muted-foreground">bez účtenky</span> : null}
      {isManager && <EditFuelButton record={r} onSaved={(n) => setRows((p) => p.map((x) => x.id === n.id ? n : x))} />}
      {canDeleteFuel(r, user?.id, isManager) && (
        <DeleteFuelButton record={r} docPath={r.document_id ? docs[r.document_id] : undefined}
          onDeleted={() => setRows((p) => p.filter((x) => x.id !== r.id))} />
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Tankování: <b className="text-foreground tabular-nums">{rows.length}</b></span>
        <span>Celkem: <b className="text-foreground tabular-nums">{fmt(totals.l, 1)} l</b></span>
        <span>Cena: <b className="text-foreground tabular-nums">{fmt(totals.p)} Kč</b></span>
        {totals.l > 0 && <span>Průměr: <b className="text-foreground tabular-nums">{fmt(totals.p / totals.l, 2)} Kč/l</b></span>}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum a čas</TableHead>
              <TableHead>Místo</TableHead>
              <TableHead className="text-right">Litry</TableHead>
              <TableHead className="text-right">Cena</TableHead>
              <TableHead className="text-right">Kč/l</TableHead>
              <TableHead className="text-right">Tachometr</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap tabular-nums">{dt(r.fueled_at)}</TableCell>
                <TableCell>{r.location || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{r.liters ? `${fmt(Number(r.liters), 2)} l` : "—"}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">{r.total_price ? `${fmt(Number(r.total_price), 2)} Kč` : "—"}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">{r.liters && r.total_price ? fmt(Number(r.total_price) / Number(r.liters), 2) : "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{r.km ? `${fmt(r.km)} km` : "—"}</TableCell>
                <TableCell>{actions(r, true)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="divide-y md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="py-2.5 text-sm space-y-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-medium tabular-nums">
                <Fuel className="h-4 w-4 text-muted-foreground shrink-0" />{dt(r.fueled_at)}
              </span>
              <span className="font-semibold tabular-nums shrink-0">{r.total_price ? `${Number(r.total_price).toLocaleString("cs-CZ")} Kč` : ""}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground min-w-0">
              <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{r.location || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {[r.liters ? `${Number(r.liters).toLocaleString("cs-CZ")} l` : "", r.km ? `${r.km.toLocaleString("cs-CZ")} km` : ""].filter(Boolean).join(" · ")}
              </span>
              {actions(r, false)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
