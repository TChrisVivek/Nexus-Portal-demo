"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, FolderKanban, ArrowLeftRight,
  BarChart3, Settings, Zap, Menu, X, Users, Wallet,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useOffline } from "@/components/OfflineProvider";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inventory", icon: Package, label: "Inventory" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/allocations", icon: ArrowLeftRight, label: "Allocations" },
  { href: "/labour", icon: Users, label: "Labour" },
  { href: "/budget", icon: Wallet, label: "Budget" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface Branding {
  companyName: string;
  companyLogo: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isOnline, pendingCount, mounted } = useOffline();
  const effectiveOnline = !mounted || isOnline;
  const [branding, setBranding] = useState<Branding>({ companyName: "CMM Grid", companyLogo: "" });

  const fetchBranding = () => {
    fetch("/api/branding", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setBranding({ companyName: data.companyName || "CMM Grid", companyLogo: data.companyLogo || "" });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBranding();

    // Listen for settings-saved signal — works BOTH same-tab (CustomEvent) and cross-tab (StorageEvent)
    const onCustom = () => fetchBranding();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cmm-settings-saved") fetchBranding();
    };

    window.addEventListener("cmm-settings-saved", onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cmm-settings-saved", onCustom);
      window.removeEventListener("storage", onStorage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive the subtitle from the company name (everything after the first word, or a short suffix)
  const nameParts = branding.companyName.trim().split(/\s+/);
  const nameTitle = nameParts[0] || "CMM Grid";
  const nameSubtitle = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-blue-600 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 flex flex-col bg-white",
          "border-r border-gray-200 shadow-[1px_0_0_0_#e2e8f0,2px_0_12px_rgba(0,0,0,0.04)]",
          "transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top accent stripe */}
        <div className="h-[3px] w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 flex-shrink-0" />

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className={cn(
            "flex items-center justify-center w-9 h-9 rounded-xl shadow-sm flex-shrink-0 overflow-hidden",
            branding.companyLogo
              ? "bg-transparent"
              : "bg-gradient-to-br from-blue-500 to-blue-700"
          )}>
            {branding.companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.companyLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Zap size={17} className="text-white" strokeWidth={2.5} />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-900 tracking-tight leading-none truncate">{nameTitle}</p>
            {nameSubtitle && (
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest mt-0.5 truncate">{nameSubtitle}</p>
            )}
          </div>
        </div>

        {/* Nav section label */}
        <p className="px-5 pt-5 pb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex-shrink-0">
          Main Menu
        </p>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setIsMobileOpen(false)}
                suppressHydrationWarning
                className={cn("sidebar-item group", isActive && "active")}
              >
                <Icon
                  size={16}
                  suppressHydrationWarning
                  className={cn(
                    "flex-shrink-0 transition-colors",
                    isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                  )}
                />
                <span className="flex-1 truncate">{label}</span>
              </Link>
            );
          })}

          {/* Admin and Sign Out */}
          <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
            <button
              onClick={async () => {
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  for (const r of regs) await r.unregister();
                }
                await signOut({ redirect: false });
                window.location.href = "/?t=" + Date.now();
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </nav>

        {/* Footer — status */}
        <div className={cn(
          "flex-shrink-0 mx-3 mb-4 p-3 rounded-xl border transition-colors duration-300",
          effectiveOnline ? "bg-gray-50 border-gray-100" : "bg-amber-50 border-amber-200"
        )}>
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1">
              <p className={cn(
                "text-[11px] font-semibold",
                effectiveOnline ? "text-emerald-700" : "text-amber-700"
              )}>
                {effectiveOnline ? "System Online" : "Offline Mode"}
              </p>
            </div>
            {!effectiveOnline && pendingCount > 0 && (
              <span className="flex-shrink-0 text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
