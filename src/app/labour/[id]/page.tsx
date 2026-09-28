"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
   ArrowLeft, Phone, IndianRupee, Calendar, CheckCircle,
   XCircle, Plus, X, Loader2, FolderKanban,
   Banknote, TrendingUp, UtensilsCrossed, Car,
   Info, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";
import { confirmAction } from "@/lib/confirmToast";

/* ─── Types ────────────────────────────────────────────────────────────── */
interface Worker {
   id: number; name: string; phone: string; trade: string;
   dailyRate: number; createdAt: string; isActive?: boolean;
}
interface Attendance {
   id: number; date: string; present: boolean; projectName: string; notes: string;
}
interface Payment {
   id: number; amount: number; baseWage: number;
   foodAllowance: number; travelAllowance: number; otherAllowance: number;
   weekStart: string; weekEnd: string; paidDate: string;
   daysWorked: number; notes: string;
}
interface Assignment {
   id: number; projectId: number; projectName: string;
   startDate: string; endDate: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function isoWeekMonday(date: Date) {
   const d = new Date(date);
   const day = d.getDay();
   const diff = d.getDate() - day + (day === 0 ? -6 : 1);
   d.setDate(diff);
   return d.toISOString().split("T")[0];
}
function addDays(dateStr: string, n: number) {
   const d = new Date(dateStr);
   d.setDate(d.getDate() + n);
   return d.toISOString().split("T")[0];
}
function fmtDate(d: string) {
   if (!d) return "-";
   return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtRs(n: number) {
   return "₹" + n.toLocaleString("en-IN");
}

/* ─── Check if a date falls within a paid week range ───────────────────── */
function isDatePaid(date: string, payments: Payment[]): boolean {
   return payments.some((p) => date >= p.weekStart && date <= p.weekEnd);
}

/* ─── Calendar Component ────────────────────────────────────────────────── */
function AttendanceCalendar({
   year, month, attendance, onToggle, onMonthChange,
}: {
   year: number; month: number;
   attendance: Map<string, boolean>;
   onToggle: (date: string, current: boolean | undefined) => void;
   onMonthChange: (y: number, m: number) => void;
}) {
   const firstDay = new Date(year, month, 1).getDay();
   const daysInMonth = new Date(year, month + 1, 0).getDate();
   const today = new Date().toISOString().split("T")[0];
   const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
   while (cells.length % 7 !== 0) cells.push(null);

   return (
      <div>
         <div className="flex items-center justify-between mb-4">
            <button onClick={() => month === 0 ? onMonthChange(year - 1, 11) : onMonthChange(year, month - 1)}
               className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-all">‹</button>
            <h3 className="text-sm font-semibold text-gray-800">{MONTHS[month]} {year}</h3>
            <button onClick={() => month === 11 ? onMonthChange(year + 1, 0) : onMonthChange(year, month + 1)}
               className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-all">›</button>
         </div>
         <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>)}
         </div>
         <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
               if (!day) return <div key={i} />;
               const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
               const isFuture = dateStr > today;
               const status = attendance.get(dateStr);
               return (
                  <button key={dateStr} disabled={isFuture} onClick={() => onToggle(dateStr, status)}
                     className={cn(
                        "h-9 w-full rounded-lg text-xs font-medium transition-all duration-150 border",
                        isFuture ? "opacity-30 cursor-not-allowed border-transparent text-gray-400" :
                           status === true ? "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200" :
                              status === false ? "bg-red-100 border-red-300 text-red-700 hover:bg-red-200" :
                                 "bg-gray-100 border-gray-200 text-gray-600 hover:border-blue-300 hover:text-gray-800"
                     )}
                  >{day}</button>
               );
            })}
         </div>
         <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-200 inline-block border border-emerald-300" />Present</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-200 inline-block border border-red-300" />Absent</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-200 inline-block border border-gray-300" />Unmarked</span>
         </div>
      </div>
   );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function WorkerDetailPage() {
   const { id } = useParams<{ id: string }>();
   const router = useRouter();
   const now = new Date();

   const [worker, setWorker] = useState<Worker | null>(null);
   const [attendance, setAttendance] = useState<Attendance[]>([]);
   const [payments, setPayments] = useState<Payment[]>([]);
   const [assignments, setAssignments] = useState<Assignment[]>([]);
   const [loading, setLoading] = useState(true);
   const [notFound, setNotFound] = useState(false);
   const [calYear, setCalYear] = useState(now.getFullYear());
   const [calMonth, setCalMonth] = useState(now.getMonth());

   // Payment form
   const [showPayForm, setShowPayForm] = useState(false);
   const [paySaving, setPaySaving] = useState(false);
   const weekMonday = isoWeekMonday(new Date());
   const [payForm, setPayForm] = useState({
      weekStart: weekMonday,
      weekEnd: addDays(weekMonday, 6),
      paidDate: now.toISOString().split("T")[0],
      daysWorked: "",
      baseWage: "",
      foodAllowance: "",
      travelAllowance: "",
      otherAllowance: "",
      notes: "",
   });

   const load = useCallback(async () => {
      try {
         const [wRes, aRes, pRes, asRes] = await Promise.all([
            fetch(`/api/workers`),
            fetch(`/api/workers/${id}/attendance`),
            fetch(`/api/workers/${id}/payments`),
            fetch(`/api/assignments?workerId=${id}`),
         ]);
         if (wRes.ok) {
            const workers: Worker[] = await wRes.json();
            const found = workers.find((w) => w.id === Number(id));
            if (!found) { setNotFound(true); setLoading(false); return; }
            setWorker(found);
         } else {
            setNotFound(true); setLoading(false); return;
         }
         if (aRes.ok) {
            const att = await aRes.json();
            setAttendance(Array.isArray(att) ? att : []);
         }
         if (pRes.ok) {
            const pay = await pRes.json();
            setPayments(Array.isArray(pay) ? pay : []);
         }
         if (asRes.ok) {
            const asnData = await asRes.json();
            setAssignments(Array.isArray(asnData) ? asnData : []);
         }
      } catch (err) {
         console.error("[worker detail] load error:", err);
      } finally {
         setLoading(false);
      }
   }, [id]);

   useEffect(() => { load(); }, [load]);

   // ── Auto-calculate unpaid days ──────────────────────────────────────────
   const unpaidDays = useMemo(() => {
      return attendance
         .filter((a) => a.present && !isDatePaid(a.date, payments))
         .map((a) => a.date)
         .sort();
   }, [attendance, payments]);

   // When form opens, auto-populate from unpaid days
   function openPayForm() {
      if (!worker) return;
      if (unpaidDays.length > 0) {
         const weekStart = unpaidDays[0];
         const weekEnd = unpaidDays[unpaidDays.length - 1];
         const days = unpaidDays.length;
         const base = days * worker.dailyRate;
         setPayForm({
            weekStart,
            weekEnd,
            paidDate: now.toISOString().split("T")[0],
            daysWorked: String(days),
            baseWage: String(base),
            foodAllowance: "",
            travelAllowance: "",
            otherAllowance: "",
            notes: "",
         });
      } else {
         setPayForm({
            weekStart: weekMonday,
            weekEnd: addDays(weekMonday, 6),
            paidDate: now.toISOString().split("T")[0],
            daysWorked: "",
            baseWage: "",
            foodAllowance: "",
            travelAllowance: "",
            otherAllowance: "",
            notes: "",
         });
      }
      setShowPayForm(true);
   }

   // Live totals
   const food = Number(payForm.foodAllowance) || 0;
   const travel = Number(payForm.travelAllowance) || 0;
   const other = Number(payForm.otherAllowance) || 0;
   const base = Number(payForm.baseWage) || 0;
   const totalDue = base + food + travel + other;

   async function handlePaySubmit(e: React.FormEvent) {
      e.preventDefault();
      setPaySaving(true);
      try {
         const res = await fetch(`/api/workers/${id}/payments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               baseWage: base, foodAllowance: food,
               travelAllowance: travel, otherAllowance: other,
               weekStart: payForm.weekStart, weekEnd: payForm.weekEnd,
               paidDate: payForm.paidDate,
               daysWorked: Number(payForm.daysWorked),
               notes: payForm.notes,
            }),
         });
         const json = await res.json();
         if (!res.ok) {
            toast.error(json.error || "Failed to record payment");
            return;
         }
         toast.success("Payment recorded successfully!");
         setShowPayForm(false);
         await load();
      } catch {
         toast.error("Network error. Please try again.");
      } finally { setPaySaving(false); }
   }

   async function toggleAttendance(date: string, current: boolean | undefined) {
      let newPresent: boolean | null = true;
      if (current === true) newPresent = false;
      else if (current === false) newPresent = null;

      try {
         const res = await fetch(`/api/workers/${id}/attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ date, present: newPresent }),
         });
         if (res.ok) {
            const label = newPresent === null ? "cleared" : newPresent ? "present" : "absent";
            toast.success(`Attendance marked ${label}`, { id: "attendance-toast" });
         } else {
            toast.error("Failed to mark attendance", { id: "attendance-toast" });
         }
         await load();
      } catch {
         toast.error("Network error marking attendance", { id: "attendance-toast" });
      }
   }

   async function handleToggleStatus() {
      if (!worker) return;
      const isCurrentlyActive = worker.isActive !== false;
      const actionText = isCurrentlyActive ? "mark this worker as having left the company? This will close their open assignments." : "reactivate this worker?";
      if (!(await confirmAction(`Are you sure you want to ${actionText}`))) return;

      try {
         const res = await fetch(`/api/workers/${id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !isCurrentlyActive }),
         });
         if (res.ok) toast.success(`Worker marked as ${isCurrentlyActive ? 'Left Company' : 'Active'}`);
         else toast.error("Failed to update status");
         await load();
      } catch {
         toast.error("Network error updating status");
      }
   }

   // ── Stats ────────────────────────────────────────────────────────────────
   const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
   const presentDays = attendance.filter((a) => a.present).length;
   const absentDays = attendance.filter((a) => !a.present).length;
   const totalEarned = worker ? presentDays * worker.dailyRate : 0;
   const balance = totalEarned - totalPaid;

   const inputCls = "w-full px-3 py-2 text-sm rounded-lg bg-white border border-gray-200 text-gray-900 " +
      "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400";
   const labelCls = "block text-xs font-semibold text-gray-600 mb-1.5";

   const attendanceMap = new Map<string, boolean>(attendance.map((a) => [a.date, a.present]));

   if (loading) return (
      <div className="space-y-6 animate-fade-in">
         <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
         <div className="h-28 bg-white rounded-2xl animate-pulse border border-gray-200" />
         <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-200" />)}</div>
      </div>
   );

   if (notFound || !worker) return (
      <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
         <p className="text-gray-800 font-medium mb-2">Worker not found</p>
         <Link href="/labour" className="text-blue-600 text-sm hover:underline">← Back to Labour</Link>
      </div>
   );

   const activeAssignment = assignments.find((a) => !a.endDate);

   return (
      <div className="space-y-6 animate-fade-in">

         {/* Back */}
         <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors group">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Labour
         </button>

         {/* Worker Header card */}
         <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
               <div>
                  <div className="flex items-center gap-2.5 mb-2">
                     <span className={cn("flex h-2.5 w-2.5 rounded-full flex-shrink-0", worker.isActive === false ? "bg-danger" : activeAssignment ? "bg-emerald-500" : "bg-gray-300")} />
                     <span className={cn("text-xs font-semibold", worker.isActive === false ? "text-danger" : activeAssignment ? "text-emerald-600" : "text-gray-400")}>
                        {worker.isActive === false ? "Left Company" : activeAssignment ? `On Site — ${activeAssignment.projectName}` : "On Bench"}
                     </span>
                  </div>
                  <h1 className={cn("text-2xl font-bold mb-1", worker.isActive === false ? "text-gray-500 line-through" : "text-gray-900")}>{worker.name}</h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 mb-3">
                     {worker.trade}
                  </span>
                  <div className="space-y-1 mt-1">
                     {worker.phone && <div className="flex items-center gap-2 text-xs text-gray-500"><Phone size={12} />{worker.phone}</div>}
                     <div className="flex items-center gap-2 text-xs text-gray-500"><IndianRupee size={12} />{fmtRs(worker.dailyRate)}/day daily rate</div>
                     <div className="flex items-center gap-2 text-xs text-gray-500"><Calendar size={12} />Joined {fmtDate(worker.createdAt)}</div>
                  </div>
               </div>
               <div className="flex flex-col items-end gap-3">
                  {/* Unpaid days badge */}
                  {unpaidDays.length > 0 && (
                     <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                        <Info size={13} />
                        <span className="text-xs font-semibold">{unpaidDays.length} unpaid day{unpaidDays.length !== 1 ? "s" : ""} pending</span>
                     </div>
                  )}
                  <div className="flex flex-col gap-2">
                     <button
                        onClick={openPayForm}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-all"
                     >
                        <Banknote size={15} />Record Payment
                     </button>
                     <button
                        onClick={handleToggleStatus}
                        className={cn("flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all",
                           worker.isActive === false ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        )}
                     >
                        {worker.isActive === false ? "Reactivate Worker" : "Mark as Left Company"}
                     </button>
                  </div>
               </div>
            </div>

            {/* Payment Form */}
            {showPayForm && (
               <div className="mt-6 pt-6 border-t border-gray-100 animate-fade-in">
                  <div className="flex items-center gap-2 mb-4">
                     <Sparkles size={14} className="text-blue-600" />
                     <h3 className="text-sm font-bold text-gray-900">Record Payment</h3>
                     {unpaidDays.length > 0 && (
                        <span className="ml-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                           Auto-filled from {unpaidDays.length} unpaid present day{unpaidDays.length !== 1 ? "s" : ""}
                        </span>
                     )}
                  </div>

                  <form onSubmit={handlePaySubmit}>
                     {/* Date range + Paid date */}
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                           <label className={labelCls}>Period Start *</label>
                           <input type="date" required value={payForm.weekStart}
                              onChange={e => setPayForm(f => ({ ...f, weekStart: e.target.value }))}
                              className={inputCls} />
                        </div>
                        <div>
                           <label className={labelCls}>Period End *</label>
                           <input type="date" required value={payForm.weekEnd}
                              onChange={e => setPayForm(f => ({ ...f, weekEnd: e.target.value }))}
                              className={inputCls} />
                        </div>
                        <div>
                           <label className={labelCls}>Date Paid *</label>
                           <input type="date" required value={payForm.paidDate}
                              onChange={e => setPayForm(f => ({ ...f, paidDate: e.target.value }))}
                              className={inputCls} />
                        </div>
                     </div>

                     {/* Days worked + Base wage row */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                           <label className={labelCls}>Days Present (in this period)</label>
                           <input type="number" min={0} placeholder="e.g. 6"
                              value={payForm.daysWorked}
                              onChange={e => {
                                 const d = e.target.value;
                                 setPayForm(f => ({
                                    ...f,
                                    daysWorked: d,
                                    baseWage: d ? String(Number(d) * worker.dailyRate) : "",
                                 }));
                              }}
                              className={cn(inputCls, "tabular-nums")} />
                           <p className="text-[11px] text-gray-400 mt-1">
                              @ {fmtRs(worker.dailyRate)}/day
                           </p>
                        </div>
                        <div>
                           <label className={labelCls}>Base Wage (₹)</label>
                           <input type="number" min={0}
                              value={payForm.baseWage}
                              onChange={e => setPayForm(f => ({ ...f, baseWage: e.target.value }))}
                              className={cn(inputCls, "tabular-nums")} />
                           <p className="text-[11px] text-blue-600 mt-1">
                              {payForm.daysWorked ? `${payForm.daysWorked} days × ${fmtRs(worker.dailyRate)} = ${fmtRs(Number(payForm.daysWorked) * worker.dailyRate)}` : ""}
                           </p>
                        </div>
                     </div>

                     {/* Allowances */}
                     <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Additional Allowances</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           <div>
                              <label className={labelCls}>
                                 <UtensilsCrossed size={11} className="inline mr-1 text-orange-500" />Food Allowance (₹)
                              </label>
                              <input type="number" min={0} placeholder="0"
                                 value={payForm.foodAllowance}
                                 onChange={e => setPayForm(f => ({ ...f, foodAllowance: e.target.value }))}
                                 className={cn(inputCls, "tabular-nums")} />
                           </div>
                           <div>
                              <label className={labelCls}>
                                 <Car size={11} className="inline mr-1 text-blue-500" />Travel Allowance (₹)
                              </label>
                              <input type="number" min={0} placeholder="0"
                                 value={payForm.travelAllowance}
                                 onChange={e => setPayForm(f => ({ ...f, travelAllowance: e.target.value }))}
                                 className={cn(inputCls, "tabular-nums")} />
                           </div>
                           <div>
                              <label className={labelCls}>
                                 <Plus size={11} className="inline mr-1 text-violet-500" />Other Extras (₹)
                              </label>
                              <input type="number" min={0} placeholder="0"
                                 value={payForm.otherAllowance}
                                 onChange={e => setPayForm(f => ({ ...f, otherAllowance: e.target.value }))}
                                 className={cn(inputCls, "tabular-nums")} />
                           </div>
                        </div>
                     </div>

                     {/* Live total breakdown */}
                     <div className={cn(
                        "rounded-xl border p-4 mb-4",
                        totalDue > 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                     )}>
                        <div className="space-y-1.5 text-sm">
                           <div className="flex justify-between text-gray-600">
                              <span>Base wage ({payForm.daysWorked || 0} days)</span>
                              <span className="tabular-nums font-medium">{fmtRs(base)}</span>
                           </div>
                           {food > 0 && (
                              <div className="flex justify-between text-gray-600">
                                 <span className="flex items-center gap-1"><UtensilsCrossed size={11} className="text-orange-500" /> Food allowance</span>
                                 <span className="tabular-nums font-medium">+ {fmtRs(food)}</span>
                              </div>
                           )}
                           {travel > 0 && (
                              <div className="flex justify-between text-gray-600">
                                 <span className="flex items-center gap-1"><Car size={11} className="text-blue-500" /> Travel allowance</span>
                                 <span className="tabular-nums font-medium">+ {fmtRs(travel)}</span>
                              </div>
                           )}
                           {other > 0 && (
                              <div className="flex justify-between text-gray-600">
                                 <span>Other extras</span>
                                 <span className="tabular-nums font-medium">+ {fmtRs(other)}</span>
                              </div>
                           )}
                           <div className="flex justify-between font-bold text-gray-900 border-t border-blue-200 pt-2 mt-2 text-base">
                              <span>Total to Pay</span>
                              <span className="tabular-nums text-blue-700">{fmtRs(totalDue)}</span>
                           </div>
                        </div>
                     </div>

                     <div>
                        <label className={labelCls}>Notes (optional)</label>
                        <input placeholder="e.g. Advance included, Diwali bonus"
                           value={payForm.notes}
                           onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))}
                           className={inputCls} />
                     </div>

                     <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={() => setShowPayForm(false)}
                           className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-all">
                           <X size={14} className="inline mr-1" />Cancel
                        </button>
                        <button type="submit" disabled={paySaving || totalDue <= 0}
                           className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50">
                           {paySaving && <Loader2 size={14} className="animate-spin" />}
                           {paySaving ? "Saving…" : `Pay ${fmtRs(totalDue)}`}
                        </button>
                     </div>
                  </form>
               </div>
            )}
         </div>

         {/* KPI Strip */}
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
               <div className="flex items-center gap-2 mb-2"><CheckCircle size={14} className="text-emerald-500" /><span className="text-xs text-gray-500">Days Present</span></div>
               <p className="text-2xl font-bold text-emerald-600 tabular-nums">{presentDays}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
               <div className="flex items-center gap-2 mb-2"><XCircle size={14} className="text-red-500" /><span className="text-xs text-gray-500">Days Absent</span></div>
               <p className="text-2xl font-bold text-red-600 tabular-nums">{absentDays}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
               <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-violet-500" /><span className="text-xs text-gray-500">Total Earned</span></div>
               <p className="text-2xl font-bold text-violet-700 tabular-nums">{fmtRs(totalEarned)}</p>
            </div>
            <div className={cn("bg-white rounded-2xl p-4 border shadow-[0_1px_3px_rgba(0,0,0,0.04)]", balance > 0 ? "border-amber-200 bg-amber-50" : "border-gray-200")}>
               <div className="flex items-center gap-2 mb-2"><Banknote size={14} className={balance > 0 ? "text-amber-500" : "text-emerald-500"} /><span className="text-xs text-gray-500">Balance Due</span></div>
               <p className={cn("text-2xl font-bold tabular-nums", balance > 0 ? "text-amber-600" : "text-emerald-600")}>{fmtRs(Math.abs(balance))}</p>
               {balance < 0 && <p className="text-[10px] text-gray-400">overpaid</p>}
               {unpaidDays.length > 0 && <p className="text-[10px] text-amber-600 mt-1">{unpaidDays.length} days pending</p>}
            </div>
         </div>

         {/* Calendar + Payment History */}
         <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-white rounded-2xl p-5 border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
               <div className="flex items-center gap-2 mb-5 border-b border-gray-100 pb-4">
                  <Calendar size={15} className="text-blue-600" />
                  <h2 className="text-sm font-semibold text-gray-800">Attendance</h2>
                  <span className="ml-auto text-xs text-gray-400">Click a date to mark present/absent</span>
               </div>
               <AttendanceCalendar
                  year={calYear} month={calMonth} attendance={attendanceMap}
                  onToggle={toggleAttendance}
                  onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
               />
               {(() => {
                  const prefix = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
                  const monthRecords = attendance.filter((a) => a.date.startsWith(prefix));
                  const p = monthRecords.filter((a) => a.present).length;
                  const ab = monthRecords.filter((a) => !a.present).length;
                  return (
                     <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-500">
                        <span><span className="font-bold text-emerald-600">{p}</span> present this month</span>
                        <span><span className="font-bold text-red-600">{ab}</span> absent</span>
                        <span className="ml-auto font-mono text-violet-600">{fmtRs(p * worker.dailyRate)} earned</span>
                     </div>
                  );
               })()}
            </div>

            {/* Payment History */}
            <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
               <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2"><Banknote size={15} className="text-blue-600" /><h2 className="text-sm font-semibold text-gray-800">Payment History</h2></div>
                  <div className="text-right">
                     <p className="text-xs font-bold text-violet-700">{fmtRs(totalPaid)}</p>
                     <p className="text-[10px] text-gray-400">total paid</p>
                  </div>
               </div>
               {payments.length === 0 ? (
                  <div className="px-5 py-10 text-center text-gray-400 text-sm">
                     No payments recorded yet.<br />Click <strong className="text-gray-700">Record Payment</strong>.
                  </div>
               ) : (
                  <div className="divide-y divide-gray-100 overflow-y-auto max-h-[420px]">
                     {payments.map((p) => {
                        const pBase = p.baseWage ?? p.amount;
                        const pFood = p.foodAllowance ?? 0;
                        const pTravel = p.travelAllowance ?? 0;
                        const pOther = p.otherAllowance ?? 0;
                        const hasAllowances = pFood > 0 || pTravel > 0 || pOther > 0;
                        return (
                           <div key={p.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start justify-between mb-1">
                                 <div>
                                    <p className="text-sm font-bold text-emerald-700">{fmtRs(p.amount)}</p>
                                    <p className="text-xs text-gray-400">Paid on {fmtDate(p.paidDate)}</p>
                                 </div>
                                 <div className="text-right">
                                    {p.daysWorked > 0 && <p className="text-xs font-semibold text-violet-700">{p.daysWorked} days</p>}
                                 </div>
                              </div>
                              {hasAllowances && (
                                 <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Base {fmtRs(pBase)}</span>
                                    {pFood > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100">🍽 {fmtRs(pFood)}</span>}
                                    {pTravel > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">🚗 {fmtRs(pTravel)}</span>}
                                    {pOther > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100">+ {fmtRs(pOther)}</span>}
                                 </div>
                              )}
                              {(p.weekStart || p.weekEnd) && (
                                 <p className="text-[10px] text-gray-400 mt-1">{fmtDate(p.weekStart)} → {fmtDate(p.weekEnd)}</p>
                              )}
                              {p.notes && <p className="text-[10px] text-gray-400 italic mt-0.5">&quot;{p.notes}&quot;</p>}
                           </div>
                        );
                     })}
                  </div>
               )}
               <div className={cn("px-5 py-3 border-t border-gray-100 text-xs flex items-center justify-between", balance > 0 ? "bg-amber-50" : "bg-emerald-50")}>
                  <span className="text-gray-500">Balance due</span>
                  <span className={cn("font-bold font-mono", balance > 0 ? "text-amber-600" : "text-emerald-600")}>
                     {balance >= 0 ? fmtRs(balance) : `Overpaid ${fmtRs(Math.abs(balance))}`}
                  </span>
               </div>
            </div>
         </div>

         {/* Project History */}
         {assignments.length > 0 && (
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
               <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                  <FolderKanban size={15} className="text-violet-600" />
                  <h2 className="text-sm font-semibold text-gray-800">Project History</h2>
               </div>
               <div className="divide-y divide-gray-100">
                  {assignments.map((a) => (
                     <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", !a.endDate ? "bg-emerald-500" : "bg-gray-300")} />
                        <div className="flex-1">
                           <Link href={`/projects/${a.projectId}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">
                              {a.projectName}
                           </Link>
                           <p className="text-xs text-gray-400 mt-0.5">{fmtDate(a.startDate)} {a.endDate ? `→ ${fmtDate(a.endDate)}` : "→ Present"}</p>
                        </div>
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border",
                           !a.endDate ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-gray-500 bg-gray-100 border-gray-200")}>
                           {!a.endDate ? "Active" : "Done"}
                        </span>
                     </div>
                  ))}
               </div>
            </div>
         )}
      </div>
   );
}
