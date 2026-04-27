import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bookmark, Plus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TripTemplate {
  id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  label: string;
  route_from: string | null;
  route_to: string | null;
  km_total: number | null;
  purpose: string | null;
  description: string | null;
  use_count: number;
}

interface Props {
  vehicleId: string;
  onPick: (tpl: TripTemplate) => void;
  /** Pre-fill values when user opens "save as template" form. */
  prefill?: Partial<TripTemplate>;
}

export default function TripTemplatesPopover({ vehicleId, onPick, prefill }: Props) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<TripTemplate>>({});
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trip_templates")
      .select("*")
      .or(`vehicle_id.eq.${vehicleId},vehicle_id.is.null`)
      .order("use_count", { ascending: false })
      .order("label", { ascending: true });
    setTemplates((data as TripTemplate[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open, vehicleId]);

  useEffect(() => {
    if (showForm) {
      setForm({
        label: prefill?.route_from && prefill?.route_to ? `${prefill.route_from} → ${prefill.route_to}` : "",
        route_from: prefill?.route_from || "",
        route_to: prefill?.route_to || "",
        km_total: prefill?.km_total ?? null,
        purpose: prefill?.purpose || "",
        description: prefill?.description || "",
      });
    }
  }, [showForm, prefill]);

  const pick = async (t: TripTemplate) => {
    onPick(t);
    setOpen(false);
    // increment use_count (best-effort)
    await supabase.from("trip_templates").update({ use_count: (t.use_count || 0) + 1 }).eq("id", t.id);
  };

  const save = async () => {
    if (!form.label) { toast({ title: "Zadejte název šablony", variant: "destructive" }); return; }
    const { error } = await supabase.from("trip_templates").insert({
      vehicle_id: vehicleId,
      label: form.label,
      route_from: form.route_from || null,
      route_to: form.route_to || null,
      km_total: form.km_total ?? null,
      purpose: form.purpose || null,
      description: form.description || null,
    });
    if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Šablona uložena" });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("trip_templates").delete().eq("id", id);
    if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <Bookmark className="mr-1 h-3.5 w-3.5" />Šablony
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3" align="end">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Šablony tras</p>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowForm(s => !s)}>
            <Plus className="mr-1 h-3 w-3" />{showForm ? "Zrušit" : "Nová"}
          </Button>
        </div>

        {showForm && (
          <div className="space-y-2 border rounded-md p-2 mb-3 bg-muted/30">
            <div>
              <Label className="text-xs">Název</Label>
              <Input className="h-8 text-xs" value={form.label || ""} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Domov → Kancelář" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Z</Label>
                <Input className="h-8 text-xs" value={form.route_from || ""} onChange={e => setForm({ ...form, route_from: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Do</Label>
                <Input className="h-8 text-xs" value={form.route_to || ""} onChange={e => setForm({ ...form, route_to: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Km</Label>
                <Input type="number" className="h-8 text-xs" value={form.km_total ?? ""} onChange={e => setForm({ ...form, km_total: e.target.value ? parseInt(e.target.value) : null })} />
              </div>
              <div>
                <Label className="text-xs">Účel</Label>
                <Input className="h-8 text-xs" value={form.purpose || ""} onChange={e => setForm({ ...form, purpose: e.target.value })} />
              </div>
            </div>
            <Button size="sm" className="w-full h-8" onClick={save}>Uložit šablonu</Button>
          </div>
        )}

        <div className="max-h-72 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Žádné šablony</p>
          ) : templates.map(t => (
            <div key={t.id} className="flex items-center gap-1 p-1.5 rounded hover:bg-muted/50 group">
              <button className="flex-1 text-left" onClick={() => pick(t)}>
                <p className="text-xs font-medium">{t.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {t.route_from || "?"} → {t.route_to || "?"}
                  {t.km_total ? ` · ${t.km_total} km` : ""}
                  {t.use_count > 0 ? ` · použito ${t.use_count}×` : ""}
                </p>
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center text-destructive/60 hover:text-destructive rounded"
                onClick={() => remove(t.id)}
                title="Smazat"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}