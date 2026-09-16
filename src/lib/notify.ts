import { supabase } from "@/integrations/supabase/client";

export interface NotifyParams {
  user_ids: string[];
  type: string;
  title: string;
  body?: string;
  link?: string;
  vehicle_id?: string;
  reservation_id?: string;
}

export async function notify(params: NotifyParams) {
  if (!params.user_ids?.length) return;
  try {
    await supabase.functions.invoke("notify-send", { body: params });
  } catch (e) {
    console.warn("notify failed", e);
  }
}

/** Najde user_id řidiče podle celého jména "Jméno Příjmení" (obě pořadí). */
export async function findDriverUserId(driverName?: string | null): Promise<string | null> {
  const name = (driverName || "").trim();
  if (!name) return null;
  const parts = name.split(/\s+/);
  const first = parts[0] || "";
  const last = parts.slice(1).join(" ") || first;
  const { data } = await supabase
    .from("drivers")
    .select("user_id")
    .or(
      `and(first_name.ilike.${first},last_name.ilike.${last}),and(first_name.ilike.${last},last_name.ilike.${first})`
    )
    .not("user_id", "is", null)
    .limit(1);
  return (data?.[0] as any)?.user_id ?? null;
}

export interface ReservationStatusNotifyInput {
  id: string;
  driver_name?: string | null;
  vehicle_id?: string | null;
  vehicleLabel?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  time_from?: string | null;
  time_to?: string | null;
  reason?: string | null;
}

const csDate = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("cs-CZ") : "";

/** Odešle řidiči notifikaci o schválení / zamítnutí jeho rezervace. */
export async function notifyReservationStatus(
  status: string,
  res: ReservationStatusNotifyInput
) {
  if (status !== "schváleno" && status !== "zamítnuto") return;
  const userId = await findDriverUserId(res.driver_name);
  if (!userId) return;

  const approved = status === "schváleno";
  const term = `${csDate(res.date_from)} ${(res.time_from || "").slice(0, 5)}${
    res.date_to && res.date_to !== res.date_from ? ` – ${csDate(res.date_to)}` : ""
  } ${(res.time_to || "").slice(0, 5)}`.replace(/\s+/g, " ").trim();
  const vehicle = res.vehicleLabel ? `${res.vehicleLabel} · ` : "";

  await notify({
    user_ids: [userId],
    type: approved ? "reservation_approved" : "reservation_rejected",
    title: approved ? "Rezervace schválena" : "Rezervace zamítnuta",
    body: approved
      ? `${vehicle}${term}`
      : `${vehicle}${term}${res.reason ? ` — důvod: ${res.reason}` : ""}`,
    link: "/m/rezervace",
    vehicle_id: res.vehicle_id || undefined,
    reservation_id: res.id,
  });
}