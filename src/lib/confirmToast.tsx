"use client";

import toast from "react-hot-toast";
import { AlertTriangle, HelpCircle } from "lucide-react";

// Fixed ID ensures only ONE confirm dialog exists at a time.
// Any new call automatically replaces/dismisses the previous one.
const CONFIRM_TOAST_ID = "cmm-confirm-dialog";

interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export const confirmAction = (
  message: string,
  options: ConfirmOptions = {}
): Promise<boolean> => {
  const { confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false } = options;

  // Dismiss any previously open confirm dialog before showing a new one
  toast.dismiss(CONFIRM_TOAST_ID);

  const accent = danger ? "#dc2626" : "#2563eb";
  const iconBg = danger ? "rgba(220,38,38,0.08)" : "rgba(37,99,235,0.08)";
  const iconBorder = danger ? "rgba(220,38,38,0.2)" : "rgba(37,99,235,0.2)";
  const confirmColor = danger ? "#dc2626" : "#2563eb";

  return new Promise((resolve) => {
    toast.custom(
      (t) => (
        <div
          style={{
            transform: t.visible ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.96)",
            opacity: t.visible ? 1 : 0,
            transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
            width: "380px",
            maxWidth: "calc(100vw - 32px)",
            pointerEvents: "auto",
          }}
        >
          <div style={{
            background: "#ffffff",
            border: `1px solid ${iconBorder}`,
            borderRadius: "16px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}>
            {/* Top accent bar */}
            <div style={{ height: "3px", background: accent, opacity: 0.8 }} />

            {/* Body */}
            <div style={{ padding: "20px 20px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                {/* Icon */}
                <div style={{
                  width: "38px", height: "38px", borderRadius: "10px",
                  background: iconBg, border: `1px solid ${iconBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {danger
                    ? <AlertTriangle size={18} color={accent} strokeWidth={2} />
                    : <HelpCircle size={18} color={accent} strokeWidth={2} />
                  }
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: "11px", fontWeight: 700, color: accent,
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    marginBottom: "4px", lineHeight: 1,
                  }}>
                    {danger ? "Confirm Deletion" : "Confirmation"}
                  </p>
                  <p style={{ fontSize: "13.5px", fontWeight: 500, color: "#0f172a", lineHeight: 1.5 }}>
                    {message}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "#f1f5f9", margin: "0 20px" }} />

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px", padding: "14px 20px 16px" }}>
              <button
                onClick={() => { toast.dismiss(CONFIRM_TOAST_ID); resolve(false); }}
                style={{
                  flex: 1, padding: "9px 16px", borderRadius: "9px",
                  border: "1px solid #e2e8f0", background: "#f8fafc",
                  color: "#475569", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9";
                  (e.currentTarget as HTMLButtonElement).style.color = "#0f172a";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc";
                  (e.currentTarget as HTMLButtonElement).style.color = "#475569";
                }}
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => { toast.dismiss(CONFIRM_TOAST_ID); resolve(true); }}
                style={{
                  flex: 1, padding: "9px 16px", borderRadius: "9px",
                  border: `1px solid ${iconBorder}`, background: iconBg,
                  color: confirmColor, fontSize: "13px", fontWeight: 700, cursor: "pointer",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.filter = "brightness(0.92)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.filter = "none";
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ),
      {
        id: CONFIRM_TOAST_ID,   // ← KEY FIX: same ID = only one dialog at a time
        duration: Infinity,
        position: "top-center",
      }
    );
  });
};
