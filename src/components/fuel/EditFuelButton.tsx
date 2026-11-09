import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

const toLocal = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export default function EditFuelButton({ record, onSaved }: { record: any; onSaved: (r: any) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<any>({});
  const start = () => {
    setF({
      fueled_at: toLocal(record.fueled_at), liters: record.liters ?? "", total_price: record.total_price ?? "",
      km: record.km ?? "", location: record.location ?? "", note: record.note ?? "",
    });
    setOpen(true);
  };
  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));
  const save = async () => {
    if (!f.fueled_at) { toast.error("Vyplňte datum a čas"); return; }
    const patch = {
      fueled_at: new Date(f.fueled_at).toISOString(),
      liters: num(String(f.liters)), total_price: num(String(f.total_price)),
      km: f.km === "" ? null : Math.round(Number(f.km)),
      location: f.location.trim() || null, note: f.note.trim() || null,
    };
    setSaving(true);
    const { data, error } = await supabase.from("fuel_records").update(patch).eq("id", record.id).select().maybeSingle();
    setSaving(false);
    if (error || !data) { toast.error("Uložení se nezdařilo"); return; }
    toast.success("Tankování upraveno");
    onSaved(data);
    setOpen(false);
  };
  return (
    <>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={start} aria-label="Upravit tankování">
        <Pencil className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upravit tankování</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Datum a čas<Input type="datetime-local" value={f.fueled_at || ""} onChange={set("fueled_at")} /></label>
            <label className="text-sm">Litry<Input inputMode="decimal" value={f.liters} onChange={set("liters")} /></label>
            <label className="text-sm">Cena celkem (Kč)<Input inputMode="decimal" value={f.total_price} onChange={set("total_price")} /></label>
            <label className="text-sm">Tachometr (km)<Input inputMode="numeric" value={f.km} onChange={set("km")} /></label>
            <label className="text-sm">Místo<Input value={f.location} onChange={set("location")} /></label>
            <label className="text-sm sm:col-span-2">Poznámka<Textarea value={f.note} onChange={set("note")} /></label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Zrušit</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Ukládám…" : "Uložit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
