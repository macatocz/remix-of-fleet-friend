import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const COUNTRIES = [
  { value: "CZE", label: "CZE" },
  { value: "DE", label: "DE" },
  { value: "SVK", label: "SVK" },
  { value: "AUT", label: "AUT" },
];

interface Vignette {
  id: string;
  country: string;
  valid_until: string;
}

interface Props {
  vehicleId: string;
  editing: boolean;
}

export default function VehicleVignettes({ vehicleId, editing }: Props) {
  const [vignettes, setVignettes] = useState<Vignette[]>([]);
  const [draft, setDraft] = useState<Record<string, Date | undefined>>({});
  const [checkedCountries, setCheckedCountries] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchVignettes = async () => {
    const { data } = await supabase
      .from("vehicle_vignettes")
      .select("*")
      .eq("vehicle_id", vehicleId);
    const items = (data as Vignette[]) || [];
    setVignettes(items);
    setCheckedCountries(new Set(items.map((v) => v.country)));
    const d: Record<string, Date | undefined> = {};
    items.forEach((v) => {
      d[v.country] = parseISO(v.valid_until);
    });
    setDraft(d);
  };

  useEffect(() => {
    fetchVignettes();
  }, [vehicleId]);

  const handleToggle = (country: string, checked: boolean) => {
    const next = new Set(checkedCountries);
    if (checked) {
      next.add(country);
    } else {
      next.delete(country);
      setDraft((prev) => {
        const copy = { ...prev };
        delete copy[country];
        return copy;
      });
    }
    setCheckedCountries(next);
  };

  const handleDateChange = (country: string, date: Date | undefined) => {
    setDraft((prev) => ({ ...prev, [country]: date }));
  };

  const saveVignettes = async () => {
    // Delete all existing vignettes for this vehicle
    await supabase.from("vehicle_vignettes").delete().eq("vehicle_id", vehicleId);

    // Insert checked countries with dates
    const rows = Array.from(checkedCountries)
      .filter((c) => draft[c])
      .map((country) => ({
        vehicle_id: vehicleId,
        country,
        valid_until: format(draft[country]!, "yyyy-MM-dd"),
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("vehicle_vignettes").insert(rows);
      if (error) {
        toast({ title: "Chyba", description: error.message, variant: "destructive" });
        return;
      }
    }
    toast({ title: "Dálniční známky uloženy" });
    fetchVignettes();
  };

  if (!editing) {
    if (vignettes.length === 0) return <span className="text-sm">—</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {vignettes.map((v) => {
          const isExpired = new Date(v.valid_until) < new Date();
          const isSoon =
            !isExpired &&
            new Date(v.valid_until) < new Date(Date.now() + 30 * 86400000);
          return (
            <Badge
              key={v.id}
              variant={isExpired ? "destructive" : isSoon ? "outline" : "default"}
              className="text-xs"
            >
              {v.country} do {format(parseISO(v.valid_until), "d.M.yyyy")}
            </Badge>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {COUNTRIES.map((c) => (
        <div key={c.value} className="flex items-center gap-3">
          <Checkbox
            checked={checkedCountries.has(c.value)}
            onCheckedChange={(checked) => handleToggle(c.value, !!checked)}
          />
          <Label className="w-10 text-sm">{c.label}</Label>
          {checkedCountries.has(c.value) && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-sm justify-start",
                    !draft[c.value] && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {draft[c.value]
                    ? format(draft[c.value]!, "d.M.yyyy")
                    : "Platnost do"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={draft[c.value]}
                  onSelect={(d) => handleDateChange(c.value, d)}
                  locale={cs}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      ))}
      <Button size="sm" onClick={saveVignettes}>
        Uložit známky
      </Button>
    </div>
  );
}
