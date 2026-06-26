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