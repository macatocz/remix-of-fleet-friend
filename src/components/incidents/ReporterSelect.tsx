import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface ReporterDriver { id: string; first_name: string; last_name: string }

export const reporterName = (d?: { first_name?: string | null; last_name?: string | null } | null) =>
  d ? `${d.first_name || ""} ${d.last_name || ""}`.trim() || "Neuvedeno" : "Neuvedeno";

export function useActiveDrivers() {
  const [drivers, setDrivers] = useState<ReporterDriver[]>([]);
  useEffect(() => {
    supabase
      .from("drivers")
      .select("id, first_name, last_name")
      .eq("status", "aktivní")
      .order("last_name")
      .then(({ data }) => setDrivers((data || []) as ReporterDriver[]));
  }, []);
  return drivers;
}

const NONE = "__none";

export default function ReporterSelect({
  value, onChange, className,
}: { value: string; onChange: (v: string) => void; className?: string }) {
  const drivers = useActiveDrivers();
  return (
    <div className={className}>
      <Label>Nahlásil / řidič</Label>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger><SelectValue placeholder="Neuvedeno" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Neuvedeno</SelectItem>
          {drivers.map((d) => (
            <SelectItem key={d.id} value={d.id}>{reporterName(d)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
