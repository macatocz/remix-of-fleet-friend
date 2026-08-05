export interface TripRow {
  vehicle_id: string;
  date: string;
  km_total: number | null;
  km_start: number | null;
  km_end: number | null;
  fuel_quantity: number | null;
  fuel_price: number | null;
  other_price: number | null;
}

export interface ServiceRow {
  vehicle_id: string;
  date: string;
  cost: number | null;
}

export interface ReservationRow {
  vehicle_id: string;
  date_from: string;
  date_to: string;
  purpose_type: string | null;
  status: string;
}

export interface QuarterRange {
  year: number;
  quarter: number; // 1..4
  from: string;
  to: string;
  label: string;
}

export function quarterRange(year: number, quarter: number): QuarterRange {
  const startMonth = (quarter - 1) * 3;
  const from = new Date(year, startMonth, 1);
  const to = new Date(year, startMonth + 3, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { year, quarter, from: fmt(from), to: fmt(to), label: `Q${quarter} ${year}` };
}

export function previousQuarter(year: number, quarter: number): QuarterRange {
  return quarter === 1 ? quarterRange(year - 1, 4) : quarterRange(year, quarter - 1);
}

export function tripKm(t: TripRow): number {
  if (t.km_total != null) return Number(t.km_total) || 0;
  if (t.km_start != null && t.km_end != null) return Math.max(0, Number(t.km_end) - Number(t.km_start));
  return 0;
}

export function tripFuelCost(t: TripRow): number {
  const qty = Number(t.fuel_quantity) || 0;
  const price = Number(t.fuel_price) || 0;
  // fuel_price se v knize jízd eviduje jako celková částka, pokud je množství nulové
  const base = qty > 0 && price > 0 && price < 200 ? qty * price : price;
  return (base || 0) + (Number(t.other_price) || 0);
}

/** Počet dní rezervace spadajících do intervalu. */
export function reservedDaysInRange(r: ReservationRow, from: string, to: string): number {
  const start = r.date_from > from ? r.date_from : from;
  const end = r.date_to < to ? r.date_to : to;
  if (start > end) return 0;
  const ms = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

export interface VehicleSummary {
  vehicle_id: string;
  km: number;
  trips: number;
  fuelCost: number;
  serviceCost: number;
  totalCost: number;
  costPerKm: number | null;
  reservations: number;
  reservedDays: number;
  utilization: number | null; // %
}

export interface QuarterSummary {
  km: number;
  trips: number;
  fuelCost: number;
  serviceCost: number;
  totalCost: number;
  costPerKm: number | null;
  reservations: number;
  privateDays: number;
  workDays: number;
  byVehicle: VehicleSummary[];
  byMonth: { month: string; fuel: number; service: number; km: number }[];
}

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;

export function buildQuarterSummary(
  range: QuarterRange,
  vehicleIds: string[],
  trips: TripRow[],
  services: ServiceRow[],
  reservations: ReservationRow[]
): QuarterSummary {
  const days = reservedDaysInRange(
    { vehicle_id: "", date_from: range.from, date_to: range.to, purpose_type: null, status: "" },
    range.from,
    range.to
  );

  const per = new Map<string, VehicleSummary>();
  const get = (id: string): VehicleSummary => {
    let s = per.get(id);
    if (!s) {
      s = {
        vehicle_id: id, km: 0, trips: 0, fuelCost: 0, serviceCost: 0,
        totalCost: 0, costPerKm: null, reservations: 0, reservedDays: 0, utilization: null,
      };
      per.set(id, s);
    }
    return s;
  };
  vehicleIds.forEach(get);

  const monthKeys: string[] = [];
  for (let i = 0; i < 3; i++) {
    const m = (range.quarter - 1) * 3 + i;
    monthKeys.push(`${range.year}-${String(m + 1).padStart(2, "0")}`);
  }
  const months = new Map(monthKeys.map((m) => [m, { month: m, fuel: 0, service: 0, km: 0 }]));

  trips.filter((t) => t.date && inRange(t.date, range.from, range.to)).forEach((t) => {
    const s = get(t.vehicle_id);
    const km = tripKm(t);
    const fuel = tripFuelCost(t);
    s.km += km;
    s.trips += 1;
    s.fuelCost += fuel;
    const mk = t.date.slice(0, 7);
    const m = months.get(mk);
    if (m) { m.fuel += fuel; m.km += km; }
  });

  services.filter((r) => r.date && inRange(r.date, range.from, range.to)).forEach((r) => {
    const s = get(r.vehicle_id);
    const cost = Number(r.cost) || 0;
    s.serviceCost += cost;
    const m = months.get(r.date.slice(0, 7));
    if (m) m.service += cost;
  });

  let privateDays = 0;
  let workDays = 0;
  let reservationCount = 0;
  reservations
    .filter((r) => r.status !== "zamítnuto" && r.date_to >= range.from && r.date_from <= range.to)
    .forEach((r) => {
      const d = reservedDaysInRange(r, range.from, range.to);
      if (d <= 0) return;
      reservationCount += 1;
      const s = get(r.vehicle_id);
      s.reservations += 1;
      s.reservedDays += d;
      if (r.purpose_type === "soukrome") privateDays += d;
      else workDays += d;
    });

  const byVehicle = Array.from(per.values()).map((s) => {
    s.totalCost = s.fuelCost + s.serviceCost;
    s.costPerKm = s.km > 0 ? s.totalCost / s.km : null;
    s.utilization = days > 0 ? Math.min(100, Math.round((s.reservedDays / days) * 100)) : null;
    return s;
  });

  const km = byVehicle.reduce((a, s) => a + s.km, 0);
  const fuelCost = byVehicle.reduce((a, s) => a + s.fuelCost, 0);
  const serviceCost = byVehicle.reduce((a, s) => a + s.serviceCost, 0);
  const totalCost = fuelCost + serviceCost;

  return {
    km,
    trips: byVehicle.reduce((a, s) => a + s.trips, 0),
    fuelCost,
    serviceCost,
    totalCost,
    costPerKm: km > 0 ? totalCost / km : null,
    reservations: reservationCount,
    privateDays,
    workDays,
    byVehicle,
    byMonth: monthKeys.map((m) => months.get(m)!),
  };
}

/** Procentní změna proti předchozímu období. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}
