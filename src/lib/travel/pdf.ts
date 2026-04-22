import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCZK } from "./calc";

export type TravelOrderPDFData = {
  number: string;
  company: { name?: string; ico?: string; address?: string; city?: string; zip?: string };
  driver: { name: string; department?: string };
  vehicle: { rz?: string; znacka?: string };
  purpose?: string;
  dateFrom: string; timeFrom: string; dateTo: string; timeTo: string;
  placeFrom?: string; placeTo?: string;
  transportMode: string[];
  legs: { date: string; time_from?: string; time_to?: string; place_from?: string; place_to?: string; km?: number; transport?: string }[];
  meals: { date: string; hours: number; country: string; amount: number }[];
  expenses: { type: string; description?: string; amount: number; currency: string }[];
  vehicleReimbursement: number;
  advance: number;
  approvedBy?: string;
};

export function generateTravelOrderPDF(data: TravelOrderPDFData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Hlavička firmy
  doc.setFontSize(9);
  doc.text(data.company.name || "—", 14, y);
  if (data.company.ico) doc.text(`IČO: ${data.company.ico}`, 14, y + 4);
  const addr = [data.company.address, [data.company.zip, data.company.city].filter(Boolean).join(" ")]
    .filter(Boolean).join(", ");
  if (addr) doc.text(addr, 14, y + 8);

  // Titul
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("CESTOVNÍ PŘÍKAZ", pageW / 2, y + 4, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`č. ${data.number}`, pageW / 2, y + 10, { align: "center" });

  y += 18;

  // Základní údaje
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 1.5 },
    body: [
      ["Cestující", data.driver.name, "Oddělení", data.driver.department || "—"],
      ["Vozidlo", `${data.vehicle.rz || "—"} ${data.vehicle.znacka || ""}`, "Doprava", data.transportMode.join(", ")],
      ["Účel cesty", data.purpose || "—", "", ""],
      ["Místo nástupu", data.placeFrom || "—", "Místo cíle", data.placeTo || "—"],
      ["Datum/čas odjezdu", `${data.dateFrom} ${data.timeFrom}`, "Datum/čas příjezdu", `${data.dateTo} ${data.timeTo}`],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 32 }, 2: { fontStyle: "bold", cellWidth: 32 } },
  });

  // Trasy
  y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Průběh cesty", 14, y);
  autoTable(doc, {
    startY: y + 2,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 1.5 },
    head: [["Datum", "Od", "Do", "Z místa", "Do místa", "km", "Doprava"]],
    body: data.legs.length
      ? data.legs.map((l) => [l.date, l.time_from || "", l.time_to || "", l.place_from || "", l.place_to || "", String(l.km || 0), l.transport || ""])
      : [["—", "", "", "", "", "0", ""]],
  });

  // Stravné
  y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Stravné", 14, y);
  const mealsTotal = data.meals.reduce((s, m) => s + (m.amount || 0), 0);
  autoTable(doc, {
    startY: y + 2,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 1.5 },
    head: [["Datum", "Hodin", "Země", "Částka"]],
    body: [
      ...data.meals.map((m) => [m.date, m.hours.toFixed(1), m.country, formatCZK(m.amount)]),
      [{ content: "Celkem stravné", colSpan: 3, styles: { fontStyle: "bold", halign: "right" } }, { content: formatCZK(mealsTotal), styles: { fontStyle: "bold" } }],
    ],
  });

  // Výdaje
  y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Další výdaje", 14, y);
  const expensesTotal = data.expenses.reduce((s, e) => s + (e.amount || 0), 0);
  autoTable(doc, {
    startY: y + 2,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 1.5 },
    head: [["Typ", "Popis", "Částka", "Měna"]],
    body: [
      ...data.expenses.map((e) => [e.type, e.description || "", e.amount.toFixed(2), e.currency]),
      [{ content: "Celkem výdaje", colSpan: 2, styles: { fontStyle: "bold", halign: "right" } }, { content: formatCZK(expensesTotal), colSpan: 2, styles: { fontStyle: "bold" } }],
    ],
  });

  // Souhrn
  y = (doc as any).lastAutoTable.finalY + 6;
  const sum = mealsTotal + data.vehicleReimbursement + expensesTotal;
  const toPay = sum - (data.advance || 0);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    body: [
      ["Stravné", formatCZK(mealsTotal)],
      ["Náhrada za vozidlo", formatCZK(data.vehicleReimbursement)],
      ["Ostatní výdaje", formatCZK(expensesTotal)],
      [{ content: "Celkem", styles: { fontStyle: "bold" } }, { content: formatCZK(sum), styles: { fontStyle: "bold" } }],
      ["Záloha", formatCZK(data.advance || 0)],
      [{ content: toPay >= 0 ? "K vyplacení" : "K vrácení", styles: { fontStyle: "bold" } }, { content: formatCZK(Math.abs(toPay)), styles: { fontStyle: "bold" } }],
    ],
    columnStyles: { 0: { cellWidth: 60 } },
  });

  // Podpisy
  y = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.text("Podpis cestujícího", 30, y, { align: "center" });
  doc.text("Podpis schvalovatele", pageW - 30, y, { align: "center" });
  doc.line(10, y - 3, 60, y - 3);
  doc.line(pageW - 60, y - 3, pageW - 10, y - 3);
  if (data.approvedBy) doc.text(data.approvedBy, pageW - 30, y + 5, { align: "center" });

  return doc;
}