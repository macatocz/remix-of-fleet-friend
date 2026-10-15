/** Jednoduchý export tabulky do PDF s českým fontem. */
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
  doc.setFont(font, "bold");
  doc.setFontSize(16);
  doc.text(opts.title, 14, 16);
  doc.setFont(font, "normal");
  doc.setFontSize(10);
  let y = 23;
  if (opts.subtitle) { doc.text(opts.subtitle, 14, y); y += 6; }
  (opts.summary || []).forEach((s) => { doc.text(s, 14, y); y += 5; });
  autoTable(doc, {
    startY: y + 2,
    head: [opts.head],
    body: opts.body.map((r) => r.map(String)),
    styles: { font, fontSize: 8 },
    headStyles: { font, fontStyle: "bold", fillColor: [200, 33, 39] },
  });
  doc.save(opts.filename);
}
