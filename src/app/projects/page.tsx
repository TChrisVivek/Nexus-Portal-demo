"use client";

import { useEffect, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { FolderKanban, MapPin, Plus, X, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Project {
  id: number;
  name: string;
  siteAddress: string;
  status: "ACTIVE" | "COMPLETED" | "ON_HOLD";
  createdAt: string;
}

interface Allocation {
  id: number;
  projectId: number;
  quantity: number;
}

const statusMap = {
  ACTIVE: { label: "Active", color: "text-success bg-success/10 border-success/25" },
  COMPLETED: { label: "Completed", color: "text-text-secondary bg-space-blue-light border-glass-border" },
  ON_HOLD: { label: "On Hold", color: "text-warning bg-warning/10 border-warning/25" },
};

const DEFAULT_FORM = { name: "", siteAddress: "", status: "ACTIVE" as "ACTIVE" | "COMPLETED" | "ON_HOLD" };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([fetch("/api/projects"), fetch("/api/allocations")]);
      if (pRes.ok) setProjects(await pRes.json());
      else console.error("[projects] GET /api/projects failed:", pRes.status);
      if (aRes.ok) setAllocations(await aRes.json());
      else console.error("[projects] GET /api/allocations failed:", aRes.status);
    } catch (err) {
      console.error("[projects] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      setShowModal(false);
      setForm(DEFAULT_FORM);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg bg-space-blue border border-glass-border text-text-primary focus:outline-none focus:border-cyan-glow/50 focus:ring-1 focus:ring-cyan-glow/20 transition-all placeholder:text-text-secondary";
  const labelCls = "block text-xs text-text-secondary mb-1.5 font-medium";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban size={16} className="text-purple-soft" />
            <span className="text-xs font-mono text-purple-soft uppercase tracking-widest">Project Sites</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
          <p className="text-text-secondary text-sm mt-1">All project sites receiving electrical goods from the main warehouse.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-semibold shadow-cyan-sm hover:shadow-cyan-glow transition-all"
        >
          <Plus size={15} />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 glass rounded-2xl animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center animate-fade-in">
          <FolderKanban size={32} className="text-text-secondary mx-auto mb-3" />
          <p className="text-text-primary font-medium mb-1">No projects yet</p>
          <p className="text-text-secondary text-sm mb-4">Add your first project site to start tracking allocations.</p>
          <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-semibold">
            <Plus size={14} /> Add Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const projectAllocations = allocations.filter((a) => a.projectId === project.id);
            const totalItems = projectAllocations.reduce((s, a) => s + a.quantity, 0);
            const st = statusMap[project.status];
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block glass glass-hover rounded-2xl p-5 shadow-card border border-glass-border transition-all duration-300 animate-fade-in hover:border-cyan-glow/30 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-bold text-text-primary leading-tight flex-1 mr-3 group-hover:text-cyan-glow transition-colors">{project.name}</h3>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap flex-shrink-0", st.color)}>{st.label}</span>
                </div>
                {project.siteAddress && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-4">
                    <MapPin size={11} className="flex-shrink-0" />
                    <span className="truncate">{project.siteAddress}</span>
                  </div>
                )}
                <div className="border-t border-glass-border pt-3 flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{projectAllocations.length} allocation{projectAllocations.length !== 1 ? "s" : ""}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-purple-soft">{totalItems.toLocaleString("en-IN")} units</span>
                    <ArrowRight size={12} className="text-text-secondary group-hover:text-cyan-glow group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md glass rounded-2xl shadow-card border border-glass-border animate-fade-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-glass-border">
              <h2 className="text-base font-bold text-text-primary">New Project</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-space-blue-light text-text-secondary hover:text-text-primary transition-all"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Project Name *</label>
                <input required placeholder="e.g. S.R. Associates Site" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Site Address</label>
                <input placeholder="e.g. Plot 14, Sector 7, Faridabad" value={form.siteAddress} onChange={e => setForm(f => ({ ...f, siteAddress: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))} className={inputCls}>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              {error && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary glass glass-hover transition-all">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-semibold shadow-cyan-sm hover:shadow-cyan-glow transition-all disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? "Saving…" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
