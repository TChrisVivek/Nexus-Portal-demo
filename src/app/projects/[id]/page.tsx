"use client";

import { useEffect, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useParams, useRouter } from "next/navigation";
import {
   ArrowLeft, MapPin, Calendar, Package, ArrowLeftRight,
   CheckCircle, Clock, AlertCircle, TrendingUp, Hash,
   Hammer, Plus, X, Loader2, ChevronDown, ChevronUp, Users, Phone, Trash2, Edit3, FileImage, FileText, Download, ExternalLink
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";
import { confirmAction } from "@/lib/confirmToast";

/* ─── Types ─── */
interface Project {
   id: number; name: string; siteAddress: string;
   status: "ACTIVE" | "COMPLETED" | "ON_HOLD"; createdAt: string;
   electricalPlans?: { id: string; name: string; url: string; addedAt: string; }[];
}
interface Allocation {
   id: number; productName: string; productSku: string;
   productUnit: string; quantity: number; allocatedDate: string; notes: string;
}
interface UsageEntry {
   id: number; productName: string; productSku: string;
   productUnit: string; quantity: number; usedDate: string; notes: string;
}
interface ProductSummary {
   productId: number; sku: string; name: string; unit: string;
   dispatched: number; used: number; remaining: number; entries: number;
}
interface DirectPurchase {
   id: number; description: string; amount: number; date: string; invoiceNo: string; notes: string; billUrl?: string;
}
interface ProjectDetail {
   project: Project; allocations: Allocation[]; usages: UsageEntry[];
   directPurchases: DirectPurchase[];
   productSummary: ProductSummary[];
   totalDispatched: number; totalUsed: number; totalRemaining: number;
   totalEntries: number; totalUsageEntries: number;
   totalDirectPurchasesCost: number;
}
interface LabourWorker {
   workerId: number; workerName: string; workerTrade: string; phone: string;
   dailyRate: number; isActive: boolean; startDate: string; endDate: string;
   daysWorked: number; totalCost: number; attendanceDates: string[];
}

/* ─── Status config ─── */
const statusConfig = {
   ACTIVE: { label: "Active", icon: Clock, color: "text-success", bg: "bg-success/10 border-success/25" },
   COMPLETED: { label: "Completed", icon: CheckCircle, color: "text-text-secondary", bg: "bg-space-blue-light border-glass-border" },
   ON_HOLD: { label: "On Hold", icon: AlertCircle, color: "text-warning", bg: "bg-warning/10 border-warning/25" },
};

function fmtDate(d: string) {
   return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Main Component ─── */
export default function ProjectDetailPage() {
   const { id } = useParams<{ id: string }>();
   const router = useRouter();
   const [data, setData] = useState<ProjectDetail | null>(null);
   const [loading, setLoading] = useState(true);
   const [notFound, setNotFound] = useState(false);
   const nowStr = new Date().toISOString().split("T")[0];

   // Usage recording
   const [showUsageForm, setShowUsageForm] = useState(false);
   const [usageForm, setUsageForm] = useState({ productId: 0, quantity: "", usedDate: nowStr, notes: "" });
   const [saving, setSaving] = useState(false);

   // Direct purchase recording
   const [showPurchaseForm, setShowPurchaseForm] = useState(false);
   const [purchaseForm, setPurchaseForm] = useState({ description: "", amount: "", date: nowStr, invoiceNo: "", notes: "" });
   const [billFile, setBillFile] = useState<File | null>(null);
   const [purchaseSaving, setPurchaseSaving] = useState(false);

   // Timeline tab
   const [activeTab, setActiveTab] = useState<"dispatched" | "used" | "purchases">("purchases");

   // Labour state
   const [allWorkers, setAllWorkers] = useState<Array<{ id: number; name: string; trade: string; phone: string; dailyRate: number }>>([]);
   const [projectAssignments, setProjectAssignments] = useState<Array<{ id: number; workerId: number; workerName: string; workerTrade: string; startDate: string; endDate: string; notes: string }>>([]);
   const [labourSummary, setLabourSummary] = useState<LabourWorker[]>([]);
   const [showAssignForm, setShowAssignForm] = useState(false);
   const [assignForm, setAssignForm] = useState({ workerId: 0, startDate: nowStr, notes: "" });
   const [assignSaving, setAssignSaving] = useState(false);
   const [markDate, setMarkDate] = useState(nowStr);
   const [markingWorker, setMarkingWorker] = useState<number | null>(null);

   // Edit / Delete Project state
   const [showEditForm, setShowEditForm] = useState(false);
   const [editForm, setEditForm] = useState({ name: "", siteAddress: "", status: "ACTIVE" as "ACTIVE" | "COMPLETED" | "ON_HOLD" });
   const [editSaving, setEditSaving] = useState(false);

   // Electrical Plans state
   const [showPlanForm, setShowPlanForm] = useState(false);
   const [planForm, setPlanForm] = useState({ name: "" });
   const [planFile, setPlanFile] = useState<File | null>(null);
   const [planSaving, setPlanSaving] = useState(false);

   // Universal Document Preview state
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);

   const load = useCallback(async () => {
      try {
         const [detailRes, workersRes, assignRes, labourRes] = await Promise.all([
            fetch(`/api/projects/${id}`),
            fetch("/api/workers"),
            fetch(`/api/assignments?projectId=${id}`),
            fetch(`/api/projects/${id}/labour`),
         ]);
         if (detailRes.status === 404) { setNotFound(true); setLoading(false); return; }
         if (detailRes.ok) setData(await detailRes.json());
         if (workersRes.ok) {
            const wData = await workersRes.json();
            setAllWorkers(Array.isArray(wData) ? wData : []);
         }
         if (assignRes.ok) {
            const aData = await assignRes.json();
            setProjectAssignments(Array.isArray(aData) ? aData : []);
         }
         if (labourRes.ok) {
            const labourData = await labourRes.json();
            setLabourSummary(labourData.workers || []);
         }
      } catch (err) {
         console.error("[project detail] load error:", err);
      } finally {
         setLoading(false);
      }
   }, [id]);

   useEffect(() => { load(); }, [load]);
   useAutoRefresh(load);

   async function handleUsageSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      try {
         const res = await fetch(`/api/projects/${id}/usage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               productId: usageForm.productId,
               quantity: Number(usageForm.quantity),
               usedDate: usageForm.usedDate,
               notes: usageForm.notes,
            }),
         });
         const json = await res.json();
         if (!res.ok) { toast.error(json.error || "Failed to save"); return; }
         toast.success("Usage recorded");
         setShowUsageForm(false);
         setUsageForm({ productId: 0, quantity: "", usedDate: nowStr, notes: "" });
         await load();
      } catch { toast.error("Network error"); } finally { setSaving(false); }
   }

   async function handlePurchaseSubmit(e: React.FormEvent) {
      e.preventDefault();
      setPurchaseSaving(true);
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

         const res = await fetch("/api/direct-purchases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               projectId: Number(id),
               description: purchaseForm.description,
               amount: purchaseForm.amount,
               date: purchaseForm.date,
               invoiceNo: purchaseForm.invoiceNo,
               notes: purchaseForm.notes,
               billUrl,
            }),
         });
         const json = await res.json();
         if (!res.ok) { toast.error(json.error || "Failed to save"); return; }
         toast.success("Purchase recorded");
         setShowPurchaseForm(false);
         setPurchaseForm({ description: "", amount: "", date: nowStr, invoiceNo: "", notes: "" });
         setBillFile(null);
         await load();
      } catch { toast.error("Network error"); } finally { setPurchaseSaving(false); }
   }

   async function handleDeletePurchase(purchaseId: number) {
      if (!(await confirmAction("Delete this direct purchase?"))) return;
      try {
         const res = await fetch(`/api/direct-purchases/${purchaseId}`, { method: "DELETE" });
         if (!res.ok) { toast.error("Failed to delete"); return; }
         toast.success("Purchase deleted");
         await load();
      } catch { toast.error("Network error"); }
   }

   async function handleMarkAttendance(workerId: number, present: boolean) {
      setMarkingWorker(workerId);
      try {
         const res = await fetch(`/api/workers/${workerId}/attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               date: markDate,
               present,
               projectId: Number(id),
               projectName: data?.project.name ?? "",
            }),
         });
         if (!res.ok) { toast.error("Failed to mark attendance"); return; }
         toast.success("Attendance updated");
         await load();
      } catch { toast.error("Network error"); } finally { setMarkingWorker(null); }
   }

   function openEditModal() {
      if (!data?.project) return;
      setEditForm({ name: data.project.name, siteAddress: data.project.siteAddress, status: data.project.status });
      setShowEditForm(true);
   }

   async function handleEditSubmit(e: React.FormEvent) {
      e.preventDefault();
      setEditSaving(true);
      try {
         const res = await fetch(`/api/projects/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editForm),
         });
         if (!res.ok) throw new Error();
         toast.success("Project updated");
         setShowEditForm(false);
         await load();
      } catch { toast.error("Failed to update project"); } finally { setEditSaving(false); }
   }

   async function handleDeleteProject() {
      if (!(await confirmAction("DELETE PROJECT? This will permanently erase ALL stock dispatch logs, direct purchases, payments, and worker attendance tied to this site!"))) return;
      try {
         const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
         if (!res.ok) throw new Error();
         toast.success("Project deleted");
         router.push("/projects");
      } catch { toast.error("Failed to delete project"); }
   }

   async function handlePlanSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!planFile) { toast.error("Please attach a file"); return; }
      setPlanSaving(true);
      try {
         const formData = new FormData();
         formData.append("file", planFile);
         formData.append("bucket", "plans");
         const upRes = await fetch("/api/upload", { method: "POST", body: formData });
         if (!upRes.ok) throw new Error("Upload failed");
         const upData = await upRes.json();

         const newPlan = { id: Math.random().toString(36).substring(2, 11), name: planForm.name || "Electrical Plan", url: upData.url, addedAt: new Date().toISOString() };
         const existingPlans = data?.project.electricalPlans || [];
         const res = await fetch(`/api/projects/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ electricalPlans: [...existingPlans, newPlan] }),
         });
         if (!res.ok) throw new Error();
         toast.success("Plan uploaded successfully");
         setShowPlanForm(false);
         setPlanForm({ name: "" });
         setPlanFile(null);
         await load();
      } catch { toast.error("Failed to upload plan"); } finally { setPlanSaving(false); }
   }

   async function handleDeletePlan(planId: string) {
      if (!(await confirmAction("Delete this electrical plan?"))) return;
      const existingPlans = data?.project.electricalPlans || [];
      const updatedPlans = existingPlans.filter(p => p.id !== planId);
      try {
         const res = await fetch(`/api/projects/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ electricalPlans: updatedPlans }),
         });
         if (!res.ok) throw new Error();
         toast.success("Plan deleted");
         await load();
      } catch { toast.error("Failed to delete plan"); }
   }

   /* ─── Loading skeleton ─── */
   if (loading) return (
      <div className="space-y-6 animate-fade-in">
         <div className="h-8 w-48 bg-space-blue-light rounded-lg animate-pulse" />
         <div className="h-36 glass rounded-2xl animate-pulse" />
         <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <div key={i} className="h-28 glass rounded-2xl animate-pulse" />)}</div>
      </div>
   );

   if (notFound || !data) return (
      <div className="glass rounded-2xl p-12 text-center animate-fade-in">
         <p className="text-text-primary font-medium mb-2">Project not found</p>
         <Link href="/projects" className="text-cyan-glow text-sm hover:underline">← Back to Projects</Link>
      </div>
   );

   const { project, allocations, usages, productSummary, totalDispatched, totalUsed, totalRemaining } = data;
   const st = statusConfig[project.status];
   const StatusIcon = st.icon;

   const availableProducts = productSummary.filter((p) => p.remaining > 0);

   const timelineByDate: Record<string, Array<{ type: "dispatch" | "use"; qty: number; sku: string; name: string; unit: string; notes: string }>> = {};
   if (activeTab === "dispatched") {
      for (const a of allocations) {
         if (!timelineByDate[a.allocatedDate]) timelineByDate[a.allocatedDate] = [];
         timelineByDate[a.allocatedDate].push({ type: "dispatch", qty: a.quantity, sku: a.productSku, name: a.productName, unit: a.productUnit, notes: a.notes });
      }
   } else {
      for (const u of usages) {
         if (!timelineByDate[u.usedDate]) timelineByDate[u.usedDate] = [];
         timelineByDate[u.usedDate].push({ type: "use", qty: u.quantity, sku: u.productSku, name: u.productName, unit: u.productUnit, notes: u.notes });
      }
   }

   const inputCls = "w-full px-3 py-2 text-sm rounded-lg bg-space-blue border border-glass-border text-text-primary focus:outline-none focus:border-cyan-glow/50 focus:ring-1 focus:ring-cyan-glow/20 transition-all placeholder:text-text-secondary";
   const labelCls = "block text-xs text-text-secondary mb-1.5 font-medium";

   const activeAssignments = projectAssignments.filter((a) => !a.endDate);
   const pastAssignments = projectAssignments.filter((a) => a.endDate);
   const activeWorkerIds = new Set(activeAssignments.map((a) => a.workerId));
   const availableWorkers = allWorkers.filter((w) => !activeWorkerIds.has(w.id));
   const totalLabourCost = labourSummary.reduce((s, w) => s + w.totalCost, 0);

   async function handleAssign(e: React.FormEvent) {
      e.preventDefault();
      setAssignSaving(true);
      try {
         const res = await fetch("/api/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workerId: assignForm.workerId, projectId: Number(id), startDate: assignForm.startDate, notes: assignForm.notes }),
         });
         const json = await res.json();
         if (!res.ok) { toast.error(json.error || "Failed to assign"); return; }
         toast.success("Worker assigned");
         setShowAssignForm(false);
         setAssignForm({ workerId: 0, startDate: nowStr, notes: "" });
         await load();
      } catch { toast.error("Network error"); } finally { setAssignSaving(false); }
   }

   async function handleRemove(assignmentId: number) {
      if (!(await confirmAction("Mark this worker as finished on this project?"))) return;
      try {
         const res = await fetch("/api/assignments", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: assignmentId }),
         });
         if (!res.ok) { toast.error("Failed to update"); return; }
         toast.success("Worker removed from project");
         await load();
      } catch { toast.error("Network error"); }
   }

   return (
      <div className="space-y-6 animate-fade-in relative">

         {/* Back */}
         <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-text-secondary hover:text-cyan-glow transition-colors group">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Projects
         </button>

         {/* Project header card */}
         <div className="glass rounded-2xl p-6 shadow-card border border-glass-border">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                     <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", st.bg, st.color)}>
                        <StatusIcon size={11} />{st.label}
                     </span>
                     <button onClick={openEditModal} className="p-1.5 rounded bg-space-blue border border-glass-border text-text-secondary hover:text-cyan-glow transition-all" title="Edit Project">
                        <Edit3 size={13} />
                     </button>
                     <button onClick={handleDeleteProject} className="p-1.5 rounded bg-space-blue border border-glass-border text-text-secondary hover:text-danger hover:border-danger/30 transition-all" title="Delete Project">
                        <Trash2 size={13} />
                     </button>
                  </div>
                  <h1 className="text-2xl font-bold text-text-primary mb-2">{project.name}</h1>
                  {project.siteAddress && (
                     <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
                        <MapPin size={14} className="flex-shrink-0" /><span>{project.siteAddress}</span>
                     </div>
                  )}
                  <div className="flex items-center gap-2 text-text-secondary text-xs">
                     <Calendar size={12} /><span>Created {fmtDate(project.createdAt)}</span>
                  </div>
               </div>
               <div className="flex flex-wrap gap-2 flex-shrink-0">
                  <Link href="/allocations" className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-glass-border text-sm font-medium text-cyan-glow hover:border-cyan-glow/40 transition-all">
                     <ArrowLeftRight size={14} />Dispatch Stock
                  </Link>
                  <button
                     onClick={() => { setShowPurchaseForm(v => !v); setShowUsageForm(false); }}
                     className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-soft/10 text-purple-soft text-sm font-semibold hover:bg-purple-soft/20 transition-all border border-purple-soft/20"
                  >
                     <Plus size={14} />Log Direct Purchase
                     {showPurchaseForm ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  <button
                     onClick={() => { setShowUsageForm(v => !v); setShowPurchaseForm(false); }}
                     className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-semibold shadow-cyan-sm hover:shadow-cyan-glow transition-all"
                  >
                     <Hammer size={14} />Record Usage
                     {showUsageForm ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
               </div>
            </div>

            {/* Direct Purchase form */}
            {showPurchaseForm && (
               <div className="mt-6 pt-6 border-t border-glass-border animate-fade-in">
                  <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                     <Plus size={14} className="text-purple-soft" />Log Direct Project Purchase
                  </h3>
                  <form onSubmit={handlePurchaseSubmit}>
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="lg:col-span-2">
                           <label className={labelCls}>Item Description *</label>
                           <input required placeholder="e.g., Screws from hardware shop" value={purchaseForm.description} onChange={e => setPurchaseForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                           <label className={labelCls}>Cost (₹) *</label>
                           <input required type="number" min={0} placeholder="e.g., 500" value={purchaseForm.amount} onChange={e => setPurchaseForm(f => ({ ...f, amount: e.target.value }))} className={cn(inputCls, "tabular-nums")} />
                        </div>
                        <div>
                           <label className={labelCls}>Date *</label>
                           <input required type="date" value={purchaseForm.date} onChange={e => setPurchaseForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                        </div>
                        <div className="lg:col-span-2">
                           <label className={labelCls}>Invoice / Bill No (Optional)</label>
                           <input placeholder="e.g., INV-1002" value={purchaseForm.invoiceNo} onChange={e => setPurchaseForm(f => ({ ...f, invoiceNo: e.target.value }))} className={inputCls} />
                        </div>
                        <div className="lg:col-span-2">
                           <label className={labelCls}>Notes (Optional)</label>
                           <input placeholder="Any extra details" value={purchaseForm.notes} onChange={e => setPurchaseForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
                        </div>
                        <div className="lg:col-span-2">
                           <label className={labelCls}>Attach Bill / Receipt (Optional)</label>
                           <input
                              type="file"
                              onChange={e => setBillFile(e.target.files?.[0] || null)}
                              className="w-full px-3 py-2 text-sm rounded-lg bg-space-blue/50 border border-glass-border text-text-primary file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-soft/10 file:text-purple-soft hover:file:bg-purple-soft/20 transition-all cursor-pointer"
                              accept="image/*,.pdf"
                           />
                        </div>
                     </div>
                     <div className="flex items-center justify-end gap-3 mt-4">
                        <button type="button" onClick={() => setShowPurchaseForm(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary glass glass-hover transition-all">
                           <X size={14} className="inline mr-1" />Cancel
                        </button>
                        <button type="submit" disabled={purchaseSaving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-soft text-white text-sm font-semibold shadow-[0_0_15px_rgba(167,139,250,0.4)] hover:shadow-[0_0_25px_rgba(167,139,250,0.6)] transition-all disabled:opacity-60">
                           {purchaseSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                           {purchaseSaving ? "Saving…" : "Save Direct Purchase"}
                        </button>
                     </div>
                  </form>
               </div>
            )}

            {/* Record Usage form */}
            {showUsageForm && (
               <div className="mt-6 pt-6 border-t border-glass-border animate-fade-in">
                  <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                     <Hammer size={14} className="text-cyan-glow" />Record Items Used at This Site
                  </h3>
                  {availableProducts.length === 0 ? (
                     <p className="text-sm text-text-secondary">
                        No dispatched stock at this site yet. <Link href="/allocations" className="text-cyan-glow hover:underline">Dispatch stock first →</Link>
                     </p>
                  ) : (
                     <form onSubmit={handleUsageSubmit}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                           <div className="lg:col-span-1">
                              <label className={labelCls}>Product *</label>
                              <select required value={usageForm.productId} onChange={e => setUsageForm(f => ({ ...f, productId: Number(e.target.value), quantity: "" }))} className={inputCls}>
                                 <option value={0}>Select product…</option>
                                 {availableProducts.map(p => (
                                    <option key={p.productId} value={p.productId}>[{p.sku}] {p.name} ({p.remaining} {p.unit}s at site)</option>
                                 ))}
                              </select>
                           </div>
                           <div>
                              <label className={labelCls}>Qty Used *</label>
                              <input required type="number" min={1}
                                 max={availableProducts.find(p => p.productId === usageForm.productId)?.remaining}
                                 placeholder="0" value={usageForm.quantity}
                                 onChange={e => setUsageForm(f => ({ ...f, quantity: e.target.value }))}
                                 className={cn(inputCls, "tabular-nums")} />
                              {usageForm.productId > 0 && (
                                 <p className="text-[11px] text-text-secondary mt-1">Max: {availableProducts.find(p => p.productId === usageForm.productId)?.remaining ?? 0} at site</p>
                              )}
                           </div>
                           <div>
                              <label className={labelCls}>Date Used</label>
                              <input type="date" value={usageForm.usedDate} onChange={e => setUsageForm(f => ({ ...f, usedDate: e.target.value }))} className={inputCls} />
                           </div>
                           <div>
                              <label className={labelCls}>Notes</label>
                              <input placeholder="e.g. 3rd floor wiring" value={usageForm.notes} onChange={e => setUsageForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
                           </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-4">
                           <button type="button" onClick={() => setShowUsageForm(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary glass glass-hover transition-all">
                              <X size={14} className="inline mr-1" />Cancel
                           </button>
                           <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-semibold shadow-cyan-sm hover:shadow-cyan-glow transition-all disabled:opacity-60">
                              {saving ? <Loader2 size={14} className="animate-spin" /> : <Hammer size={14} />}
                              {saving ? "Saving…" : "Record Usage"}
                           </button>
                        </div>
                     </form>
                  )}
               </div>
            )}
         </div>

         {/* KPI Strip */}
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass glass-hover rounded-2xl p-5 border border-glass-border">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-cyan-glow/10 border border-cyan-glow/20"><TrendingUp size={16} className="text-cyan-glow" /></div>
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Dispatched to Site</span>
               </div>
               <p className="text-3xl font-bold text-text-primary tabular-nums">{formatNumber(totalDispatched)}</p>
               <p className="text-xs text-text-secondary mt-1">units received at this site</p>
            </div>
            <div className="glass glass-hover rounded-2xl p-5 border border-glass-border">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-warning/10 border border-warning/20"><Hammer size={16} className="text-warning" /></div>
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Used on Site</span>
               </div>
               <p className="text-3xl font-bold text-text-primary tabular-nums">{formatNumber(totalUsed)}</p>
               <p className="text-xs text-text-secondary mt-1">units consumed / installed</p>
            </div>
            <div className="glass glass-hover rounded-2xl p-5 border border-glass-border">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-success/10 border border-success/20"><Hash size={16} className="text-success" /></div>
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Remaining at Site</span>
               </div>
               <p className={cn("text-3xl font-bold tabular-nums", totalRemaining > 0 ? "text-success" : "text-text-primary")}>{formatNumber(totalRemaining)}</p>
               <p className="text-xs text-text-secondary mt-1">units still at site, not yet used</p>
            </div>
         </div>

         {/* Stock breakdown + Timeline */}
         <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 glass rounded-2xl overflow-hidden border border-glass-border">
               <div className="flex items-center gap-2 px-5 py-4 border-b border-glass-border">
                  <Package size={15} className="text-purple-soft" />
                  <h2 className="text-sm font-semibold text-text-primary">Stock at Site</h2>
                  <span className="ml-auto text-xs text-text-secondary">{productSummary.length} SKU{productSummary.length !== 1 ? "s" : ""}</span>
               </div>
               {productSummary.length === 0 ? (
                  <div className="px-5 py-10 text-center text-text-secondary text-sm">
                     No stock here yet.<br />
                     <Link href="/allocations" className="text-cyan-glow hover:underline">Dispatch stock →</Link>
                  </div>
               ) : (
                  <div className="divide-y divide-glass-border/50">
                     {productSummary.map((p) => {
                        const usedPct = p.dispatched > 0 ? (p.used / p.dispatched) * 100 : 0;
                        return (
                           <div key={p.productId} className="px-5 py-4 table-row-hover">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                 <div className="min-w-0 flex-1">
                                    <span className="font-mono text-[10px] text-cyan-glow bg-cyan-glow/5 px-1.5 py-0.5 rounded border border-cyan-glow/15">{p.sku}</span>
                                    <p className="text-xs text-text-primary font-medium mt-1 truncate">{p.name}</p>
                                 </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center mt-2 mb-2">
                                 <div>
                                    <p className="text-xs font-bold text-purple-soft tabular-nums">{formatNumber(p.dispatched)}</p>
                                    <p className="text-[10px] text-text-secondary">In</p>
                                 </div>
                                 <div>
                                    <p className="text-xs font-bold text-warning tabular-nums">{formatNumber(p.used)}</p>
                                    <p className="text-[10px] text-text-secondary">Used</p>
                                 </div>
                                 <div>
                                    <p className={cn("text-xs font-bold tabular-nums", p.remaining > 0 ? "text-success" : "text-text-secondary")}>{formatNumber(p.remaining)}</p>
                                    <p className="text-[10px] text-text-secondary">Left</p>
                                 </div>
                              </div>
                              <div className="h-1 rounded-full bg-space-blue-light overflow-hidden">
                                 <div className={cn("h-full rounded-full transition-all duration-700", usedPct >= 100 ? "bg-danger" : usedPct > 70 ? "bg-warning" : "bg-success")}
                                    style={{ width: `${Math.min(usedPct, 100)}%` }} />
                              </div>
                              <p className="text-[10px] text-text-secondary mt-1">{Math.round(usedPct)}% consumed &bull; {p.unit}s</p>
                           </div>
                        );
                     })}
                  </div>
               )}
            </div>

            <div className="lg:col-span-3 glass rounded-2xl overflow-hidden border border-glass-border">
               <div className="flex border-b border-glass-border">
                  <button onClick={() => setActiveTab("purchases")}
                     className={cn("flex-1 flex items-center justify-center gap-2 px-5 py-4 text-sm font-semibold transition-all",
                        activeTab === "purchases" ? "text-purple-soft border-b-2 border-purple-soft bg-purple-soft/5" : "text-text-secondary hover:text-text-primary")}>
                     <Plus size={14} />Direct Purchases ({data.directPurchases.length})
                  </button>
                  <button onClick={() => setActiveTab("dispatched")}
                     className={cn("flex-1 flex items-center justify-center gap-2 px-5 py-4 text-sm font-semibold transition-all",
                        activeTab === "dispatched" ? "text-cyan-glow border-b-2 border-cyan-glow bg-cyan-glow/5" : "text-text-secondary hover:text-text-primary")}>
                     <ArrowLeftRight size={14} />Dispatched ({allocations.length})
                  </button>
                  <button onClick={() => setActiveTab("used")}
                     className={cn("flex-1 flex items-center justify-center gap-2 px-5 py-4 text-sm font-semibold transition-all",
                        activeTab === "used" ? "text-warning border-b-2 border-warning bg-warning/5" : "text-text-secondary hover:text-text-primary")}>
                     <Hammer size={14} />Used ({usages.length})
                  </button>
               </div>
               {activeTab === "purchases" ? (
                  data.directPurchases.length === 0 ? (
                     <div className="px-5 py-12 text-center text-text-secondary text-sm">
                        No direct purchases recorded. Click <strong className="text-purple-soft">Log Direct Purchase</strong> above.
                     </div>
                  ) : (
                     <div className="overflow-y-auto max-h-[480px] divide-y divide-glass-border/50">
                        {data.directPurchases.map((purchase) => (
                           <div key={purchase.id} className="flex items-start gap-3 px-5 py-4 table-row-hover">
                              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-purple-soft shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                       <p className="text-sm font-bold text-text-primary">{purchase.description}</p>
                                       <div className="flex items-center gap-3 text-[11px] text-text-secondary mt-1">
                                          <span className="flex items-center gap-1"><Calendar size={11} />{fmtDate(purchase.date)}</span>
                                          {purchase.invoiceNo && <span className="px-1.5 py-0.5 rounded bg-space-blue border border-glass-border font-mono text-text-primary">Bill: {purchase.invoiceNo}</span>}
                                          {purchase.billUrl && (
                                             <button onClick={() => setPreviewUrl(purchase.billUrl!)} className="text-purple-soft hover:underline">
                                                View Bill
                                             </button>
                                          )}
                                       </div>
                                       {purchase.notes && <p className="text-xs text-text-secondary mt-1.5 italic">&quot;{purchase.notes}&quot;</p>}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                       <p className="text-lg font-bold text-purple-soft tabular-nums">₹{formatNumber(purchase.amount)}</p>
                                       <button onClick={() => handleDeletePurchase(purchase.id)} className="text-[10px] text-danger hover:underline mt-1">delete</button>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )
               ) : Object.keys(timelineByDate).length === 0 ? (
                  <div className="px-5 py-12 text-center text-text-secondary text-sm">
                     {activeTab === "dispatched" ? (
                        <>No dispatches yet. <Link href="/allocations" className="text-cyan-glow hover:underline">Add one →</Link></>
                     ) : (
                        <>No usage recorded. Click <strong className="text-text-primary">Record Usage</strong> above to add one.</>
                     )}
                  </div>
               ) : (
                  <div className="overflow-y-auto max-h-[480px] divide-y divide-glass-border/50">
                     {Object.entries(timelineByDate).map(([date, entries]) => (
                        <div key={date}>
                           <div className="sticky top-0 px-5 py-2 bg-space-blue border-b border-glass-border flex items-center gap-2 z-10">
                              <Calendar size={11} className={activeTab === "dispatched" ? "text-cyan-glow" : "text-warning"} />
                              <span className={cn("text-xs font-semibold", activeTab === "dispatched" ? "text-cyan-glow" : "text-warning")}>{fmtDate(date)}</span>
                              <span className="ml-auto text-[10px] text-text-secondary">{entries.reduce((s, e) => s + e.qty, 0)} units</span>
                           </div>
                           {entries.map((entry, i) => (
                              <div key={i} className="flex items-start gap-3 px-5 py-3 table-row-hover">
                                 <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", activeTab === "dispatched" ? "bg-purple-soft" : "bg-warning")} />
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                       <div className="min-w-0">
                                          <p className="text-sm text-text-primary font-medium truncate">{entry.name}</p>
                                          <span className="font-mono text-[10px] text-cyan-glow">{entry.sku}</span>
                                          {entry.notes && <p className="text-xs text-text-secondary mt-0.5 italic">&quot;{entry.notes}&quot;</p>}
                                       </div>
                                       <div className="text-right flex-shrink-0">
                                          <p className={cn("text-sm font-mono font-semibold", activeTab === "dispatched" ? "text-purple-soft" : "text-warning")}>
                                             &times;{formatNumber(entry.qty)}
                                          </p>
                                          <p className="text-[10px] text-text-secondary">{entry.unit}</p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* ── Labour Section ── */}
         <div className="glass rounded-2xl overflow-hidden border border-glass-border animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
               <div className="flex items-center gap-2 flex-wrap">
                  <Users size={15} className="text-cyan-glow" />
                  <h2 className="text-sm font-semibold text-text-primary">Labour on This Site</h2>
                  <span className="text-xs text-text-secondary">{activeAssignments.length} active</span>
                  {totalLabourCost > 0 && (
                     <span className="text-xs font-semibold text-purple-soft">&middot; &#8377;{totalLabourCost.toLocaleString("en-IN")} total cost</span>
                  )}
               </div>
               <button
                  onClick={() => { setShowAssignForm(v => !v); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-glow-grad text-deep-space text-xs font-semibold shadow-cyan-sm hover:shadow-cyan-glow transition-all flex-shrink-0"
               >
                  <Plus size={12} />Assign Worker
               </button>
            </div>

            {/* Assign form */}
            {showAssignForm && (
               <div className="px-5 py-5 border-b border-glass-border bg-space-blue/40 animate-fade-in">
                  {availableWorkers.length === 0 ? (
                     <p className="text-sm text-text-secondary">
                        All workers are already assigned here, or <Link href="/labour" className="text-cyan-glow hover:underline">add new workers &rarr;</Link>
                     </p>
                  ) : (
                     <form onSubmit={handleAssign}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                           <div>
                              <label className="block text-xs text-text-secondary mb-1.5">Worker *</label>
                              <select required value={assignForm.workerId} onChange={e => setAssignForm(f => ({ ...f, workerId: Number(e.target.value) }))} className={inputCls}>
                                 <option value={0}>Select worker&hellip;</option>
                                 {availableWorkers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.trade})</option>)}
                              </select>
                           </div>
                           <div>
                              <label className="block text-xs text-text-secondary mb-1.5">Start Date</label>
                              <input type="date" value={assignForm.startDate} onChange={e => setAssignForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                           </div>
                           <div>
                              <label className="block text-xs text-text-secondary mb-1.5">Notes</label>
                              <input placeholder="e.g. Main panel work" value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
                           </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                           <button type="button" onClick={() => setShowAssignForm(false)} className="px-4 py-1.5 rounded-lg text-sm text-text-secondary glass glass-hover transition-all">Cancel</button>
                           <button type="submit" disabled={assignSaving} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-cyan-glow-grad text-deep-space text-sm font-semibold disabled:opacity-60">
                              {assignSaving && <Loader2 size={13} className="animate-spin" />}
                              {assignSaving ? "Assigning\u2026" : "Assign"}
                           </button>
                        </div>
                     </form>
                  )}
               </div>
            )}

            {/* Attendance date picker */}
            {activeAssignments.length > 0 && (
               <div className="flex items-center gap-3 px-5 py-2.5 bg-space-blue/30 border-b border-glass-border flex-wrap">
                  <span className="text-xs text-text-secondary font-medium">Mark attendance for date:</span>
                  <input
                     type="date"
                     value={markDate}
                     max={new Date().toISOString().split("T")[0]}
                     onChange={(e) => setMarkDate(e.target.value)}
                     className="px-2 py-1 text-xs rounded-lg bg-space-blue border border-glass-border text-text-primary focus:outline-none focus:border-cyan-glow/40"
                  />
                  <span className="text-[10px] text-text-secondary italic">then click &#10003; Present or &#10007; Absent for each worker</span>
               </div>
            )}

            {/* Active worker list */}
            {activeAssignments.length === 0 && !showAssignForm ? (
               <div className="px-5 py-8 text-center text-text-secondary text-sm">
                  No workers assigned. Click <strong className="text-text-primary">Assign Worker</strong> above.
               </div>
            ) : (
               <div className="divide-y divide-glass-border/50">
                  {activeAssignments.map((a) => {
                     const worker = allWorkers.find(w => w.id === a.workerId);
                     const summary = labourSummary.find(s => s.workerId === a.workerId);
                     const isMarking = markingWorker === a.workerId;
                     const markedPresent = summary?.attendanceDates.includes(markDate);
                     return (
                        <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 table-row-hover">
                           <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow flex-shrink-0" />
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                 <Link href={`/labour/${a.workerId}`} className="text-sm font-semibold text-text-primary hover:text-cyan-glow transition-colors">
                                    {a.workerName}
                                 </Link>
                                 {summary && summary.daysWorked > 0 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-glow/10 border border-cyan-glow/20 text-cyan-glow font-mono">
                                       {summary.daysWorked}d &middot; &#8377;{summary.totalCost.toLocaleString("en-IN")}
                                    </span>
                                 )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-text-secondary mt-0.5 flex-wrap">
                                 <span className="px-1.5 py-0.5 rounded bg-purple-accent/10 text-purple-soft border border-purple-accent/20">{a.workerTrade}</span>
                                 {worker?.phone && <span className="flex items-center gap-1"><Phone size={10} />{worker.phone}</span>}
                                 <span>Since {fmtDate(a.startDate)}</span>
                                 {worker?.dailyRate && <span>&#8377;{worker.dailyRate}/day</span>}
                                 {a.notes && <span className="italic truncate">{a.notes}</span>}
                              </div>
                           </div>
                           {/* Quick attendance ✓ / ✗ buttons */}
                           <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                 onClick={() => handleMarkAttendance(a.workerId, true)}
                                 disabled={isMarking}
                                 title="Mark present on selected date"
                                 className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold transition-all",
                                    markedPresent === true
                                       ? "bg-success/20 border border-success/50 text-success shadow-sm"
                                       : "bg-space-blue border border-glass-border text-text-secondary hover:bg-success/10 hover:border-success/30 hover:text-success"
                                 )}
                              >&#10003;</button>
                              <button
                                 onClick={() => handleMarkAttendance(a.workerId, false)}
                                 disabled={isMarking}
                                 title="Mark absent on selected date"
                                 className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold bg-space-blue border border-glass-border text-text-secondary hover:bg-danger/10 hover:border-danger/30 hover:text-danger transition-all"
                              >&#10007;</button>
                              <button
                                 onClick={() => handleRemove(a.id)}
                                 title="Remove from project (finished)"
                                 className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-all"
                              ><X size={13} /></button>
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}

            {/* Past workers */}
            {pastAssignments.length > 0 && (
               <div className="border-t border-glass-border">
                  <p className="px-5 py-2 text-[10px] text-text-secondary uppercase tracking-wider">Past Assignments</p>
                  {pastAssignments.map((a) => {
                     const summary = labourSummary.find(s => s.workerId === a.workerId);
                     return (
                        <div key={a.id} className="flex items-center gap-4 px-5 py-3 table-row-hover opacity-60">
                           <div className="w-2 h-2 rounded-full bg-text-secondary flex-shrink-0" />
                           <div className="flex-1 min-w-0">
                              <p className="text-sm text-text-primary">{a.workerName}</p>
                              <p className="text-xs text-text-secondary">
                                 {a.workerTrade} &middot; {fmtDate(a.startDate)} &rarr; {fmtDate(a.endDate)}
                                 {summary && summary.daysWorked > 0 && ` · ${summary.daysWorked} days · ₹${summary.totalCost.toLocaleString("en-IN")}`}
                              </p>
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}
         </div>

         {/* ── Electrical Plans Section ── */}
         <div className="glass rounded-2xl overflow-hidden border border-glass-border animate-fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
               <div className="flex items-center gap-2 flex-wrap">
                  <FileImage size={15} className="text-purple-soft" />
                  <h2 className="text-sm font-semibold text-text-primary">Electrical Plans & Drawings</h2>
                  <span className="text-xs text-text-secondary">{project.electricalPlans?.length || 0} files</span>
               </div>
               <button
                  onClick={() => { setShowPlanForm(v => !v); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-soft/10 text-purple-soft border border-purple-soft/20 text-xs font-semibold hover:bg-purple-soft/20 transition-all flex-shrink-0"
               >
                  <Plus size={12} />Upload Plan
               </button>
            </div>

            {/* Upload form */}
            {showPlanForm && (
               <div className="px-5 py-5 border-b border-glass-border bg-space-blue/40 animate-fade-in">
                  <form onSubmit={handlePlanSubmit}>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs text-text-secondary mb-1.5">Plan Name / Description</label>
                           <input placeholder="e.g. Ground Floor Wiring PDF" value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                           <label className="block text-xs text-text-secondary mb-1.5">Attach File (PDF, Image) *</label>
                           <input
                              required
                              type="file"
                              onChange={e => setPlanFile(e.target.files?.[0] || null)}
                              className="w-full px-3 py-1.5 text-sm rounded-lg bg-space-blue border border-glass-border text-text-primary file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-soft/10 file:text-purple-soft hover:file:bg-purple-soft/20 cursor-pointer transition-all h-[38px]"
                           />
                        </div>
                     </div>
                     <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={() => setShowPlanForm(false)} className="px-4 py-1.5 rounded-lg text-sm text-text-secondary glass glass-hover transition-all">Cancel</button>
                        <button type="submit" disabled={planSaving} className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-purple-soft text-white text-sm font-semibold shadow-[0_0_15px_rgba(167,139,250,0.4)] disabled:opacity-60">
                           {planSaving && <Loader2 size={13} className="animate-spin" />}
                           {planSaving ? "Uploading\u2026" : "Upload"}
                        </button>
                     </div>
                  </form>
               </div>
            )}

            {/* List of plans */}
            {(!project.electricalPlans || project.electricalPlans.length === 0) && !showPlanForm ? (
               <div className="px-5 py-8 text-center text-text-secondary text-sm">
                  <FileText size={24} className="mx-auto mb-2 opacity-30 text-purple-soft" />
                  No plans uploaded yet. Click <strong className="text-text-primary">Upload Plan</strong> to add diagrams.
               </div>
            ) : (
               project.electricalPlans && project.electricalPlans.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-5">
                     {project.electricalPlans.map((plan) => (
                        <div key={plan.id} className="glass rounded-xl p-4 border border-glass-border relative group table-row-hover">
                           <div className="flex items-start gap-3 mb-3">
                              <div className="p-2.5 rounded-lg bg-space-blue/50 border border-glass-border">
                                 {plan.url.endsWith(".pdf") ? (
                                    <FileText size={18} className="text-danger" />
                                 ) : (
                                    <FileImage size={18} className="text-purple-soft" />
                                 )}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-sm font-semibold text-text-primary truncate">{plan.name}</p>
                                 <p className="text-[10px] text-text-secondary mt-0.5">Added {fmtDate(plan.addedAt)}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2 mt-4 pt-3 border-t border-glass-border/50">
                              <button onClick={() => setPreviewUrl(plan.url)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-soft/10 text-purple-soft text-xs font-semibold border border-purple-soft/20 hover:bg-purple-soft/20 transition-all">
                                 <ExternalLink size={12} />Preview
                              </button>
                              <a href={plan.url} download className="p-1.5 rounded-lg bg-space-blue border border-glass-border text-text-secondary hover:text-cyan-glow transition-all" title="Download">
                                 <Download size={14} />
                              </a>
                              <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 rounded-lg bg-space-blue border border-glass-border text-text-secondary hover:text-danger hover:border-danger/30 transition-all" title="Delete">
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               )
            )}
         </div>

         {/* Edit Form Modal */}
         {showEditForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEditForm(false)} />
               <div className="relative w-full max-w-md glass rounded-2xl shadow-card border border-glass-border animate-fade-in">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-glass-border">
                     <h2 className="text-base font-bold text-text-primary">Edit Project</h2>
                     <button onClick={() => setShowEditForm(false)} className="p-1 rounded-lg hover:bg-space-blue-light text-text-secondary hover:text-text-primary transition-all"><X size={18} /></button>
                  </div>
                  <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                     <div>
                        <label className={labelCls}>Project Name *</label>
                        <input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                     </div>
                     <div>
                        <label className={labelCls}>Site Address</label>
                        <input value={editForm.siteAddress} onChange={e => setEditForm(f => ({ ...f, siteAddress: e.target.value }))} className={inputCls} />
                     </div>
                     <div>
                        <label className={labelCls}>Status</label>
                        <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value as typeof editForm.status }))} className={inputCls}>
                           <option value="ACTIVE">Active</option>
                           <option value="ON_HOLD">On Hold</option>
                           <option value="COMPLETED">Completed</option>
                        </select>
                     </div>
                     <div className="flex items-center justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setShowEditForm(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary glass glass-hover transition-all">Cancel</button>
                        <button type="submit" disabled={editSaving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-semibold shadow-cyan-sm hover:shadow-cyan-glow transition-all disabled:opacity-60">
                           {editSaving && <Loader2 size={14} className="animate-spin" />}
                           {editSaving ? "Saving…" : "Save Changes"}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* Document Preview Modal */}
         {previewUrl && (
            <div className="fixed inset-0 z-[100] flex flex-col p-2 sm:p-10 animate-fade-in">
               <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setPreviewUrl(null)} />
               <div className="relative flex-1 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between p-3 bg-space-blue border-b border-glass-border">
                     <span className="text-sm font-semibold text-text-primary px-3 truncate">
                        {previewUrl.split('/').pop()}
                     </span>
                     <div className="flex gap-2">
                        <a href={previewUrl} target="_blank" rel="noreferrer" className="p-2 rounded bg-space-blue-light hover:text-cyan-glow transition-all" title="Open externally">
                           <ExternalLink size={16} />
                        </a>
                        <button onClick={() => setPreviewUrl(null)} className="p-2 rounded bg-space-blue-light hover:text-danger hover:bg-danger/10 transition-all" title="Close Preview">
                           <X size={16} />
                        </button>
                     </div>
                  </div>
                  <div className="flex-1 bg-[#525659] flex items-center justify-center overflow-hidden">
                     {previewUrl.endsWith(".pdf") ? (
                        <iframe src={previewUrl} className="w-full h-full border-none bg-white" title="PDF Preview" />
                     ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain p-4" />
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
