import { describe, expect, it } from "vitest";
import {
  buildQuarterSummary, pctChange, previousQuarter, quarterRange, reservedDaysInRange, tripKm,
} from "../quarterly";

describe("quarterRange", () => {
  it("vrací hranice čtvrtletí", () => {
    expect(quarterRange(2026, 1)).toMatchObject({ from: "2026-01-01", to: "2026-03-31" });
    expect(quarterRange(2026, 4)).toMatchObject({ from: "2026-10-01", to: "2026-12-31" });
  });
  it("předchozí čtvrtletí přechází přes rok", () => {
    expect(previousQuarter(2026, 1)).toMatchObject({ year: 2025, quarter: 4 });
  });
});

describe("tripKm", () => {
  it("preferuje km_total", () => {
    expect(tripKm({ vehicle_id: "v", date: "2026-01-01", km_total: 120, km_start: 0, km_end: 0, fuel_quantity: null, fuel_price: null, other_price: null })).toBe(120);
  });
  it("dopočítá z tachometru", () => {
    expect(tripKm({ vehicle_id: "v", date: "2026-01-01", km_total: null, km_start: 1000, km_end: 1150, fuel_quantity: null, fuel_price: null, other_price: null })).toBe(150);
  });
});

describe("reservedDaysInRange", () => {
  it("ořízne na hranice období", () => {
    const d = reservedDaysInRange({ vehicle_id: "v", date_from: "2025-12-28", date_to: "2026-01-03", purpose_type: null, status: "schváleno" }, "2026-01-01", "2026-03-31");
    expect(d).toBe(3);
  });
});

describe("buildQuarterSummary", () => {
  const range = quarterRange(2026, 1);
  it("sečte km, náklady a vytížení", () => {
    const s = buildQuarterSummary(
      range,
      ["v1"],
      [{ vehicle_id: "v1", date: "2026-01-10", km_total: 200, km_start: null, km_end: null, fuel_quantity: 40, fuel_price: 35, other_price: 100 }],
      [{ vehicle_id: "v1", date: "2026-02-05", cost: 3000 }],
      [{ vehicle_id: "v1", date_from: "2026-01-10", date_to: "2026-01-11", purpose_type: "soukrome", status: "schváleno" }],
    );
    expect(s.km).toBe(200);
    expect(s.fuelCost).toBe(1500);
    expect(s.serviceCost).toBe(3000);
    expect(s.totalCost).toBe(4500);
    expect(s.costPerKm).toBeCloseTo(22.5);
    expect(s.privateDays).toBe(2);
    expect(s.byMonth).toHaveLength(3);
  });
  it("ignoruje zamítnuté rezervace", () => {
    const s = buildQuarterSummary(range, ["v1"], [], [], [
      { vehicle_id: "v1", date_from: "2026-01-10", date_to: "2026-01-11", purpose_type: "pracovni", status: "zamítnuto" },
    ]);
    expect(s.reservations).toBe(0);
  });
});

describe("pctChange", () => {
  it("počítá růst", () => expect(pctChange(150, 100)).toBe(50));
  it("nulový základ", () => expect(pctChange(10, 0)).toBeNull());
});
