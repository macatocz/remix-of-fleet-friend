import type jsPDF from "jspdf";
import type { UserOptions } from "jspdf-autotable";

type PdfColor = [number, number, number];

/** Fixed print tokens, inherited from :root even when the app is in dark mode. */
export function getPdfTheme() {
  const css = getComputedStyle(document.documentElement);
  const readColor = (role: string): PdfColor => {
    const channels = css.getPropertyValue(`--pdf-${role}`).trim().split(/\s+/).map(Number);
    if (channels.length !== 3 || channels.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
      throw new Error(`Invalid PDF color token: ${role}`);
    }
    return [channels[0], channels[1], channels[2]];
  };
  const colors = {
    primary: readColor("primary"),
    foreground: readColor("foreground"),
    mutedForeground: readColor("muted-foreground"),
    background: readColor("background"),
    muted: readColor("muted"),
    border: readColor("border"),
  };
  const table: UserOptions = {
    styles: { textColor: colors.foreground, lineColor: colors.border },
    headStyles: { fillColor: colors.primary, textColor: colors.background, lineColor: colors.primary },
    bodyStyles: { fillColor: colors.background, textColor: colors.foreground },
    alternateRowStyles: { fillColor: colors.muted },
    footStyles: { fillColor: colors.muted, textColor: colors.foreground, lineColor: colors.border },
  };
  return { colors, table };
}

export function applyPdfTheme(doc: jsPDF, colors: ReturnType<typeof getPdfTheme>["colors"]) {
  doc.setTextColor(...colors.foreground);
  doc.setDrawColor(...colors.border);
}