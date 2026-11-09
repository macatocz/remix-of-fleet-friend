import JSZip from "jszip";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { officializeTrips } from "@/lib/tripLog/fuelSync";
import { buildTripLogWorkbook } from "@/components/TripLogExport";
import { vehicleLabel } from "@/lib/vehicleName";
import { generateTravelOrderPDF } from "@/lib/travel/pdf";
import { getFuelPrice, getKmRate } from "@/lib/travel/calc";
import { ensurePdfFont, PDF_FONT } from "@/lib/travel/pdfFont";
import { applyPdfTheme, getPdfTheme } from "@/lib/pdf/theme";

const safe = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 60);
const wbBytes = (wb: XLSX.WorkBook) => XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

export async function buildMonthlyClosing(month: string, onProgress?: (msg: string) => void): Promise<Blob> {
  const [y, m] = month.split("-").map(Number);
  const from = `${month}-01`;
  const to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const monthLabel = new Date(y, m - 1).toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
  const zip = new JSZip();
  const root = zip.folder(`uzaverka_${month}`)!;

  onProgress?.("Načítám data…");
  const [{ data: vehicles }, { data: fuel }, { data: service }, { data: trips }, { data: orders }, { data: company }, { data: drivers }] = await Promise.all([
    supabase.from("vehicles").select("id, rz, znacka, nazev_vozu"),
    supabase.from("fuel_records").select("*, vehicle_documents(file_path, name, mime_type)").gte("fueled_at", from).lte("fueled_at", to + "T23:59:59").order("fueled_at"),
    supabase.from("service_records").select("*").gte("date", from).lte("date", to).order("date"),
    supabase.from("trip_logs").select("*, drivers(first_name, last_name)").gte("date", from).lte("date", to).order("date").order("time"),
    supabase.from("travel_orders").select("*").eq("status", "schvaleno").lte("date_from", to).gte("date_to", from),
    supabase.from("company_public").select("*").maybeSingle(),
    supabase.from("drivers").select("id, first_name, last_name, department"),
  ]);
  const vMap = new Map((vehicles || []).map((v: any) => [v.id, v]));
  const vName = (id: string) => { const v: any = vMap.get(id); return v ? `${v.rz || ""} ${vehicleLabel(v)}`.trim() : "—"; };

  // 1) Souhrn nákladů
  const perVehicle = new Map<string, { fuel: number; liters: number; service: number }>();
  const add = (id: string) => { if (!perVehicle.has(id)) perVehicle.set(id, { fuel: 0, liters: 0, service: 0 }); return perVehicle.get(id)!; };
  (fuel || []).forEach((f: any) => { const p = add(f.vehicle_id); p.fuel += Number(f.total_price) || 0; p.liters += Number(f.liters) || 0; });
  (service || []).forEach((s: any) => { add(s.vehicle_id).service += Number(s.cost) || 0; });
  const summaryRows = [...perVehicle.entries()].map(([id, p]) => [vName(id), Math.round(p.liters * 10) / 10, Math.round(p.fuel), Math.round(p.service), Math.round(p.fuel + p.service)]);
  const tot = summaryRows.reduce<number[]>((a, r) => [a[0] + Number(r[1]), a[1] + Number(r[2]), a[2] + Number(r[3]), a[3] + Number(r[4])], [0, 0, 0, 0]);
  const head = ["Vozidlo", "PHM (l)", "PHM (Kč)", "Servis (Kč)", "Celkem (Kč)"];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`Souhrn nákladů – ${monthLabel}`], [], head, ...summaryRows, [], ["CELKEM", ...tot]]), "Souhrn");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Datum", "Vozidlo", "Místo", "Litry", "Kč", "Km"], ...(fuel || []).map((f: any) => [new Date(f.fueled_at).toLocaleDateString("cs-CZ"), vName(f.vehicle_id), f.location || "", f.liters ?? "", f.total_price ?? "", f.km ?? ""])]), "Tankování");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Datum", "Vozidlo", "Typ", "Popis", "Kč"], ...(service || []).map((s: any) => [new Date(s.date).toLocaleDateString("cs-CZ"), vName(s.vehicle_id), s.type, s.description || "", s.cost ?? ""])]), "Servis");
  root.file("01_souhrn-nakladu.xlsx", wbBytes(wb));

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensurePdfFont(doc);
  const theme = getPdfTheme();
  applyPdfTheme(doc, theme.colors);
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(16);
  doc.text(`Souhrn nákladů – ${monthLabel}`, 14, 18);
  autoTable(doc, { startY: 26, head: [head], body: [...summaryRows, ["CELKEM", ...tot]], ...(theme.table as any), styles: { ...(theme.table.styles as any), font: PDF_FONT, fontSize: 9 } });
  root.file("01_souhrn-nakladu.pdf", doc.output("arraybuffer"));

  // 2) Oficiální kniha jízd per vozidlo
  onProgress?.("Připravuji knihy jízd…");
  const byVeh = new Map<string, any[]>();
  (trips || []).forEach((t: any) => { if (!byVeh.has(t.vehicle_id)) byVeh.set(t.vehicle_id, []); byVeh.get(t.vehicle_id)!.push(t); });
  const tripFolder = root.folder("02_knihy-jizd")!;
  for (const [vid, rows] of byVeh) {
    let prefs: any = {};
    try { prefs = JSON.parse(localStorage.getItem(`trip-gen:${vid}`) || "{}"); } catch { /* ignore */ }
    const split = (v?: string) => (v || "").split("\n").map((x) => x.trim()).filter(Boolean);
    const off = officializeTrips(rows, { base: (prefs.base || "Sídlo").trim(), destinations: split(prefs.destinations), purposes: split(prefs.purposes) });
    tripFolder.file(`kniha-jizd_${safe(vName(vid))}_${month}.xlsx`, wbBytes(buildTripLogWorkbook(off, "official", vName(vid), monthLabel)));
  }

  // 3) Schválené cestovní příkazy
  onProgress?.("Připravuji cestovní příkazy…");
  const coFolder = root.folder("03_cestovni-prikazy")!;
  const dMap = new Map((drivers || []).map((d: any) => [d.id, d]));
  for (const o of (orders || []) as any[]) {
    const [{ data: legs }, { data: meals }, { data: exps }] = await Promise.all([
      supabase.from("travel_order_legs").select("*").eq("travel_order_id", o.id).order("sort_order"),
      supabase.from("travel_order_meals").select("*").eq("travel_order_id", o.id).order("date"),
      supabase.from("travel_order_expenses").select("*").eq("travel_order_id", o.id),
    ]);
    const transport = (o.transport_mode?.[0]) || "sluzebni";
    const totalKm = (legs || []).reduce((s: number, l: any) => s + (Number(l.km) || 0), 0);
    const reimb = transport === "vlastni" ? Math.round(totalKm * (getKmRate(o.date_from) + (7 / 100) * getFuelPrice(o.date_from)) * 100) / 100 : 0;
    const d: any = dMap.get(o.driver_id); const v: any = vMap.get(o.vehicle_id);
    const pdf = await generateTravelOrderPDF({
      number: o.number, status: o.status, company: (company as any) || {},
      driver: { name: d ? `${d.first_name} ${d.last_name}` : "—", department: d?.department },
      coTravelers: o.co_travelers || undefined, vehicle: { rz: v?.rz, znacka: v?.znacka }, purpose: o.purpose || undefined,
      dateFrom: o.date_from, timeFrom: o.time_from || "", dateTo: o.date_to, timeTo: o.time_to || "",
      placeFrom: o.place_from || undefined, placeTo: o.place_to || undefined, transportMode: [transport],
      legs: (legs || []) as any, meals: (meals || []) as any, expenses: (exps || []) as any,
      vehicleReimbursement: reimb, advance: Number(o.advance_payment) || 0,
      currencyRateDate: o.currency_rate_date || undefined, currencyRateEurCzk: o.currency_rate_eur_czk || undefined,
      requestedAt: o.requested_at || undefined, requestApprovedAt: o.request_approved_at || undefined,
      reportSubmittedAt: o.report_submitted_at || undefined, reportApprovedAt: o.report_approved_at || undefined,
    } as any);
    coFolder.file(`CP-${safe(o.number)}-${safe(d?.last_name || "")}.pdf`, pdf.output("arraybuffer"));
  }

  // 4) Účtenky
  onProgress?.("Stahuji účtenky…");
  const rcFolder = root.folder("04_uctenky")!;
  for (const f of (fuel || []) as any[]) {
    const docRow = f.vehicle_documents;
    if (!docRow?.file_path) continue;
    const { data: blob } = await supabase.storage.from("vehicle-documents").download(docRow.file_path);
    if (!blob) continue;
    const ext = (docRow.file_path.split(".").pop() || "jpg").toLowerCase();
    rcFolder.file(`${f.fueled_at.slice(0, 10)}_${safe(vName(f.vehicle_id))}_${Math.round(Number(f.total_price) || 0)}Kc.${ext}`, blob);
  }

  onProgress?.("Balím ZIP…");
  return zip.generateAsync({ type: "blob" });
}
