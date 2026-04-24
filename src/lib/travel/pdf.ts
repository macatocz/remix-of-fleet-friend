import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCZK, formatCurrency } from "./calc";

export type TravelOrderPDFData = {
  number: string;
  status?: string;
  company: { name?: string; ico?: string; address?: string; city?: string; zip?: string };
  driver: { name: string; department?: string };
  coTravelers?: string;
  vehicle: { rz?: string; znacka?: string };
  purpose?: string;
  dateFrom: string; timeFrom: string; dateTo: string; timeTo: string;
  placeFrom?: string; placeTo?: string;
  transportMode: string[];
  legs: { date: string; time_from?: string; time_to?: string; place_from?: string; place_to?: string; km?: number; transport?: string; country?: string }[];
  meals: { date: string; hours: number; country: string; amount: number; currency?: string; pocket_money_amount?: number }[];
  expenses: { type: string; description?: string; amount: number; currency: string }[];
  vehicleReimbursement: number;
  advance: number;
  // Kurz ČNB snapshot
  currencyRateDate?: string;
  currencyRateEurCzk?: number;
  // 4-úrovňový workflow
  requestedBy?: string; requestedAt?: string;
  requestApprovedBy?: string; requestApprovedAt?: string;
  reportSubmittedBy?: string; reportSubmittedAt?: string;
  reportApprovedBy?: string; reportApprovedAt?: string;
};

