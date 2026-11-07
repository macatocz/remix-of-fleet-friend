import { describe, it, expect } from "vitest";
import { parseTripRows, countGaps, detectField } from "@/lib/tripLog/importParser";

describe("trip log import", () => {
  it("detects Czech headers", () => {
    expect(detectField("Počáteční stav km")).toBe("km_start");
    expect(detectField("Konečný stav")).toBe("km_end");
    expect(detectField("Datum")).toBe("date");
  });
  it("splits combined route and computes end km from distance", () => {
    const { trips } = parseTripRows([
      ["Kniha jízd"],
      ["Datum", "Trasa", "Počáteční km", "Ujeto km", "Typ"],
      ["7.1.2026", "Praha – Brno", "12 047", "205", "Soukromě"],
    ]);
    expect(trips[0]).toMatchObject({ date: "2026-01-07", route_from: "Praha", route_to: "Brno", km_start: 12047, km_end: 12252, purpose_type: "soukrome" });
  });
  it("counts odometer gaps", () => {
    const { trips } = parseTripRows([
      ["Datum", "Odkud", "Kam", "Počáteční km", "Konečné km"],
      ["1.2.2026", "A", "B", "100", "150"],
      ["2.2.2026", "B", "C", "160", "200"],
    ]);
    expect(countGaps(trips)).toBe(1);
  });
});
