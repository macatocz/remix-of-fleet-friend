// Czech public holidays (fixed dates + Easter Monday). Good enough for generator.
function easterSunday(year: number): Date {
  // Meeus/Jones/Butcher algorithm
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function czHolidays(year: number): Set<string> {
  const set = new Set<string>();
  const fixed: [number, number][] = [
    [1, 1], [5, 1], [5, 8], [7, 5], [7, 6],
    [9, 28], [10, 28], [11, 17], [12, 24], [12, 25], [12, 26],
  ];
  fixed.forEach(([m, d]) => set.add(ymd(new Date(year, m - 1, d))));
  // Velký pátek + Velikonoční pondělí
  const es = easterSunday(year);
  const gf = new Date(es); gf.setDate(es.getDate() - 2);
  const em = new Date(es); em.setDate(es.getDate() + 1);
  set.add(ymd(gf));
  set.add(ymd(em));
  return set;
}

export function isWorkingDay(date: Date, holidays: Set<string>): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false;
  return !holidays.has(ymd(date));
}

export { ymd };