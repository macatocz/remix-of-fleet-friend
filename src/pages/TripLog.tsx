import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VehicleTripLog from "@/components/VehicleTripLog";
import VehicleTripLogInline from "@/components/VehicleTripLogInline";
import { vehicleLabel } from "@/lib/vehicleName";

export default function TripLog() {
  const [params, setParams] = useSearchParams();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const vid = params.get("vozidlo") || "all";

  useEffect(() => {
    supabase.from("vehicles").select("id, rz, znacka, nazev_vozu").order("rz").then(({ data }) => setVehicles(data || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kniha jízd</h1>
          <p className="text-sm text-muted-foreground mt-1">Vyberte vozidlo pro zápis, import, kontrolu a export. „Všechna vozidla“ je jen přehled.</p>
        </div>
        <Select value={vid} onValueChange={(v) => setParams(v === "all" ? {} : { vozidlo: v }, { replace: true })}>
          <SelectTrigger className="w-72" aria-label="Vozidlo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechna vozidla (přehled)</SelectItem>
            {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.rz} · {vehicleLabel(v)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {vid === "all" ? <VehicleTripLog readOnly /> : <VehicleTripLogInline key={vid} vehicleId={vid} />}
    </div>
  );
}
