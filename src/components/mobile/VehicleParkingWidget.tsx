import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Parking {
  lokalita: string | null;
  parkovaci_stani: string | null;
}

export default function VehicleParkingWidget({ vehicleId }: { vehicleId: string }) {
  const [data, setData] = useState<Parking | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: row } = await supabase
        .from("vehicles_basic")
        .select("lokalita, parkovaci_stani")
        .eq("id", vehicleId)
        .maybeSingle();
      if (!cancelled) setData((row as Parking) || null);
    })();
    return () => { cancelled = true; };
  }, [vehicleId]);

  const lokalita = data?.lokalita?.trim() || "";
  const stani = data?.parkovaci_stani?.trim() || "";

  if (!lokalita && !stani) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Kde vůz najdete
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {lokalita && (
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="text-xs text-muted-foreground shrink-0 pt-0.5">Lokalita</span>
            <span className="font-medium text-right">{lokalita}</span>
          </div>
        )}
        {stani && (
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="text-xs text-muted-foreground shrink-0 pt-0.5">Parkovací stání</span>
            <span className="font-medium text-right">{stani}</span>
          </div>
        )}
        {lokalita && (
          <Button
            variant="outline"
            className="w-full h-10 mt-1"
            onClick={() =>
              window.open(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lokalita)}`,
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            <Navigation className="h-4 w-4 mr-2" /> Navigovat
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
