import { useEffect } from "react";

/**
 * Calls `refreshFn` whenever:
 * 1. The browser tab becomes visible again (user switches back)
 * 2. The window regains focus (user comes back from another window)
 *
 * This avoids stale data without needing manual page reloads.
 */
export function useAutoRefresh(refreshFn: () => void) {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshFn();
    };
    const handleFocus = () => refreshFn();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshFn]);
}
