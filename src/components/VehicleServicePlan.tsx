import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Pencil, Trash2, CalendarIcon, Wrench, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addMonths, differenceInDays } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ServicePlan {
  id: string;
  vehicle_id: string;
  type: string;
  interval_km: number | null;
  interval_months: number | null;
  last_done_km: number | null;
  last_done_date: string | null;
  next_due_km: number | null;
  next_due_date: string | null;
  notes: string | null;
}

interface FormState {
  type: string;
  interval_km: string;
  interval_months: string;
  last_done_km: string;
  last_done_date: string;
  notes: string;
}

const emptyForm: FormState = {
  type: "",
  interval_km: "",
  interval_months: "",
  last_done_km: "",
  last_done_date: "",
  notes: "",
};

const TEMPLATES: { label: string; type: string; interval_km: number; interval_months: number }[] = [
  { label: "Výměna oleje", type: "Výměna oleje", interval_km: 15000, interval_months: 12 },
  { label: "Brzdové destičky", type: "Brzdové destičky", interval_km: 40000, interval_months: 24 },
  { label: "Rotace pneu", type: "Rotace pneu", interval_km: 10000, interval_months: 6 },
  { label: "Výměna pneu (sezónní)", type: "Výměna pneu", interval_km: 0, interval_months: 6 },
  { label: "Provozní kapaliny", type: "Provozní kapaliny", interval_km: 30000, interval_months: 24 },
  { label: "Rozvody", type: "Rozvody", interval_km: 120000, interval_months: 60 },
];

function computeNext(form: FormState, currentKm: number | null) {
  const intervalKm = Number(form.interval_km) || 0;
  const intervalMonths = Number(form.interval_months) || 0;
  const lastKm = Number(form.last_done_km) || currentKm || 0;
  const lastDate = form.last_done_date ? parseISO(form.last_done_date) : null;

  const nextKm = intervalKm > 0 && lastKm > 0 ? lastKm + intervalKm : null;
  const nextDate = intervalMonths > 0 && lastDate ? format(addMonths(lastDate, intervalMonths), "yyyy-MM-dd") : null;
  return { nextKm, nextDate };
}

