import jsPDF from "jspdf";
import QRCode from "qrcode";
import { ensurePdfFont, PDF_FONT } from "@/lib/travel/pdfFont";
import { vehicleLabel } from "@/lib/vehicleName";
import { applyPdfTheme, getPdfTheme } from "@/lib/pdf/theme";

export interface VehicleCardData {
  id: string;
  nazev_vozu?: string | null;
  znacka?: string | null;
  rz?: string | null;
  vin?: string | null;
  kategorie?: string | null;
  lokalita?: string | null;
  status?: string | null;
  spravce?: string | null;
  hlavni_uzivatel?: string | null;
  typ_vlastnictvi?: string | null;
  leasingova_spolecnost?: string | null;
  datum_ukonceni_leasingu?: string | null;
  stk?: string | null;
  dalnicni_znamka?: string | null;
  zelena_karta?: string | null;
  misto_uskladneni_pneu?: string | null;
  nahradni_klic?: string | null;
  parkovaci_stani?: string | null;
  lekarnicka?: string | null;
  poznamky?: string | null;
}

export interface VehicleCardExtras {
  spravceContact?: string | null;
  stkValidUntil?: string | null;
  insurance?: { insurer?: string | null; type?: string | null; valid_until?: string | null }[];
  currentKm?: number | null;
  publicUrl?: string | null;
}

const cs = (d?: string | null) => {

  if (!d) return "—";
  const t = Date.parse(d);
  return isNaN(t) ? d : new Date(t).toLocaleDateString("cs-CZ");
};
const val = (v?: string | number | null) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const qrDataUrl = (vehicleId: string, publicUrl?: string | null) => {
  const base = (publicUrl || window.location.origin).replace(/\/$/, "");
  return QRCode.toDataURL(`${base}/m/vozidla/${vehicleId}`, { width: 320, margin: 1 });
};



const CATEGORY: Record<string, string> = {
  A: "A – Ředitel",
  B: "B – Management",
  C: "C – Konzultant",
  D: "D – Referent",
};

/** A4 karta vozidla s QR kódem pro rychlé otevření v mobilu. */
export async function generateVehicleCardPdf(v: VehicleCardData, extras: VehicleCardExtras = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensurePdfFont(doc);
  const { colors } = getPdfTheme();
  applyPdfTheme(doc, colors);
  const W = 210;
  const M = 15;
  let y = 18;

  const title = v.nazev_vozu || v.znacka || "Vozidlo";
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...colors.primary);
  doc.text(title, M, y);
  y += 7;
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(11);
  doc.setTextColor(...colors.mutedForeground);
  doc.text(`${val(v.rz)}   ·   ${val(v.znacka)}`, M, y);
  doc.setTextColor(...colors.foreground);
  y += 6;
  doc.setDrawColor(...colors.border);
  doc.line(M, y, W - M, y);

  // QR vpravo nahoře
  try {
    const qr = await qrDataUrl(v.id, extras.publicUrl);
    doc.addImage(qr, "PNG", W - M - 34, 12, 34, 34);
    doc.setFontSize(7);
    doc.setTextColor(...colors.mutedForeground);
    doc.text("Naskenujte pro kartu vozu", W - M - 34, 49);
    doc.setTextColor(...colors.foreground);
  } catch { /* QR je nepovinné */ }


  y += 10;

  const section = (label: string) => {
    if (y > 262) { doc.addPage(); y = 20; }
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.primary);
    doc.text(label, M, y);
    doc.setTextColor(...colors.foreground);
    y += 2;
    doc.setDrawColor(...colors.border);
    doc.line(M, y, W - M, y);
    y += 5;
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(10);
  };

  const rows = (pairs: [string, string][]) => {
    const colW = (W - 2 * M) / 2;
    pairs.forEach((p, i) => {
      const col = i % 2;
      if (col === 0 && y > 272) { doc.addPage(); y = 20; }
      const x = M + col * colW;
      doc.setTextColor(...colors.mutedForeground);
      doc.setFontSize(8);
      doc.text(p[0], x, y);
      doc.setTextColor(...colors.foreground);
      doc.setFontSize(10);
      doc.text(doc.splitTextToSize(p[1], colW - 4)[0] ?? "—", x, y + 4.5);
      if (col === 1 || i === pairs.length - 1) y += 11;
    });
    y += 3;
  };

  section("Základní údaje");
  rows([
    ["Kategorie", v.kategorie ? CATEGORY[v.kategorie] || v.kategorie : "—"],
    ["Stav", val(v.status)],
    ["Lokalita", val(v.lokalita)],
    ["VIN", val(v.vin)],
    ["Správce", val(v.spravce)],
    ["Kontakt na správce", val(extras.spravceContact)],
    ["Hlavní uživatel", val(v.hlavni_uzivatel)],
    ["Stav tachometru", extras.currentKm ? `${extras.currentKm.toLocaleString("cs-CZ")} km` : "—"],
  ]);

  section("Vlastnictví a leasing");
  rows([
    ["Typ vlastnictví", val(v.typ_vlastnictvi)],
    ["Leasingová společnost", val(v.leasingova_spolecnost)],
    ["Konec leasingu", cs(v.datum_ukonceni_leasingu)],
  ]);

  section("Platnosti");
  const ins = extras.insurance || [];
  rows([
    ["STK do", cs(extras.stkValidUntil || v.stk)],
    ["Dálniční známka", val(v.dalnicni_znamka)],
    ["Zelená karta", val(v.zelena_karta)],
    ...(ins.length
      ? (ins.map((i) => [
          `Pojištění – ${i.type || "?"} (${i.insurer || "?"})`,
          cs(i.valid_until),
        ]) as [string, string][])
      : ([["Pojištění", "—"]] as [string, string][])),
  ]);

  section("Výbava a provoz");
  rows([
    ["Uskladnění pneu", val(v.misto_uskladneni_pneu)],
    ["Náhradní klíč", val(v.nahradni_klic)],
    ["Parkovací stání", val(v.parkovaci_stani)],
    ["Lékárnička", val(v.lekarnicka)],
  ]);

  if (v.poznamky) {
    section("Poznámky");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(v.poznamky, W - 2 * M), M, y);
  }

  doc.setFontSize(7);
  doc.setTextColor(...colors.mutedForeground);
  doc.text(`Vytištěno ${new Date().toLocaleString("cs-CZ")}`, M, 288);
  doc.save(`karta-vozidla-${(v.rz || v.id).replace(/\s+/g, "-")}.pdf`);
}

