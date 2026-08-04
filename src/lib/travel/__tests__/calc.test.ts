import { describe, it, expect } from "vitest";
import {
  MEAL_RATES_BY_YEAR,
  getMealRates,
  getFuelPrice,
  getKmRate,
  mealAmountForHours,
  mealAmountForeign,
  pocketMoneyAmount,
  vehicleReimbursement,
  hoursBetween,
  isForeignCountry,
} from "@/lib/travel/calc";

describe("rate lookup by year", () => {
  it("returns 2026 domestic meal rates", () => {
    expect(getMealRates("2026-03-01")).toEqual({ "5_12": 155, "12_18": 236, "18_plus": 370 });
  });

  it("returns 2025 rates for 2025 dates", () => {
    expect(getMealRates("2025-06-15")).toEqual(MEAL_RATES_BY_YEAR[2025]);
  });

  it("honours a company override", () => {
    const override = { 2026: { "5_12": 200, "12_18": 300, "18_plus": 400 } };
    expect(getMealRates("2026-01-01", override)["5_12"]).toBe(200);
  });

  it("returns fuel price and km rate for 2026", () => {
    expect(getFuelPrice("2026-02-02")).toBe(34.7);
    expect(getKmRate("2026-02-02")).toBe(5.9);
  });
});

describe("mealAmountForHours", () => {
  it("pays nothing under 5 hours", () => {
    expect(mealAmountForHours(4.9, "2026-01-01")).toBe(0);
  });

  it("uses the 5–12 h tier", () => {
    expect(mealAmountForHours(5, "2026-01-01")).toBe(155);
    expect(mealAmountForHours(12, "2026-01-01")).toBe(155);
  });

  it("uses the 12–18 h tier", () => {
    expect(mealAmountForHours(12.5, "2026-01-01")).toBe(236);
  });

  it("uses the 18+ h tier", () => {
    expect(mealAmountForHours(20, "2026-01-01")).toBe(370);
  });
});

describe("mealAmountForeign", () => {
  it("returns zero below 1 hour", () => {
    expect(mealAmountForeign("DE", 0.5, "2026-01-01").amount).toBe(0);
  });

  it("applies 1/3, 2/3 and full tiers", () => {
    const third = mealAmountForeign("DE", 6, "2026-01-01");
    const twoThirds = mealAmountForeign("DE", 15, "2026-01-01");
    const full = mealAmountForeign("DE", 20, "2026-01-01");
    expect(third.amount).toBeGreaterThan(0);
    expect(twoThirds.amount).toBeGreaterThan(third.amount);
    expect(full.amount).toBeGreaterThan(twoThirds.amount);
    expect(full.currency).toBe("EUR");
  });

  it("recognises foreign countries", () => {
    expect(isForeignCountry("CZ", "2026-01-01")).toBe(false);
    expect(isForeignCountry("DE", "2026-01-01")).toBe(true);
  });
});

describe("pocketMoneyAmount", () => {
  it("computes a percentage of the meal allowance", () => {
    expect(pocketMoneyAmount(45, 40)).toBe(18);
  });

  it("returns zero for a missing percentage", () => {
    expect(pocketMoneyAmount(45, 0)).toBe(0);
  });
});

describe("vehicleReimbursement", () => {
  it("adds the basic rate and fuel consumption", () => {
    // 100 km, 6 l/100 km, 30 Kč/l, 5 Kč/km => 100 * (5 + 1.8) = 680
    expect(vehicleReimbursement(100, 6, 30, 5)).toBe(680);
  });

  it("falls back to yearly rates", () => {
    const v = vehicleReimbursement(100, 6, undefined, undefined, "2026-01-01");
    expect(v).toBeCloseTo(100 * (5.9 + (6 / 100) * 34.7), 2);
  });
});

describe("hoursBetween", () => {
  it("computes hours across days", () => {
    expect(hoursBetween("2026-03-01", "08:00", "2026-03-02", "08:00")).toBe(24);
  });

  it("clamps negative ranges to zero", () => {
    expect(hoursBetween("2026-03-02", "08:00", "2026-03-01", "08:00")).toBe(0);
  });
});