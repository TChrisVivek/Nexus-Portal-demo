"use client";

/**
 * CMM Grid — Offline Provider
 *
 * Wraps the app and:
 * 1. Watches navigator.onLine / window events
 * 2. Shows an "Offline Mode" banner when disconnected
 * 3. Auto-replays the offline queue when connectivity returns
 * 4. Shows a sync toast with progress
 * 5. Exports useOffline() hook for any component to read online state + queue count
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  replayQueue,
  queueCount,
  type SyncResult,
} from "@/lib/offlineQueue";
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface OfflineCtx {
  isOnline: boolean;
  pendingCount: number;
  mounted: boolean;
  triggerSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineCtx>({
  isOnline: true,
  pendingCount: 0,
  mounted: true,
  triggerSync: async () => {},
});

export function useOffline() {
  return useContext(OfflineContext);
}

type ToastState =
  | { type: "idle" }
  | { type: "syncing"; done: number; total: number }
  | { type: "success"; result: SyncResult }
  | { type: "error"; message: string };

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  // Start as true (assume online) to match server render, then sync real state after mount
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState<ToastState>({ type: "idle" });
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    const count = await queueCount();
    setPendingCount(count);
  }, []);

  // Dismiss toast after delay
  const scheduleToastDismiss = useCallback((ms = 4000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast({ type: "idle" });
    }, ms);
  }, []);

  // Replay the queue
  const triggerSync = useCallback(async () => {
    const count = await queueCount();
    if (count === 0) return;

    setToast({ type: "syncing", done: 0, total: count });

    try {
      const result = await replayQueue((done, total) => {
        setToast({ type: "syncing", done, total });
      });

      await refreshCount();

      if (result.failed === 0) {
        setToast({ type: "success", result });
      } else {
        setToast({
          type: "error",
          message: `${result.succeeded} uploaded, ${result.failed} failed — will retry later`,
        });
      }
      scheduleToastDismiss(5000);
    } catch {
      setToast({ type: "error", message: "Sync failed — will retry when online" });
      scheduleToastDismiss(5000);
    }
  }, [refreshCount, scheduleToastDismiss]);

  // Online / offline event listeners
  useEffect(() => {
    // Sync real online state after mount (avoids SSR hydration mismatch)
    setMounted(true);
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) refreshCount();

    const handleOnline = async () => {
      setIsOnline(true);
      await refreshCount();
      // Small delay to let the network stabilise
      setTimeout(() => triggerSync(), 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ type: "idle" });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Also listen for the service-worker-triggered sync
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_SYNC_TRIGGER") {
        triggerSync();
      }
    };
    navigator.serviceWorker?.addEventListener("message", handleSWMessage);

    // Initial count
    refreshCount();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleSWMessage);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [refreshCount, triggerSync]);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, mounted, triggerSync }}>
      {children}

      {/* ── Offline banner ─────────────────────────────────────────────── */}
      <div
        className={`offline-banner ${mounted && !isOnline ? "offline-banner--visible" : ""}`}
        role="alert"
        aria-live="polite"
      >
        <WifiOff size={14} className="flex-shrink-0" />
        <span>
          <strong>Offline Mode</strong> — changes are saved locally and will sync when you reconnect.
          {pendingCount > 0 && (
            <span className="offline-banner__badge">{pendingCount} queued</span>
          )}
        </span>
      </div>

      {/* ── Sync toast ─────────────────────────────────────────────────── */}
      {toast.type !== "idle" && (
        <div className="sync-toast" role="status" aria-live="polite">
          {toast.type === "syncing" && (
            <>
              <RefreshCw size={15} className="sync-toast__icon sync-toast__icon--spin" />
              <span>
                Syncing{" "}
                <strong>
                  {toast.done}/{toast.total}
                </strong>{" "}
                item{toast.total !== 1 ? "s" : ""}…
              </span>
            </>
          )}
          {toast.type === "success" && (
            <>
              <CheckCircle2 size={15} className="sync-toast__icon sync-toast__icon--success" />
              <span>
                All synced!{" "}
                <strong>{toast.result.succeeded}</strong> item
                {toast.result.succeeded !== 1 ? "s" : ""} uploaded ✓
              </span>
            </>
          )}
          {toast.type === "error" && (
            <>
              <AlertCircle size={15} className="sync-toast__icon sync-toast__icon--error" />
              <span>{toast.message}</span>
            </>
          )}
        </div>
      )}
    </OfflineContext.Provider>
  );
}
