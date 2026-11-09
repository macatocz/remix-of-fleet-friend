/** Kontrola knihy jízd před exportem – jen upozorňuje, nic neopravuje. */
export interface AuditTrip {
  id?: string;
  date: string; // YYYY-MM-DD
  time?: string | null; // HH:MM[:SS]
  km_start?: number | null;
  km_end?: number | null;
  km_total?: number | null;
  purpose_type?: string | null;
  break_minutes?: number | null;
}
export interface AuditFuel { fueled_at: string; liters?: number | null; location?: string | null }
export type AuditKind = "weekend" | "holiday" | "speed" | "odometer_gap" | "weekend_fuel";
export interface AuditIssue { kind: AuditKind; date: string; message: string; tripId?: string }

export const MAX_AVG_SPEED = 130;

function easterSunday(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, month - 1, day));
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** České státní svátky pro daný rok (YYYY-MM-DD). */
export function czechHolidays(y: number): Set<string> {
  const fixed = ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"];
  const s = new Set(fixed.map((md) => `${y}-${md}`));
  const easter = easterSunday(y);
  s.add(iso(new Date(easter.getTime() - 2 * 86400000))); // Velký pátek
  s.add(iso(new Date(easter.getTime() + 86400000))); // Velikonoční pondělí
  return s;
}

const dow = (date: string) => new Date(date + "T00:00:00Z").getUTCDay();
const isWeekend = (date: string) => { const d = dow(date); return d === 0 || d === 6; };
const toMin = (t?: string | null) => { if (!t) return null; const [h, m] = t.split(":").map(Number); return Number.isFinite(h) ? h * 60 + (m || 0) : null; };
const fmt = (date: string) => new Date(date + "T00:00:00").toLocaleDateString("cs-CZ");
const km = (t: AuditTrip) => t.km_total ?? (t.km_end != null && t.km_start != null ? t.km_end - t.km_start : 0);

export function auditTrips(trips: AuditTrip[], fuel: AuditFuel[] = []): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const sorted = [...trips].sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
  const holidayCache = new Map<number, Set<string>>();
  const isHoliday = (date: string) => {
    const y = Number(date.slice(0, 4));
    if (!holidayCache.has(y)) holidayCache.set(y, czechHolidays(y));
    return holidayCache.get(y)!.has(date);
  };

  sorted.forEach((t, i) => {
    const business = (t.purpose_type || "pracovne") === "pracovne";
    if (business && isHoliday(t.date)) issues.push({ kind: "holiday", date: t.date, tripId: t.id, message: `Služební jízda ve státní svátek (${fmt(t.date)})` });
    else if (business && isWeekend(t.date)) issues.push({ kind: "weekend", date: t.date, tripId: t.id, message: `Služební jízda o víkendu (${fmt(t.date)})` });

    const next = sorted[i + 1];
    if (next && next.date === t.date) {
      const a = toMin(t.time), b = toMin(next.time);
      if (a != null && b != null && b > a) {
        const hours = Math.max(b - a - (t.break_minutes || 0), 1) / 60;
        const speed = km(t) / hours;
        if (speed > MAX_AVG_SPEED) issues.push({ kind: "speed", date: t.date, tripId: t.id, message: `Nereálná průměrná rychlost ${Math.round(speed)} km/h (${km(t)} km, ${fmt(t.date)})` });
      }
    }
    if (next && t.km_end != null && next.km_start != null && next.km_start !== t.km_end) {
      issues.push({ kind: "odometer_gap", date: next.date, tripId: next.id, message: `Tachometr nenavazuje: ${t.km_end} → ${next.km_start} km (${next.km_start - t.km_end > 0 ? "+" : ""}${next.km_start - t.km_end} km, ${fmt(next.date)})` });
    }
  });

  const tripDays = new Set(trips.map((t) => t.date));
  fuel.forEach((f) => {
    const d = f.fueled_at.slice(0, 10);
    if (isWeekend(d) && !tripDays.has(d)) issues.push({ kind: "weekend_fuel", date: d, message: `Tankování o víkendu bez jízdy v ten den (${fmt(d)}${f.location ? ", " + f.location : ""})` });
  });
  return issues.sort((a, b) => a.date.localeCompare(b.date));
}
