import { czHolidays, isWorkingDay, ymd } from "./holidaysCZ";
import type { GeneratorInput, GeneratedTrip, FuelStop } from "./types";

function daysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const last = new Date(year, month, 0).getDate();
  for (let d = 1; d <= last; d++) days.push(new Date(year, month - 1, d));
  return days;
}

function pick<T>(arr: T[], idx: number): T | undefined {
  if (!arr.length) return undefined;
  return arr[idx % arr.length];
}

export function generateMonth(input: GeneratorInput): { trips: GeneratedTrip[]; warnings: string[] } {
  const warnings: string[] = [];
  const [yStr, mStr] = input.month.split("-");
  const year = parseInt(yStr);
  const month = parseInt(mStr);
  const holidays = czHolidays(year);

  const totalKm = input.kmEnd - input.kmStart;
  if (totalKm <= 0) {
    warnings.push("Cílový stav km musí být vyšší než počáteční.");
    return { trips: [], warnings };
  }

  const all = daysInMonth(year, month);

  // Days when tanking happens are always kept (even if weekend), all other days
  // filtered by workingDaysOnly.
  const fuelByDate = new Map<string, FuelStop>();
  input.fuelStops.forEach((f) => fuelByDate.set(f.date, f));

  const activeDays = all.filter((d) => {
    const key = ymd(d);
    if (fuelByDate.has(key)) return true;
    return input.workingDaysOnly ? isWorkingDay(d, holidays) : true;
  });

  if (activeDays.length === 0) {
    warnings.push("V měsíci není žádný pracovní den.");
    return { trips: [], warnings };
  }

  // Volitelně omez počet jízdních dní (dny s tankováním zůstávají vždy).
  const requested = input.tripDaysCount ?? null;
  if (requested != null && requested > 0 && requested < activeDays.length) {
    const fuelDays = activeDays.filter((d) => fuelByDate.has(ymd(d)));
    const otherDays = activeDays.filter((d) => !fuelByDate.has(ymd(d)));
    const needed = Math.max(0, requested - fuelDays.length);
    // Rovnoměrně rozmístit `needed` dní přes `otherDays`
    const picked: Date[] = [];
    if (needed > 0 && otherDays.length > 0) {
      const step = otherDays.length / needed;
      for (let i = 0; i < needed; i++) {
        const idx = Math.min(otherDays.length - 1, Math.floor(i * step + step / 2));
        picked.push(otherDays[idx]);
      }
    }
    const keep = new Set<string>([...fuelDays, ...picked].map(ymd));
    // Zachovat pořadí podle kalendáře
    const filtered = activeDays.filter((d) => keep.has(ymd(d)));
    if (filtered.length < requested) {
      warnings.push(`Požadováno ${requested} jízdních dní, ale k dispozici je jen ${filtered.length}.`);
    }
    activeDays.length = 0;
    activeDays.push(...filtered);
  }

  // km per day: fuel days get 1.5x the average weight to reflect longer trip
  const weights = activeDays.map((d) => (fuelByDate.has(ymd(d)) ? 1.6 : 1));
  const sumW = weights.reduce((a, b) => a + b, 0);
  const perDay = activeDays.map((_, i) => Math.round((totalKm * weights[i]) / sumW));

  // Correct rounding drift on the last active day
  const drift = totalKm - perDay.reduce((a, b) => a + b, 0);
  perDay[perDay.length - 1] += drift;

  const trips: GeneratedTrip[] = [];
  let runningKm = input.kmStart;
  let purposeIdx = 0;
  let destIdx = 0;

  activeDays.forEach((d, i) => {
    const dayKm = perDay[i];
    if (dayKm <= 0) return;
    const dayStr = ymd(d);
    const fuel = fuelByDate.get(dayStr);
    const destination = fuel
      ? fuel.place
      : pick(input.destinations, destIdx++) || "Zákazník";
    const purpose = pick(input.purposes, purposeIdx++) || "Služební jednání";

    if (input.roundTripMode === "single") {
      // Jeden řádek: kruhová trasa základna → cíl → základna
      const start = runningKm;
      const end = runningKm + dayKm;
      trips.push({
        vehicle_id: input.vehicleId,
        driver_id: input.driverId || null,
        date: dayStr,
        time: input.timeOut,
        route_from: input.base,
        route_to: `${destination} – ${input.base}`,
        purpose,
        km_start: start,
        km_end: end,
        km_total: dayKm,
        fuel_quantity: fuel ? fuel.liters : null,
        fuel_price: fuel ? fuel.price : null,
      });
      runningKm = end;
      return;
    }

    const outKm = Math.round(dayKm / 2);
    const backKm = dayKm - outKm;

    // outbound
    const outStart = runningKm;
    const outEnd = runningKm + outKm;
    trips.push({
      vehicle_id: input.vehicleId,
      driver_id: input.driverId || null,
      date: dayStr,
      time: input.timeOut,
      route_from: input.base,
      route_to: destination,
      purpose,
      km_start: outStart,
      km_end: outEnd,
      km_total: outKm,
      fuel_quantity: null,
      fuel_price: null,
    });
    runningKm = outEnd;

    // return
    const backStart = runningKm;
    const backEnd = runningKm + backKm;
    trips.push({
      vehicle_id: input.vehicleId,
      driver_id: input.driverId || null,
      date: dayStr,
      time: input.timeBack,
      route_from: destination,
      route_to: input.base,
      purpose,
      km_start: backStart,
      km_end: backEnd,
      km_total: backKm,
      fuel_quantity: fuel ? fuel.liters : null,
      fuel_price: fuel ? fuel.price : null,
    });
    runningKm = backEnd;
  });

  // Attach any fuel stop whose date wasn't in activeDays (shouldn't happen, but guard)
  input.fuelStops.forEach((f) => {
    if (!trips.some((t) => t.date === f.date && t.fuel_quantity !== null)) {
      warnings.push(`Tankování ${f.date} (${f.place}) nebylo přiřazeno k žádné jízdě.`);
    }
  });

  if (runningKm !== input.kmEnd) {
    warnings.push(`Konečný stav km po zaokrouhlení: ${runningKm} (cíl ${input.kmEnd}).`);
  }

  return { trips, warnings };
}