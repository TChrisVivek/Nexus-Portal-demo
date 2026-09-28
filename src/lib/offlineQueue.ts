/**
 * CMM Grid — Offline Queue (IndexedDB)
 *
 * When the device is offline, any mutating API call (POST / PUT / DELETE / PATCH)
 * is saved here instead. When the device comes back online, all queued requests
 * are replayed in order against the real API server.
 */

const DB_NAME = "cmm-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "queue";

export interface QueuedRequest {
  id?: number;
  url: string;
  method: string;
  body: string | null;
  headers: Record<string, string>;
  timestamp: number;
  label: string; // human-readable description e.g. "Add Product"
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue(item: Omit<QueuedRequest, "id">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dequeueAll(): Promise<QueuedRequest[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedRequest[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeItem(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function queueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Replay ──────────────────────────────────────────────────────────────────

export interface SyncResult {
  succeeded: number;
  failed: number;
}

/**
 * Replays all queued requests. Returns a summary.
 * Call this when the browser goes online.
 */
export async function replayQueue(
  onProgress?: (done: number, total: number) => void
): Promise<SyncResult> {
  const queue = await dequeueAll();
  const total = queue.length;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body ?? undefined,
      });

      if (res.ok) {
        await removeItem(item.id!);
        succeeded++;
      } else {
        // Server-side error — keep in queue for manual retry
        failed++;
      }
    } catch {
      // Network still down for this item
      failed++;
    }
    onProgress?.(i + 1, total);
  }

  return { succeeded, failed };
}

// ─── Offline-aware fetch wrapper ─────────────────────────────────────────────

/**
 * Use this instead of `fetch` for all mutating calls.
 * - If online → passes through to real fetch.
 * - If offline → saves to IndexedDB queue and returns a fake 202 response.
 */
export async function offlineFetch(
  url: string,
  options: RequestInit & { offlineLabel?: string } = {}
): Promise<Response> {
  const { offlineLabel = "Action", ...fetchOptions } = options;

  if (navigator.onLine) {
    return fetch(url, fetchOptions);
  }

  // Save to queue
  await enqueue({
    url,
    method: fetchOptions.method ?? "POST",
    body:
      fetchOptions.body != null
        ? typeof fetchOptions.body === "string"
          ? fetchOptions.body
          : JSON.stringify(fetchOptions.body)
        : null,
    headers: (fetchOptions.headers as Record<string, string>) ?? {
      "Content-Type": "application/json",
    },
    timestamp: Date.now(),
    label: offlineLabel,
  });

  // Return a fake 202 Accepted so the caller knows it was queued
  return new Response(
    JSON.stringify({ queued: true, offline: true }),
    {
      status: 202,
      headers: { "Content-Type": "application/json" },
    }
  );
}
