// Utility helpers for parsing pasted Excel/TSV data and common Czech formats.

export function parseCzNumber(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/\s/g, "").replace(/[^\d,.\-]/g, "").replace(",", ".");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

export function parseCzInt(s: string): number | null {
  const n = parseCzNumber(s);
  return n == null ? null : Math.round(n);
}

/** Parse various Czech date formats → ISO YYYY-MM-DD (or null). */
export function parseCzDate(s: string, fallbackYear?: number): string | null {
  if (!s) return null;
  const t = s.trim();
  // ISO
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // 15.4. or 15.4.2026
  m = t.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})?$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    let y = m[3] ? parseInt(m[3]) : (fallbackYear ?? new Date().getFullYear());
    if (y < 100) y += 2000;
    return `${y}-${mo}-${d}`;
  }
  // 15/4 or 15/4/2026
  m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    let y = m[3] ? parseInt(m[3]) : (fallbackYear ?? new Date().getFullYear());
    if (y < 100) y += 2000;
    return `${y}-${mo}-${d}`;
  }
  return null;
}

/** Parse "7:30" / "07:30" → "HH:MM" or null. */
export function parseTime(s: string): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = m[1].padStart(2, "0");
  return `${h}:${m[2]}`;
}

export interface ParsedCell {
  raw: string;
  date?: string | null;
  time?: string | null;
  number?: number | null;
  int?: number | null;
}

export function parseCell(raw: string): ParsedCell {
  const r = (raw ?? "").trim();
  return {
    raw: r,
    date: parseCzDate(r),
    time: parseTime(r),
    number: parseCzNumber(r),
    int: parseCzInt(r),
  };
}

/** Split TSV / clipboard text into rows × cells (tab between cells). */
export function parseTSV(text: string): string[][] {
  if (!text) return [];
  // Normalize line endings, drop trailing empty line.
  const norm = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  return norm.split("\n").map(line => line.split("\t"));
}

/** Coerce a parsed cell to the type expected for a trip_logs column. */
export function coerceForColumn(colKey: string, raw: string): any {
  const r = (raw ?? "").trim();
  if (r === "") return null;
  switch (colKey) {
    case "date":
      return parseCzDate(r) ?? r;
    case "time":
      return parseTime(r);
    case "break_minutes":
    case "km_start":
    case "km_end":
      return parseCzInt(r);
    case "fuel_quantity":
    case "fuel_price":
    case "other_quantity":
    case "other_price":
      return parseCzNumber(r);
    default:
      return r;
  }
}