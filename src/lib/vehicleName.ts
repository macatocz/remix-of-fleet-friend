// Utility for generating short vehicle names — "Příjmení Značka Model"
// or "Pool <lokalita> <číslo> Značka Model".
// Full model description stays in the `znacka` column.

const BRAND_MAP: Record<string, string> = {
  volkswagen: "VW",
  vw: "VW",
  škoda: "Škoda",
  skoda: "Škoda",
  hyundai: "Hyundai",
  toyota: "Toyota",
  volvo: "Volvo",
  dacia: "Dacia",
  bmw: "BMW",
  ford: "Ford",
  audi: "Audi",
  mercedes: "Mercedes",
  peugeot: "Peugeot",
  renault: "Renault",
  kia: "Kia",
  citroen: "Citroën",
  citroën: "Citroën",
};

const VERSION_TOKEN = /^(TSI|TDI|mHEV|TCe|AT|4x4|DC|D-4D|HEV|PHEV|EV|BEV)$/i;

/** "Volkswagen Golf Var.1.0TSI 81 Life 5d" -> "VW Golf" */
export function shortenModel(znacka: string | null | undefined): string {
  if (!znacka) return "";
  const parts = znacka.trim().split(/\s+/);
  if (parts.length === 0) return "";
  const brand = BRAND_MAP[parts[0].toLowerCase()] ?? parts[0];
  let series = (parts[1] ?? "").replace(/\..*$/, "");
  if (/^\d/.test(series)) series = "";
  if (series === "Var" || series === "V" || series === "") {
    for (let i = 2; i < parts.length; i++) {
      const t = parts[i].replace(/\..*$/, "");
      if (t && !/^\d/.test(t) && !VERSION_TOKEN.test(t)) {
        series = t;
        break;
      }
    }
  }
  return (brand + (series ? " " + series : "")).trim();
}

function lastName(full: string | null | undefined): string {
  if (!full) return "";
  const p = full.trim().split(/\s+/);
  return p[p.length - 1];
}

function locCode(lokalita: string | null | undefined): string {
  const l = (lokalita ?? "").toLowerCase();
  if (l.startsWith("praha")) return "PHA";
  if (l.startsWith("liberec")) return "LBC";
  if (l.startsWith("brno")) return "BRN";
  if (l.startsWith("ostrava")) return "OST";
  if (l.startsWith("plzeň") || l.startsWith("plzen")) return "PLZ";
  return (lokalita ?? "X").slice(0, 3).toUpperCase();
}

export interface VehicleNameInput {
  znacka?: string | null;
  spravce?: string | null;
  lokalita?: string | null;
}

/**
 * Build a short human-readable vehicle name.
 * For POOL vehicles it uses existing text (e.g. "POOL PHA 1") when present,
 * otherwise derives a location code from `lokalita`. Numbering across the fleet
 * is not deduplicated here — call sites can pass a suggestion via `poolIndex`.
 */
export function buildVehicleName(v: VehicleNameInput, opts?: { poolIndex?: number }): string {
  const model = shortenModel(v.znacka);
  const spravce = (v.spravce ?? "").trim();

  if (/^POOL/i.test(spravce)) {
    const m = spravce.match(/^POOL\s+([A-Za-zŽŠČŘĎŤŇÁÉÍÓÚŮÝ]{2,4})\s*(\d+)?/);
    let loc: string;
    let num: number | null = null;
    if (m) {
      loc = m[1].toUpperCase();
      num = m[2] ? parseInt(m[2], 10) : null;
    } else {
      loc = locCode(v.lokalita);
    }
    if (num == null) num = opts?.poolIndex ?? 1;
    return `Pool ${loc} ${num} ${model}`.trim();
  }

  const sn = lastName(spravce);
  return sn ? `${sn} ${model}`.trim() : model;
}