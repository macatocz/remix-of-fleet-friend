// Offline queue for mobile writes (trips, reservations, incidents) using IndexedDB.
// When the device has no connectivity, records are stored locally and flushed when back online.
import { openDB, type IDBPDatabase } from "idb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DB_NAME = "cmfleet-offline";
const STORE = "trip_queue";
const OPS = "op_queue";

export type OfflineTable = "trip_logs" | "reservations" | "incidents";

export interface QueuedOp {
  id?: number;
  table: OfflineTable;
  payload: Record<string, any>;
  created_at: string;
}

export interface QueuedTrip {
  id?: number;
  payload: Record<string, any>;
  created_at: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
        if (!d.objectStoreNames.contains(OPS)) {
          d.createObjectStore(OPS, { keyPath: "id", autoIncrement: true });
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

export async function enqueueOp(table: OfflineTable, payload: Record<string, any>) {
  const d = await db();
  await d.add(OPS, { table, payload, created_at: new Date().toISOString() });
}

/**
 * Insert online, or queue locally when offline / on network failure.
 * Returns "online" | "queued" | { error } for real (non-network) errors.
 */
export async function insertOrQueue(
  table: OfflineTable,
  payload: Record<string, any>,
): Promise<{ status: "online" } | { status: "queued" } | { status: "error"; message: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueOp(table, payload);
    return { status: "queued" };
  }
  try {
    const { error } = await supabase.from(table).insert(payload as any);
    if (!error) return { status: "online" };
    const networkish = /fetch|network|Failed to fetch|timeout/i.test(error.message || "");
    if (networkish) {
      await enqueueOp(table, payload);
      return { status: "queued" };
    }
    return { status: "error", message: error.message };
  } catch (e: any) {
    await enqueueOp(table, payload);
    return { status: "queued" };
  }
}

export async function pendingCount(): Promise<number> {
  const d = await db();
  const [a, b] = await Promise.all([d.count(STORE), d.count(OPS)]);
  return a + b;
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
  const ops = (await d.getAll(OPS)) as QueuedOp[];
  for (const op of ops) {
    const { error } = await supabase.from(op.table).insert(op.payload as any);
    if (!error) { await d.delete(OPS, op.id!); ok++; }
    else if (!/fetch|network|Failed to fetch|timeout/i.test(error.message || "")) {
      // permanent error – drop it so the queue does not get stuck
      await d.delete(OPS, op.id!); fail++;
    } else { fail++; }
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
    if (ok > 0) toast.success(`Synchronizováno ${ok} offline ${ok > 1 ? "záznamů" : "záznam"}`);
    if (fail > 0) toast.error(`${fail} záznamů se nepodařilo synchronizovat`);
    window.dispatchEvent(new CustomEvent("offline-queue-changed"));
  };
  window.addEventListener("online", tryFlush);
  // Try once on startup
  setTimeout(tryFlush, 1500);
}