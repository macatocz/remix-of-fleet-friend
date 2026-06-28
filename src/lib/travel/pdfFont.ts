import type jsPDF from "jspdf";
import robotoRegularUrl from "@/assets/fonts/Roboto-Regular.ttf?url";
import robotoBoldUrl from "@/assets/fonts/Roboto-Bold.ttf?url";

export const PDF_FONT = "Roboto";

let cache: { regular: string; bold: string } | null = null;

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
}

export async function ensurePdfFont(doc: jsPDF): Promise<string> {
  if (!cache) {
    const [regular, bold] = await Promise.all([
      fetchBase64(robotoRegularUrl),
      fetchBase64(robotoBoldUrl),
    ]);
    cache = { regular, bold };
  }
  doc.addFileToVFS("Roboto-Regular.ttf", cache.regular);
  doc.addFont("Roboto-Regular.ttf", PDF_FONT, "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", cache.bold);
  doc.addFont("Roboto-Bold.ttf", PDF_FONT, "bold");
  doc.setFont(PDF_FONT, "normal");
  return PDF_FONT;
}