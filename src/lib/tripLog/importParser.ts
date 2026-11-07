// Parse rows from an Excel/CSV trip log into trip_logs inserts.
import { parseCzDate, parseCzNumber, parseTime } from "@/lib/tripParse";

export type ImportField =
  | "date" | "time" | "break_minutes" | "driver" | "description" | "purpose" | "purpose_type"
  | "route" | "route_from" | "route_to" | "km_start" | "km_end" | "km_total"
  | "fuel_quantity" | "fuel_price" | "other_price";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

const RULES: [ImportField, RegExp][] = [
  ["date", /^(datum|date|den)\b/],
  ["time", /^(cas|time|odjezd)\b/],
  ["break_minutes", /prestavk|break/],
  ["driver", /ridic|driver|jmeno/],
  ["purpose_type", /^typ|soukrom|sluzeb|charakter/],
  ["route_from", /^(odkud|z |from|misto odjezdu|start)/],
  ["route_to", /^(kam|do |to|cil|misto prijezdu)/],
  ["route", /trasa|route|cesta/],
  ["km_start", /(pocatecni|zacatek|start|pocatek|tach.*(od|zac))/],
  ["km_end", /(konecn|konec|end|tach.*(do|kon))/],
  ["km_total", /(ujeto|vzdalenost|ujete|celkem km|^km$|distance)/],
  ["fuel_quantity", /(litr|^l$|phm.*(l|mnoz))|mnozstvi/],
  ["fuel_price", /(phm.*(kc|cena|czk)|cena|castka|kc)/],
  ["other_price", /jine|ostatni/],
  ["purpose", /ucel|purpose|duvod/],
  ["description", /popis|poznamk|note/],
];

export function detectField(header: string): ImportField | null {
  const h = norm(header);
  if (!h) return null;
  for (const [f, re] of RULES) if (re.test(h)) return f;
  return null;
}

/** Find the header row (first row with ≥3 recognised columns, incl. a date). */
export function findHeader(rows: unknown[][]): { index: number; map: (ImportField | null)[] } | null {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const map = (rows[i] || []).map(c => detectField(String(c ?? "")));
    const used = new Set<ImportField>();
    const dedup = map.map(f => (f && !used.has(f) ? (used.add(f), f) : null));
    if (dedup.filter(Boolean).length >= 3 && dedup.includes("date")) return { index: i, map: dedup };
  }
  return null;
}

function toDate(v: unknown, year?: number): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !isNaN(v.getTime()))
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  return parseCzDate(String(v).trim(), year);
}

function toTime(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return `${String(v.getHours()).padStart(2, "0")}:${String(v.getMinutes()).padStart(2, "0")}`;
  if (typeof v === "number" && v >= 0 && v < 1) {
    const m = Math.round(v * 1440);
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }
  return parseTime(String(v).trim().slice(0, 5).replace(/\.$/, ""));
}

const num = (v: unknown) => (typeof v === "number" ? v : parseCzNumber(String(v ?? "")));
const int = (v: unknown) => { const n = num(v); return n == null ? null : Math.round(n); };

export function toPurposeType(v: unknown): "pracovne" | "soukrome" | "jine" {
  const s = norm(String(v ?? ""));
  if (/soukr|private|^s$/.test(s)) return "soukrome";
  if (/jine|other/.test(s)) return "jine";
  return "pracovne";
}

export interface ImportedTrip {
  date: string;
  time: string | null;
  break_minutes: number | null;
  driver_name: string | null;
  description: string | null;
  purpose: string | null;
  purpose_type: "pracovne" | "soukrome" | "jine";
  route_from: string | null;
  route_to: string | null;
  km_start: number | null;
  km_end: number | null;
  fuel_quantity: number | null;
  fuel_price: number | null;
  other_price: number | null;
}

export function parseTripRows(rows: unknown[][], fallbackYear?: number): { trips: ImportedTrip[]; skipped: number; header: boolean } {
  const h = findHeader(rows);
  if (!h) return { trips: [], skipped: 0, header: false };
  const trips: ImportedTrip[] = [];
  let skipped = 0;
  for (const row of rows.slice(h.index + 1)) {
    const g: Partial<Record<ImportField, unknown>> = {};
    h.map.forEach((f, i) => { if (f) g[f] = row?.[i]; });
    const date = toDate(g.date, fallbackYear);
    if (!date) { if ((row || []).some(c => c !== "" && c != null)) skipped++; continue; }
    let from = g.route_from ? String(g.route_from).trim() : null;
    let to = g.route_to ? String(g.route_to).trim() : null;
    if (!from && !to && g.route) {
      const parts = String(g.route).split(/\s+[–—-]\s+|\s*[–—]\s*/).map(s => s.trim()).filter(Boolean);
      from = parts[0] ?? null;
      to = parts.length > 1 ? parts.slice(1).join(" – ") : null;
    }
    let ks = int(g.km_start), ke = int(g.km_end);
    const kt = int(g.km_total);
    if (ks != null && ke == null && kt != null) ke = ks + kt;
    if (ke != null && ks == null && kt != null) ks = ke - kt;
    if (ks == null && ke == null && kt == null && !from && !to) { skipped++; continue; }
    trips.push({
      date,
      time: toTime(g.time),
      break_minutes: int(g.break_minutes),
      driver_name: g.driver ? String(g.driver).trim() || null : null,
      description: g.description ? String(g.description).trim() || null : null,
      purpose: g.purpose ? String(g.purpose).trim() || null : null,
      purpose_type: toPurposeType(g.purpose_type ?? g.purpose),
      route_from: from, route_to: to,
      km_start: ks, km_end: ke,
      fuel_quantity: num(g.fuel_quantity) || null,
      fuel_price: num(g.fuel_price) || null,
      other_price: num(g.other_price) || null,
    });
  }
  trips.sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")) || (a.km_start ?? 0) - (b.km_start ?? 0));
  return { trips, skipped, header: true };
}

/** Count places where a trip's start km doesn't match the previous trip's end km. */
export function countGaps(trips: ImportedTrip[]): number {
  let gaps = 0;
  for (let i = 1; i < trips.length; i++) {
    const p = trips[i - 1].km_end, c = trips[i].km_start;
    if (p != null && c != null && p !== c) gaps++;
  }
  return gaps;
}
