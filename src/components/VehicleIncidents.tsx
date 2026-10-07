import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ReporterSelect, { reporterName } from "@/components/incidents/ReporterSelect";
import { Plus, Loader2, Trash2, X, AlertTriangle } from "lucide-react";

interface Props {
  vehicleId: string;
}

interface Incident {
  id: string;
  date: string;
  location: string | null;
  description: string | null;
  estimated_cost: number | null;
  status: string;
  drivers?: { first_name: string; last_name: string } | null;
}

interface Photo {
  id: string;
  incident_id: string;
  file_path: string;
  url?: string;
}

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  nahlaseno: { label: "Nahlášeno", variant: "default" },
  v_reseni: { label: "V řešení", variant: "secondary" },
  uzavreno: { label: "Uzavřeno", variant: "outline" },
};

export default function VehicleIncidents({ vehicleId }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<Incident[]>([]);
  const [photosByItem, setPhotosByItem] = useState<Record<string, Photo[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    location: "",
    description: "",
    estimated_cost: "",
    status: "nahlaseno",
    driver_id: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: list } = await supabase
      .from("incidents")
      .select("*, drivers(first_name, last_name)")
      .eq("vehicle_id", vehicleId)
      .order("date", { ascending: false });

    const arr = (list || []) as Incident[];
    setItems(arr);

    if (arr.length) {
      const { data: phs } = await supabase
        .from("incident_photos")
        .select("*")
        .in("incident_id", arr.map((i) => i.id));
      const grouped: Record<string, Photo[]> = {};
      for (const ph of (phs || []) as Photo[]) {
        const { data: signed } = await supabase.storage
          .from("handover-photos")
          .createSignedUrl(ph.file_path, 3600);
        (grouped[ph.incident_id] ||= []).push({ ...ph, url: signed?.signedUrl });
      }
      setPhotosByItem(grouped);
    } else {
      setPhotosByItem({});
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      location: "",
      description: "",
      estimated_cost: "",
      status: "nahlaseno",
      driver_id: "",
    });
    setPendingFiles([]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: inserted, error } = await supabase
        .from("incidents")
        .insert({
          vehicle_id: vehicleId,
          date: form.date,
          location: form.location || null,
          description: form.description || null,
          estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : 0,
          status: form.status,
          driver_id: form.driver_id || null,
        })
        .select()
        .single();
      if (error) throw error;

      for (const file of pendingFiles) {
        const path = `incidents/${vehicleId}/${inserted.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("handover-photos")
          .upload(path, file);
        if (upErr) throw upErr;
        await supabase.from("incident_photos").insert({
          incident_id: inserted.id,
          file_path: path,
        });
      }

      toast({ title: "Záznam škody uložen" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      toast({ title: "Chyba", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("incidents").update({ status }).eq("id", id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Smazat záznam škody?")) return;
    const photos = photosByItem[id] || [];
    for (const ph of photos) {
      await supabase.storage.from("handover-photos").remove([ph.file_path]);
    }
    await supabase.from("incidents").delete().eq("id", id);
    toast({ title: "Smazáno" });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Škody a pojistné události
        </h3>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nahlásit škodu</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nová škoda / pojistná událost</DialogTitle>
              <DialogDescription>Základní záznam o škodě na vozidle.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Datum</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nahlaseno">Nahlášeno</SelectItem>
                      <SelectItem value="v_reseni">V řešení</SelectItem>
                      <SelectItem value="uzavreno">Uzavřeno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ReporterSelect className="col-span-2" value={form.driver_id} onChange={(v) => setForm({ ...form, driver_id: v })} />
                <div className="col-span-2">
                  <Label>Místo</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="např. Parkoviště Praha 5" />
                </div>
                <div className="col-span-2">
                  <Label>Popis</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label>Odhad nákladu (Kč)</Label>
                  <Input type="number" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Fotky</Label>
                <Input type="file" accept="image/*" multiple onChange={(e) => e.target.files && setPendingFiles((p) => [...p, ...Array.from(e.target.files!)])} />
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
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Žádné škody – výborně!</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const photos = photosByItem[it.id] || [];
            const sl = STATUS_LABEL[it.status] || { label: it.status, variant: "outline" };
            return (
              <Card key={it.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Badge variant={sl.variant}>{sl.label}</Badge>
                        {new Date(it.date).toLocaleDateString("cs-CZ")}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground mt-1">{it.location || "—"}</div>
                      <div className="text-xs text-muted-foreground">Nahlásil: {reporterName(it.drivers)}</div>
                    </div>
                    <div className="flex gap-1">
                      <Select value={it.status} onValueChange={(v) => updateStatus(it.id, v)}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nahlaseno">Nahlášeno</SelectItem>
                          <SelectItem value="v_reseni">V řešení</SelectItem>
                          <SelectItem value="uzavreno">Uzavřeno</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(it.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {it.description && <p className="text-sm mb-2">{it.description}</p>}
                  {it.estimated_cost ? (
                    <div className="text-sm">Odhad nákladu: <strong>{Number(it.estimated_cost).toLocaleString("cs-CZ")} Kč</strong></div>
                  ) : null}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {photos.map((ph) => (
                        <a key={ph.id} href={ph.url} target="_blank" rel="noreferrer">
                          <img src={ph.url} alt="" className="w-full h-20 object-cover rounded border" />
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
