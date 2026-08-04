import { supabase } from "@/integrations/supabase/client";

/** Maximální počet dní dopředu, na které lze rezervovat vozidlo. */
export const MAX_ADVANCE_DAYS = 21;

/** Měsíční limit soukromých rezervací na zaměstnance. */
export const PRIVATE_LIMIT_WEEKENDS = 1;
export const PRIVATE_LIMIT_WORKDAYS = 5;

export const PURPOSE_TYPES = [
  { value: "pracovne", label: "Pracovně" },
  { value: "soukrome", label: "Soukromě" },
  { value: "jine", label: "Jiné" },
] as const;

export type PurposeType = (typeof PURPOSE_TYPES)[number]["value"];

export const purposeTypeLabel = (v?: string | null) =>
  PURPOSE_TYPES.find((p) => p.value === v)?.label ?? "Pracovně";

function parseDate(d: string): Date {
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, m - 1, dd);
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Všechny dny v intervalu (včetně krajních). */
export function daysBetween(dateFrom: string, dateTo: string): Date[] {
  const out: Date[] = [];
  const start = parseDate(dateFrom);
  const end = parseDate(dateTo);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d));
  return out;
}

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** ISO číslo týdne — používáme pro počítání „víkendů". */
function weekKey(d: Date): string {
  const t = new Date(d);
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); // pondělí daného týdne
  return fmt(t);
}

/**
 * Kontrola, že rezervace nezačíná dál než MAX_ADVANCE_DAYS dopředu.
 * Vrací chybovou hlášku nebo null.
 */
export function checkAdvanceLimit(dateFrom: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + MAX_ADVANCE_DAYS);
  if (parseDate(dateFrom) > limit) {
    return `Rezervovat lze nejvýše ${MAX_ADVANCE_DAYS} dní dopředu (nejpozději ${limit.toLocaleDateString("cs-CZ")}).`;
  }
  return null;
}

export interface PrivateUsage {
  weekends: number;
  workdays: number;
}

/** Spočítá čerpání soukromých rezervací daného řidiče v měsíci data `anyDateInMonth`. */
export async function getPrivateUsage(
  driverName: string,
  anyDateInMonth: string,
  excludeId?: string
): Promise<PrivateUsage> {
  const ref = parseDate(anyDateInMonth);
  const monthStart = fmt(new Date(ref.getFullYear(), ref.getMonth(), 1));
  const monthEnd = fmt(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));

  let q = supabase
    .from("reservations")
    .select("id, date_from, date_to")
    .eq("driver_name", driverName)
    .eq("purpose_type", "soukrome")
    .in("status", ["čeká", "schváleno", "dokončeno"])
    .lte("date_from", monthEnd)
    .gte("date_to", monthStart);
  if (excludeId) q = q.neq("id", excludeId);

  const { data } = await q;
  const weekends = new Set<string>();
  let workdays = 0;
  (data || []).forEach((r: any) => {
    daysBetween(r.date_from, r.date_to).forEach((d) => {
      if (fmt(d) < monthStart || fmt(d) > monthEnd) return;
      if (isWeekend(d)) weekends.add(weekKey(d));
      else workdays += 1;
    });
  });
  return { weekends: weekends.size, workdays };
}

/**
 * Ověří měsíční limit soukromých rezervací pro nový/upravovaný záznam.
 * Vrací chybovou hlášku nebo null.
 */
export async function checkPrivateLimit(
  driverName: string,
  dateFrom: string,
  dateTo: string,
  excludeId?: string
): Promise<string | null> {
  const used = await getPrivateUsage(driverName, dateFrom, excludeId);

  const newWeekends = new Set<string>();
  let newWorkdays = 0;
  daysBetween(dateFrom, dateTo).forEach((d) => {
    if (isWeekend(d)) newWeekends.add(weekKey(d));
    else newWorkdays += 1;
  });

  if (used.weekends + newWeekends.size > PRIVATE_LIMIT_WEEKENDS) {
    return `Máte vyčerpaný měsíční limit soukromých víkendů (${PRIVATE_LIMIT_WEEKENDS} víkend / měsíc). Zkuste jiný termín.`;
  }
  if (used.workdays + newWorkdays > PRIVATE_LIMIT_WORKDAYS) {
    return `Máte vyčerpaný měsíční limit soukromých pracovních dní (využito ${used.workdays} z ${PRIVATE_LIMIT_WORKDAYS}).`;
  }
  return null;
}

/** Délka rezervace v hodinách (počítá se první den od–do). */
export function reservationHours(
  dateFrom: string,
  dateTo: string,
  timeFrom?: string | null,
  timeTo?: string | null
): number {
  const from = new Date(`${dateFrom}T${(timeFrom || "08:00").slice(0, 5)}:00`);
  const to = new Date(`${dateTo}T${(timeTo || "17:00").slice(0, 5)}:00`);
  return Math.max(0, (to.getTime() - from.getTime()) / 3_600_000);
}

/** Nad kolik hodin se má nabídnout / vyžádat cestovní příkaz. */
export const TRAVEL_ORDER_HOURS_THRESHOLD = 5;