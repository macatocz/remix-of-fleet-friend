// Offline queue for trip log entries using IndexedDB.
// When the device has no connectivity, trips are stored locally and flushed when back online.
import { openDB, type IDBPDatabase } from "idb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DB_NAME = "cmfleet-offline";
const STORE = "trip_queue";

export interface QueuedTrip {
  id?: number;
  payload: Record<string, any>;
  created_at: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueTrip(payload: Record<string, any>) {
  const d = await db();
  await d.add(STORE, { payload, created_at: new Date().toISOString() });
}

export async function pendingCount(): Promise<number> {
  const d = await db();
  return d.count(STORE);
}

export async function listPending(): Promise<QueuedTrip[]> {
  const d = await db();
  return d.getAll(STORE);
}

export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  const d = await db();
  const items = (await d.getAll(STORE)) as QueuedTrip[];
  let ok = 0, fail = 0;
  for (const item of items) {
    const { error } = await supabase.from("trip_logs").insert(item.payload as any);
    if (!error) { await d.delete(STORE, item.id!); ok++; }
    else { fail++; }
  }
  return { ok, fail };
}

let started = false;
export function startOfflineSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  const tryFlush = async () => {
    if (!navigator.onLine) return;
    const n = await pendingCount();
    if (n === 0) return;
    const { ok, fail } = await flushQueue();
    if (ok > 0) toast.success(`Synchronizováno ${ok} offline jízd${ok > 1 ? "" : "a"}`);
    if (fail > 0) toast.error(`${fail} jízd se nepodařilo synchronizovat`);
  };
  window.addEventListener("online", tryFlush);
  // Try once on startup
  setTimeout(tryFlush, 1500);
}