import { describe, it, expect } from "vitest";
import { auditTrips, czechHolidays } from "@/lib/tripLog/audit";

describe("kontrola knihy jízd", () => {
  it("služební jízda v sobotu je upozornění", () => {
    const r = auditTrips([{ date: "2026-11-07", purpose_type: "pracovne", km_total: 10 }]);
    expect(r.map((i) => i.kind)).toEqual(["weekend"]);
  });
  it("soukromá jízda o víkendu není upozornění", () => {
    expect(auditTrips([{ date: "2026-11-07", purpose_type: "soukrome", km_total: 10 }])).toHaveLength(0);
  });
  it("17. listopad a Velký pátek 2026 jsou svátky", () => {
    const h = czechHolidays(2026);
    expect(h.has("2026-11-17")).toBe(true);
    expect(h.has("2026-04-03")).toBe(true);
  });
  it("rychlost nad 130 km/h", () => {
    const r = auditTrips([
      { date: "2026-11-09", time: "08:00", km_start: 0, km_end: 300, km_total: 300 },
      { date: "2026-11-09", time: "09:30", km_start: 300, km_end: 310, km_total: 10 },
    ]);
    expect(r.some((i) => i.kind === "speed")).toBe(true);
  });
  it("nenavazující tachometr", () => {
    const r = auditTrips([
      { date: "2026-11-09", km_start: 0, km_end: 100 },
      { date: "2026-11-10", km_start: 150, km_end: 200 },
    ]);
    expect(r.filter((i) => i.kind === "odometer_gap")).toHaveLength(1);
  });
  it("tankování v neděli bez jízdy", () => {
    const r = auditTrips([], [{ fueled_at: "2026-11-08T10:00:00Z" }]);
    expect(r[0].kind).toBe("weekend_fuel");
  });
});
