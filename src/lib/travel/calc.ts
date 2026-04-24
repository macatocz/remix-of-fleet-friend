import { differenceInMinutes, parseISO } from "date-fns";

export type MealRates = { "5_12": number; "12_18": number; "18_plus": number };

export const DEFAULT_MEAL_RATES: MealRates = { "5_12": 166, "12_18": 252, "18_plus": 396 };
export const DEFAULT_KM_RATE = 5.85; // Kč/km základní náhrada
export const DEFAULT_FUEL_PRICE = 36.10; // Kč/l průměr

/**
 * Sazby zahraničního stravného podle vyhlášky MF ČR (orientační, plná denní sazba).
 * Pásma: 1–12 h = 1/3, 12–18 h = 2/3, 18+ h = plná sazba.
 */
export type ForeignMealRate = { currency: string; full: number };
export const FOREIGN_MEAL_RATES: Record<string, ForeignMealRate> = {
  SK: { currency: "EUR", full: 40 },
  AT: { currency: "EUR", full: 50 },
  DE: { currency: "EUR", full: 50 },
  PL: { currency: "EUR", full: 40 },
  HU: { currency: "EUR", full: 40 },
  IT: { currency: "EUR", full: 50 },
  FR: { currency: "EUR", full: 50 },
  CH: { currency: "CHF", full: 75 },
  GB: { currency: "GBP", full: 45 },
  US: { currency: "USD", full: 60 },
  NL: { currency: "EUR", full: 50 },
  BE: { currency: "EUR", full: 50 },
  ES: { currency: "EUR", full: 50 },
};

export function isForeignCountry(country: string): boolean {
  return country !== "CZ" && !!FOREIGN_MEAL_RATES[country];
}

/** Sazba stravného podle počtu hodin v daném dni (ČR). */
export function mealAmountForHours(hours: number, rates: MealRates = DEFAULT_MEAL_RATES): number {
  if (hours < 5) return 0;
  if (hours <= 12) return rates["5_12"];
  if (hours <= 18) return rates["12_18"];
  return rates["18_plus"];
}

/**
 * Zahraniční stravné: pásma 1–12 / 12–18 / 18+ hodin, plná sazba × 1/3, 2/3, 1.
 * Vrací { amount, currency } v měně dané země.
 */
export function mealAmountForeign(country: string, hours: number): { amount: number; currency: string } {
  const rate = FOREIGN_MEAL_RATES[country];
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
  fuelPrice: number = DEFAULT_FUEL_PRICE,
  kmRate: number = DEFAULT_KM_RATE,
): number {
  const fuelPart = (consumptionPer100km / 100) * fuelPrice;
  return Math.round((km * (kmRate + fuelPart)) * 100) / 100;
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