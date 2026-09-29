import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, ChevronRight, Clock, FileText, Route as RouteIcon, CalendarClock } from "lucide-react";
import { reservationEnd, reservationStart } from "@/lib/reservationRules";
import { STATUS_LABEL } from "@/lib/travel/status";
import { formatCZK } from "@/lib/travel/calc";

/* ---------- Právě teď ---------- */

interface NowRes {
  date_from: string; date_to: string; time_from: string | null; time_to: string | null;
  vehicle_id: string; vehicle?: { rz: string | null; znacka: string | null; nazev_vozu?: string | null };
}

function fmtLeft(ms: number) {
  const min = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

export function NowBanner({ reservations, onTrip }: { reservations: NowRes[]; onTrip: () => void }) {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);

  const active = reservations.find((r) => {
    const s = reservationStart(r.date_from, r.time_from), e = reservationEnd(r.date_to, r.time_to);
    return s <= now && e > now && (r as any).status === "schváleno";
  });
  const todayNext = !active && reservations.find((r) => {
    const s = reservationStart(r.date_from, r.time_from);
    return (r as any).status === "schváleno" && s > now && s.toDateString() === now.toDateString();
  });
  const r = active || todayNext;
  if (!r) return null;

  const name = `${r.vehicle?.nazev_vozu || r.vehicle?.znacka || "Vůz"} · ${r.vehicle?.rz || "?"}`;
  const text = active
    ? `Rezervace končí za ${fmtLeft(reservationEnd(r.date_to, r.time_to).getTime() - now.getTime())}`
    : `Dnešní jízda začíná za ${fmtLeft(reservationStart(r.date_from, r.time_from).getTime() - now.getTime())}`;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="p-5 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Car className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-primary font-semibold">
              {active ? "Právě teď" : "Dnes"}
            </p>
            <p className="font-semibold truncate">{name}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {text}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/ridic/vozidla/${r.vehicle_id}`)}>Detail vozu</Button>
          <Button onClick={onTrip}><RouteIcon className="h-4 w-4 mr-2" />Zapsat jízdu</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Termíny mého vozu ---------- */

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const t = v.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(+m[2], +m[1], 0);
  return null;
}

interface Deadline { label: string; date: Date | null; note?: string }

function DeadlineRow({ d }: { d: Deadline }) {
  const days = d.date ? Math.ceil((d.date.getTime() - Date.now()) / 86400000) : null;
  const variant: "destructive" | "secondary" | "outline" =
    days === null ? "outline" : days < 0 ? "destructive" : days <= 30 ? "destructive" : "secondary";
  const txt = days === null ? (d.note || "neuvedeno") : days < 0 ? `prošlé ${-days} d` : days === 0 ? "dnes" : `za ${days} d`;
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{d.label}</p>
        {d.date && <p className="text-xs text-muted-foreground">{d.date.toLocaleDateString("cs-CZ")}</p>}
      </div>
      <Badge variant={variant} className="shrink-0">{txt}</Badge>
    </div>
  );
}

export function VehicleDeadlinesCard({ vehicleId }: { vehicleId: string }) {
  const [items, setItems] = useState<Deadline[] | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: v }, { data: vig }, { data: sp }] = await Promise.all([
        supabase.from("vehicles_basic").select("stk").eq("id", vehicleId).maybeSingle(),
        supabase.from("vehicle_vignettes").select("country, valid_until").eq("vehicle_id", vehicleId).order("valid_until", { ascending: false }),
        supabase.from("service_plans").select("type, next_due_date, next_due_km").eq("vehicle_id", vehicleId).order("next_due_date", { ascending: true }),
      ]);
      const list: Deadline[] = [{ label: "STK", date: parseDate((v as any)?.stk) }];
      const cz = (vig || []).find((x: any) => x.country === "CZ") || (vig || [])[0];
      list.push({ label: `Dálniční známka${cz ? ` (${cz.country})` : ""}`, date: cz ? parseDate(cz.valid_until) : null, note: "chybí" });
      const nextService = (sp || []).find((s: any) => s.next_due_date || s.next_due_km);
      if (nextService) {
        list.push({
          label: `Servis – ${nextService.type}`,
          date: parseDate(nextService.next_due_date),
          note: nextService.next_due_km ? `při ${nextService.next_due_km.toLocaleString("cs-CZ")} km` : undefined,
        });
      }
      const m = new Date().getMonth() + 1;
      if ([3, 4, 10, 11].includes(m)) {
        list.push({ label: m <= 4 ? "Přezutí na letní pneu" : "Přezutí na zimní pneu", date: null, note: "sezóna právě probíhá" });
      }
      setItems(list);
    })();
  }, [vehicleId]);

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center gap-2 space-y-0">
        <CalendarClock className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Termíny mého vozu</CardTitle>
      </CardHeader>
      <CardContent>
        {!items ? <p className="text-sm text-muted-foreground">Načítám…</p> : items.map((d) => <DeadlineRow key={d.label} d={d} />)}
      </CardContent>
    </Card>
  );
}

/* ---------- Cestovní příkazy ---------- */

export function TravelOrdersCard({ driverId }: { driverId: string }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    supabase
      .from("travel_orders")
      .select("id, number, status, purpose, place_to, date_from, total_amount")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => setRows(data || []));
  }, [driverId]);

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Cestovní příkazy</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/ridic/cestovni-prikazy/novy")} className="text-xs text-primary">+ Nový</button>
          <button onClick={() => navigate("/ridic/cestovni-prikazy")} className="text-xs text-primary flex items-center gap-0.5">
            Vše <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {!rows ? <p className="text-sm text-muted-foreground">Načítám…</p> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Zatím žádné cestovní příkazy.</p>
        ) : rows.map((o) => (
          <button
            key={o.id}
            onClick={() => navigate(`/ridic/cestovni-prikazy/${o.id}`)}
            className="w-full flex items-center justify-between py-2 border-b last:border-0 hover:bg-accent/40 -mx-2 px-2 rounded text-left"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{o.number} · {o.place_to || o.purpose || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {o.date_from}{o.total_amount ? ` · ${formatCZK(Number(o.total_amount))}` : ""}
              </p>
            </div>
            <Badge variant={o.status === "schvaleno" ? "default" : o.status === "zamitnuto" ? "destructive" : "secondary"} className="shrink-0">
              {STATUS_LABEL[o.status] || o.status}
            </Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
