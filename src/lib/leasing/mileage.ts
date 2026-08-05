import { differenceInMonths, differenceInDays, parseISO } from "date-fns";

export interface MileageSource {
  id?: string;
  vehicle_id: string;
  km: number;
  recorded_at: string; // ISO date
  source: "vehicle_mileage" | "trip_log";
  note?: string | null;
}

export interface LeasingMileageInput {
  typ_vlastnictvi: string | null;
  najezd_za_rok: string | number | null;
  datum_zahajeni_leasingu: string | null;
  datum_ukonceni_leasingu: string | null;
  vychozi_stav_tachometru: string | number | null;
}

export interface TripLogMileage {
  vehicle_id: string;
  km_end: number | null;
  date: string | null;
}

function parseNumber(val: string | number | null): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/\s/g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(val: string | null): Date | null {
  if (!val) return null;
  try {
    const d = parseISO(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function isLeasingVehicle(input: LeasingMileageInput): boolean {
  return input.typ_vlastnictvi === "operativni_leasing" || input.typ_vlastnictvi === "financni_leasing";
}

export function computeTotalContractKm(input: LeasingMileageInput): number | null {
  const najezdRocni = parseNumber(input.najezd_za_rok);
  const from = parseDate(input.datum_zahajeni_leasingu);
  const to = parseDate(input.datum_ukonceni_leasingu);
  if (!najezdRocni || !from || !to) return null;
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
  if (months <= 0) return null;
  return Math.round((najezdRocni * months) / 12);
}

export function deriveCurrentMileage(
  vehicleId: string,
  input: LeasingMileageInput,
  mileageRecords: MileageSource[],
  tripLogs: TripLogMileage[]
): { km: number; recordedAt: string | null; source: "vehicle_mileage" | "trip_log" | "initial" } | null {
  const vychozi = parseNumber(input.vychozi_stav_tachometru);

  const vehicleRecords = mileageRecords
    .filter((m) => m.vehicle_id === vehicleId)
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));

  const tripRecords = tripLogs
    .filter((t) => t.vehicle_id === vehicleId && t.km_end !== null && t.date !== null)
    .map((t) => ({ km: t.km_end as number, recorded_at: t.date as string, source: "trip_log" as const }))
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));

  const all = [...vehicleRecords, ...tripRecords].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
  const latest = all[0];

  if (latest) {
    return { km: latest.km, recordedAt: latest.recorded_at, source: latest.source };
  }

  if (vychozi !== null) {
    return { km: vychozi, recordedAt: input.datum_zahajeni_leasingu, source: "initial" };
  }

  return null;
}

export interface LeasingMileageResult {
  currentKm: number | null;
  currentKmAt: string | null;
  currentKmSource: "vehicle_mileage" | "trip_log" | "initial" | null;
  startKm: number | null;
  totalContractKm: number | null;
  elapsedMonths: number;
  totalMonths: number | null;
  expectedKmNow: number | null;
  differenceKm: number | null;
  percentageUsed: number | null;
  projectedEndKm: number | null;
  projectedOverrun: number | null;
  monthlyAverage: number | null;
  status: "ok" | "watch" | "warning" | "critical" | "no-data";
}

export function computeLeasingMileage(
  input: LeasingMileageInput,
  currentMileage: { km: number; recordedAt: string | null } | null,
  referenceDate: Date = new Date()
): LeasingMileageResult {
  if (!isLeasingVehicle(input)) {
    return {
      currentKm: currentMileage?.km ?? null,
      currentKmAt: currentMileage?.recordedAt ?? null,
      currentKmSource: null,
      startKm: null,
      totalContractKm: null,
      elapsedMonths: 0,
      totalMonths: null,
      expectedKmNow: null,
      differenceKm: null,
      percentageUsed: null,
      projectedEndKm: null,
      projectedOverrun: null,
      monthlyAverage: null,
      status: "no-data",
    };
  }

  const from = parseDate(input.datum_zahajeni_leasingu);
  const to = parseDate(input.datum_ukonceni_leasingu);
  const totalContractKm = computeTotalContractKm(input);
  const startKm = parseNumber(input.vychozi_stav_tachometru) ?? 0;
  const currentKm = currentMileage?.km ?? null;
  const currentKmAt = currentMileage?.recordedAt ?? null;

  if (!from || !to || totalContractKm === null) {
    return {
      currentKm,
      currentKmAt,
      currentKmSource: null,
      startKm,
      totalContractKm,
      elapsedMonths: 0,
      totalMonths: null,
      expectedKmNow: null,
      differenceKm: null,
      percentageUsed: null,
      projectedEndKm: null,
      projectedOverrun: null,
      monthlyAverage: null,
      status: "no-data",
    };
  }

  const totalMonths = Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1);
  const elapsedDays = Math.max(0, differenceInDays(referenceDate, from));
  const totalDays = Math.max(1, differenceInDays(to, from));
  const elapsedMonths = elapsedDays / 30.44;
  const expectedKmNow = Math.round((elapsedDays / totalDays) * totalContractKm);

  let drivenKm: number | null = null;
  if (currentKm !== null) {
    drivenKm = Math.max(0, currentKm - startKm);
  }

  const percentageUsed = expectedKmNow > 0 && drivenKm !== null
    ? Math.round((drivenKm / expectedKmNow) * 100)
    : null;

  const differenceKm = drivenKm !== null ? drivenKm - expectedKmNow : null;

  let monthlyAverage: number | null = null;
  let projectedEndKm: number | null = null;
  let projectedOverrun: number | null = null;

  if (drivenKm !== null && elapsedMonths > 0) {
    monthlyAverage = Math.round(drivenKm / elapsedMonths);
    const remainingMonths = Math.max(0, totalMonths - elapsedMonths);
    projectedEndKm = Math.round(currentKm + monthlyAverage * remainingMonths);
    projectedOverrun = projectedEndKm - (startKm + totalContractKm);
  }

  let status: LeasingMileageResult["status"] = "no-data";
  if (percentageUsed === null) {
    status = "no-data";
  } else if (percentageUsed > 95) {
    status = "critical";
  } else if (percentageUsed >= 80) {
    status = "warning";
  } else if (percentageUsed >= 70) {
    status = "watch";
  } else {
    status = "ok";
  }

  return {
    currentKm,
    currentKmAt,
    currentKmSource: null,
    startKm,
    totalContractKm,
    elapsedMonths: Math.round(elapsedMonths),
    totalMonths,
    expectedKmNow,
    differenceKm,
    percentageUsed,
    projectedEndKm,
    projectedOverrun,
    monthlyAverage,
    status,
  };
}

export function statusColor(status: LeasingMileageResult["status"]): string {
  switch (status) {
    case "ok": return "bg-success";
    case "watch": return "bg-info";
    case "warning": return "bg-warning";
    case "critical": return "bg-destructive";
    default: return "bg-muted";
  }
}

export function statusText(status: LeasingMileageResult["status"]): string {
  switch (status) {
    case "ok": return "V pořádku";
    case "watch": return "Sledovat";
    case "warning": return "Varování";
    case "critical": return "Překročeno";
    default: return "Bez dat";
  }
}
