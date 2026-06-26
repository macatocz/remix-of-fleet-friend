import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDriverContext } from "@/hooks/useDriverContext";
import { toast } from "sonner";
import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_ITEMS = [
  "Pneumatiky (tlak, vzhled)",
  "Světla (přední, zadní, blinkry)",
  "Stěrače a ostřikovače",
  "Hladina paliva",
  "Kapaliny (olej, chladič)",
  "Karoserie (poškození)",
  "Interiér a čistota",
  "Doklady a lékárnička",
];

type State = "ok" | "issue" | "na";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicleId: string;
  vehicleLabel?: string;
  type?: "pre" | "post";
}

export default function ChecklistDialog({ open, onOpenChange, vehicleId, vehicleLabel, type = "pre" }: Props) {
  const { user } = useAuth();
  const { driver } = useDriverContext();
  const [states, setStates] = useState<Record<string, State>>(() =>
    Object.fromEntries(DEFAULT_ITEMS.map((k) => [k, "ok"])),
  );
  const [km, setKm] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const setItem = (k: string, s: State) => setStates((p) => ({ ...p, [k]: s }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("vehicle_checklists").insert({
      vehicle_id: vehicleId,
      user_id: user?.id || null,
      driver_name: driver ? `${driver.first_name} ${driver.last_name}` : null,
      type,
      items: states,
      km: km ? parseInt(km) : null,
      notes: notes || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(type === "pre" ? "Předjízdní kontrola uložena" : "Po-jízdní kontrola uložena");
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>{type === "pre" ? "Předjízdní kontrola" : "Po-jízdní kontrola"}{vehicleLabel ? ` · ${vehicleLabel}` : ""}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-3 overflow-y-auto">
          {DEFAULT_ITEMS.map((it) => (
            <div key={it} className="flex items-center justify-between border rounded-lg p-2.5">
              <span className="text-sm">{it}</span>
              <div className="flex gap-1">
                {([
                  { v: "ok", icon: Check, cls: "bg-green-500/10 text-green-600 border-green-500/30" },
                  { v: "issue", icon: X, cls: "bg-red-500/10 text-red-600 border-red-500/30" },
                  { v: "na", icon: Minus, cls: "bg-muted text-muted-foreground" },
                ] as const).map((b) => (
                  <button
                    key={b.v}
                    onClick={() => setItem(it, b.v)}
                    className={cn("h-9 w-9 rounded-md border flex items-center justify-center", states[it] === b.v ? b.cls : "")}
                  >
                    <b.icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label>Stav km</Label>
              <Input className="h-11" type="number" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Poznámka</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Popis závad nebo poznámka…" />
          </div>
        </div>
        <DrawerFooter className="pb-safe gap-2">
          <Button className="w-full h-12" onClick={save} disabled={saving}>{saving ? "Ukládám…" : "Uložit kontrolu"}</Button>
          <Button variant="outline" className="w-full h-12" onClick={() => onOpenChange(false)}>Zrušit</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}