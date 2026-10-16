import { supabase } from "@/integrations/supabase/client";

/** Smaže záznam tankování včetně navázané účtenky (dokument + soubor). */
export async function deleteFuelRecord(record: { id: string; document_id?: string | null }, docPath?: string) {
  const { error } = await supabase.from("fuel_records").delete().eq("id", record.id);
  if (error) throw error;
  if (record.document_id) {
    const { error: e1 } = await supabase.from("vehicle_documents").delete().eq("id", record.document_id);
    if (e1) console.warn("Úklid dokumentu selhal", e1);
  }
  if (docPath) {
    const { error: e2 } = await supabase.storage.from("vehicle-documents").remove([docPath]);
    if (e2) console.warn("Úklid souboru selhal", e2);
  }
}

export function canDeleteFuel(
  r: { user_id?: string; created_at?: string },
  userId: string | undefined,
  isManager: boolean,
) {
  if (isManager) return true;
  if (!userId || r.user_id !== userId || !r.created_at) return false;
  return new Date(r.created_at).toDateString() === new Date().toDateString();
}
