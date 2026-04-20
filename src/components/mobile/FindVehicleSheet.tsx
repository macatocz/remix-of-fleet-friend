import { useState } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDriverContext } from "@/hooks/useDriverContext";
import { toast } from "sonner";

interface FreeVehicle {
  id: string;
  rz: string | null;
  znacka: string | null;
  kategorie: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick?: (vehicleId: string, dateFrom: string, dateTo: string, timeFrom: string, timeTo: string) => void;
}

export default function FindVehicleSheet({ open, onOpenChange, onPick }: Props) {
  const { allVehicles } = useDriverContext();
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [timeFrom, setTimeFrom] = useState("08:00");
  const [timeTo, setTimeTo] = useState("17:00");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<FreeVehicle[] | null>(null);

  const search = async () => {
    if (dateTo < dateFrom) { toast.error("Datum do musí být ≥ datum od"); return; }
    setSearching(true);

    const { data: conflicts, error } = await supabase
      .from("reservations")
      .select("vehicle_id, date_from, date_to, time_from, time_to")
      .in("status", ["čeká", "schváleno"])
      .lte("date_from", dateTo)
      .gte("date_to", dateFrom);

    if (error) {
      setSearching(false);
      toast.error("Chyba: " + error.message);
      return;
    }

    const blocked = new Set<string>();
    (conflicts || []).forEach((c: any) => {
      const sameSingleDay = c.date_from === c.date_to && dateFrom === dateTo && c.date_from === dateFrom;
      if (!sameSingleDay) { blocked.add(c.vehicle_id); return; }
      const cFrom = c.time_from || "00:00:00";
      const cTo = c.time_to || "23:59:59";
      const nFrom = (timeFrom || "00:00") + ":00";
      const nTo = (timeTo || "23:59") + ":00";
      if (cFrom < nTo && nFrom < cTo) blocked.add(c.vehicle_id);
    });

    const { data: vs } = await supabase
      .from("vehicles")
      .select("id, rz, znacka, kategorie")
      .eq("status", "aktivní")
      .order("rz", { ascending: true });

    const free = (vs || []).filter((v: any) => !blocked.has(v.id));
    setResults(free as FreeVehicle[]);
    setSearching(false);
  };

  const pick = (id: string) => {
    onPick?.(id, dateFrom, dateTo, timeFrom, timeTo);
    onOpenChange(false);
    setResults(null);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Najít volný vůz</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Datum od</Label>
              <Input className="h-12" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Datum do</Label>
              <Input className="h-12" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Čas od</Label>
              <Input className="h-12" type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Čas do</Label>
              <Input className="h-12" type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} />
            </div>
          </div>

          <Button className="w-full h-12" onClick={search} disabled={searching}>
            <Search className="h-4 w-4 mr-2" />
            {searching ? "Hledám…" : "Najít volné vozy"}
          </Button>

          {results !== null && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Nalezeno {results.length} {results.length === 1 ? "vůz" : results.length < 5 ? "vozy" : "vozů"}
              </p>
              {results.length === 0 && (
                <Card><CardContent className="p-4 text-sm text-muted-foreground text-center">
                  V daném termínu není žádný vůz volný. Zkuste jiný termín.
                </CardContent></Card>
              )}
              {results.map(v => (
                <button
                  key={v.id}
                  onClick={() => pick(v.id)}
                  className="w-full text-left active:scale-[0.99] transition-transform"
                >
                  <Card>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{v.rz || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.znacka || "—"}{v.kategorie ? ` · ${v.kategorie}` : ""}
                        </p>
                      </div>
                      <span className="text-xs text-primary font-medium">Vybrat</span>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          )}
        </div>
        <DrawerFooter className="pb-safe">
          <Button variant="outline" className="w-full h-12" onClick={() => onOpenChange(false)}>
            Zavřít
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}