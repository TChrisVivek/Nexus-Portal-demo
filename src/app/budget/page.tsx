"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import {
  IndianRupee, TrendingUp, TrendingDown, Package, Users,
  Plus, Trash2, X, ChevronDown, ChevronUp,
  BarChart3, Loader2, RefreshCw, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { confirmAction } from "@/lib/confirmToast";

// ── Types ──────────────────────────────────────────────────────────────────
interface ClientPaymentRecord {
  id: number; projectId: number; projectName: string;
  amount: number; paymentDate: string; invoiceNo: string; notes: string;
  billUrl?: string;
}

interface ProjectBudget {
  projectId: number; projectName: string; status: string;
  materialCost: number; labourCost: number; labourDays: number;
  directPurchaseCost: number;
  totalSpent: number; clientReceived: number; netPL: number;
  invoices: ClientPaymentRecord[];
}

interface BudgetTotals {
  totalMaterial: number; totalLabour: number; totalDirectPurchases: number;
  totalSpent: number; totalReceived: number; netPL: number;
}

interface Project { id: number; name: string; status: string; }

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  "₹" + Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 " +
  "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

// ─────────────────────────────────────────────────────────────────────────
export default function BudgetPage() {
  const [projects, setProjects] = useState<ProjectBudget[]>([]);
  const [totals, setTotals] = useState<BudgetTotals | null>(null);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    projectId: 0, amount: "", paymentDate: new Date().toISOString().split("T")[0],
    invoiceNo: "", notes: ""
  });
  const [billFile, setBillFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        fetch("/api/budget"),
        fetch("/api/projects"),
      ]);
      if (bRes.ok) {
        const bData = await bRes.json();
        setProjects(bData.projects ?? []);
        setTotals(bData.totals ?? null);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setProjectList(Array.isArray(pData) ? pData : []);
      }
    } catch (err) {
      console.error("[budget] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPaymentSaving(true);
    try {
      let billUrl = "";
      if (billFile) {
        const formData = new FormData();
        formData.append("file", billFile);
        formData.append("bucket", "bills");
        const upRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (!upRes.ok) throw new Error("Upload failed");
        const upData = await upRes.json();
        billUrl = upData.url;
      }

      const res = await fetch("/api/budget/client-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...paymentForm, amount: Number(paymentForm.amount), billUrl }),
      });
      const resData = await res.json();
      if (!res.ok) { toast.error(resData.error || "Failed to record payment"); return; }
      toast.success("Payment recorded successfully!");
      setShowPaymentModal(false);
      setPaymentForm({ projectId: 0, amount: "", paymentDate: new Date().toISOString().split("T")[0], invoiceNo: "", notes: "" });
      setBillFile(null);
      load();
    } catch { toast.error("Network error"); } finally { setPaymentSaving(false); }
  }

  async function handleDeletePayment(id: number) {
    if (!(await confirmAction("Delete this payment record?"))) return;
    await fetch(`/api/budget/client-payments/${id}`, { method: "DELETE" });
    load();
  }

  // ── Skeleton ──
  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  );

  const profitColor = (v: number) => v >= 0 ? "text-emerald-600" : "text-red-600";
  const profitBg = (v: number) => v >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200";

  // ── Render ──
  return (
    <div className="space-y-7 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={15} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-widest">Finance</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Budget & Financials</h1>
          <p className="text-gray-500 text-sm mt-1">Track money invested and received across all project sites.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-all"
          >
            <Plus size={15} /> Record Client Payment
          </button>
        </div>
      </div>

      {/* ── Overview KPI Cards ── */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Material */}
          <KpiCard
            label="Material Cost" value={fmt(totals.totalMaterial)}
            sub="Total dispatched goods" icon={Package}
            accent="bg-violet-500" iconBg="bg-violet-50" iconColor="text-violet-600"
          />
          {/* Total Labour */}
          <KpiCard
            label="Labour Cost" value={fmt(totals.totalLabour)}
            sub="Wages from attendance" icon={Users}
            accent="bg-amber-500" iconBg="bg-amber-50" iconColor="text-amber-600"
          />
          {/* Total Invested */}
          <KpiCard
            label="Total Invested" value={fmt(totals.totalSpent)}
            sub="Mats. + Direct + Labour" icon={IndianRupee}
            accent="bg-blue-500" iconBg="bg-blue-50" iconColor="text-blue-600"
          />
          {/* Received */}
          <KpiCard
            label="Client Received" value={fmt(totals.totalReceived)}
            sub="Payments from clients" icon={TrendingUp}
            accent="bg-emerald-500" iconBg="bg-emerald-50" iconColor="text-emerald-600"
          />
          {/* Net P&L */}
          <div className={cn(
            "relative bg-white rounded-2xl p-4 border overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]",
            profitBg(totals.netPL)
          )}>
            <div className={cn("metric-accent-bar", totals.netPL >= 0 ? "bg-emerald-500" : "bg-red-500")} />
            <div className="pl-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Net P&amp;L</p>
              <div className="flex items-center gap-1.5">
                {totals.netPL >= 0
                  ? <TrendingUp size={18} className="text-emerald-500 flex-shrink-0" />
                  : <TrendingDown size={18} className="text-red-500 flex-shrink-0" />}
                <p className={cn("text-2xl font-bold tabular-nums", profitColor(totals.netPL))}>
                  {totals.netPL < 0 ? "-" : ""}{fmt(totals.netPL)}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">Received minus spent</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Per-Project Breakdown ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-900">Project-wise Breakdown</h2>
          </div>
          <span className="text-xs text-gray-400">{projects.length} projects</span>
        </div>

        {projects.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400 text-sm">
            No projects found. Create a project first.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-6 py-2.5 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              <div className="col-span-3">Project</div>
              <div className="col-span-2 text-right">Material</div>
              <div className="col-span-2 text-right">Labour</div>
              <div className="col-span-2 text-right">Total Spent</div>
              <div className="col-span-2 text-right">Received</div>
              <div className="col-span-1 text-right">P&L</div>
            </div>

            {projects.map((p) => (
              <div key={p.projectId}>
                {/* Row */}
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === p.projectId ? null : p.projectId)}
                  className="w-full grid grid-cols-12 gap-2 px-6 py-4 text-left hover:bg-gray-50 transition-colors group"
                >
                  {/* Name */}
                  <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      p.status === "ACTIVE" ? "bg-emerald-500" : p.status === "COMPLETED" ? "bg-blue-500" : "bg-amber-500"
                    )} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.projectName}</p>
                      <p className="text-[10px] text-gray-400">{p.status}</p>
                    </div>
                  </div>
                  {/* Material */}
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-medium text-violet-700 tabular-nums">{fmt(p.materialCost)}</p>
                    <p className="text-[10px] text-gray-400">goods</p>
                  </div>
                  {/* Labour */}
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-medium text-amber-700 tabular-nums">{fmt(p.labourCost)}</p>
                    <p className="text-[10px] text-gray-400">{p.labourDays} days</p>
                  </div>
                  {/* Total Spent */}
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-semibold text-blue-700 tabular-nums">{fmt(p.totalSpent)}</p>
                    <p className="text-[10px] text-gray-400">invested</p>
                  </div>
                  {/* Received */}
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-semibold text-emerald-700 tabular-nums">{fmt(p.clientReceived)}</p>
                    <p className="text-[10px] text-gray-400">{p.invoices.length} payment{p.invoices.length !== 1 ? "s" : ""}</p>
                  </div>
                  {/* P&L */}
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <p className={cn("text-sm font-bold tabular-nums", profitColor(p.netPL))}>
                      {p.netPL >= 0 ? "+" : "-"}{fmt(p.netPL)}
                    </p>
                    {expanded === p.projectId
                      ? <ChevronUp size={14} className="text-gray-400 ml-1" />
                      : <ChevronDown size={14} className="text-gray-400 ml-1" />}
                  </div>
                </button>

                {/* Expanded: invoices list */}
                {expanded === p.projectId && (
                  <div className="mx-6 mb-4 rounded-xl border border-gray-100 bg-gray-50 overflow-hidden animate-fade-in">
                    {/* Cost summary */}
                    <div className="grid grid-cols-4 divide-x divide-gray-200 border-b border-gray-200">
                      <div className="p-4 text-center">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Material</p>
                        <p className="text-base font-bold text-violet-700 tabular-nums">{fmt(p.materialCost)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">from inventory</p>
                      </div>
                      <div className="p-4 text-center">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Direct</p>
                        <p className="text-base font-bold text-purple-600 tabular-nums">{fmt(p.directPurchaseCost)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">direct shipments</p>
                      </div>
                      <div className="p-4 text-center">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Labour</p>
                        <p className="text-base font-bold text-amber-700 tabular-nums">{fmt(p.labourCost)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{p.labourDays} days</p>
                      </div>
                      <div className="p-4 text-center">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Net Balance</p>
                        <p className={cn("text-base font-bold tabular-nums", profitColor(p.netPL))}>
                          {p.netPL >= 0 ? "+" : ""}{fmt(p.netPL)}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">received − spent</p>
                      </div>
                    </div>

                    {/* Client payments list */}
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                        Client Payments Received
                      </p>
                      {p.invoices.length === 0 ? (
                        <p className="text-xs text-gray-400 py-3 text-center">No payments recorded yet for this project.</p>
                      ) : (
                        <div className="space-y-2">
                          {p.invoices.map((inv) => (
                            <div key={inv.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-3 py-2.5">
                              <IndianRupee size={14} className="text-emerald-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-emerald-700 tabular-nums">{fmt(inv.amount)}</span>
                                  {inv.invoiceNo && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-600 font-mono">
                                      #{inv.invoiceNo}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-gray-400">{inv.paymentDate}</span>
                                  {inv.notes && <span className="text-[11px] text-gray-400 truncate">· {inv.notes}</span>}
                                  {inv.billUrl && (
                                    <a href={inv.billUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline">
                                      · View Bill
                                    </a>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeletePayment(inv.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => { setPaymentForm(f => ({ ...f, projectId: p.projectId })); setShowPaymentModal(true); }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <Plus size={12} /> Add payment for this project
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Payment Modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Record Client Payment</h3>
                <p className="text-xs text-gray-500 mt-0.5">Money received from a client for a project</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Project *</label>
                <select
                  required
                  value={paymentForm.projectId}
                  onChange={e => setPaymentForm(f => ({ ...f, projectId: Number(e.target.value) }))}
                  className={inputCls}
                >
                  <option value={0}>— Select project —</option>
                  {projectList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Amount (₹) *</label>
                  <input
                    required type="number" min={1}
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 50000"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Payment Date *</label>
                  <input
                    required type="date"
                    value={paymentForm.paymentDate}
                    onChange={e => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Invoice / Challan No. (optional)</label>
                <input
                  value={paymentForm.invoiceNo}
                  onChange={e => setPaymentForm(f => ({ ...f, invoiceNo: e.target.value }))}
                  placeholder="e.g. INV-2026-001"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Notes (optional)</label>
                <input
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. First instalment"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Attach Bill / Receipt (optional)</label>
                <input
                  type="file"
                  onChange={e => setBillFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-900 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                  accept="image/*,.pdf"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={paymentSaving}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-60">
                  {paymentSaving && <Loader2 size={14} className="animate-spin" />}
                  {paymentSaving ? "Saving…" : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── KPI Card sub-component ────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, accent, iconBg, iconColor }: {
  label: string; value: string; sub: string; icon: React.ElementType;
  accent: string; iconBg: string; iconColor: string;
}) {
  return (
    <div className="relative bg-white rounded-2xl p-4 border border-gray-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
      <div className={cn("metric-accent-bar", accent)} />
      <div className="pl-3">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
          <div className={cn("p-1.5 rounded-lg flex-shrink-0", iconBg)}>
            <Icon size={14} className={iconColor} strokeWidth={2} />
          </div>
        </div>
        <p className={cn("text-xl font-bold tabular-nums", iconColor)}>{value}</p>
        <p className="text-[11px] text-gray-400 mt-1.5">{sub}</p>
      </div>
    </div>
  );
}
