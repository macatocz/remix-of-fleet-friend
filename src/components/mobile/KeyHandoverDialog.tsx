import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Key, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vehicleId: string;
  vehicleLabel?: string;
}

interface Status {
  action: string;
  to_name: string | null;
  created_at: string;
}

export default function KeyHandoverDialog({ open, onOpenChange, vehicleId, vehicleLabel }: Props) {
  const { user } = useAuth();
  const [action, setAction] = useState<"take" | "return">("take");
  const [toName, setToName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase.from("vehicle_key_status").select("*").eq("vehicle_id", vehicleId).maybeSingle()
      .then(({ data }) => setStatus((data as any) || null));
  }, [open, vehicleId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("key_handovers").insert({
      vehicle_id: vehicleId,
      action,
      to_name: action === "take" ? (toName || null) : null,
      from_user_id: action === "return" ? user?.id : null,
      to_user_id: action === "take" ? user?.id : null,
      created_by: user?.id,
      note: note || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(action === "take" ? "Klíče vyzvednuty" : "Klíče vráceny");
    setNote(""); setToName("");
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Klíče{vehicleLabel ? ` · ${vehicleLabel}` : ""}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4">
          {status && (
            <div className="text-xs text-muted-foreground border rounded-md p-2.5 bg-muted/40">
              Aktuální stav: <b>{status.action === "take" ? `klíče má ${status.to_name || "neznámý"}` : "vráceny"}</b> ({new Date(status.created_at).toLocaleString("cs-CZ")})
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setAction("take")}
              className={cn("flex flex-col items-center gap-1 p-3 rounded-lg border", action === "take" ? "border-primary bg-primary/5 text-primary" : "")}
            >
              <Key className="h-6 w-6" />
              <span className="text-sm font-medium">Vyzvednout</span>
            </button>
            <button
              onClick={() => setAction("return")}
              className={cn("flex flex-col items-center gap-1 p-3 rounded-lg border", action === "return" ? "border-primary bg-primary/5 text-primary" : "")}
            >
              <KeyRound className="h-6 w-6" />
              <span className="text-sm font-medium">Vrátit</span>
            </button>
          </div>
          {action === "take" && (
            <div className="space-y-1.5">
              <Label>Komu (jméno)</Label>
              <Input className="h-11" value={toName} onChange={(e) => setToName(e.target.value)} placeholder="Nepovinné – default: vy" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Poznámka</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DrawerFooter className="pb-safe gap-2">
          <Button className="w-full h-12" onClick={save} disabled={saving}>{saving ? "Ukládám…" : "Potvrdit"}</Button>
          <Button variant="outline" className="w-full h-12" onClick={() => onOpenChange(false)}>Zrušit</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}