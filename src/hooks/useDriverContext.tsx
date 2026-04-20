import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface DriverInfo {
  id: string;
  first_name: string;
  last_name: string;
  fullName: string;
}

export interface DriverVehicle {
  id: string;
  znacka: string | null;
  rz: string | null;
  status: string;
  stk: string | null;
  zelena_karta: string | null;
}

/**
 * Loads the driver record linked to the current user (via drivers.user_id)
 * and any vehicles where this driver is set as správce (vehicles.spravce_id).
 */
export function useDriverContext() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [myVehicles, setMyVehicles] = useState<DriverVehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<DriverVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data: drv } = await supabase
        .from("drivers")
        .select("id, first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (drv) {
        const info: DriverInfo = {
          id: drv.id,
          first_name: drv.first_name,
          last_name: drv.last_name,
          fullName: `${drv.first_name} ${drv.last_name}`.trim(),
        };
        setDriver(info);

        const { data: mine } = await supabase
          .from("vehicles")
          .select("id, znacka, rz, status, stk, zelena_karta")
          .eq("spravce_id", drv.id);
        if (!cancelled) setMyVehicles((mine as DriverVehicle[]) || []);
      }

      const { data: all } = await supabase
        .from("vehicles")
        .select("id, znacka, rz, status, stk, zelena_karta")
        .eq("status", "aktivní")
        .order("rz", { ascending: true });
      if (!cancelled) setAllVehicles((all as DriverVehicle[]) || []);

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user]);

  const isSpravce = myVehicles.length > 0;
  return { driver, myVehicles, allVehicles, loading, isSpravce };
}
