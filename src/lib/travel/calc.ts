import { differenceInMinutes, parseISO } from "date-fns";

export type MealRates = { "5_12": number; "12_18": number; "18_plus": number };

export const DEFAULT_MEAL_RATES: MealRates = { "5_12": 166, "12_18": 252, "18_plus": 396 };
export const DEFAULT_KM_RATE = 5.85; // Kč/km základní náhrada
export const DEFAULT_FUEL_PRICE = 36.10; // Kč/l průměr

/** Sazba stravného podle počtu hodin v daném dni (ČR). */
export function mealAmountForHours(hours: number, rates: MealRates = DEFAULT_MEAL_RATES): number {
  if (hours < 5) return 0;
  if (hours <= 12) return rates["5_12"];
  if (hours <= 18) return rates["12_18"];
  return rates["18_plus"];
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