function fmtTs(ts?: string): string {
  if (!ts) return "";
  try { return new Date(ts).toLocaleString("cs-CZ"); } catch { return ts; }
}

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
  doc.text(`č. ${data.number}${data.status ? `  •  ${data.status}` : ""}`, pageW / 2, y + 10, { align: "center" });

  y += 18;

  // Základní údaje
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 1.5 },
    body: [
      ["Cestující", data.driver.name, "Oddělení", data.driver.department || "—"],
      ["Spolucestující", data.coTravelers || "—", "", ""],
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
    head: [["Datum", "Od", "Do", "Země", "Z místa", "Do místa", "km", "Doprava"]],
    body: data.legs.length
      ? data.legs.map((l) => [l.date, l.time_from || "", l.time_to || "", l.country || "CZ", l.place_from || "", l.place_to || "", String(l.km || 0), l.transport || ""])
      : [["—", "", "", "", "", "", "0", ""]],
  });

  // Stravné — rozdělené podle měny
  y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Stravné", 14, y);
  // Souhrn stravného + kapesného per měna
  const mealsByCurrency: Record<string, number> = {};
  const pocketByCurrency: Record<string, number> = {};
  data.meals.forEach((m) => {
    const cur = m.currency || "CZK";
    mealsByCurrency[cur] = (mealsByCurrency[cur] || 0) + (Number(m.amount) || 0);
    pocketByCurrency[cur] = (pocketByCurrency[cur] || 0) + (Number(m.pocket_money_amount) || 0);
  });
  autoTable(doc, {
    startY: y + 2,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 1.5 },
    head: [["Datum", "Hodin", "Země", "Měna", "Stravné", "Kapesné"]],
    body: [
      ...data.meals.map((m) => [
        m.date, Number(m.hours).toFixed(1), m.country, m.currency || "CZK",
        formatCurrency(m.amount, m.currency || "CZK"),
        formatCurrency(m.pocket_money_amount || 0, m.currency || "CZK"),
      ]),
    ],
  });

  // Mezisoučty stravného per měna
  y = (doc as any).lastAutoTable.finalY + 2;
  const subtotalRows = Object.keys(mealsByCurrency).map((cur) => [
    `Celkem ${cur}`,
    formatCurrency(mealsByCurrency[cur], cur),
    formatCurrency(pocketByCurrency[cur] || 0, cur),
  ]);
  if (subtotalRows.length) {
    autoTable(doc, {
      startY: y,
      theme: "plain",
      styles: { fontSize: 8, cellPadding: 1.5, fontStyle: "bold" },
      head: [["Měna", "Stravné celkem", "Kapesné celkem"]],
      body: subtotalRows,
    });
  }

  // Výdaje — per měna
  y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Další výdaje", 14, y);
  const expensesByCurrency: Record<string, number> = {};
  data.expenses.forEach((e) => {
    expensesByCurrency[e.currency || "CZK"] = (expensesByCurrency[e.currency || "CZK"] || 0) + (Number(e.amount) || 0);
  });
  autoTable(doc, {
    startY: y + 2,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 1.5 },
    head: [["Typ", "Popis", "Částka", "Měna"]],
    body: [
      ...data.expenses.map((e) => [e.type, e.description || "", e.amount.toFixed(2), e.currency]),
      ...Object.keys(expensesByCurrency).map((cur) => [
        { content: `Celkem ${cur}`, colSpan: 2, styles: { fontStyle: "bold", halign: "right" } as const },
        { content: formatCurrency(expensesByCurrency[cur], cur), colSpan: 2, styles: { fontStyle: "bold" } as const },
      ]),
    ],
  });

  // Souhrn — per měna
  y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.text("Souhrn náhrad podle měn", 14, y);

  // Sjednoť všechny měny
  const allCurrencies = Array.from(new Set([
    ...Object.keys(mealsByCurrency),
    ...Object.keys(expensesByCurrency),
    "CZK",
  ]));
  const summaryRows = allCurrencies.map((cur) => {
    const meal = mealsByCurrency[cur] || 0;
    const pocket = pocketByCurrency[cur] || 0;
    const expense = expensesByCurrency[cur] || 0;
    const vehicle = cur === "CZK" ? data.vehicleReimbursement : 0;
    const sub = meal + pocket + expense + vehicle;
    return [cur, formatCurrency(meal, cur), formatCurrency(pocket, cur), formatCurrency(vehicle, cur), formatCurrency(expense, cur), formatCurrency(sub, cur)];
  });
  autoTable(doc, {
    startY: y + 2,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    head: [["Měna", "Stravné", "Kapesné", "Vozidlo", "Výdaje", "Celkem"]],
    body: summaryRows,
  });

  // Přepočet do CZK přes uložený kurz
  y = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let totalCzk = 0;
  if (data.currencyRateEurCzk && data.currencyRateDate) {
    doc.text(`Kurz ČNB ke dni ${data.currencyRateDate}: 1 EUR = ${data.currencyRateEurCzk.toFixed(3)} CZK`, 14, y);
    y += 5;
  }
  // Hrubý přepočet: CZK přímo, EUR přes kurz, ostatní 1:1 (orientačně)
  for (const cur of allCurrencies) {
    const meal = mealsByCurrency[cur] || 0;
    const pocket = pocketByCurrency[cur] || 0;
    const expense = expensesByCurrency[cur] || 0;
    const vehicle = cur === "CZK" ? data.vehicleReimbursement : 0;
    const sub = meal + pocket + expense + vehicle;
    if (cur === "CZK") totalCzk += sub;
    else if (cur === "EUR" && data.currencyRateEurCzk) totalCzk += sub * data.currencyRateEurCzk;
  }
  const toPayCzk = totalCzk - (data.advance || 0);
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    body: [
      [{ content: "Celkem v CZK (přepočet)", styles: { fontStyle: "bold" } }, { content: formatCZK(totalCzk), styles: { fontStyle: "bold" } }],
      ["Záloha", formatCZK(data.advance || 0)],
      [{ content: toPayCzk >= 0 ? "K vyplacení" : "K vrácení", styles: { fontStyle: "bold" } }, { content: formatCZK(Math.abs(toPayCzk)), styles: { fontStyle: "bold" } }],
    ],
    columnStyles: { 0: { cellWidth: 70 } },
  });

  // 4 podpisové bloky 2×2
  y = (doc as any).lastAutoTable.finalY + 16;
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(9);
  const colW = (pageW - 28) / 2;
  const blocks = [
    { title: "Žádost vystavil", name: data.requestedBy, ts: data.requestedAt },
    { title: "Žádost schválil", name: data.requestApprovedBy, ts: data.requestApprovedAt },
    { title: "Výkaz vystavil", name: data.reportSubmittedBy, ts: data.reportSubmittedAt },
    { title: "Výkaz schválil", name: data.reportApprovedBy, ts: data.reportApprovedAt },
  ];
  blocks.forEach((b, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 14 + col * colW;
    const yy = y + row * 22;
    doc.line(x, yy, x + colW - 6, yy);
    doc.setFont("helvetica", "bold");
    doc.text(b.title, x, yy + 4);
    doc.setFont("helvetica", "normal");
    if (b.name) doc.text(b.name, x, yy + 9);
    if (b.ts) doc.text(fmtTs(b.ts), x, yy + 13);
  });

  return doc;
}