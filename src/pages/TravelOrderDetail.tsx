import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Save, FileDown, RefreshCw, CheckCircle2, Banknote, Send, XCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getKmRate, getFuelPrice, getMealRates, mealAmountForHours, mealAmountForeignWith,
  pocketMoneyAmount, hoursBetween, formatCZK, formatCurrency, isForeignCountry, COUNTRY_TIMEZONES,
} from "@/lib/travel/calc";
import { generateTravelOrderPDF, type TravelOrderPDFData } from "@/lib/travel/pdf";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { TravelOrderStepper } from "@/components/travel/TravelOrderStepper";
import { STATUS_LABEL, STATUS_BADGE_CLASS } from "@/lib/travel/status";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Leg = { id?: string; date: string; time_from?: string; time_to?: string; place_from?: string; place_to?: string; km?: number; transport?: string; sort_order?: number; country?: string; timezone?: string };
type Meal = { id?: string; date: string; hours: number; country: string; rate: number; amount: number; currency?: string; pocket_money_pct?: number; pocket_money_amount?: number };
type Expense = { id?: string; type: string; description?: string; amount: number; currency: string };

const COUNTRIES = ["CZ", "SK", "AT", "DE", "PL", "HU", "IT", "FR", "CH", "GB", "US", "NL", "BE", "ES"];
const CURRENCIES = ["CZK", "EUR", "USD", "GBP", "CHF", "PLN", "HUF"];

