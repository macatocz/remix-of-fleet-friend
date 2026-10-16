import { fuelCardMissing } from "@/lib/completeness";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";

interface FuelCard {
  id: string;
  vehicle_id: string;
  provider: string;
  card_number: string | null;
  pin: string | null;
  owner_name: string | null;
  status: string;
  valid_until: string | null;
  notes: string | null;
}

interface Props {
  vehicleId: string;
  defaultOwner?: string;
}

const PROVIDERS = ["MOL", "Shell", "Bonett", "Jiné"];

const statusBadge = (status: string) => {
  switch (status) {
    case "aktivní": return <Badge className="bg-success text-success-foreground">Aktivní</Badge>;
    case "blokovaná": return <Badge className="bg-warning text-warning-foreground">Blokovaná</Badge>;
    case "zrušená": return <Badge variant="secondary">Zrušená</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

const emptyForm = (defaultOwner?: string) => ({
  provider: "MOL",
  card_number: "",
  pin: "",
  owner_name: defaultOwner || "",
  status: "aktivní",
  valid_until: "",
  notes: "",
});

export default function VehicleFuelCards({ vehicleId, defaultOwner }: Props) {
  const [cards, setCards] = useState<FuelCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(defaultOwner));
  const [saving, setSaving] = useState(false);
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fuel_cards")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    setCards((data as FuelCard[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCards(); }, [vehicleId]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm(defaultOwner));
    setDialogOpen(true);
  };

  const openEdit = (card: FuelCard) => {
    setEditingId(card.id);
    setForm({
      provider: card.provider,
      card_number: card.card_number || "",
      pin: card.pin || "",
      owner_name: card.owner_name || "",
      status: card.status,
      valid_until: card.valid_until || "",
      notes: card.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.provider) {
      toast({ title: "Vyplňte poskytovatele", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      vehicle_id: vehicleId,
      provider: form.provider,
      card_number: form.card_number || null,
      pin: form.pin || null,
      owner_name: form.owner_name || null,
      status: form.status,
      valid_until: form.valid_until || null,
      notes: form.notes || null,
    };

    const { error } = editingId
      ? await supabase.from("fuel_cards").update(payload).eq("id", editingId)
      : await supabase.from("fuel_cards").insert(payload);

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Karta upravena" : "Karta přidána" });
      setDialogOpen(false);
      fetchCards();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("fuel_cards").delete().eq("id", id);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Karta smazána" });
      fetchCards();
    }
  };

  const togglePin = (id: string) => {
    setVisiblePins(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base md:text-lg font-semibold">Tankovací karty</h3>
        <Button size="sm" onClick={openNew}><Plus className="mr-2 h-4 w-4" />Přidat kartu</Button>
      </div>

      {cards.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">Žádné tankovací karty.</p>
      ) : (
        <>
        <div className="space-y-2 md:hidden">
          {cards.map(card => {
            const missing = fuelCardMissing(card);
            return (
              <div key={card.id} className="rounded-lg border bg-card p-3 space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold">{card.provider}</span>
                    {statusBadge(card.status)}
                  </div>
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(card)} aria-label="Upravit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" aria-label="Smazat">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Smazat kartu?</AlertDialogTitle>
                          <AlertDialogDescription>Opravdu chcete smazat tuto tankovací kartu?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Zrušit</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(card.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Smazat</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <p className="font-mono text-base tracking-wider break-all">{card.card_number || "—"}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase text-muted-foreground">PIN</p>
                    <button type="button" className="flex items-center gap-1.5 font-mono" onClick={() => card.pin && togglePin(card.id)}>
                      {visiblePins.has(card.id) ? (card.pin || "—") : (card.pin ? "••••" : "—")}
                      {card.pin && (visiblePins.has(card.id) ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />)}
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase text-muted-foreground">Platnost do</p>
                    <p>{card.valid_until ? new Date(card.valid_until).toLocaleDateString("cs-CZ") : "—"}</p>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <p className="text-[11px] uppercase text-muted-foreground">Vlastník</p>
                    <p className="truncate">{card.owner_name || "—"}</p>
                  </div>
                </div>
                {missing.length > 0 && <Badge variant="destructive" className="text-[10px]">Chybí {missing.join(" / ")}</Badge>}
              </div>
            );
          })}
        </div>
        <Table className="hidden md:table">
          <TableHeader>
            <TableRow>
              <TableHead>Poskytovatel</TableHead>
              <TableHead>Číslo karty</TableHead>
              <TableHead>PIN</TableHead>
              <TableHead>Vlastník</TableHead>
              <TableHead>Platnost do</TableHead>
              <TableHead>Stav</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map(card => (
              <TableRow key={card.id}>
                <TableCell className="font-medium">{card.provider}</TableCell>
                <TableCell>{card.card_number || "—"}{fuelCardMissing(card).length > 0 && <Badge variant="destructive" className="ml-2 text-[10px]">Chybí {fuelCardMissing(card).join(" / ")}</Badge>}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-sm">
                      {visiblePins.has(card.id) ? (card.pin || "—") : (card.pin ? "••••" : "—")}
                    </span>
                    {card.pin && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePin(card.id)}>
                        {visiblePins.has(card.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>{card.owner_name || "—"}</TableCell>
                <TableCell>{card.valid_until || "—"}</TableCell>
                <TableCell>{statusBadge(card.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(card)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Smazat kartu?</AlertDialogTitle>
                          <AlertDialogDescription>Opravdu chcete smazat tuto tankovací kartu?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Zrušit</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(card.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Smazat</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Upravit kartu" : "Nová tankovací karta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Poskytovatel</Label>
              <Select value={form.provider} onValueChange={v => setForm(p => ({ ...p, provider: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Číslo karty</Label>
              <Input value={form.card_number} onChange={e => setForm(p => ({ ...p, card_number: e.target.value }))} />
            </div>
            <div>
              <Label>PIN</Label>
              <Input value={form.pin} onChange={e => setForm(p => ({ ...p, pin: e.target.value }))} />
            </div>
            <div>
              <Label>Vlastník (správce)</Label>
              <Input value={form.owner_name} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} />
            </div>
            <div>
              <Label>Platnost do</Label>
              <Input type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} />
            </div>
            <div>
              <Label>Stav</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktivní">Aktivní</SelectItem>
                  <SelectItem value="blokovaná">Blokovaná</SelectItem>
                  <SelectItem value="zrušená">Zrušená</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Poznámky</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Uložit" : "Přidat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
