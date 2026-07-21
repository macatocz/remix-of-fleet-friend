import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Trash2, Camera, X } from "lucide-react";

interface Props {
  vehicleId: string;
}

interface Protocol {
  id: string;
  type: string;
  date: string;
  driver_name: string | null;
  handover_by: string | null;
  km: number | null;
  fuel_percent: number | null;
  checklist: Record<string, boolean>;
  notes: string | null;
  reservation_id: string | null;
  damage_description?: string | null;
  damage_cost_estimate?: number | null;
  incident_id?: string | null;
}

interface Photo {
  id: string;
  protocol_id: string;
  file_path: string;
  caption: string | null;
  url?: string;
}

const CHECKLIST_ITEMS = [
  { key: "lekarnicka", label: "Lékárnička" },
  { key: "trojuhelnik", label: "Výstražný trojúhelník" },
  { key: "vesta", label: "Reflexní vesta" },
  { key: "klice", label: "Klíče (vč. náhradního)" },
  { key: "maly_tp", label: "Malý TP" },
  { key: "dalnicni_znamka", label: "Dálniční známka" },
  { key: "tankovaci_karta", label: "Tankovací karta" },
  { key: "pneu_letni", label: "Letní pneu" },
  { key: "pneu_zimni", label: "Zimní pneu" },
  { key: "ciste", label: "Vůz čistý uvnitř i venku" },
];