export default function TravelOrderDetail() {
  const { id } = useParams();
  const isNew = !id || id === "novy";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: companyOv } = useCompanySettings();
  const { hasRole } = useAuth();
  const canApprove = hasRole("admin") || hasRole("dispatcer");

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
  const [notes, setNotes] = useState("");
  const [transport, setTransport] = useState<string>("sluzebni");
  const [coTravelers, setCoTravelers] = useState("");
  const [currencyRateDate, setCurrencyRateDate] = useState<string>("");
  const [currencyRateEurCzk, setCurrencyRateEurCzk] = useState<number | null>(null);
  // Workflow podpisy
  const [requestedBy, setRequestedBy] = useState<string>("");
  const [requestedAt, setRequestedAt] = useState<string>("");
  const [requestApprovedBy, setRequestApprovedBy] = useState<string>("");
  const [requestApprovedAt, setRequestApprovedAt] = useState<string>("");
  const [reportSubmittedBy, setReportSubmittedBy] = useState<string>("");
  const [reportSubmittedAt, setReportSubmittedAt] = useState<string>("");
  const [reportApprovedBy, setReportApprovedBy] = useState<string>("");
  const [reportApprovedAt, setReportApprovedAt] = useState<string>("");
  const [rejectedBy, setRejectedBy] = useState<string>("");
  const [rejectedAt, setRejectedAt] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectDraft, setRejectDraft] = useState("");

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
    setNotes(o.notes || "");
    setTransport((o.transport_mode?.[0]) || "sluzebni");
    setCoTravelers(o.co_travelers || "");
    setCurrencyRateDate(o.currency_rate_date || "");
    setCurrencyRateEurCzk(o.currency_rate_eur_czk ? Number(o.currency_rate_eur_czk) : null);
    setRequestedBy(o.requested_by || ""); setRequestedAt(o.requested_at || "");
    setRequestApprovedBy(o.request_approved_by || ""); setRequestApprovedAt(o.request_approved_at || "");
    setReportSubmittedBy(o.report_submitted_by || ""); setReportSubmittedAt(o.report_submitted_at || "");
    setReportApprovedBy(o.report_approved_by || ""); setReportApprovedAt(o.report_approved_at || "");
    setRejectedBy(o.rejected_by || ""); setRejectedAt(o.rejected_at || "");
    setRejectionReason(o.rejection_reason || "");
    setLegs(existing.legs as Leg[]);
    setMeals(existing.meals as Meal[]);
    setExpenses(existing.expenses as Expense[]);
  }, [existing]);

  // Náhrada za vlastní vozidlo
  const totalKm = useMemo(() => legs.reduce((s, l) => s + (Number(l.km) || 0), 0), [legs]);
  const vehicleReimb = useMemo(() => {
    if (transport !== "vlastni") return 0;
    const consumption = 7;
    const fuelPart = (consumption / 100) * getFuelPrice(dateFrom, companyOv?.fuel_price_override);
    return Math.round(totalKm * (getKmRate(dateFrom, companyOv?.km_rate_override) + fuelPart) * 100) / 100;
  }, [totalKm, transport, dateFrom, companyOv]);

  // Souhrny per měna
  const mealsByCurrency = useMemo(() => {
    const o: Record<string, number> = {};
    meals.forEach((m) => { const c = m.currency || "CZK"; o[c] = (o[c] || 0) + (Number(m.amount) || 0); });
    return o;
  }, [meals]);
  const pocketByCurrency = useMemo(() => {
    const o: Record<string, number> = {};
    meals.forEach((m) => { const c = m.currency || "CZK"; o[c] = (o[c] || 0) + (Number(m.pocket_money_amount) || 0); });
    return o;
  }, [meals]);
  const expensesByCurrency = useMemo(() => {
    const o: Record<string, number> = {};
    expenses.forEach((e) => { o[e.currency] = (o[e.currency] || 0) + (Number(e.amount) || 0); });
    return o;
  }, [expenses]);

  const mealsTotalCzk = mealsByCurrency.CZK || 0;
  const expensesTotalCzk = expensesByCurrency.CZK || 0;
  const total = mealsTotalCzk + vehicleReimb + expensesTotalCzk; // jen CZK pro lokální souhrn
  const toPay = total - (Number(advance) || 0);

  const loadFromTripLogs = async () => {
    if (!vehicleId) { toast({ title: "Vyberte vozidlo", variant: "destructive" }); return; }
    const { data, error } = await supabase
      .from("trip_logs").select("*").eq("vehicle_id", vehicleId)
      .gte("date", dateFrom).lte("date", dateTo).order("date");
    if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
    setLegs((data || []).map((t: any, i: number) => ({
      date: t.date, time_from: t.time?.slice(0, 5),
      place_from: t.route_from, place_to: t.route_to,
      km: t.km_total || 0, transport: "sluzebni",
      country: "CZ", timezone: "Europe/Prague", sort_order: i,
    })));
    toast({ title: `Načteno ${data?.length || 0} úseků z knihy jízd` });
  };

  // Stáhnutí kurzů ČNB
  const fetchCnbRate = async () => {
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/cnb-rates?date=${dateFrom}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const eur = json.rates?.EUR;
      if (!eur) throw new Error("Kurz EUR nenalezen v odpovědi");
      setCurrencyRateDate(json.date || dateFrom);
      setCurrencyRateEurCzk(eur);
      toast({ title: "Kurz ČNB načten", description: `${json.date}: 1 EUR = ${eur.toFixed(3)} CZK` });
    } catch (e: any) {
      toast({ title: "Chyba kurzu", description: e.message, variant: "destructive" });
    }
  };

  // Přepočet jednoho řádku stravného (země / hodiny / kapesné)
  const recomputeMealRow = (m: Meal): Meal => {
    let amount: number; let currency: string;
    if (isForeignCountry(m.country, m.date)) {
      const r = mealAmountForeignWith(m.country, m.hours, m.date, companyOv?.foreign_meal_rates_override);
      amount = r.amount; currency = r.currency;
    } else {
      const rates = getMealRates(m.date, companyOv?.meal_rates_override);
      amount = mealAmountForHours(m.hours, rates); currency = "CZK";
    }
    const pocket = pocketMoneyAmount(amount, m.pocket_money_pct || 0);
    return { ...m, amount, currency, rate: amount, pocket_money_amount: pocket };
  };

  const recomputeMeals = () => {
    const totalH = hoursBetween(dateFrom, timeFrom, dateTo, timeTo);
    if (totalH < 5) { setMeals([]); return; }
    const days = Math.max(1, Math.ceil(totalH / 24));
    const perDayHours = totalH / days;
    const newMeals: Meal[] = [];
    const start = new Date(dateFrom);
    for (let i = 0; i < days; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const base: Meal = {
        date: d.toISOString().slice(0, 10),
        hours: Math.round(perDayHours * 10) / 10,
        country: "CZ", rate: 0, amount: 0, currency: "CZK",
        pocket_money_pct: 0, pocket_money_amount: 0,
      };
      newMeals.push(recomputeMealRow(base));
    }
    setMeals(newMeals);
    toast({ title: "Stravné přepočítáno" });
  };

  const save = async (newStatus?: string, overrides: any = {}) => {
    const payload: any = {
      status: newStatus || status,
      driver_id: driverId || null, vehicle_id: vehicleId || null,
      purpose, date_from: dateFrom, time_from: timeFrom, date_to: dateTo, time_to: timeTo,
      place_from: placeFrom, place_to: placeTo,
      transport_mode: [transport], advance_payment: advance,
      notes, total_amount: total,
      co_travelers: coTravelers || null,
      currency_rate_date: currencyRateDate || null,
      currency_rate_eur_czk: currencyRateEurCzk,
      requested_by: requestedBy || null, requested_at: requestedAt || null,
      request_approved_by: requestApprovedBy || null, request_approved_at: requestApprovedAt || null,
      report_submitted_by: reportSubmittedBy || null, report_submitted_at: reportSubmittedAt || null,
      report_approved_by: reportApprovedBy || null, report_approved_at: reportApprovedAt || null,
      rejected_by: rejectedBy || null, rejected_at: rejectedAt || null,
      rejection_reason: rejectionReason || null,
      ...overrides,
    };
    let saveId = orderId;
    if (!saveId) {
      const { data, error } = await supabase.from("travel_orders").insert(payload).select().single();
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return null; }
      saveId = data.id; setOrderId(saveId); setNumber(data.number);
    } else {
      const { error } = await supabase.from("travel_orders").update(payload).eq("id", saveId);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return null; }
    }

    const emptyToNull = (v: any) => (v === "" || v === undefined ? null : v);
    const legsPayload = legs.map((l, i) => ({
      travel_order_id: saveId,
      date: l.date,
      time_from: emptyToNull(l.time_from),
      time_to: emptyToNull(l.time_to),
      place_from: emptyToNull(l.place_from),
      place_to: emptyToNull(l.place_to),
      km: l.km != null && l.km !== ("" as any) ? Math.round(Number(l.km)) : 0,
      transport: l.transport || "sluzebni",
      note: emptyToNull((l as any).note),
      sort_order: i,
      country: l.country || "CZ",
      timezone: l.timezone || "Europe/Prague",
    }));
    const mealsPayload = meals.map((m) => ({
      travel_order_id: saveId,
      date: m.date,
      hours: Number(m.hours) || 0,
      country: m.country || "CZ",
      rate: Number(m.rate) || 0,
      amount: Number(m.amount) || 0,
      currency: m.currency || "CZK",
      pocket_money_pct: Number(m.pocket_money_pct) || 0,
      pocket_money_amount: Number(m.pocket_money_amount) || 0,
    }));
    const expensesPayload = expenses.map((e) => ({
      travel_order_id: saveId,
      type: e.type || "ostatni",
      description: emptyToNull(e.description),
      amount: Number(e.amount) || 0,
      currency: e.currency || "CZK",
    }));

    const delLegs = await supabase.from("travel_order_legs").delete().eq("travel_order_id", saveId);
    if (delLegs.error) { toast({ title: "Chyba při mazání úseků", description: delLegs.error.message, variant: "destructive" }); return null; }
    const delMeals = await supabase.from("travel_order_meals").delete().eq("travel_order_id", saveId);
    if (delMeals.error) { toast({ title: "Chyba při mazání stravného", description: delMeals.error.message, variant: "destructive" }); return null; }
    const delExp = await supabase.from("travel_order_expenses").delete().eq("travel_order_id", saveId);
    if (delExp.error) { toast({ title: "Chyba při mazání výdajů", description: delExp.error.message, variant: "destructive" }); return null; }

    if (legsPayload.length) {
      const { error } = await supabase.from("travel_order_legs").insert(legsPayload);
      if (error) { console.error("legs insert error", error, legsPayload); toast({ title: "Chyba při ukládání úseků", description: error.message, variant: "destructive" }); return null; }
    }
    if (mealsPayload.length) {
      const { error } = await supabase.from("travel_order_meals").insert(mealsPayload);
      if (error) { console.error("meals insert error", error, mealsPayload); toast({ title: "Chyba při ukládání stravného", description: error.message, variant: "destructive" }); return null; }
    }
    if (expensesPayload.length) {
      const { error } = await supabase.from("travel_order_expenses").insert(expensesPayload);
      if (error) { console.error("expenses insert error", error, expensesPayload); toast({ title: "Chyba při ukládání výdajů", description: error.message, variant: "destructive" }); return null; }
    }

    if (newStatus) setStatus(newStatus);
    qc.invalidateQueries({ queryKey: ["travel_orders"] });
    qc.invalidateQueries({ queryKey: ["travel_order", saveId] });
    toast({ title: "Uloženo" });
    if (isNew) navigate(`/cestovni-prikazy/${saveId}`, { replace: true });
    return saveId;
  };

  const driverName = useMemo(() => {
    const d = drivers?.find((x) => x.id === driverId);
    return d ? `${d.first_name} ${d.last_name}` : "—";
  }, [drivers, driverId]);

  const setWorkflow = async (
    kind: "submit" | "submit_report" | "approve_report" | "reject" | "reopen",
    reason?: string
  ) => {
    const now = new Date().toISOString();
    const me = driverName;
    if (kind === "submit") {
      setRequestedBy(me); setRequestedAt(now);
      await save("odeslano", { requested_by: me, requested_at: now, status: "odeslano" });
    } else if (kind === "submit_report") {
      setReportSubmittedBy(me); setReportSubmittedAt(now);
      await save("vyuctovano", { report_submitted_by: me, report_submitted_at: now, status: "vyuctovano" });
    } else if (kind === "approve_report") {
      setReportApprovedBy(me); setReportApprovedAt(now);
      await save("schvaleno", { report_approved_by: me, report_approved_at: now, status: "schvaleno" });
    } else if (kind === "reject") {
      setRejectedBy(me); setRejectedAt(now); setRejectionReason(reason || "");
      await save("zamitnuto", {
        rejected_by: me, rejected_at: now, rejection_reason: reason || null, status: "zamitnuto",
      });
    } else if (kind === "reopen") {
      setRejectedBy(""); setRejectedAt(""); setRejectionReason("");
      await save("koncept", { rejected_by: null, rejected_at: null, rejection_reason: null, status: "koncept" });
    }
  };

  const openReject = () => { setRejectDraft(rejectionReason || ""); setRejectDialogOpen(true); };
  const confirmReject = async () => {
    setRejectDialogOpen(false);
    await setWorkflow("reject", rejectDraft.trim() || undefined);
  };

  const exportPDF = async () => {
    const driver = drivers?.find((d) => d.id === driverId);
    const vehicle = vehicles?.find((v) => v.id === vehicleId);
    const data: TravelOrderPDFData = {
      number: number || "(nový)", status,
      company: company || {},
      driver: { name: driver ? `${driver.first_name} ${driver.last_name}` : "—", department: driver?.department },
      coTravelers,
      vehicle: { rz: vehicle?.rz, znacka: vehicle?.znacka },
      purpose, dateFrom, timeFrom, dateTo, timeTo, placeFrom, placeTo,
      transportMode: [transport],
      legs, meals, expenses,
      vehicleReimbursement: vehicleReimb, advance,
      currencyRateDate: currencyRateDate || undefined,
      currencyRateEurCzk: currencyRateEurCzk || undefined,
      requestedBy, requestedAt,
      requestApprovedBy, requestApprovedAt,
      reportSubmittedBy, reportSubmittedAt,
      reportApprovedBy, reportApprovedAt,
    };
    const doc = await generateTravelOrderPDF(data);
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
          {!isNew && (
            <Badge variant="outline" className={cn(STATUS_BADGE_CLASS[status])}>
              {STATUS_LABEL[status] || status}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPDF}><FileDown className="h-4 w-4" />PDF</Button>
          <Button onClick={() => save()}><Save className="h-4 w-4" />Uložit</Button>
        </div>
      </div>

      {!isNew && (
        <Card>
          <CardHeader><CardTitle>Stav příkazu</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <TravelOrderStepper
              status={status}
              signatures={{
                koncept: { by: requestedBy ? "Řidič" : driverName, at: undefined },
                odeslano: { by: requestedBy, at: requestedAt },
                vyuctovano: { by: reportSubmittedBy, at: reportSubmittedAt },
                schvaleno: { by: reportApprovedBy, at: reportApprovedAt },
              }}
              rejection={{ by: rejectedBy, at: rejectedAt, reason: rejectionReason }}
            />

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {status === "koncept" && (
                <Button size="sm" onClick={() => setWorkflow("submit")}>
                  <Send className="h-4 w-4" />Odeslat / zahájit cestu
                </Button>
              )}
              {(status === "koncept" || status === "odeslano") && (
                <Button size="sm" variant="outline" onClick={() => setWorkflow("submit_report")}>
                  <CheckCircle2 className="h-4 w-4" />Vyúčtovat
                </Button>
              )}
              {status === "vyuctovano" && canApprove && (
                <Button size="sm" onClick={() => setWorkflow("approve_report")}>
                  <CheckCircle2 className="h-4 w-4" />Schválit vyúčtování
                </Button>
              )}
              {canApprove && status !== "koncept" && status !== "schvaleno" && status !== "zamitnuto" && (
                <Button size="sm" variant="outline" className="text-destructive" onClick={openReject}>
                  <XCircle className="h-4 w-4" />Zamítnout
                </Button>
              )}
              {status === "zamitnuto" && (
                <Button size="sm" variant="outline" onClick={() => setWorkflow("reopen")}>
                  <RotateCcw className="h-4 w-4" />Vrátit do konceptu
                </Button>
              )}
              {!canApprove && status === "vyuctovano" && (
                <span className="text-xs text-muted-foreground self-center">Čeká na schválení admin/dispečer.</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            <Label>Spolucestující</Label>
            <Input value={coTravelers} onChange={(e) => setCoTravelers(e.target.value)} placeholder="Jména oddělená čárkou" />
          </div>
          <div className="md:col-span-2">
            <Label>Účel cesty</Label>
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
          <div><Label>Místo nástupu</Label><Input value={placeFrom} onChange={(e) => setPlaceFrom(e.target.value)} /></div>
          <div><Label>Místo cíle</Label><Input value={placeTo} onChange={(e) => setPlaceTo(e.target.value)} /></div>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Trasa</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadFromTripLogs}><RefreshCw className="h-4 w-4" />Z knihy jízd</Button>
            <Button size="sm" variant="outline" onClick={() => setLegs([...legs, { date: dateFrom, transport: "sluzebni", km: 0, country: "CZ", timezone: "Europe/Prague" }])}>
              <Plus className="h-4 w-4" />Úsek
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {legs.length === 0 && <p className="text-sm text-muted-foreground">Žádné úseky. Přidejte ručně nebo načtěte z knihy jízd.</p>}
          {legs.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
              <div className="col-span-2"><Label className="text-xs">Datum</Label><Input type="date" value={l.date} onChange={(e) => { const c = [...legs]; c[i] = { ...l, date: e.target.value }; setLegs(c); }} /></div>
              <div className="col-span-1">
                <Label className="text-xs">Země</Label>
                <Select value={l.country || "CZ"} onValueChange={(v) => { const c = [...legs]; c[i] = { ...l, country: v, timezone: COUNTRY_TIMEZONES[v] || "Europe/Prague" }; setLegs(c); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((co) => <SelectItem key={co} value={co}>{co}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-3"><Label className="text-xs">Z místa</Label><Input value={l.place_from || ""} onChange={(e) => { const c = [...legs]; c[i] = { ...l, place_from: e.target.value }; setLegs(c); }} /></div>
              <div className="col-span-3"><Label className="text-xs">Do místa</Label><Input value={l.place_to || ""} onChange={(e) => { const c = [...legs]; c[i] = { ...l, place_to: e.target.value }; setLegs(c); }} /></div>
              <div className="col-span-2"><Label className="text-xs">km</Label><Input type="number" value={l.km || 0} onChange={(e) => { const c = [...legs]; c[i] = { ...l, km: Number(e.target.value) }; setLegs(c); }} /></div>
              <div className="col-span-1 flex justify-end"><Button size="icon" variant="ghost" onClick={() => setLegs(legs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
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
            <Button size="sm" variant="outline" onClick={() => setMeals([...meals, recomputeMealRow({ date: dateFrom, hours: 8, country: "CZ", rate: 0, amount: 0, currency: "CZK", pocket_money_pct: 0, pocket_money_amount: 0 })])}>
              <Plus className="h-4 w-4" />Den
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {meals.map((m, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded p-2">
              <div className="col-span-2"><Label className="text-xs">Datum</Label><Input type="date" value={m.date} onChange={(e) => { const c = [...meals]; c[i] = { ...m, date: e.target.value }; setMeals(c); }} /></div>
              <div className="col-span-1"><Label className="text-xs">Hod.</Label><Input type="number" step="0.5" value={m.hours} onChange={(e) => { const c = [...meals]; c[i] = recomputeMealRow({ ...m, hours: Number(e.target.value) }); setMeals(c); }} /></div>
              <div className="col-span-2">
                <Label className="text-xs">Země</Label>
                <Select value={m.country} onValueChange={(v) => { const c = [...meals]; c[i] = recomputeMealRow({ ...m, country: v }); setMeals(c); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((co) => <SelectItem key={co} value={co}>{co}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Label className="text-xs">Měna</Label>
                <Select value={m.currency || "CZK"} onValueChange={(v) => { const c = [...meals]; c[i] = { ...m, currency: v }; setMeals(c); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((cu) => <SelectItem key={cu} value={cu}>{cu}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label className="text-xs">Stravné</Label><Input type="number" value={m.amount} onChange={(e) => { const c = [...meals]; c[i] = { ...m, amount: Number(e.target.value), pocket_money_amount: pocketMoneyAmount(Number(e.target.value), m.pocket_money_pct || 0) }; setMeals(c); }} /></div>
              <div className="col-span-1"><Label className="text-xs">Kapesné %</Label><Input type="number" value={m.pocket_money_pct || 0} onChange={(e) => { const pct = Number(e.target.value); const c = [...meals]; c[i] = { ...m, pocket_money_pct: pct, pocket_money_amount: pocketMoneyAmount(m.amount, pct) }; setMeals(c); }} /></div>
              <div className="col-span-2"><Label className="text-xs">Kapesné</Label><Input type="number" value={m.pocket_money_amount || 0} readOnly className="bg-muted" /></div>
              <div className="col-span-1 flex justify-end"><Button size="icon" variant="ghost" onClick={() => setMeals(meals.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </div>
          ))}
          <div className="pt-2 text-sm space-y-1">
            {Object.entries(mealsByCurrency).map(([cur, sum]) => (
              <div key={cur} className="flex justify-between"><span>Stravné celkem ({cur})</span><strong>{formatCurrency(sum, cur)}</strong></div>
            ))}
            {Object.entries(pocketByCurrency).filter(([, v]) => v > 0).map(([cur, sum]) => (
              <div key={`p-${cur}`} className="flex justify-between text-muted-foreground"><span>Kapesné celkem ({cur})</span><span>{formatCurrency(sum, cur)}</span></div>
            ))}
          </div>
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
              <div className="col-span-1">
                <Label className="text-xs">Měna</Label>
                <Select value={e.currency} onValueChange={(v) => { const c = [...expenses]; c[i] = { ...e, currency: v }; setExpenses(c); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((cu) => <SelectItem key={cu} value={cu}>{cu}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-1 flex justify-end"><Button size="icon" variant="ghost" onClick={() => setExpenses(expenses.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Kurz ČNB</CardTitle>
          <Button size="sm" variant="outline" onClick={fetchCnbRate}><Banknote className="h-4 w-4" />Načíst kurz ke dni {dateFrom}</Button>
        </CardHeader>
        <CardContent className="text-sm">
          {currencyRateEurCzk
            ? <p>Uložený kurz ČNB ze dne <strong>{currencyRateDate}</strong>: 1 EUR = <strong>{currencyRateEurCzk.toFixed(3)} CZK</strong></p>
            : <p className="text-muted-foreground">Žádný kurz uložen — pro přepočet zahraničních měn klikněte na „Načíst kurz".</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Souhrn (CZK)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Stravné CZK</span><span>{formatCZK(mealsTotalCzk)}</span></div>
          <div className="flex justify-between"><span>Náhrada za vozidlo ({totalKm} km)</span><span>{formatCZK(vehicleReimb)}</span></div>
          <div className="flex justify-between"><span>Výdaje CZK</span><span>{formatCZK(expensesTotalCzk)}</span></div>
          <div className="flex justify-between font-bold border-t pt-2"><span>Celkem CZK</span><span>{formatCZK(total)}</span></div>
          <div className="flex justify-between items-center gap-4">
            <Label>Záloha</Label>
            <Input type="number" value={advance} onChange={(e) => setAdvance(Number(e.target.value))} className="w-32 text-right" />
          </div>
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>{toPay >= 0 ? "K vyplacení" : "K vrácení"} (CZK)</span>
            <span>{formatCZK(Math.abs(toPay))}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-2">Souhrn ostatních měn a celkový přepočet přes kurz ČNB najdete v exportovaném PDF.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Poznámky</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zamítnout cestovní příkaz</DialogTitle>
            <DialogDescription>Uveďte důvod — řidič ho uvidí v detailu příkazu.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={rejectDraft} onChange={(e) => setRejectDraft(e.target.value)} placeholder="Např. chybějící doklady, nesouhlasí částky…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Zrušit</Button>
            <Button variant="destructive" onClick={confirmReject}>Zamítnout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}