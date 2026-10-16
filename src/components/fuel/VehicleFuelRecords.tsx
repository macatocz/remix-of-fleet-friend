import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Fuel, Receipt, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import DeleteFuelButton from "@/components/fuel/DeleteFuelButton";
import { canDeleteFuel } from "@/lib/fuel/deleteFuelRecord";

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

  return (
    <div className="divide-y">
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
          <Fuel className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium tabular-nums">{new Date(r.fueled_at).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" })}</span>
          <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />{r.location || "—"}
          </span>
          <span className="tabular-nums">{r.liters ? `${Number(r.liters).toLocaleString("cs-CZ")} l` : ""}</span>
          <span className="tabular-nums">{r.total_price ? `${Number(r.total_price).toLocaleString("cs-CZ")} Kč` : ""}</span>
          <span className="tabular-nums text-muted-foreground">{r.km ? `${r.km.toLocaleString("cs-CZ")} km` : ""}</span>
          {r.document_id && docs[r.document_id] && (
            <Button size="sm" variant="outline" className="h-8" onClick={() => openReceipt(docs[r.document_id])}>
              <Receipt className="mr-1 h-3.5 w-3.5" />Účtenka
            </Button>
          )}
          {canDeleteFuel(r, user?.id, isManager) && (
            <DeleteFuelButton record={r} docPath={r.document_id ? docs[r.document_id] : undefined}
              onDeleted={() => setRows((p) => p.filter((x) => x.id !== r.id))} />
          )}
        </div>
      ))}
    </div>
  );
}
