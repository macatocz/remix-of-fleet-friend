import { describe, it, expect } from "vitest";
import {
  checkAdvanceLimit,
  daysBetween,
  reservationHours,
  purposeTypeLabel,
  MAX_ADVANCE_DAYS,
  TRAVEL_ORDER_HOURS_THRESHOLD,
} from "@/lib/reservationRules";

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const inDays = (n: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return fmt(d);
};

describe("checkAdvanceLimit", () => {
  it("allows a reservation today", () => {
    expect(checkAdvanceLimit(inDays(0))).toBeNull();
  });

  it("allows the last day inside the window", () => {
    expect(checkAdvanceLimit(inDays(MAX_ADVANCE_DAYS))).toBeNull();
  });

  it("blocks a reservation beyond the window", () => {
    const err = checkAdvanceLimit(inDays(MAX_ADVANCE_DAYS + 1));
    expect(err).toBeTruthy();
    expect(err).toContain(String(MAX_ADVANCE_DAYS));
  });
});

describe("daysBetween", () => {
  it("includes both boundary days", () => {
    expect(daysBetween("2026-03-02", "2026-03-04")).toHaveLength(3);
  });

  it("returns a single day for equal dates", () => {
    expect(daysBetween("2026-03-02", "2026-03-02")).toHaveLength(1);
  });

  it("crosses month boundaries", () => {
    expect(daysBetween("2026-01-30", "2026-02-02")).toHaveLength(4);
  });
});

describe("reservationHours", () => {
  it("computes hours within one day", () => {
    expect(reservationHours("2026-03-02", "2026-03-02", "08:00", "17:00")).toBe(9);
  });

  it("uses defaults when times are missing", () => {
    expect(reservationHours("2026-03-02", "2026-03-02")).toBe(9);
  });

  it("never returns a negative value", () => {
    expect(reservationHours("2026-03-02", "2026-03-02", "17:00", "08:00")).toBe(0);
  });

  it("detects trips above the travel-order threshold", () => {
    const h = reservationHours("2026-03-02", "2026-03-02", "07:00", "16:00");
    expect(h > TRAVEL_ORDER_HOURS_THRESHOLD).toBe(true);
    const short = reservationHours("2026-03-02", "2026-03-02", "08:00", "11:00");
    expect(short > TRAVEL_ORDER_HOURS_THRESHOLD).toBe(false);
  });
});

describe("purposeTypeLabel", () => {
  it("maps known values", () => {
    expect(purposeTypeLabel("soukrome")).toBe("Soukromě");
    expect(purposeTypeLabel("jine")).toBe("Jiné");
  });

  it("falls back to work purpose", () => {
    expect(purposeTypeLabel(null)).toBe("Pracovně");
    expect(purposeTypeLabel("nonsense")).toBe("Pracovně");
  });
});