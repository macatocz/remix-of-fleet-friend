import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Save, FileDown, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_KM_RATE, DEFAULT_FUEL_PRICE, DEFAULT_MEAL_RATES, mealAmountForHours, hoursBetween, formatCZK } from "@/lib/travel/calc";
import { generateTravelOrderPDF, type TravelOrderPDFData } from "@/lib/travel/pdf";

type Leg = { id?: string; date: string; time_from?: string; time_to?: string; place_from?: string; place_to?: string; km?: number; transport?: string; sort_order?: number };
type Meal = { id?: string; date: string; hours: number; country: string; rate: number; amount: number };
type Expense = { id?: string; type: string; description?: string; amount: number; currency: string };

export default function TravelOrderDetail() {
  const { id } = useParams();
  const isNew = !id || id === "novy";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [orderId, setOrderId] = useState<string | null>(isNew ? null : id!);
  const [number, setNumber] = useState("");
  const [status, setStatus] = useState("koncept");
  const [driverId, setDriverId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [purpose, setPurpose] = useState("");
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [timeFrom, setTimeFrom] = useState("08:00");
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [timeTo, setTimeTo] = useState("17:00");
  const [placeFrom, setPlaceFrom] = useState("");
  const [placeTo, setPlaceTo] = useState("");
  const [advance, setAdvance] = useState(0);
  const [approvedBy, setApprovedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [transport, setTransport] = useState<string>("sluzebni");

  const [legs, setLegs] = useState<Leg[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const { data: drivers } = useQuery({
    queryKey: ["drivers-min"],
    queryFn: async () => (await supabase.from("drivers").select("id,first_name,last_name,department").order("last_name")).data || [],
  });
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-min"],
    queryFn: async () => (await supabase.from("vehicles").select("id,rz,znacka").order("rz")).data || [],
  });
  const { data: company } = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => (await supabase.from("company_settings").select("*").maybeSingle()).data,
  });

  const { data: existing } = useQuery({
    queryKey: ["travel_order", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [{ data: order }, { data: l }, { data: m }, { data: e }] = await Promise.all([
        supabase.from("travel_orders").select("*").eq("id", orderId!).single(),
        supabase.from("travel_order_legs").select("*").eq("travel_order_id", orderId!).order("sort_order"),
        supabase.from("travel_order_meals").select("*").eq("travel_order_id", orderId!).order("date"),
        supabase.from("travel_order_expenses").select("*").eq("travel_order_id", orderId!).order("created_at"),
      ]);
      return { order, legs: l || [], meals: m || [], expenses: e || [] };
    },
  });

  useEffect(() => {
    if (!existing?.order) return;
    const o = existing.order as any;
    setNumber(o.number); setStatus(o.status);
    setDriverId(o.driver_id || ""); setVehicleId(o.vehicle_id || "");
    setPurpose(o.purpose || "");
    setDateFrom(o.date_from); setTimeFrom(o.time_from || "08:00");
    setDateTo(o.date_to); setTimeTo(o.time_to || "17:00");
    setPlaceFrom(o.place_from || ""); setPlaceTo(o.place_to || "");
    setAdvance(Number(o.advance_payment) || 0);
    setApprovedBy(o.approved_by || ""); setNotes(o.notes || "");
    setTransport((o.transport_mode?.[0]) || "sluzebni");
    setLegs(existing.legs as Leg[]);
    setMeals(existing.meals as Meal[]);
    setExpenses(existing.expenses as Expense[]);
  }, [existing]);

  // Náhrada za vlastní vozidlo
  const totalKm = useMemo(() => legs.reduce((s, l) => s + (Number(l.km) || 0), 0), [legs]);
  const vehicleReimb = useMemo(() => {
    if (transport !== "vlastni") return 0;
    const consumption = 7; // L/100km default — lze později per-vozidlo
    const fuelPart = (consumption / 100) * DEFAULT_FUEL_PRICE;
    return Math.round(totalKm * (DEFAULT_KM_RATE + fuelPart) * 100) / 100;
  }, [totalKm, transport]);

  const mealsTotal = useMemo(() => meals.reduce((s, m) => s + (Number(m.amount) || 0), 0), [meals]);
  const expensesTotal = useMemo(() => expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [expenses]);
  const total = mealsTotal + vehicleReimb + expensesTotal;
  const toPay = total - (Number(advance) || 0);

  // Načtení z knihy jízd
  const loadFromTripLogs = async () => {
    if (!vehicleId) { toast({ title: "Vyberte vozidlo", variant: "destructive" }); return; }
    const { data, error } = await supabase
      .from("trip_logs")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date");
    if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
    setLegs((data || []).map((t: any, i: number) => ({
      date: t.date,
      time_from: t.time?.slice(0, 5),
      place_from: t.route_from,
      place_to: t.route_to,
      km: t.km_total || 0,
      transport: "sluzebni",
      sort_order: i,
    })));
    toast({ title: `Načteno ${data?.length || 0} úseků z knihy jízd` });
  };

  // Auto-výpočet stravného: 1 řádek na den
  const recomputeMeals = () => {
    const totalH = hoursBetween(dateFrom, timeFrom, dateTo, timeTo);
    if (totalH < 5) { setMeals([]); return; }
    // Přibližně: pokud jeden den, 1 řádek; pokud více dní, rozdělit
    const days = Math.max(1, Math.ceil(totalH / 24));
    const perDayHours = totalH / days;
    const newMeals: Meal[] = [];
    const start = new Date(dateFrom);
    for (let i = 0; i < days; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const amount = mealAmountForHours(perDayHours);
      newMeals.push({
        date: d.toISOString().slice(0, 10),
        hours: Math.round(perDayHours * 10) / 10,
        country: "CZ",
        rate: amount,
        amount,
      });
    }
    setMeals(newMeals);
    toast({ title: "Stravné přepočítáno" });
  };

  const save = async (newStatus?: string) => {
    const payload: any = {
      status: newStatus || status,
      driver_id: driverId || null,
      vehicle_id: vehicleId || null,
      purpose, date_from: dateFrom, time_from: timeFrom, date_to: dateTo, time_to: timeTo,
      place_from: placeFrom, place_to: placeTo,
      transport_mode: [transport],
      advance_payment: advance,
      approved_by: approvedBy || null,
      approved_at: newStatus === "schvaleny" ? new Date().toISOString() : null,
      notes,
      total_amount: total,
    };
    let saveId = orderId;
    if (!saveId) {
      const { data, error } = await supabase.from("travel_orders").insert(payload).select().single();
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return null; }
      saveId = data.id;
      setOrderId(saveId);
      setNumber(data.number);
    } else {
      const { error } = await supabase.from("travel_orders").update(payload).eq("id", saveId);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return null; }
    }
    // Přepiš děti — smaž a vlož
    await Promise.all([
      supabase.from("travel_order_legs").delete().eq("travel_order_id", saveId),
      supabase.from("travel_order_meals").delete().eq("travel_order_id", saveId),
      supabase.from("travel_order_expenses").delete().eq("travel_order_id", saveId),
    ]);
    if (legs.length) await supabase.from("travel_order_legs").insert(legs.map((l, i) => ({ ...l, id: undefined, travel_order_id: saveId, sort_order: i })));
    if (meals.length) await supabase.from("travel_order_meals").insert(meals.map((m) => ({ ...m, id: undefined, travel_order_id: saveId })));
    if (expenses.length) await supabase.from("travel_order_expenses").insert(expenses.map((e) => ({ ...e, id: undefined, travel_order_id: saveId })));

    if (newStatus) setStatus(newStatus);
    qc.invalidateQueries({ queryKey: ["travel_orders"] });
    qc.invalidateQueries({ queryKey: ["travel_order", saveId] });
    toast({ title: "Uloženo" });
    if (isNew) navigate(`/cestovni-prikazy/${saveId}`, { replace: true });
    return saveId;
  };

  const exportPDF = async () => {
    const driver = drivers?.find((d) => d.id === driverId);
    const vehicle = vehicles?.find((v) => v.id === vehicleId);
    const data: TravelOrderPDFData = {
      number: number || "(nový)",
      company: company || {},
      driver: { name: driver ? `${driver.first_name} ${driver.last_name}` : "—", department: driver?.department },
      vehicle: { rz: vehicle?.rz, znacka: vehicle?.znacka },
      purpose, dateFrom, timeFrom, dateTo, timeTo, placeFrom, placeTo,
      transportMode: [transport],
      legs, meals, expenses,
      vehicleReimbursement: vehicleReimb,
      advance,
      approvedBy,
    };
    const doc = generateTravelOrderPDF(data);
    const fname = `CP-${number || "novy"}-${driver?.last_name || ""}.pdf`;
    doc.save(fname);
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/cestovni-prikazy")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{isNew ? "Nový cestovní příkaz" : number}</h1>
          {!isNew && <Badge variant={status === "schvaleny" ? "default" : "outline"}>{status}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPDF}><FileDown className="h-4 w-4" />PDF</Button>
          <Button variant="outline" onClick={() => save("schvaleny")}><CheckCircle2 className="h-4 w-4" />Schválit</Button>
          <Button onClick={() => save()}><Save className="h-4 w-4" />Uložit</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Základní údaje</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Řidič</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Vyberte řidiče" /></SelectTrigger>
              <SelectContent>
                {drivers?.map((d) => <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vozidlo</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
              <SelectContent>
                {vehicles?.map((v) => <SelectItem key={v.id} value={v.id}>{v.rz} — {v.znacka}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Účel cesty</Label>
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div>
            <Label>Místo nástupu</Label>
            <Input value={placeFrom} onChange={(e) => setPlaceFrom(e.target.value)} />
          </div>
          <div>
            <Label>Místo cíle</Label>
            <Input value={placeTo} onChange={(e) => setPlaceTo(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Datum od</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
            <div><Label>Čas od</Label><Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Datum do</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
            <div><Label>Čas do</Label><Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} /></div>
          </div>
          <div>
            <Label>Doprava</Label>
            <Select value={transport} onValueChange={setTransport}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sluzebni">Služební vozidlo</SelectItem>
                <SelectItem value="vlastni">Vlastní vozidlo</SelectItem>
                <SelectItem value="mhd">MHD</SelectItem>
                <SelectItem value="vlak">Vlak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Schvaluje</Label>
            <Input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Trasa</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadFromTripLogs}><RefreshCw className="h-4 w-4" />Z knihy jízd</Button>
            <Button size="sm" variant="outline" onClick={() => setLegs([...legs, { date: dateFrom, transport: "sluzebni", km: 0 }])}>
              <Plus className="h-4 w-4" />Úsek
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {legs.length === 0 && <p className="text-sm text-muted-foreground">Žádné úseky. Přidejte ručně nebo načtěte z knihy jízd.</p>}
          {legs.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
              <div className="col-span-2"><Label className="text-xs">Datum</Label><Input type="date" value={l.date} onChange={(e) => { const c = [...legs]; c[i] = { ...l, date: e.target.value }; setLegs(c); }} /></div>
              <div className="col-span-3"><Label className="text-xs">Z místa</Label><Input value={l.place_from || ""} onChange={(e) => { const c = [...legs]; c[i] = { ...l, place_from: e.target.value }; setLegs(c); }} /></div>
              <div className="col-span-3"><Label className="text-xs">Do místa</Label><Input value={l.place_to || ""} onChange={(e) => { const c = [...legs]; c[i] = { ...l, place_to: e.target.value }; setLegs(c); }} /></div>
              <div className="col-span-2"><Label className="text-xs">km</Label><Input type="number" value={l.km || 0} onChange={(e) => { const c = [...legs]; c[i] = { ...l, km: Number(e.target.value) }; setLegs(c); }} /></div>
              <div className="col-span-2 flex justify-end"><Button size="icon" variant="ghost" onClick={() => setLegs(legs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </div>
          ))}
          <div className="text-sm text-muted-foreground pt-2">Celkem: <strong>{totalKm} km</strong></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Stravné</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={recomputeMeals}><RefreshCw className="h-4 w-4" />Přepočítat</Button>
            <Button size="sm" variant="outline" onClick={() => setMeals([...meals, { date: dateFrom, hours: 8, country: "CZ", rate: DEFAULT_MEAL_RATES["5_12"], amount: DEFAULT_MEAL_RATES["5_12"] }])}>
              <Plus className="h-4 w-4" />Den
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {meals.map((m, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
              <div className="col-span-3"><Label className="text-xs">Datum</Label><Input type="date" value={m.date} onChange={(e) => { const c = [...meals]; c[i] = { ...m, date: e.target.value }; setMeals(c); }} /></div>
              <div className="col-span-2"><Label className="text-xs">Hodin</Label><Input type="number" step="0.5" value={m.hours} onChange={(e) => { const h = Number(e.target.value); const a = mealAmountForHours(h); const c = [...meals]; c[i] = { ...m, hours: h, rate: a, amount: a }; setMeals(c); }} /></div>
              <div className="col-span-2"><Label className="text-xs">Země</Label><Input value={m.country} onChange={(e) => { const c = [...meals]; c[i] = { ...m, country: e.target.value }; setMeals(c); }} /></div>
              <div className="col-span-3"><Label className="text-xs">Částka</Label><Input type="number" value={m.amount} onChange={(e) => { const c = [...meals]; c[i] = { ...m, amount: Number(e.target.value) }; setMeals(c); }} /></div>
              <div className="col-span-2 flex justify-end"><Button size="icon" variant="ghost" onClick={() => setMeals(meals.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </div>
          ))}
          <div className="text-sm text-muted-foreground pt-2">Celkem stravné: <strong>{formatCZK(mealsTotal)}</strong></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Další výdaje</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setExpenses([...expenses, { type: "parkovne", description: "", amount: 0, currency: "CZK" }])}>
            <Plus className="h-4 w-4" />Výdaj
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {expenses.map((e, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
              <div className="col-span-3">
                <Label className="text-xs">Typ</Label>
                <Select value={e.type} onValueChange={(v) => { const c = [...expenses]; c[i] = { ...e, type: v }; setExpenses(c); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parkovne">Parkovné</SelectItem>
                    <SelectItem value="dalnice">Dálnice</SelectItem>
                    <SelectItem value="ubytovani">Ubytování</SelectItem>
                    <SelectItem value="ostatni">Ostatní</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-5"><Label className="text-xs">Popis</Label><Input value={e.description || ""} onChange={(ev) => { const c = [...expenses]; c[i] = { ...e, description: ev.target.value }; setExpenses(c); }} /></div>
              <div className="col-span-2"><Label className="text-xs">Částka</Label><Input type="number" value={e.amount} onChange={(ev) => { const c = [...expenses]; c[i] = { ...e, amount: Number(ev.target.value) }; setExpenses(c); }} /></div>
              <div className="col-span-1"><Label className="text-xs">Měna</Label><Input value={e.currency} onChange={(ev) => { const c = [...expenses]; c[i] = { ...e, currency: ev.target.value }; setExpenses(c); }} /></div>
              <div className="col-span-1 flex justify-end"><Button size="icon" variant="ghost" onClick={() => setExpenses(expenses.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Souhrn</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Stravné</span><span>{formatCZK(mealsTotal)}</span></div>
          <div className="flex justify-between"><span>Náhrada za vozidlo ({totalKm} km)</span><span>{formatCZK(vehicleReimb)}</span></div>
          <div className="flex justify-between"><span>Ostatní výdaje</span><span>{formatCZK(expensesTotal)}</span></div>
          <div className="flex justify-between font-bold border-t pt-2"><span>Celkem</span><span>{formatCZK(total)}</span></div>
          <div className="flex justify-between items-center gap-4">
            <Label>Záloha</Label>
            <Input type="number" value={advance} onChange={(e) => setAdvance(Number(e.target.value))} className="w-32 text-right" />
          </div>
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>{toPay >= 0 ? "K vyplacení" : "K vrácení"}</span>
            <span>{formatCZK(Math.abs(toPay))}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Poznámky</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </CardContent>
      </Card>
    </div>
  );
}