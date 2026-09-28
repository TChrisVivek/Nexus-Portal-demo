"use client";

import { useEffect, useState, useCallback } from "react";
import {
   Building2, SlidersHorizontal, FileText,
   Database, Save, CheckCircle, Download, Loader2,
   AlertTriangle, RefreshCw, ChevronRight,
   ShieldAlert, UserCheck, UserX, Ban, RotateCcw, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { SystemUser } from "@/lib/types";

interface SessionWithRole {
  user?: { name?: string | null; email?: string | null; image?: string | null; role?: string };
}

interface AppSettings {
   companyName: string;
   companyAddress: string;
   companyPhone: string;
   companyEmail: string;
   defaultLowStockThreshold: number;
   defaultDailyRate: number;
   currency: string;
   reportFooter: string;
   companyLogo: string;
}

const DEFAULT_SETTINGS: AppSettings = {
   companyName: "CMM Electricals",
   companyAddress: "",
   companyPhone: "",
   companyEmail: "",
   defaultLowStockThreshold: 50,
   defaultDailyRate: 600,
   currency: "INR",
   reportFooter: "Confidential — CMM Electricals",
   companyLogo: "",
};

const inputCls = "w-full px-3 py-2 text-sm rounded-lg bg-space-blue border border-glass-border text-text-primary focus:outline-none focus:border-cyan-glow/50 focus:ring-1 focus:ring-cyan-glow/20 transition-all placeholder:text-text-secondary/60";
const labelCls = "block text-xs font-medium text-text-secondary mb-1.5";

export default function SettingsPage() {
   const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [saved, setSaved] = useState(false);
   const [activeSection, setActiveSection] = useState("company");
   const [clearing, setClearing] = useState(false);
   const { data: session } = useSession();

   // Admin User State
   const [users, setUsers] = useState<SystemUser[]>([]);
   const [usersLoading, setUsersLoading] = useState(false);
   const [updatingUser, setUpdatingUser] = useState<string | null>(null);

   const load = useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/settings", { cache: "no-store" });
         if (res.ok) setSettings(await res.json());
      } catch (err) {
         console.error("[settings] load error:", err);
      } finally {
         setLoading(false);
      }
   }, []);

   const loadUsers = useCallback(async () => {
      if ((session as SessionWithRole)?.user?.role !== "ADMIN") return;
      setUsersLoading(true);
      try {
         const res = await fetch("/api/admin/users", { cache: "no-store" });
         if (res.ok) {
            const data = await res.json();
            setUsers(data.users || []);
         }
      } catch {
         toast.error("Could not fetch user list");
      } finally {
         setUsersLoading(false);
      }
   }, [session]);

   useEffect(() => { load(); loadUsers(); }, [load, loadUsers]);

   async function handleSave(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      setSaved(false);
      const res = await fetch("/api/settings", {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(settings),
      });
      if (res.ok) {
         setSettings(await res.json());
         setSaved(true);
         setTimeout(() => setSaved(false), 3000);
         // Signal sidebar to re-fetch branding (same-tab CustomEvent + cross-tab StorageEvent)
         window.dispatchEvent(new CustomEvent("cmm-settings-saved"));
         localStorage.setItem("cmm-settings-saved", Date.now().toString());
      }
      setSaving(false);
   }

   async function handleClearData() {
      const confirmed = window.confirm(
         "⚠️ CLEAR ALL DATA\n\nThis will permanently delete:\n• All inventory items\n• All projects\n• All workers & labour records\n• All allocations & attendance\n• All payments\n• Company settings (name, logo, etc.)\n\n✅ WHAT IS KEPT:\n• Your Google login accounts\n• Your Admin / User roles\n• You will still be able to sign in normally\n\nAre you absolutely sure?"
      );
      if (!confirmed) return;

      // Double-confirm for safety
      const reconfirmed = window.confirm("Final confirmation — delete all data? (Your login access is NOT affected)");
      if (!reconfirmed) return;

      setClearing(true);
      try {
         const res = await fetch("/api/settings/reset", { method: "POST" });
         if (res.ok) {
            toast.success("All data cleared. Reloading...");
            setTimeout(() => window.location.reload(), 1500);
         } else {
            const d = await res.json().catch(() => ({}));
            toast.error(d.error || "Failed to clear data");
         }
      } catch {
         toast.error("Network error while clearing data");
      } finally {
         setClearing(false);
      }
   }

   async function changeUserRole(email: string, role: string) {
      setUpdatingUser(email);
      try {
         const res = await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, role }),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Failed to update role");
         toast.success("Role updated successfully!");
         await loadUsers();
      } catch (err: unknown) {
         toast.error(err instanceof Error ? err.message : "Failed to update role");
      } finally {
         setUpdatingUser(null);
      }
   }

   function handleExportBackup() {
      fetch("/api/settings/backup")
         .then(r => r.json())
         .then(data => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `CMM_Grid_Backup_${new Date().toISOString().split("T")[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
         });
   }

   const isAdmin = (session as SessionWithRole)?.user?.role === "ADMIN";

   const sections = [
      { id: "company", label: "Company Profile", icon: Building2 },
      { id: "defaults", label: "App Defaults", icon: SlidersHorizontal },
      { id: "reports", label: "Report Branding", icon: FileText },
      ...(isAdmin ? [{ id: "access", label: "System Access", icon: ShieldAlert }] : []),
      { id: "data", label: "Data Management", icon: Database },
   ];

   if (loading) return (
      <div className="space-y-6 animate-fade-in">
         <div className="h-8 w-48 bg-space-blue-light rounded-lg animate-pulse" />
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="h-64 glass rounded-2xl animate-pulse" />
            <div className="lg:col-span-3 h-64 glass rounded-2xl animate-pulse" />
         </div>
      </div>
   );

   return (
      <form onSubmit={handleSave} className="space-y-6 animate-fade-in">

         {/* Header */}
         <div className="flex items-end justify-between gap-4">
            <div>
               <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
               <p className="text-text-secondary text-sm mt-1">Manage company details and application preferences.</p>
            </div>
            <div className="flex items-center gap-3">
               <button type="button" onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg glass glass-hover text-text-secondary hover:text-text-primary text-xs transition-all">
                  <RefreshCw size={13} />Reset
               </button>
               <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-bold shadow-cyan-sm hover:shadow-cyan-glow transition-all disabled:opacity-60"
               >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
                  {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
               </button>
            </div>
         </div>

         {saved && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-success/10 border border-success/25 text-success text-sm animate-fade-in">
               <CheckCircle size={16} />Settings saved successfully.
            </div>
         )}

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Left: Section nav */}
            <div className="glass rounded-2xl overflow-hidden border border-glass-border h-fit">
               {sections.map((s) => {
                  const Icon = s.icon;
                  const active = activeSection === s.id;
                  return (
                     <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveSection(s.id)}
                        className={cn(
                           "w-full flex items-center gap-3 px-4 py-3.5 text-sm transition-all text-left border-b border-glass-border/50 last:border-0",
                           active
                              ? "bg-cyan-glow/10 text-cyan-glow font-semibold"
                              : "text-text-secondary hover:text-text-primary hover:bg-space-blue-light"
                        )}
                     >
                        <Icon size={15} className={active ? "text-cyan-glow" : "text-text-secondary"} />
                        <span className="flex-1">{s.label}</span>
                        {active && <ChevronRight size={13} className="text-cyan-glow" />}
                     </button>
                  );
               })}
            </div>

            {/* Right: Section content */}
            <div className="lg:col-span-3 space-y-5">

               {/* ── Company Profile ── */}
               {activeSection === "company" && (
                  <div className="glass rounded-2xl overflow-hidden border border-glass-border animate-fade-in">
                     <div className="px-6 py-5 border-b border-glass-border flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-glow/10 border border-cyan-glow/20">
                           <Building2 size={17} className="text-cyan-glow" />
                        </div>
                        <div>
                           <h2 className="text-sm font-bold text-text-primary">Company Profile</h2>
                           <p className="text-xs text-text-secondary mt-0.5">Used in Excel report headers and system-wide branding</p>
                        </div>
                     </div>
                     <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Logo upload */}
                        <div className="sm:col-span-2">
                           <label className={labelCls}>Company Logo</label>
                           <div className="flex items-center gap-4">
                              {/* Preview */}
                              <div className="w-16 h-16 rounded-xl border border-glass-border bg-space-blue flex items-center justify-center flex-shrink-0 overflow-hidden">
                                 {settings.companyLogo ? (
                                     <>
                                       {/* eslint-disable-next-line @next/next/no-img-element */}
                                       <img src={settings.companyLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                                     </>
                                 ) : (
                                    <span className="text-2xl text-text-secondary font-black">?</span>
                                 )}
                              </div>
                              {/* Upload button */}
                              <div className="flex-1">
                                 <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-space-blue border border-glass-border text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-cyan-glow/40 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    {settings.companyLogo ? "Change Logo" : "Upload Logo"}
                                    <input
                                       type="file"
                                       accept="image/*"
                                       className="hidden"
                                       onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          if (file.size > 500 * 1024) {
                                             toast.error("Logo must be under 500 KB");
                                             return;
                                          }
                                          const reader = new FileReader();
                                          reader.onload = ev => {
                                             setSettings(s => ({ ...s, companyLogo: ev.target?.result as string }));
                                          };
                                          reader.readAsDataURL(file);
                                       }}
                                    />
                                 </label>
                                 {settings.companyLogo && (
                                    <button
                                       type="button"
                                       onClick={() => setSettings(s => ({ ...s, companyLogo: "" }))}
                                       className="ml-2 text-xs text-danger hover:opacity-80 transition-opacity"
                                    >
                                       Remove
                                    </button>
                                 )}
                                 <p className="text-[11px] text-text-secondary mt-1.5">PNG, JPG or SVG · Max 500 KB · Shown in the sidebar and reports</p>
                              </div>
                           </div>
                        </div>
                        <div className="sm:col-span-2">
                           <label className={labelCls}>Company Name *</label>
                           <input
                              required
                              value={settings.companyName}
                              onChange={e => setSettings(s => ({ ...s, companyName: e.target.value }))}
                              placeholder="CMM Electricals"
                              className={inputCls}
                           />
                           <p className="text-[11px] text-text-secondary mt-1">Appears as the bold header on all Excel reports</p>
                        </div>
                        <div className="sm:col-span-2">
                           <label className={labelCls}>Office Address</label>
                           <textarea
                              rows={2}
                              value={settings.companyAddress}
                              onChange={e => setSettings(s => ({ ...s, companyAddress: e.target.value }))}
                              placeholder="Shop 4, Main Market, Faridabad, Haryana"
                              className={cn(inputCls, "resize-none")}
                           />
                        </div>
                        <div>
                           <label className={labelCls}>Phone Number</label>
                           <input
                              value={settings.companyPhone}
                              onChange={e => setSettings(s => ({ ...s, companyPhone: e.target.value }))}
                              placeholder="+91 98xxx xxxxx"
                              className={inputCls}
                           />
                        </div>
                        <div>
                           <label className={labelCls}>Email Address</label>
                           <input
                              type="email"
                              value={settings.companyEmail}
                              onChange={e => setSettings(s => ({ ...s, companyEmail: e.target.value }))}
                              placeholder="accounts@cmmelectricals.in"
                              className={inputCls}
                           />
                        </div>
                     </div>
                  </div>
               )}

               {/* ── App Defaults ── */}
               {activeSection === "defaults" && (
                  <div className="glass rounded-2xl overflow-hidden border border-glass-border animate-fade-in">
                     <div className="px-6 py-5 border-b border-glass-border flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-accent/10 border border-purple-accent/20">
                           <SlidersHorizontal size={17} className="text-purple-soft" />
                        </div>
                        <div>
                           <h2 className="text-sm font-bold text-text-primary">App Defaults</h2>
                           <p className="text-xs text-text-secondary mt-0.5">Pre-filled values when creating new inventory items or workers</p>
                        </div>
                     </div>
                     <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                           <div>
                              <label className={labelCls}>Default Low Stock Threshold</label>
                              <div className="relative">
                                 <input
                                    type="number" min={1}
                                    value={settings.defaultLowStockThreshold}
                                    onChange={e => setSettings(s => ({ ...s, defaultLowStockThreshold: Number(e.target.value) }))}
                                    className={cn(inputCls, "tabular-nums")}
                                 />
                              </div>
                              <p className="text-[11px] text-text-secondary mt-1">Pre-filled when adding a new inventory item</p>
                           </div>
                           <div>
                              <label className={labelCls}>Default Daily Rate (&#8377;)</label>
                              <input
                                 type="number" min={1}
                                 value={settings.defaultDailyRate}
                                 onChange={e => setSettings(s => ({ ...s, defaultDailyRate: Number(e.target.value) }))}
                                 className={cn(inputCls, "tabular-nums")}
                              />
                              <p className="text-[11px] text-text-secondary mt-1">Pre-filled when registering a new worker</p>
                           </div>
                        </div>

                        <div className="rounded-xl border border-glass-border bg-space-blue px-5 py-4">
                           <p className="text-xs font-semibold text-text-primary mb-1">Currency</p>
                           <div className="flex gap-3 mt-2">
                              {["INR", "USD", "AED"].map((c) => (
                                 <button
                                    key={c}
                                    type="button"
                                    onClick={() => setSettings(s => ({ ...s, currency: c }))}
                                    className={cn(
                                       "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                                       settings.currency === c
                                          ? "bg-cyan-glow/10 border-cyan-glow/30 text-cyan-glow"
                                          : "border-glass-border text-text-secondary hover:text-text-primary hover:bg-space-blue-light"
                                    )}
                                 >{c}</button>
                              ))}
                           </div>
                           <p className="text-[11px] text-text-secondary mt-2">Display currency throughout the app (cosmetic only — all stored values are in ₹)</p>
                        </div>
                     </div>
                  </div>
               )}

               {/* ── Report Branding ── */}
               {activeSection === "reports" && (
                  <div className="glass rounded-2xl overflow-hidden border border-glass-border animate-fade-in">
                     <div className="px-6 py-5 border-b border-glass-border flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-warning/10 border border-warning/20">
                           <FileText size={17} className="text-warning" />
                        </div>
                        <div>
                           <h2 className="text-sm font-bold text-text-primary">Report Branding</h2>
                           <p className="text-xs text-text-secondary mt-0.5">Customise how your Excel reports look and what they say</p>
                        </div>
                     </div>
                     <div className="p-6 space-y-5">
                        <div>
                           <label className={labelCls}>Report Header (Company Name)</label>
                           <input
                              value={settings.companyName}
                              onChange={e => setSettings(s => ({ ...s, companyName: e.target.value }))}
                              placeholder="CMM Electricals"
                              className={inputCls}
                           />
                           <p className="text-[11px] text-text-secondary mt-1">Row 1 of every downloaded Excel sheet — large dark navy bold text</p>
                        </div>
                        <div>
                           <label className={labelCls}>Report Footer / Confidentiality Note</label>
                           <input
                              value={settings.reportFooter}
                              onChange={e => setSettings(s => ({ ...s, reportFooter: e.target.value }))}
                              placeholder="Confidential — CMM Electricals"
                              className={inputCls}
                           />
                           <p className="text-[11px] text-text-secondary mt-1">Small note shown as file metadata (future use)</p>
                        </div>

                        {/* Preview */}
                        <div className="rounded-xl border border-glass-border overflow-hidden">
                           <div className="px-4 py-2 bg-space-blue border-b border-glass-border">
                              <span className="text-[10px] text-text-secondary uppercase tracking-wider">Excel Preview (Row 1–3)</span>
                           </div>
                           <div className="divide-y divide-glass-border/40">
                              <div className="px-4 py-3 bg-[#1B2B4B]/60 flex items-center gap-2">
                                 <span className="text-xs font-bold text-white">{settings.companyName || "CMM Electricals"}</span>
                                 <span className="text-[10px] text-white/40 ml-auto">Row 1 — Company header (navy)</span>
                              </div>
                              <div className="px-4 py-2.5 bg-[#2D4F82]/50 flex items-center gap-2">
                                 <span className="text-xs text-white/80">Inventory Report — Generated: 03 Apr 2026</span>
                                 <span className="text-[10px] text-white/30 ml-auto">Row 2 — Report title (blue)</span>
                              </div>
                              <div className="px-4 py-2.5 bg-[#1F4E79]/60 flex items-center gap-2">
                                 <span className="text-[11px] font-semibold text-white/90">SKU · Product Name · Unit · &hellip;</span>
                                 <span className="text-[10px] text-white/30 ml-auto">Row 3 — Column headers (dark blue)</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* ── System Access ── */}
               {activeSection === "access" && isAdmin && (
                  <div className="glass rounded-2xl overflow-hidden border border-glass-border animate-fade-in">

                     {/* Header */}
                     <div className="px-6 py-5 border-b border-glass-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="p-2 rounded-xl bg-warning/10 border border-warning/20">
                              <ShieldAlert size={17} className="text-warning" />
                           </div>
                           <div>
                              <h2 className="text-sm font-bold text-text-primary">System Access &amp; Personnel</h2>
                              <p className="text-xs text-text-secondary mt-0.5">Approve, revoke, or block user access to the dashboard</p>
                           </div>
                        </div>
                        <button
                           type="button"
                           onClick={loadUsers}
                           className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-space-blue border border-glass-border text-xs text-text-secondary hover:text-cyan-glow transition-all"
                        >
                           <RefreshCw size={13} className={usersLoading ? "animate-spin" : ""} />
                           Refresh
                        </button>
                     </div>

                     {/* Pending banner */}
                     {users.filter(u => u.role === "PENDING").length > 0 && (
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-warning/5 border-b border-warning/15 text-xs font-semibold text-warning">
                           <ShieldAlert size={12} />
                           {users.filter(u => u.role === "PENDING").length} user{users.filter(u => u.role === "PENDING").length > 1 ? "s" : ""} waiting for approval
                        </div>
                     )}

                     {/* Loading */}
                     {usersLoading && (
                        <div className="flex items-center justify-center gap-2 py-10 text-xs text-text-secondary">
                           <Loader2 size={14} className="animate-spin" /> Loading users…
                        </div>
                     )}

                     {/* Table */}
                     {!usersLoading && (
                        <div className="overflow-x-auto">
                           <table className="w-full text-left text-sm">
                              <thead className="bg-space-blue/30 text-text-secondary text-xs uppercase tracking-wider">
                                 <tr>
                                    <th className="px-5 py-3 font-semibold">User</th>
                                    <th className="px-5 py-3 font-semibold">Status</th>
                                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-glass-border/40">
                                 {users.map((u) => (
                                    <tr
                                       key={u.email}
                                       className={cn(
                                          "transition-colors",
                                          u.role === "PENDING" ? "bg-warning/[0.025]" : "hover:bg-space-blue/20"
                                       )}
                                    >
                                       <td className="px-5 py-3.5">
                                          <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-full bg-space-blue border border-glass-border flex items-center justify-center text-xs font-bold text-text-secondary flex-shrink-0">
                                                {u.name?.charAt(0)?.toUpperCase() || "?"}
                                             </div>
                                             <div>
                                                <p className="text-xs font-semibold text-text-primary">{u.name}</p>
                                                <p className="text-[11px] text-text-secondary font-mono mt-0.5">{u.email}</p>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-5 py-3.5">
                                          <span className={cn(
                                             "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                                             u.role === "ADMIN"   ? "bg-warning/15 text-warning border-warning/25" :
                                             u.role === "USER"    ? "bg-success/15 text-success border-success/25" :
                                             u.role === "PENDING" ? "bg-amber-400/15 text-amber-500 border-amber-400/25" :
                                                                    "bg-danger/10 text-danger border-danger/25"
                                          )}>
                                             <span className={cn(
                                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                u.role === "ADMIN"   ? "bg-warning" :
                                                u.role === "USER"    ? "bg-success" :
                                                u.role === "PENDING" ? "bg-amber-400" : "bg-danger"
                                             )} />
                                             {u.role === "ADMIN" ? "Admin" : u.role === "USER" ? "Active" : u.role === "PENDING" ? "Pending" : "Blocked"}
                                          </span>
                                       </td>
                                       <td className="px-5 py-3.5 text-right">
                                          {updatingUser === u.email ? (
                                             <span className="inline-flex items-center gap-1.5 text-text-secondary text-xs">
                                                <Loader2 size={12} className="animate-spin" /> Saving…
                                             </span>
                                          ) : (
                                             <div className="flex items-center justify-end gap-2">
                                                {/* Approve (for PENDING or REJECTED) */}
                                                {(u.role === "PENDING" || u.role === "REJECTED") && (
                                                   <button type="button" onClick={() => changeUserRole(u.email, "USER")}
                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-success/10 text-success border border-success/25 hover:bg-success/20 transition-all">
                                                      <UserCheck size={12} /> Approve
                                                   </button>
                                                )}
                                                {/* Revoke (for active USER) */}
                                                {u.role === "USER" && (
                                                   <button type="button" onClick={() => changeUserRole(u.email, "PENDING")}
                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary border border-glass-border bg-space-blue hover:bg-warning/10 hover:text-warning hover:border-warning/30 transition-all">
                                                      <UserX size={12} /> Revoke
                                                   </button>
                                                )}
                                                {/* Block (not for ADMIN or already REJECTED) */}
                                                {u.role !== "ADMIN" && u.role !== "REJECTED" && (
                                                   <button type="button" onClick={() => changeUserRole(u.email, "REJECTED")}
                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary border border-glass-border bg-space-blue hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-all">
                                                      <Ban size={12} /> Block
                                                   </button>
                                                )}
                                                {/* Unblock (for REJECTED) */}
                                                {u.role === "REJECTED" && (
                                                   <button type="button" onClick={() => changeUserRole(u.email, "PENDING")}
                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-warning/10 text-warning border border-warning/25 hover:bg-warning/20 transition-all">
                                                      <RotateCcw size={12} /> Unblock
                                                   </button>
                                                )}
                                                {/* Make Admin (for active USER only) */}
                                                {u.role === "USER" && (
                                                   <button type="button" onClick={() => changeUserRole(u.email, "ADMIN")}
                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary border border-glass-border bg-space-blue hover:bg-warning/10 hover:text-warning hover:border-warning/30 transition-all">
                                                      <ShieldAlert size={12} /> Make Admin
                                                   </button>
                                                )}
                                                {/* Remove Admin (for ADMIN users — protected server-side against last admin) */}
                                                {u.role === "ADMIN" && (
                                                   <button type="button" onClick={() => changeUserRole(u.email, "USER")}
                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary border border-glass-border bg-space-blue hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-all">
                                                      <UserX size={12} /> Remove Admin
                                                   </button>
                                                )}
                                             </div>
                                          )}
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                           {users.length === 0 && (
                              <div className="py-12 text-center">
                                 <ShieldAlert size={26} className="mx-auto mb-3 text-text-secondary opacity-25" />
                                 <p className="text-sm font-medium text-text-secondary">No users registered yet</p>
                                 <p className="text-xs text-text-secondary mt-1 opacity-50">Users appear here after their first sign-in</p>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               )}

                              {/* ── Data Management ── */}
               {activeSection === "data" && (
                  <div className="space-y-4 animate-fade-in">
                     {/* Backup */}
                     <div className="glass rounded-2xl overflow-hidden border border-glass-border">
                        <div className="px-6 py-5 border-b border-glass-border flex items-center gap-3">
                           <div className="p-2 rounded-xl bg-success/10 border border-success/20">
                              <Download size={17} className="text-success" />
                           </div>
                           <div>
                              <h2 className="text-sm font-bold text-text-primary">Export Data Backup</h2>
                              <p className="text-xs text-text-secondary mt-0.5">Download all your data as a JSON file for safekeeping</p>
                           </div>
                        </div>
                        <div className="p-6 space-y-4">
                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                 { label: "Inventory", color: "text-purple-soft" },
                                 { label: "Projects", color: "text-cyan-glow" },
                                 { label: "Labour", color: "text-success" },
                                 { label: "Allocations", color: "text-warning" },
                              ].map(({ label, color }) => (
                                 <div key={label} className="rounded-xl bg-space-blue border border-glass-border p-3 text-center">
                                    <span className={cn("text-xs font-semibold", color)}>{label}</span>
                                    <p className="text-[10px] text-text-secondary mt-0.5">included</p>
                                 </div>
                              ))}
                           </div>
                           <button
                              type="button"
                              onClick={handleExportBackup}
                              className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-success/10 border border-success/25 text-success text-sm font-semibold hover:bg-success/15 transition-all"
                           >
                              <Download size={16} />Download Full Backup (.json)
                           </button>
                           <p className="text-[11px] text-text-secondary">
                              Backup includes all products, projects, allocations, labour, attendance, payments, and settings.
                              Store this file securely — it can be used to restore data.
                           </p>
                        </div>
                     </div>

                     {/* Warning panel */}
                     <div className="glass rounded-2xl overflow-hidden border border-warning/20">
                        <div className="px-6 py-5 border-b border-warning/20 flex items-center gap-3">
                           <div className="p-2 rounded-xl bg-warning/10 border border-warning/20">
                              <AlertTriangle size={17} className="text-warning" />
                           </div>
                           <div>
                              <h2 className="text-sm font-bold text-text-primary">Data Storage Info</h2>
                              <p className="text-xs text-text-secondary mt-0.5">Current storage backend and migration status</p>
                           </div>
                        </div>
                        <div className="p-6 space-y-3">
                           <div className="flex items-center gap-3 text-sm">
                              <span className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
                              <span className="text-text-primary font-medium">Active Backend:</span>
                              <code className="text-cyan-glow font-mono text-xs bg-cyan-glow/5 px-2 py-0.5 rounded border border-cyan-glow/15">src/data/store.json</code>
                           </div>
                           <p className="text-xs text-text-secondary leading-relaxed">
                              All data is stored locally in a JSON flat-file. This works well for single-user operation.
                              For multi-user or cloud access, migrate to a PostgreSQL database using the schema in <code className="text-text-primary">database/schema.sql</code>.
                           </p>
                           <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-warning/5 border border-warning/20">
                              <AlertTriangle size={13} className="text-warning mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-warning/90">Export a backup regularly. The JSON file is not version-controlled by default.</p>
                           </div>
                        </div>
                     </div>

                     {/* Danger Zone — Clear All Data */}
                     {isAdmin && (
                        <div className="glass rounded-2xl overflow-hidden border border-danger/30">
                           <div className="px-6 py-5 border-b border-danger/20 flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-danger/10 border border-danger/20">
                                 <Trash2 size={17} className="text-danger" />
                              </div>
                              <div>
                                 <h2 className="text-sm font-bold text-danger">Danger Zone</h2>
                                 <p className="text-xs text-text-secondary mt-0.5">Irreversible actions — proceed with extreme caution</p>
                              </div>
                           </div>
                           <div className="p-6 space-y-4">

                              {/* Safe callout — login not affected */}
                              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-success/5 border border-success/25">
                                 <CheckCircle size={14} className="text-success mt-0.5 flex-shrink-0" />
                                 <p className="text-xs text-success/90 leading-relaxed">
                                    <strong>Your login access is completely safe.</strong> Google accounts, Admin roles, and all user permissions are <strong>never</strong> deleted by this action. You will be able to sign in normally after the reset.
                                 </p>
                              </div>

                              <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
                                 <p className="text-sm font-semibold text-danger mb-1">Clear All Business Data</p>
                                 <p className="text-xs text-text-secondary mb-1 leading-relaxed">
                                    Permanently deletes:
                                 </p>
                                 <ul className="text-xs text-text-secondary mb-4 space-y-0.5 ml-3 list-disc">
                                    <li>All inventory items &amp; stock records</li>
                                    <li>All projects &amp; site data</li>
                                    <li>All workers, attendance &amp; payments</li>
                                    <li>All allocations &amp; usages</li>
                                    <li>Company settings (name, logo, address)</li>
                                 </ul>
                                 <button
                                    type="button"
                                    onClick={handleClearData}
                                    disabled={clearing}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-danger/15 border border-danger/30 text-danger text-sm font-bold hover:bg-danger/25 transition-all disabled:opacity-60"
                                 >
                                    {clearing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                    {clearing ? "Clearing…" : "Clear All Data"}
                                 </button>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>
         </div>
      </form>
   );
}
