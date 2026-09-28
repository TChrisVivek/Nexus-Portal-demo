"use client";

import toast, { useToaster, resolveValue } from "react-hot-toast";
import type { Toast } from "react-hot-toast";
import { useEffect, useState } from "react";
import {
  CheckCircle2, XCircle, Info, Loader2, X,
} from "lucide-react";

/* ─── Per-type config ───────────────────────────────────────────── */
const CONFIG = {
  success: {
    icon: CheckCircle2,
    accent: "#16a34a",
    bg: "rgba(22,163,74,0.08)",
    border: "rgba(22,163,74,0.2)",
    iconColor: "#16a34a",
    label: "Success",
  },
  error: {
    icon: XCircle,
    accent: "#dc2626",
    bg: "rgba(220,38,38,0.08)",
    border: "rgba(220,38,38,0.2)",
    iconColor: "#dc2626",
    label: "Error",
  },
  loading: {
    icon: Loader2,
    accent: "#2563eb",
    bg: "rgba(37,99,235,0.08)",
    border: "rgba(37,99,235,0.2)",
    iconColor: "#2563eb",
    label: "Please wait",
  },
  blank: {
    icon: Info,
    accent: "#2563eb",
    bg: "rgba(37,99,235,0.06)",
    border: "rgba(37,99,235,0.15)",
    iconColor: "#2563eb",
    label: "Info",
  },
  custom: {
    icon: Info,
    accent: "#2563eb",
    bg: "rgba(37,99,235,0.06)",
    border: "rgba(37,99,235,0.15)",
    iconColor: "#2563eb",
    label: "Info",
  },
} as const;

const DURATION = 3500; // ms for non-loading toasts

/* ─── Single toast card ─────────────────────────────────────────── */
function ToastCard({ t, dismiss }: { t: Toast; dismiss: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const isLoading = t.type === "loading";
  const cfg = CONFIG[t.type] ?? CONFIG.blank;
  const Icon = cfg.icon;
  const message = resolveValue(t.message, t);

  // Progress bar countdown
  useEffect(() => {
    if (isLoading || !t.visible) return;
    const duration = (t.duration ?? DURATION);
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct === 0) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [t.visible, t.duration, isLoading]);

  return (
    <div
      style={{
        transform: t.visible ? "translateY(0) scale(1)" : "translateY(12px) scale(0.96)",
        opacity: t.visible ? 1 : 0,
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
        marginBottom: "10px",
        width: "360px",
        maxWidth: "calc(100vw - 32px)",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border: `1px solid ${cfg.border}`,
          borderRadius: "14px",
          boxShadow: `0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(255,255,255,0.8)`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Left accent bar */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          background: cfg.accent,
          borderRadius: "14px 0 0 14px",
        }} />

        {/* Body */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px 14px 20px" }}>
          {/* Icon */}
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: cfg.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <Icon
              size={16}
              color={cfg.iconColor}
              style={isLoading ? { animation: "spin 1s linear infinite" } : undefined}
            />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0, marginTop: "1px" }}>
            <p style={{
              fontSize: "11px",
              fontWeight: 700,
              color: cfg.iconColor,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "2px",
              lineHeight: 1,
            }}>
              {cfg.label}
            </p>
            <p style={{
              fontSize: "13.5px",
              fontWeight: 500,
              color: "#0f172a",
              lineHeight: 1.4,
              wordBreak: "break-word",
            }}>
              {typeof message === "string" ? message : null}
            </p>
          </div>

          {/* Dismiss button */}
          {!isLoading && (
            <button
              onClick={() => dismiss(t.id)}
              style={{
                flexShrink: 0,
                padding: "4px",
                borderRadius: "6px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s, color 0.15s",
                marginTop: "-2px",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9";
                (e.currentTarget as HTMLButtonElement).style.color = "#475569";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {!isLoading && (
          <div style={{ height: "3px", background: "#f1f5f9" }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: cfg.accent,
              opacity: 0.5,
              transition: "width 30ms linear",
              borderRadius: "0 0 2px 2px",
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Toaster container ─────────────────────────────────────────── */
export function ToastProvider() {
  const { toasts, handlers } = useToaster({ duration: DURATION });
  const { startPause, endPause } = handlers;

  const regularToasts = toasts.filter((t) => t.type !== "custom");
  const customToasts = toasts.filter((t) => t.type === "custom");

  return (
    <>
      {/* Global spin animation for loading toasts */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Regular toasts — bottom right */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "8px",
          pointerEvents: "none",
        }}
        onMouseEnter={startPause}
        onMouseLeave={endPause}
      >
        {regularToasts.map((t) => (
          <ToastCard key={t.id} t={t} dismiss={toast.dismiss} />
        ))}
      </div>

      {/* Custom toasts (confirmAction dialogs) — top center */}
      {customToasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            pointerEvents: "none",
          }}
        >
          {customToasts.map((t) => (
            <div key={t.id} style={{ pointerEvents: "auto" }}>
              {resolveValue(t.message, t)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}