export default function VehicleServicePlan({ vehicleId }: { vehicleId: string }) {
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [currentKm, setCurrentKm] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const [planRes, mileageRes, tripRes] = await Promise.all([
      supabase.from("service_plans").select("*").eq("vehicle_id", vehicleId).order("next_due_date", { ascending: true, nullsFirst: false }),
      supabase.from("vehicle_mileage").select("km").eq("vehicle_id", vehicleId).order("recorded_at", { ascending: false }).limit(1),
      supabase.from("trip_logs").select("km_end").eq("vehicle_id", vehicleId).not("km_end", "is", null).order("date", { ascending: false }).limit(1),
    ]);
    setPlans((planRes.data as ServicePlan[]) || []);
    const mKm = mileageRes.data?.[0]?.km ?? null;
    const tKm = tripRes.data?.[0]?.km_end ?? null;
    const candidates = [mKm, tKm].filter((v): v is number => typeof v === "number");
    setCurrentKm(candidates.length ? Math.max(...candidates) : null);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  const openNew = (template?: typeof TEMPLATES[number]) => {
    setEditingId(null);
    setForm(template
      ? { ...emptyForm, type: template.type, interval_km: String(template.interval_km || ""), interval_months: String(template.interval_months || "") }
      : emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: ServicePlan) => {
    setEditingId(p.id);
    setForm({
      type: p.type,
      interval_km: p.interval_km ? String(p.interval_km) : "",
      interval_months: p.interval_months ? String(p.interval_months) : "",
      last_done_km: p.last_done_km ? String(p.last_done_km) : "",
      last_done_date: p.last_done_date || "",
      notes: p.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.type.trim()) {
      toast({ title: "Vyplňte typ servisu", variant: "destructive" });
      return;
    }
    const { nextKm, nextDate } = computeNext(form, currentKm);
    const payload = {
      vehicle_id: vehicleId,
      type: form.type.trim(),
      interval_km: form.interval_km ? Number(form.interval_km) : null,
      interval_months: form.interval_months ? Number(form.interval_months) : null,
      last_done_km: form.last_done_km ? Number(form.last_done_km) : null,
      last_done_date: form.last_done_date || null,
      next_due_km: nextKm,
      next_due_date: nextDate,
      notes: form.notes || null,
    };
    const { error } = editingId
      ? await supabase.from("service_plans").update(payload).eq("id", editingId)
      : await supabase.from("service_plans").insert([payload]);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Plán upraven" : "Plán přidán" });
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("service_plans").delete().eq("id", id);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else { toast({ title: "Plán smazán" }); fetchData(); }
  };

  const markDone = async (p: ServicePlan) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const km = currentKm ?? p.last_done_km ?? 0;
    const fakeForm: FormState = {
      type: p.type,
      interval_km: p.interval_km ? String(p.interval_km) : "",
      interval_months: p.interval_months ? String(p.interval_months) : "",
      last_done_km: String(km),
      last_done_date: today,
      notes: p.notes || "",
    };
    const { nextKm, nextDate } = computeNext(fakeForm, currentKm);
    const { error } = await supabase.from("service_plans").update({
      last_done_km: km,
      last_done_date: today,
      next_due_km: nextKm,
      next_due_date: nextDate,
    }).eq("id", p.id);
    if (error) toast({ title: "Chyba", description: error.message, variant: "destructive" });
    else { toast({ title: "Označeno jako provedeno", description: `${p.type}: další za ${nextKm ? `${nextKm.toLocaleString("cs-CZ")} km` : ""}${nextKm && nextDate ? " / " : ""}${nextDate ? format(parseISO(nextDate), "d.M.yyyy") : ""}` }); fetchData(); }
  };

  const statusFor = (p: ServicePlan) => {
    const daysToDate = p.next_due_date ? differenceInDays(parseISO(p.next_due_date), new Date()) : null;
    const kmToDue = p.next_due_km && currentKm ? p.next_due_km - currentKm : null;
    const overdue = (daysToDate !== null && daysToDate < 0) || (kmToDue !== null && kmToDue < 0);
    const soon = (!overdue) && ((daysToDate !== null && daysToDate <= 30) || (kmToDue !== null && kmToDue <= 1000));
    if (overdue) return { variant: "destructive" as const, label: "Po termínu" };
    if (soon) return { variant: "secondary" as const, className: "bg-warning text-warning-foreground", label: "Brzy" };
    return { variant: "outline" as const, label: "OK" };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" />
          Aktuální stav km: <strong className="text-foreground">{currentKm !== null ? `${currentKm.toLocaleString("cs-CZ")} km` : "neznámý"}</strong>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Sparkles className="mr-2 h-4 w-4" />Šablona</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Vyberte šablonu</DialogTitle>
                <DialogDescription>Předvyplní typ a intervaly. Upravíte před uložením.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-2">
                {TEMPLATES.map(t => (
                  <Button
                    key={t.label}
                    variant="outline"
                    className="justify-between"
                    onClick={() => openNew(t)}
                  >
                    <span>{t.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.interval_km > 0 && `${t.interval_km.toLocaleString("cs-CZ")} km`}
                      {t.interval_km > 0 && t.interval_months > 0 && " / "}
                      {t.interval_months > 0 && `${t.interval_months} měs`}
                    </span>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" onClick={() => openNew()}><Plus className="mr-2 h-4 w-4" />Přidat plán</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Načítání…</p>
      ) : plans.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Zatím žádné plánované servisy. Použijte šablonu nebo přidejte vlastní.
        </CardContent></Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Typ</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Naposledy</TableHead>
                <TableHead>Další servis</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(p => {
                const st = statusFor(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.interval_km ? `${p.interval_km.toLocaleString("cs-CZ")} km` : ""}
                      {p.interval_km && p.interval_months ? " / " : ""}
                      {p.interval_months ? `${p.interval_months} měs` : ""}
                      {!p.interval_km && !p.interval_months && "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.last_done_date ? format(parseISO(p.last_done_date), "d.M.yyyy") : "—"}
                      {p.last_done_km ? ` · ${p.last_done_km.toLocaleString("cs-CZ")} km` : ""}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.next_due_date ? format(parseISO(p.next_due_date), "d.M.yyyy") : "—"}
                      {p.next_due_km ? ` · ${p.next_due_km.toLocaleString("cs-CZ")} km` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={st.variant} className={cn(st.className)}>
                        {st.variant === "destructive" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" title="Označit jako provedeno" onClick={() => markDone(p)}>
                        <CheckCircle className="h-4 w-4 text-success" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Smazat plán?</AlertDialogTitle>
                            <AlertDialogDescription>Smazat „{p.type}"? Akce je nevratná.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Zrušit</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(p.id)} className="bg-destructive text-destructive-foreground">Smazat</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit/Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Upravit plán" : "Nový servisní plán"}</DialogTitle>
            <DialogDescription>Další termín se vypočítá automaticky z intervalů a posledního provedení.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Typ servisu</Label>
              <Input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="Výměna oleje" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Interval (km)</Label>
                <Input type="number" value={form.interval_km} onChange={e => setForm({ ...form, interval_km: e.target.value })} placeholder="15000" />
              </div>
              <div>
                <Label>Interval (měsíce)</Label>
                <Input type="number" value={form.interval_months} onChange={e => setForm({ ...form, interval_months: e.target.value })} placeholder="12" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Naposledy provedeno (km)</Label>
                <Input type="number" value={form.last_done_km} onChange={e => setForm({ ...form, last_done_km: e.target.value })} placeholder={currentKm ? `aktuálně ${currentKm}` : ""} />
              </div>
              <div>
                <Label>Datum posledního servisu</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start", !form.last_done_date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.last_done_date ? format(parseISO(form.last_done_date), "d.M.yyyy") : "Vyberte datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.last_done_date ? parseISO(form.last_done_date) : undefined}
                      onSelect={d => setForm({ ...form, last_done_date: d ? format(d, "yyyy-MM-dd") : "" })}
                      locale={cs}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label>Poznámka</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Volitelně" />
            </div>
            {(() => {
              const { nextKm, nextDate } = computeNext(form, currentKm);
              if (!nextKm && !nextDate) return null;
              return (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Další servis: </span>
                  <strong>
                    {nextKm ? `${nextKm.toLocaleString("cs-CZ")} km` : ""}
                    {nextKm && nextDate ? " / " : ""}
                    {nextDate ? format(parseISO(nextDate), "d.M.yyyy") : ""}
                  </strong>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Zrušit</Button>
            <Button onClick={handleSave}>{editingId ? "Uložit změny" : "Vytvořit plán"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