export default function VehicleHandover({ vehicleId }: Props) {
  const { toast } = useToast();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [photosByProtocol, setPhotosByProtocol] = useState<Record<string, Photo[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; first_name: string; last_name: string }>>([]);
  const [form, setForm] = useState({
    type: "predani",
    date: "",
    driver_name: "",
    handover_by: "",
    km: "",
    fuel_percent: "100",
    notes: "",
    checklist: {} as Record<string, boolean>,
    damage_description: "",
    damage_cost_estimate: "",
    report_as_incident: true,
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: ps } = await supabase
      .from("handover_protocols")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("date", { ascending: false });

    const list = (ps || []) as any as Protocol[];
    setProtocols(list);

    if (list.length) {
      const ids = list.map((p) => p.id);
      const { data: phs } = await supabase
        .from("handover_photos")
        .select("*")
        .in("protocol_id", ids);

      const grouped: Record<string, Photo[]> = {};
      for (const ph of (phs || []) as Photo[]) {
        const { data: signed } = await supabase.storage
          .from("handover-photos")
          .createSignedUrl(ph.file_path, 3600);
        (grouped[ph.protocol_id] ||= []).push({ ...ph, url: signed?.signedUrl });
      }
      setPhotosByProtocol(grouped);
    } else {
      setPhotosByProtocol({});
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("drivers")
        .select("id, first_name, last_name, status")
        .order("last_name", { ascending: true });
      setDrivers(((data || []) as any[]).filter((d) => (d.status || "aktivní") === "aktivní"));
    })();
  }, []);

  const resetForm = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setForm({
      type: "predani",
      date: now.toISOString().slice(0, 16),
      driver_name: "",
      handover_by: "",
      km: "",
      fuel_percent: "100",
      notes: "",
      checklist: {},
      damage_description: "",
      damage_cost_estimate: "",
      report_as_incident: true,
    });
    setPendingFiles([]);
  };

  useEffect(() => {
    if (dialogOpen && !form.date) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setForm((f) => ({ ...f, date: now.toISOString().slice(0, 16) }));
    }
  }, [dialogOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Optionally create incident first
      let incidentId: string | null = null;
      const hasDamage = form.damage_description.trim().length > 0;
      if (hasDamage && form.report_as_incident) {
        const driver = drivers.find(
          (d) => `${d.first_name} ${d.last_name}`.trim() === form.driver_name.trim(),
        );
        const typeLabel = form.type === "predani" ? "předání" : "převzetí";
        const { data: inc, error: incErr } = await supabase
          .from("incidents")
          .insert({
            vehicle_id: vehicleId,
            date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
            description: `${form.damage_description.trim()}\n\n(Zjištěno při ${typeLabel} vozidla${form.driver_name ? `, řidič: ${form.driver_name}` : ""}.)`,
            estimated_cost: form.damage_cost_estimate ? parseFloat(form.damage_cost_estimate) : null,
            driver_id: driver?.id ?? null,
            status: "nová",
          })
          .select()
          .single();
        if (incErr) throw incErr;
        incidentId = inc.id;
      }

      const { data: inserted, error } = await supabase
        .from("handover_protocols")
        .insert({
          vehicle_id: vehicleId,
          type: form.type,
          date: form.date ? new Date(form.date).toISOString() : new Date().toISOString(),
          driver_name: form.driver_name || null,
          handover_by: form.handover_by || null,
          km: form.km ? parseInt(form.km) : null,
          fuel_percent: form.fuel_percent ? parseInt(form.fuel_percent) : null,
          notes: form.notes || null,
          checklist: form.checklist as any,
          damage_description: hasDamage ? form.damage_description.trim() : null,
          damage_cost_estimate: form.damage_cost_estimate ? parseFloat(form.damage_cost_estimate) : null,
          incident_id: incidentId,
        })
        .select()
        .single();
      if (error) throw error;

      // Upload photos
      for (const file of pendingFiles) {
        const path = `${vehicleId}/${inserted.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("handover-photos")
          .upload(path, file);
        if (upErr) throw upErr;
        await supabase.from("handover_photos").insert({
          protocol_id: inserted.id,
          file_path: path,
        });
      }

      toast({
        title: "Protokol uložen",
        description: incidentId ? "Škodní událost byla automaticky založena." : undefined,
      });
      setDialogOpen(false);
      resetForm();
      await fetchData();
    } catch (e: any) {
      toast({ title: "Chyba", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Opravdu smazat protokol?")) return;
    const photos = photosByProtocol[id] || [];
    for (const ph of photos) {
      await supabase.storage.from("handover-photos").remove([ph.file_path]);
    }
    await supabase.from("handover_protocols").delete().eq("id", id);
    toast({ title: "Smazáno" });
    fetchData();
  };

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    setPendingFiles((prev) => [...prev, ...Array.from(files)]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Předání / Převzetí vozidla</h3>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nový protokol</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nový protokol</DialogTitle>
              <DialogDescription>Stav vozidla při předání nebo převzetí.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Typ</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="predani">Předání řidiči</SelectItem>
                      <SelectItem value="prevzeti">Převzetí od řidiče</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Datum a čas</Label>
                  <Input
                    type="datetime-local"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Lze zadat i zpětně.</p>
                </div>
                <div>
                  <Label>Řidič</Label>
                  <Select
                    value={form.driver_name || "__none__"}
                    onValueChange={(v) => setForm({ ...form, driver_name: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Vyberte řidiče" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— (bez řidiče)</SelectItem>
                      {drivers.map((d) => {
                        const name = `${d.first_name} ${d.last_name}`.trim();
                        return <SelectItem key={d.id} value={name}>{name}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Předává / přebírá (správce)</Label>
                  <Input value={form.handover_by} onChange={(e) => setForm({ ...form, handover_by: e.target.value })} />
                </div>
                <div>
                  <Label>Stav km</Label>
                  <Input type="number" value={form.km} onChange={(e) => setForm({ ...form, km: e.target.value })} />
                </div>
                <div>
                  <Label>Palivo (%)</Label>
                  <Input type="number" min="0" max="100" value={form.fuel_percent} onChange={(e) => setForm({ ...form, fuel_percent: e.target.value })} />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Checklist výbavy</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                  {CHECKLIST_ITEMS.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={!!form.checklist[item.key]}
                        onCheckedChange={(v) => setForm({ ...form, checklist: { ...form.checklist, [item.key]: !!v } })}
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label>Poznámka</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>

              <div className="border rounded-md p-3 space-y-3 bg-destructive/5">
                <Label className="text-destructive font-semibold">Zjištěná poškození</Label>
                <Textarea
                  placeholder="Např. Škrábanec na pravých zadních dveřích, prasklé zpětné zrcátko..."
                  value={form.damage_description}
                  onChange={(e) => setForm({ ...form, damage_description: e.target.value })}
                  rows={2}
                />
                {form.damage_description.trim().length > 0 && (
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <Label className="text-xs">Odhad nákladů (Kč)</Label>
                      <Input
                        type="number"
                        value={form.damage_cost_estimate}
                        onChange={(e) => setForm({ ...form, damage_cost_estimate: e.target.value })}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                      <Checkbox
                        checked={form.report_as_incident}
                        onCheckedChange={(v) => setForm({ ...form, report_as_incident: !!v })}
                      />
                      Nahlásit jako škodní událost
                    </label>
                  </div>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Fotky vozidla</Label>
                <Input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
                {pendingFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                        {f.name}
                        <button onClick={() => setPendingFiles(pendingFiles.filter((_, idx) => idx !== i))}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Uložit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : protocols.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Zatím žádné protokoly.</div>
      ) : (
        <div className="space-y-3">
          {protocols.map((p) => {
            const photos = photosByProtocol[p.id] || [];
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant={p.type === "predani" ? "default" : "secondary"}>
                          {p.type === "predani" ? "Předání" : "Převzetí"}
                        </Badge>
                        {new Date(p.date).toLocaleString("cs-CZ")}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground mt-1">
                        Řidič: {p.driver_name || "—"} • Předal: {p.handover_by || "—"}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>Km: <strong>{p.km?.toLocaleString("cs-CZ") || "—"}</strong></div>
                    <div>Palivo: <strong>{p.fuel_percent != null ? `${p.fuel_percent} %` : "—"}</strong></div>
                  </div>
                  {p.damage_description && (
                    <div className="mb-2 p-2 rounded border border-destructive/40 bg-destructive/5 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-destructive">Poškození:</span>
                        {p.incident_id && <Badge variant="destructive">Škoda nahlášena</Badge>}
                        {p.damage_cost_estimate != null && (
                          <span className="text-xs text-muted-foreground">
                            Odhad: {Number(p.damage_cost_estimate).toLocaleString("cs-CZ")} Kč
                          </span>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap mt-1">{p.damage_description}</div>
                    </div>
                  )}
                  {Object.keys(p.checklist || {}).length > 0 && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Výbava: {CHECKLIST_ITEMS.filter((i) => p.checklist[i.key]).map((i) => i.label).join(", ") || "—"}
                    </div>
                  )}
                  {p.notes && <p className="text-sm mb-2">{p.notes}</p>}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {photos.map((ph) => (
                        <a key={ph.id} href={ph.url} target="_blank" rel="noreferrer" className="block">
                          <img src={ph.url} alt={ph.caption || ""} className="w-full h-20 object-cover rounded border" />
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
