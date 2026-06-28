import { differenceInMinutes, parseISO } from "date-fns";

export type MealRates = { "5_12": number; "12_18": number; "18_plus": number };

/**
 * Sazby tuzemského stravného podle vyhlášky MF ČR — horní hranice pro státní sféru
 * (firmy běžně používají horní hranici; minimum je v zákoníku práce).
 * Hodnoty pro nové roky doplňuj po vydání vyhlášky (obvykle prosinec předchozího roku).
 */
export const MEAL_RATES_BY_YEAR: Record<number, MealRates> = {
  2024: { "5_12": 140, "12_18": 212, "18_plus": 333 },
  2025: { "5_12": 166, "12_18": 252, "18_plus": 396 },
  2026: { "5_12": 166, "12_18": 252, "18_plus": 396 }, // POZOR: dočasně = 2025, doplň po vydání vyhlášky MF ČR pro rok 2026
};

/** Průměrná cena PHM (Natural 95) podle vyhlášky MF ČR — Kč/l. */
export const FUEL_PRICE_BY_YEAR: Record<number, number> = {
  2024: 38.20,
  2025: 36.10,
  2026: 36.10, // POZOR: dočasně = 2025
};

/** Sazba základní náhrady za 1 km u osobních vozidel — Kč/km. */
export const KM_RATE_BY_YEAR: Record<number, number> = {
  2024: 5.60,
  2025: 5.85,
  2026: 5.85, // POZOR: dočasně = 2025
};

export const LATEST_YEAR = Math.max(...Object.keys(MEAL_RATES_BY_YEAR).map(Number));

/** Zpětná kompatibilita — defaulty pro aktuální rok. */
export const DEFAULT_MEAL_RATES: MealRates = MEAL_RATES_BY_YEAR[LATEST_YEAR];
export const DEFAULT_KM_RATE = KM_RATE_BY_YEAR[LATEST_YEAR];
export const DEFAULT_FUEL_PRICE = FUEL_PRICE_BY_YEAR[LATEST_YEAR];

function yearFromDate(d?: string | number): number {
  if (!d) return LATEST_YEAR;
  if (typeof d === "number") return d;
  const y = parseInt(String(d).slice(0, 4), 10);
  return isNaN(y) ? LATEST_YEAR : y;
}

/** Vrátí sazby tuzemského stravného platné pro daný rok (s případným firemním override). */
export function getMealRates(date?: string | number, override?: Record<string, MealRates> | null): MealRates {
  const y = yearFromDate(date);
  if (override && override[y]) return override[y];
  return MEAL_RATES_BY_YEAR[y] || MEAL_RATES_BY_YEAR[LATEST_YEAR];
}

export function getFuelPrice(date?: string | number, override?: Record<string, number> | null): number {
  const y = yearFromDate(date);
  if (override && override[y] != null) return override[y];
  return FUEL_PRICE_BY_YEAR[y] ?? FUEL_PRICE_BY_YEAR[LATEST_YEAR];
}

export function getKmRate(date?: string | number, override?: Record<string, number> | null): number {
  const y = yearFromDate(date);
  if (override && override[y] != null) return override[y];
  return KM_RATE_BY_YEAR[y] ?? KM_RATE_BY_YEAR[LATEST_YEAR];
}

/**
 * Sazby zahraničního stravného podle vyhlášky MF ČR (orientační, plná denní sazba).
 * Pásma: 1–12 h = 1/3, 12–18 h = 2/3, 18+ h = plná sazba.
 */
export type ForeignMealRate = { currency: string; full: number };

/** Zahraniční stravné po letech. Doplň po vydání nové vyhlášky MF ČR. */
export const FOREIGN_MEAL_RATES_BY_YEAR: Record<number, Record<string, ForeignMealRate>> = {
  2025: {
    SK: { currency: "EUR", full: 40 }, AT: { currency: "EUR", full: 50 },
    DE: { currency: "EUR", full: 50 }, PL: { currency: "EUR", full: 40 },
    HU: { currency: "EUR", full: 40 }, IT: { currency: "EUR", full: 50 },
    FR: { currency: "EUR", full: 50 }, CH: { currency: "CHF", full: 75 },
    GB: { currency: "GBP", full: 45 }, US: { currency: "USD", full: 60 },
    NL: { currency: "EUR", full: 50 }, BE: { currency: "EUR", full: 50 },
    ES: { currency: "EUR", full: 50 },
  },
  2026: {
    SK: { currency: "EUR", full: 40 }, AT: { currency: "EUR", full: 50 },
    DE: { currency: "EUR", full: 50 }, PL: { currency: "EUR", full: 40 },
    HU: { currency: "EUR", full: 40 }, IT: { currency: "EUR", full: 50 },
    FR: { currency: "EUR", full: 50 }, CH: { currency: "CHF", full: 75 },
    GB: { currency: "GBP", full: 45 }, US: { currency: "USD", full: 60 },
    NL: { currency: "EUR", full: 50 }, BE: { currency: "EUR", full: 50 },
    ES: { currency: "EUR", full: 50 },
  },
};

