"use client";

import { useEffect, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { ArrowLeftRight, Plus, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  warehouseQty: number;
}

interface Project {
  id: number;
  name: string;
  status: string;
}

interface AllocationLine {
  id: number;
  productId: number;
  projectId: number;
  quantity: string;
  notes: string;
}

let lineId = 1;
const newLine = (): AllocationLine => ({ id: lineId++, productId: 0, projectId: 0, quantity: "", notes: "" });

export default function AllocationsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lines, setLines] = useState<AllocationLine[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const load = useCallback(async () => {
    try {
      const [pRes, prRes] = await Promise.all([fetch("/api/inventory"), fetch("/api/projects")]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProducts(Array.isArray(pData) ? pData : []);
      }
      if (prRes.ok) {
        const prData = await prRes.json();
        setProjects(Array.isArray(prData) ? prData.filter((p: Project) => p.status === "ACTIVE") : []);
      }
    } catch (err) {
      console.error("[allocations] load error:", err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  const addLine = () => setLines(l => [...l, newLine()]);
  const removeLine = (id: number) => setLines(l => l.filter(ln => ln.id !== id));
  const updateLine = <K extends keyof AllocationLine>(id: number, k: K, v: AllocationLine[K]) =>
    setLines(l => l.map(ln => ln.id === id ? { ...ln, [k]: v } : ln));

  const isValid = lines.every(l => l.productId > 0 && l.projectId > 0 && Number(l.quantity) > 0);

  async function handleSubmit() {
    if (!isValid) return;
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const payload = lines.map(l => ({
        productId: l.productId,
        projectId: l.projectId,
        quantity: Number(l.quantity),
        allocatedDate: date,
        notes: l.notes,
      }));
      const res = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Submission failed"); return; }
      setSuccess(`${data.length} allocation${data.length !== 1 ? "s" : ""} saved. Stock levels updated.`);
      setLines([newLine()]);
      await load(); // refresh product stock levels
    } finally {
      setSubmitting(false);
    }
  }

  const selectCls = "w-full px-3 py-2 text-sm rounded-lg bg-space-blue border border-glass-border text-text-primary focus:outline-none focus:border-cyan-glow/50 focus:ring-1 focus:ring-cyan-glow/20 transition-all";

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-text-primary">Allocations</h1>
        <p className="text-text-secondary text-sm mt-1">Allocate materials from the warehouse to active project sites.</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl glass border border-success/30 text-success animate-fade-in">
          <CheckCircle size={18} /><span className="text-sm font-medium">{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl glass border border-danger/30 text-danger animate-fade-in">
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {products.length === 0 || projects.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center animate-fade-in">
          <ArrowLeftRight size={32} className="text-text-secondary mx-auto mb-3" />
          <p className="text-text-primary font-medium mb-1">
            {products.length === 0 ? "No inventory items yet" : "No active projects yet"}
          </p>
          <p className="text-text-secondary text-sm">
            {products.length === 0
              ? "Add inventory items first before creating allocations."
              : "Create an active project site first to allocate goods to it."}
          </p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden shadow-card animate-fade-in">
          {/* Date row */}
          <div className="px-5 py-4 border-b border-glass-border flex items-center gap-4">
            <div>
              <label className="block text-xs text-text-secondary mb-1 font-medium">Allocation Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={cn(selectCls, "w-auto")} />
            </div>
          </div>

          <div className="px-5 py-3 border-b border-glass-border">
            <h2 className="text-sm font-semibold text-text-primary">Allocation Lines</h2>
            <p className="text-xs text-text-secondary mt-0.5">Each line moves one product from warehouse to a project site.</p>
          </div>

          <div className="divide-y divide-glass-border/50">
            {lines.map((line, idx) => {
              const prod = products.find(p => p.id === line.productId);
              const remaining = prod ? prod.warehouseQty - Number(line.quantity || 0) : null;
              const isOver = remaining !== null && remaining < 0;
              return (
                <div key={line.id} className="px-5 py-4 animate-fade-in">
                  <p className="text-xs font-mono text-text-secondary mb-3">Line {idx + 1}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="lg:col-span-1">
                      <label className="block text-xs text-text-secondary mb-1.5">Product / SKU</label>
                      <select value={line.productId} onChange={e => updateLine(line.id, "productId", Number(e.target.value))} className={selectCls}>
                        <option value={0}>Select product…</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>[{p.sku}] {p.name} ({p.warehouseQty} in warehouse)</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5">Destination Site</label>
                      <select value={line.projectId} onChange={e => updateLine(line.id, "projectId", Number(e.target.value))} className={selectCls}>
                        <option value={0}>Select project…</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5">Quantity</label>
                      <input type="number" min={1} value={line.quantity} onChange={e => updateLine(line.id, "quantity", e.target.value)} placeholder="0" className={cn(selectCls, "tabular-nums")} />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-text-secondary mb-1.5">Notes</label>
                        <input value={line.notes} onChange={e => updateLine(line.id, "notes", e.target.value)} placeholder="optional" className={selectCls} />
                      </div>
                      <div className="flex items-end pb-0.5">
                        <button onClick={() => removeLine(line.id)} disabled={lines.length === 1} className="p-2 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-all disabled:opacity-30">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {prod && line.quantity && (
                    <p className={cn("text-xs mt-2", isOver ? "text-danger" : "text-text-secondary")}>
                      Warehouse: <span className="font-semibold text-text-primary">{prod.warehouseQty} {prod.unit}s</span>
                      {" → "}After: <span className={cn("font-semibold", isOver ? "text-danger" : "text-success")}>{remaining}</span>
                      {isOver && " ⚠ Insufficient stock"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-5 py-4 border-t border-glass-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <button onClick={addLine} className="flex items-center gap-2 px-4 py-2 rounded-lg glass glass-hover border border-glass-border text-sm font-medium text-cyan-glow transition-all">
              <Plus size={15} />Add Line
            </button>
            <button onClick={handleSubmit} disabled={!isValid || submitting} className={cn("flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all", isValid && !submitting ? "bg-cyan-glow-grad text-deep-space shadow-cyan-sm hover:shadow-cyan-glow" : "bg-space-blue-light text-text-secondary cursor-not-allowed")}>
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
              {submitting ? "Submitting…" : `Submit Batch (${lines.length} line${lines.length !== 1 ? "s" : ""})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
