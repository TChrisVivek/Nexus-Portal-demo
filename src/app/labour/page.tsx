"use client";

import { useEffect, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import {
  Users, Plus, X, Loader2, Phone,
  IndianRupee, FolderKanban, Clock, ArrowRight, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";
import { confirmAction } from "@/lib/confirmToast";

interface Worker {
  id: number; name: string; phone: string;
  trade: string; dailyRate: number; createdAt: string;
  isActive?: boolean;
}
interface Assignment {
  id: number; workerId: number; workerName: string; workerTrade: string;
  projectId: number; projectName: string; startDate: string; endDate: string; notes: string;
}

const TRADES = ["Electrician", "Wireman", "Helper", "Supervisor", "Fitter", "Technician", "Other"];
const DEFAULT_FORM = { name: "", phone: "", trade: "Electrician", dailyRate: "" };

export default function LabourPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, aRes] = await Promise.all([fetch("/api/workers"), fetch("/api/assignments")]);
      if (wRes.ok) {
        const wData = await wRes.json();
        setWorkers(Array.isArray(wData) ? wData : []);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAssignments(Array.isArray(aData) ? aData : []);
      }
    } catch (err) {
      console.error("[labour] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dailyRate: Number(form.dailyRate) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add worker");
        return;
      }
      toast.success("Worker added successfully!");
      setShowModal(false);
      setForm(DEFAULT_FORM);
      await load();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(worker: Worker, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = await confirmAction(
      `Delete "${worker.name}"? This will permanently remove the worker and all their attendance, assignments, and payment records.`,
      { confirmLabel: "Delete", danger: true }
    );
    if (!confirmed) return;

    setDeletingId(worker.id);
    try {
      const res = await fetch(`/api/workers?id=${worker.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Failed to delete worker");
        return;
      }
      toast.success(`${worker.name} deleted`);
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setDeletingId(null);
    }
  }

  // For each worker, find which projects they're active on
  function getActiveProjects(workerId: number) {
    return assignments.filter((a) => a.workerId === workerId && !a.endDate);
  }
  function getPastProjects(workerId: number) {
    return assignments.filter((a) => a.workerId === workerId && a.endDate);
  }

  const activeWorkersList = workers.filter(w => w.isActive !== false);
  const leftWorkersList = workers.filter(w => w.isActive === false);
  const totalOnSite = activeWorkersList.filter((w) => getActiveProjects(w.id).length > 0).length;
  const totalOnBench = activeWorkersList.length - totalOnSite;

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg bg-space-blue border border-glass-border text-text-primary focus:outline-none focus:border-cyan-glow/50 focus:ring-1 focus:ring-cyan-glow/20 transition-all placeholder:text-text-secondary";
  const labelCls = "block text-xs text-text-secondary mb-1.5 font-medium";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Labour</h1>
          <p className="text-text-secondary text-sm mt-1">Manage workers and their current project assignments.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-semibold shadow-cyan-sm hover:shadow-cyan-glow transition-all"
        >
          <Plus size={15} />Add Worker
        </button>
      </div>

      {/* Summary strip */}
      {!loading && workers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
          <div className="glass rounded-2xl p-4 border border-glass-border">
            <p className="text-xs text-text-secondary mb-1">Total Active Employed</p>
            <p className="text-2xl font-bold text-text-primary">{activeWorkersList.length}</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-glass-border">
            <p className="text-xs text-text-secondary mb-1">Currently On Site</p>
            <p className="text-2xl font-bold text-success">{totalOnSite}</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-glass-border">
            <p className="text-xs text-text-secondary mb-1">On Bench</p>
            <p className="text-2xl font-bold text-text-primary">{totalOnBench}</p>
          </div>
          <div className="glass rounded-2xl p-4 border border-glass-border">
            <p className="text-xs text-text-secondary mb-1">Left Company</p>
            <p className="text-2xl font-bold text-text-secondary">{leftWorkersList.length}</p>
          </div>
        </div>
      )}

      {/* Workers grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-44 glass rounded-2xl animate-pulse" />)}
        </div>
      ) : workers.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center animate-fade-in">
          <Users size={32} className="text-text-secondary mx-auto mb-3" />
          <p className="text-text-primary font-medium mb-1">No workers added yet</p>
          <p className="text-text-secondary text-sm mb-4">Add your first worker to start tracking labour across project sites.</p>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-semibold">
            <Plus size={14} />Add Worker
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeWorkersList.map((worker) => {
              const active = getActiveProjects(worker.id);
              const past = getPastProjects(worker.id);
              const isDeleting = deletingId === worker.id;
              return (
                <div key={worker.id} className="relative group">
                  <Link href={`/labour/${worker.id}`} className="block glass glass-hover rounded-2xl p-5 border border-glass-border transition-all duration-300 animate-fade-in hover:border-cyan-glow/30 group">
                    {/* Name + status */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", active.length > 0 ? "bg-success animate-pulse-slow" : "bg-space-blue-light")} />
                          <span className={cn("text-xs font-semibold", active.length > 0 ? "text-success" : "text-text-secondary")}>
                            {active.length > 0 ? "On Site" : "Bench"}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-text-primary">{worker.name}</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-accent/10 text-purple-soft border border-purple-accent/20 flex-shrink-0">
                        {worker.trade}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1.5 mb-4">
                      {worker.phone && (
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Phone size={11} /><span>{worker.phone}</span>
                        </div>
                      )}
                      {worker.dailyRate > 0 && (
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <IndianRupee size={11} /><span>₹{worker.dailyRate.toLocaleString("en-IN")}/day</span>
                        </div>
                      )}
                    </div>

                    {/* Active assignments */}
                    {active.length > 0 && (
                      <div className="border-t border-glass-border pt-3 mb-2 space-y-1">
                        {active.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs text-cyan-glow hover:underline">
                            <FolderKanban size={11} className="flex-shrink-0" />
                            <span className="truncate">{a.projectName}</span>
                            <Clock size={10} className="flex-shrink-0 text-text-secondary ml-auto" />
                            <span className="text-text-secondary flex-shrink-0">{a.startDate}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="border-t border-glass-border pt-3 flex items-center justify-between text-xs text-text-secondary">
                      <span>{past.length} past project{past.length !== 1 ? "s" : ""}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono">{active.length} active</span>
                        <ArrowRight size={12} className="text-text-secondary group-hover:text-cyan-glow group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>

                  {/* Delete button — always visible, top-right corner */}
                  <button
                    onClick={(e) => handleDelete(worker, e)}
                    disabled={isDeleting}
                    title="Delete worker"
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-danger hover:border-danger/40 hover:bg-danger/5 transition-all shadow-sm disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              );
            })}
          </div>

          {leftWorkersList.length > 0 && (
            <div className="pt-6 border-t border-glass-border">
              <h2 className="text-sm font-bold text-text-secondary mb-4 flex items-center gap-2">
                <Users size={16} /> Left Company / Inactive ({leftWorkersList.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-75">
                {leftWorkersList.map((worker) => {
                  const past = getPastProjects(worker.id);
                  const isDeleting = deletingId === worker.id;
                  return (
                    <div key={worker.id} className="relative group">
                      <Link href={`/labour/${worker.id}`} className="block glass rounded-2xl p-5 border border-glass-border transition-all duration-300 animate-fade-in hover:opacity-100 group">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-danger/50" />
                              <span className="text-xs font-semibold text-danger">Left Company</span>
                            </div>
                            <h3 className="text-base font-bold text-text-secondary line-through">{worker.name}</h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-glass-border/30 text-text-secondary border border-glass-border/50 flex-shrink-0">
                            {worker.trade}
                          </span>
                        </div>

                        <div className="border-t border-glass-border pt-3 flex items-center justify-between text-xs text-text-secondary">
                          <span>{past.length} past project{past.length !== 1 ? "s" : ""}</span>
                          <ArrowRight size={12} className="text-text-secondary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDelete(worker, e)}
                        disabled={isDeleting}
                        title="Delete worker"
                        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-danger hover:border-danger/40 hover:bg-danger/5 transition-all shadow-sm disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Worker Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md glass rounded-2xl shadow-card border border-glass-border animate-fade-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-glass-border">
              <h2 className="text-base font-bold text-text-primary">Add Worker</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-space-blue-light text-text-secondary hover:text-text-primary transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input required placeholder="e.g. Ramesh Kumar" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Trade / Role</label>
                  <select value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} className={inputCls}>
                    {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" placeholder="98XXXXXXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Daily Rate (₹)</label>
                <input type="number" min={0} placeholder="e.g. 700" value={form.dailyRate} onChange={e => setForm(f => ({ ...f, dailyRate: e.target.value }))} className={cn(inputCls, "tabular-nums")} />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary glass glass-hover transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-semibold shadow-cyan-sm hover:shadow-cyan-glow transition-all disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? "Saving…" : "Add Worker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
