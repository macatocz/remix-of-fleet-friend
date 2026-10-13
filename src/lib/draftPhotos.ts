/** Tiny IndexedDB store for draft photos (survives app reload). */
const DB = "cmfleet-drafts";
const STORE = "photos";

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function saveDraftPhotos(key: string, files: File[]) {
  try {
    const d = await db();
    const data = await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, buf: await f.arrayBuffer() })));
    d.transaction(STORE, "readwrite").objectStore(STORE).put(data, key);
  } catch {}
}

export async function loadDraftPhotos(key: string): Promise<File[]> {
  try {
    const d = await db();
    const data: any[] = await new Promise((res) => {
      const r = d.transaction(STORE).objectStore(STORE).get(key);
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => res([]);
    });
    return data.map((x) => new File([x.buf], x.name, { type: x.type }));
  } catch { return []; }
}

export async function clearDraftPhotos(key: string) {
  try { const d = await db(); d.transaction(STORE, "readwrite").objectStore(STORE).delete(key); } catch {}
}
