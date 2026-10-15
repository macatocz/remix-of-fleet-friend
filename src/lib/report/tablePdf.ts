/** Jednoduchý export tabulky do PDF s českým fontem. */
import { applyPdfTheme, getPdfTheme } from "@/lib/pdf/theme";

export async function exportTablePdf(opts: {
  title: string;
  subtitle?: string;
  summary?: string[];
  head: string[];
  body: (string | number)[][];
  filename: string;
}) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const { ensurePdfFont } = await import("@/lib/travel/pdfFont");
  const doc = new jsPDF({ orientation: "landscape" });
  const font = await ensurePdfFont(doc);
  const { colors, table } = getPdfTheme();
  applyPdfTheme(doc, colors);
  doc.setTextColor(...colors.primary);
  doc.setFont(font, "bold");
  doc.setFontSize(16);
  doc.text(opts.title, 14, 16);
  doc.setTextColor(...colors.foreground);
  doc.setFont(font, "normal");
  doc.setFontSize(10);
  let y = 23;
  if (opts.subtitle) { doc.text(opts.subtitle, 14, y); y += 6; }
  (opts.summary || []).forEach((s) => { doc.text(s, 14, y); y += 5; });
  autoTable(doc, {
    ...table,
    startY: y + 2,
    head: [opts.head],
    body: opts.body.map((r) => r.map(String)),
    styles: { ...table.styles, font, fontSize: 8 },
    headStyles: { ...table.headStyles, font, fontStyle: "bold" },
  });
  doc.save(opts.filename);
}
