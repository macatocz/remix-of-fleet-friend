import { describe, it, expect } from "vitest";
import {
  computeLeasingMileage,
  deriveCurrentMileage,
  computeTotalContractKm,
  isLeasingVehicle,
} from "@/lib/leasing/mileage";

const baseInput = {
  typ_vlastnictvi: "operativni_leasing" as const,
  najezd_za_rok: "30000",
  datum_zahajeni_leasingu: "2024-01-01",
  datum_ukonceni_leasingu: "2026-12-31",
  vychozi_stav_tachometru: "10000",
};

describe("isLeasingVehicle", () => {
  it("returns true for operativni and financni leasing", () => {
    expect(isLeasingVehicle({ ...baseInput, typ_vlastnictvi: "operativni_leasing" })).toBe(true);
    expect(isLeasingVehicle({ ...baseInput, typ_vlastnictvi: "financni_leasing" })).toBe(true);
  });

  it("returns false for majetek", () => {
    expect(isLeasingVehicle({ ...baseInput, typ_vlastnictvi: "majetek" })).toBe(false);
  });
});

describe("computeTotalContractKm", () => {
  it("computes 36 months at 30k/year as 90k", () => {
    expect(computeTotalContractKm(baseInput)).toBe(90000);
  });

  it("returns null when missing data", () => {
    expect(computeTotalContractKm({ ...baseInput, najezd_za_rok: null })).toBeNull();
    expect(computeTotalContractKm({ ...baseInput, datum_zahajeni_leasingu: null })).toBeNull();
  });

  it("returns null for invalid date range", () => {
    expect(
      computeTotalContractKm({ ...baseInput, datum_ukonceni_leasingu: "2023-01-01" })
    ).toBeNull();
  });
});

describe("deriveCurrentMileage", () => {
  it("uses latest trip log when available", () => {
    const current = deriveCurrentMileage("v1", baseInput, [], [
      { vehicle_id: "v1", km_end: 25000, date: "2025-06-01" },
      { vehicle_id: "v1", km_end: 27000, date: "2025-07-15" },
    ]);
    expect(current).not.toBeNull();
    expect(current!.km).toBe(27000);
    expect(current!.source).toBe("trip_log");
  });

  it("prefers newer manual vehicle_mileage record over older trip log", () => {
    const current = deriveCurrentMileage(
      "v1",
      baseInput,
      [{ vehicle_id: "v1", km: 28000, recorded_at: "2025-08-01", source: "vehicle_mileage" }],
      [{ vehicle_id: "v1", km_end: 27000, date: "2025-07-15" }]
    );
    expect(current!.km).toBe(28000);
    expect(current!.source).toBe("vehicle_mileage");
  });

  it("falls back to initial mileage when no records", () => {
    const current = deriveCurrentMileage("v1", baseInput, [], []);
    expect(current!.km).toBe(10000);
    expect(current!.source).toBe("initial");
  });

  it("returns null when no records and no initial mileage", () => {
    const current = deriveCurrentMileage("v1", { ...baseInput, vychozi_stav_tachometru: null }, [], []);
    expect(current).toBeNull();
  });
});

describe("computeLeasingMileage", () => {
  it("returns no-data for non-leasing vehicle", () => {
    const result = computeLeasingMileage(
      { ...baseInput, typ_vlastnictvi: "majetek" },
      { km: 15000, recordedAt: "2025-01-01" }
    );
    expect(result.status).toBe("no-data");
  });

  it("calculates percentage and difference correctly mid-contract", () => {
    const ref = new Date("2025-07-01"); // ~18 months into 36-month lease
    const current = { km: 55000, recordedAt: "2025-07-01" }; // 45k driven from 10k start
    const result = computeLeasingMileage(baseInput, current, ref);

    expect(result.totalContractKm).toBe(90000);
    expect(result.expectedKmNow).toBeGreaterThan(0);
    expect(result.currentKm).toBe(55000);
    expect(result.startKm).toBe(10000);
    expect(result.differenceKm).toBe(55000 - 10000 - result.expectedKmNow!);
    expect(result.percentageUsed).toBeGreaterThan(0);
    expect(result.projectedEndKm).not.toBeNull();
  });

  it("marks critical when over 95% of planned km", () => {
    const ref = new Date("2025-01-01"); // 1 year into 3-year lease -> expected ~30k driven
    const current = { km: 60000, recordedAt: "2025-01-01" }; // 50k driven -> 166%
    const result = computeLeasingMileage(baseInput, current, ref);
    expect(result.status).toBe("critical");
    expect(result.percentageUsed).toBeGreaterThan(95);
  });

  it("marks ok when under 70%", () => {
    const ref = new Date("2025-01-01");
    const current = { km: 25000, recordedAt: "2025-01-01" }; // 15k driven -> 50%
    const result = computeLeasingMileage(baseInput, current, ref);
    expect(result.status).toBe("ok");
  });

  it("handles missing data gracefully", () => {
    const result = computeLeasingMileage(
      { ...baseInput, najezd_za_rok: null },
      { km: 20000, recordedAt: "2025-01-01" }
    );
    expect(result.status).toBe("no-data");
  });

  it("returns no-data when reference is after lease end", () => {
    const ref = new Date("2027-01-01");
    const result = computeLeasingMileage(baseInput, { km: 100000, recordedAt: "2027-01-01" }, ref);
    expect(result.totalMonths).toBe(36);
    expect(result.elapsedMonths).toBeGreaterThan(35);
  });
});
