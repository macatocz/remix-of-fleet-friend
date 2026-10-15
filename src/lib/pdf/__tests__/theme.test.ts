import { beforeEach, describe, expect, it, vi } from "vitest";
import jsPDF from "jspdf";
import { applyPdfTheme, getPdfTheme } from "../theme";

describe("shared PDF print theme", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    const tokens = {
      primary: "200 33 39", foreground: "86 86 86", "muted-foreground": "118 118 118",
      background: "255 255 255", muted: "245 245 245", border: "220 220 220",
    };
    Object.entries(tokens).forEach(([role, value]) => document.documentElement.style.setProperty(`--pdf-${role}`, value));
  });

  it("uses exact brand colors and explicit readable table colors", () => {
    const { colors, table } = getPdfTheme();
    expect(colors.primary).toEqual([200, 33, 39]);
    expect(colors.foreground).toEqual([86, 86, 86]);
    expect(table.headStyles).toMatchObject({ fillColor: colors.primary, textColor: colors.background });
    expect(table.bodyStyles).toMatchObject({ fillColor: colors.background, textColor: colors.foreground });
    expect(table.alternateRowStyles).toEqual({ fillColor: colors.muted });
  });

  it("does not change with screen dark mode", () => {
    const light = getPdfTheme();
    document.documentElement.classList.add("dark");
    expect(getPdfTheme()).toEqual(light);
  });

  it("applies the shared text and line colors to a PDF document", () => {
    const doc = new jsPDF();
    const text = vi.spyOn(doc, "setTextColor");
    const draw = vi.spyOn(doc, "setDrawColor");
    applyPdfTheme(doc, getPdfTheme().colors);
    expect(text).toHaveBeenCalledWith(86, 86, 86);
    expect(draw).toHaveBeenCalledWith(220, 220, 220);
  });

  it("rejects missing print tokens rather than silently exporting wrong colors", () => {
    document.documentElement.style.removeProperty("--pdf-primary");
    expect(() => getPdfTheme()).toThrow("Invalid PDF color token: primary");
  });
});