/** Zpětná kompatibilita. */
export const FOREIGN_MEAL_RATES = FOREIGN_MEAL_RATES_BY_YEAR[LATEST_YEAR];

export function getForeignMealRate(
  country: string,
  date?: string | number,
  override?: Record<string, Record<string, ForeignMealRate>> | null,
): ForeignMealRate | undefined {
  const y = yearFromDate(date);
  if (override && override[y] && override[y][country]) return override[y][country];
  return (FOREIGN_MEAL_RATES_BY_YEAR[y] || FOREIGN_MEAL_RATES_BY_YEAR[LATEST_YEAR])[country];
}

export function isForeignCountry(country: string, date?: string | number): boolean {
  return country !== "CZ" && !!getForeignMealRate(country, date);
}

/** Sazba stravného podle počtu hodin v daném dni (ČR). */
export function mealAmountForHours(hours: number, ratesOrDate?: MealRates | string): number {
  const rates: MealRates =
    !ratesOrDate ? getMealRates()
    : typeof ratesOrDate === "string" ? getMealRates(ratesOrDate)
    : ratesOrDate;
  if (hours < 5) return 0;
  if (hours <= 12) return rates["5_12"];
  if (hours <= 18) return rates["12_18"];
  return rates["18_plus"];
}

/**
 * Zahraniční stravné: pásma 1–12 / 12–18 / 18+ hodin, plná sazba × 1/3, 2/3, 1.
 * Vrací { amount, currency } v měně dané země.
 */
export function mealAmountForeign(country: string, hours: number, date?: string): { amount: number; currency: string } {
  const rate = getForeignMealRate(country, date);
  if (!rate || hours < 1) return { amount: 0, currency: rate?.currency || "EUR" };
  let factor = 0;
  if (hours <= 12) factor = 1 / 3;
  else if (hours <= 18) factor = 2 / 3;
  else factor = 1;
  return { amount: Math.round(rate.full * factor * 100) / 100, currency: rate.currency };
}

/** Vypočte kapesné = stravné × procento / 100 (zaokr. na 2 des. místa). */
export function pocketMoneyAmount(mealAmount: number, pct: number): number {
  return Math.round((mealAmount * (pct || 0)) / 100 * 100) / 100;
}

/** Náhrada za vlastní vozidlo: km × (sazba + spotřeba/100 × cena PHM). */
export function vehicleReimbursement(
  km: number,
  consumptionPer100km: number,
  fuelPrice?: number,
  kmRate?: number,
  date?: string,
): number {
  const fp = fuelPrice ?? getFuelPrice(date);
  const kr = kmRate ?? getKmRate(date);
  const fuelPart = (consumptionPer100km / 100) * fp;
  return Math.round((km * (kr + fuelPart)) * 100) / 100;
}

export function hoursBetween(dateFrom: string, timeFrom: string, dateTo: string, timeTo: string): number {
  try {
    const from = parseISO(`${dateFrom}T${timeFrom || "00:00"}`);
    const to = parseISO(`${dateTo}T${timeTo || "00:00"}`);
    return Math.max(0, differenceInMinutes(to, from) / 60);
  } catch {
    return 0;
  }
}

export function formatCZK(n: number): string {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 2 }).format(n || 0);
}

export function formatCurrency(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("cs-CZ", { style: "currency", currency, maximumFractionDigits: 2 }).format(n || 0);
  } catch {
    return `${(n || 0).toFixed(2)} ${currency}`;
  }
}

export const COUNTRY_TIMEZONES: Record<string, string> = {
  CZ: "Europe/Prague", SK: "Europe/Bratislava", AT: "Europe/Vienna",
  DE: "Europe/Berlin", PL: "Europe/Warsaw", HU: "Europe/Budapest",
  IT: "Europe/Rome", FR: "Europe/Paris", CH: "Europe/Zurich",
  GB: "Europe/London", NL: "Europe/Amsterdam", BE: "Europe/Brussels",
  ES: "Europe/Madrid", US: "America/New_York",
};