/** Mřížka QR kódů vybraných vozidel pro tisk a nalepení do vozů. */
export async function generateQrSheetPdf(
  vehicles: { id: string; nazev_vozu?: string | null; znacka?: string | null; rz?: string | null }[],
  publicUrl?: string | null
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensurePdfFont(doc);
  const { colors } = getPdfTheme();
  applyPdfTheme(doc, colors);
  const M = 15;
  const cols = 3;
  const rowsPerPage = 4;
  const cellW = (210 - 2 * M) / cols;
  const cellH = (297 - 2 * M - 10) / rowsPerPage;


  for (let i = 0; i < vehicles.length; i++) {
    const idx = i % (cols * rowsPerPage);
    if (i > 0 && idx === 0) doc.addPage();
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = M + col * cellW;
    const y = M + 8 + row * cellH;
    const v = vehicles[i];

    doc.setDrawColor(...colors.border);
    doc.roundedRect(x + 2, y - 4, cellW - 4, cellH - 6, 2, 2);
    try {
      const qr = await qrDataUrl(v.id, publicUrl);
      const size = Math.min(cellW - 22, cellH - 30);

      doc.addImage(qr, "PNG", x + (cellW - size) / 2, y + 2, size, size);
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(9);
      doc.setTextColor(...colors.primary);
      doc.text(
        doc.splitTextToSize(v.nazev_vozu || v.znacka || "Vozidlo", cellW - 8)[0],
        x + cellW / 2,
        y + size + 8,
        { align: "center" }
      );
      doc.setFont(PDF_FONT, "normal");
      doc.setFontSize(8);
      doc.setTextColor(...colors.mutedForeground);
      doc.text(v.rz || "—", x + cellW / 2, y + size + 13, { align: "center" });
      doc.setTextColor(...colors.foreground);
    } catch { /* přeskoč */ }
  }

  doc.setFontSize(7);
  doc.setTextColor(...colors.mutedForeground);
  doc.text(`QR kódy vozidel · ${vehicles.length} ks · ${new Date().toLocaleDateString("cs-CZ")}`, M, 292);
  doc.save(`qr-kody-vozidel-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export { vehicleLabel };
