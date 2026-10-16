import { supabase } from "@/integrations/supabase/client";

export type Priority = "important" | "other";
export interface MissingItem { key: string; label: string; priority: Priority; tab: string; }

export interface VehicleRelated {
  insurance: number;
  inspections: number;
  vignettes: number;
  mileage: number;
  trips: number;
  fuelCards: { card_number: string | null; valid_until: string | null }[];
}

const empty = (v: unknown) => v === null || v === undefined || String(v).trim() === "";

export const isLeasing = (v: any) => /leas|pronaj/i.test(v?.typ_vlastnictvi || "");
export const isMoto = (v: any) => /vespa|moto|sk[uú]tr/i.test(`${v?.znacka || ""} ${v?.nazev_vozu || ""}`);

type Field = { key: string; label: string; priority: Priority; tab: string; when?: (v: any) => boolean };

const FIELDS: Field[] = [
  { key: "vin", label: "VIN", priority: "important", tab: "info" },
  { key: "nazev_vozu", label: "Název vozu", priority: "other", tab: "info" },
  { key: "kategorie", label: "Kategorie", priority: "other", tab: "info" },
  { key: "lokalita", label: "Lokalita", priority: "other", tab: "info" },
  { key: "vlastnik", label: "Vlastník", priority: "other", tab: "info" },
  { key: "typ_vlastnictvi", label: "Typ vlastnictví", priority: "important", tab: "info" },
  { key: "stk", label: "STK", priority: "important", tab: "info" },
  { key: "zelena_karta", label: "Zelená karta", priority: "important", tab: "info" },
  { key: "dalnicni_znamka", label: "Dálniční známka", priority: "important", tab: "info", when: v => !isMoto(v) },
  { key: "vychozi_stav_tachometru", label: "Výchozí stav tachometru", priority: "important", tab: "info" },
  { key: "parkovaci_stani", label: "Parkovací stání", priority: "other", tab: "info" },
  { key: "misto_uskladneni_pneu", label: "Uskladnění pneu", priority: "other", tab: "info", when: v => !isMoto(v) },
  { key: "lekarnicka", label: "Lékárnička", priority: "other", tab: "info" },
  { key: "nahradni_klic", label: "Náhradní klíč", priority: "other", tab: "info" },
  { key: "velky_tp", label: "Velký TP", priority: "other", tab: "info" },
  { key: "maly_tp", label: "Malý TP", priority: "other", tab: "info" },
  { key: "leasingova_spolecnost", label: "Leasingová společnost", priority: "important", tab: "info", when: isLeasing },
  { key: "cislo_smlouvy_leasing", label: "Číslo leasingové smlouvy", priority: "important", tab: "info", when: isLeasing },
  { key: "datum_zahajeni_leasingu", label: "Začátek leasingu", priority: "important", tab: "info", when: isLeasing },
  { key: "datum_ukonceni_leasingu", label: "Konec leasingu", priority: "important", tab: "info", when: isLeasing },
  { key: "najezd_za_rok", label: "Nájezd za rok", priority: "important", tab: "info", when: isLeasing },
  { key: "mesicni_splatka", label: "Měsíční splátka", priority: "other", tab: "info", when: isLeasing },
];

export function vehicleCompleteness(v: any, r?: VehicleRelated) {
  const checks: { item: MissingItem; ok: boolean }[] = [];
  for (const f of FIELDS) {
    if (f.when && !f.when(v)) continue;
    checks.push({ item: { key: f.key, label: f.label, priority: f.priority, tab: f.tab }, ok: !empty(v[f.key]) });
  }
  if (r) {
    checks.push({ item: { key: "insurance", label: "Pojištění (záznam)", priority: "important", tab: "info" }, ok: r.insurance > 0 });
    checks.push({ item: { key: "mileage", label: "Aktuální odečet tachometru", priority: "important", tab: "info" }, ok: r.mileage > 0 || r.trips > 0 });
    checks.push({ item: { key: "fuelcard", label: "Tankovací karta", priority: "other", tab: "fuelcards" }, ok: r.fuelCards.length > 0 });
    r.fuelCards.forEach((c, i) => {
      const n = r.fuelCards.length > 1 ? ` ${i + 1}` : "";
      checks.push({ item: { key: `fc_num_${i}`, label: `Číslo tankovací karty${n}`, priority: "other", tab: "fuelcards" }, ok: !empty(c.card_number) });
      checks.push({ item: { key: `fc_valid_${i}`, label: `Platnost tankovací karty${n}`, priority: "other", tab: "fuelcards" }, ok: !empty(c.valid_until) });
    });
  }
  const missing = checks.filter(c => !c.ok).map(c => c.item);
  const percent = checks.length ? Math.round(((checks.length - missing.length) / checks.length) * 100) : 100;
  return { percent, missing, total: checks.length };
}

export function fuelCardMissing(c: { card_number: string | null; valid_until: string | null }) {
  const m: string[] = [];
  if (empty(c.card_number)) m.push("číslo");
  if (empty(c.valid_until)) m.push("platnost");
  return m;
}

export function driverMissing(d: any) {
  const m: string[] = [];
  if (empty(d.phone)) m.push("telefon");
  if (empty(d.email)) m.push("e-mail");
  if (empty(d.department)) m.push("oddělení");
  if (empty(d.user_id)) m.push("účet");
  return m;
}

export const completenessTone = (p: number) => (p >= 90 ? "success" : p >= 60 ? "warning" : "destructive");

export async function loadVehicleRelated(ids?: string[]): Promise<Record<string, VehicleRelated>> {
  const f = (q: any) => (ids ? q.in("vehicle_id", ids) : q);
  const [ins, insp, vig, mil, trips, cards] = await Promise.all([
    f(supabase.from("insurance").select("vehicle_id")),
    f(supabase.from("inspections").select("vehicle_id")),
    f(supabase.from("vehicle_vignettes").select("vehicle_id")),
    f(supabase.from("vehicle_mileage").select("vehicle_id")),
    f(supabase.from("trip_logs").select("vehicle_id").not("km_end", "is", null)),
    f(supabase.from("fuel_cards").select("vehicle_id, card_number, valid_until, status")),
  ]);
  const out: Record<string, VehicleRelated> = {};
  const get = (id: string) => (out[id] ||= { insurance: 0, inspections: 0, vignettes: 0, mileage: 0, trips: 0, fuelCards: [] });
  (ins.data || []).forEach((r: any) => get(r.vehicle_id).insurance++);
  (insp.data || []).forEach((r: any) => get(r.vehicle_id).inspections++);
  (vig.data || []).forEach((r: any) => get(r.vehicle_id).vignettes++);
  (mil.data || []).forEach((r: any) => get(r.vehicle_id).mileage++);
  (trips.data || []).forEach((r: any) => get(r.vehicle_id).trips++);
  (cards.data || []).filter((c: any) => c.status !== "zrušená").forEach((c: any) => get(c.vehicle_id).fuelCards.push(c));
  return out;
}

export const emptyRelated = (): VehicleRelated => ({ insurance: 0, inspections: 0, vignettes: 0, mileage: 0, trips: 0, fuelCards: [] });
