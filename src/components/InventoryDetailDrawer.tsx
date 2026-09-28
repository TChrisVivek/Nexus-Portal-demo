"use client";

/**
 * Inventory Item Detail Drawer
 * Slides in from the right when a product row is clicked.
 * Shows full detail, allocation history for this product, and allows inline editing.
 */

import { useEffect, useState, useCallback } from "react";
import {
  X, Package, Warehouse, ArrowLeftRight, TrendingDown,
  AlertTriangle, CheckCircle2, Edit3, Save, Loader2,
  IndianRupee, BarChart3, Calendar, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, Allocation } from "@/lib/types";

interface DrawerProps {
  product: Product | null;
  onClose: () => void;
  onUpdate: (updated: Product) => void;
}

interface ProductAllocation extends Allocation {
  allocatedDate: string;
}

function StatCard({ label, value, sub, color = "default" }: {
  label: string; value: string | number; sub?: string;
  color?: "default" | "cyan" | "warning" | "success" | "purple";
}) {
  const colors = {
    default: "text-text-primary",
    cyan: "text-cyan-glow",
    warning: "text-warning",
    success: "text-success",
    purple: "text-purple-soft",
  };
  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">{label}</p>
      <p className={cn("text-2xl font-bold tabular-nums", colors[color])}>{value}</p>
      {sub && <p className="text-xs text-text-secondary">{sub}</p>}
    </div>
  );
}

export function InventoryDetailDrawer({ product, onClose, onUpdate }: DrawerProps) {
  const [allocations, setAllocations] = useState<ProductAllocation[]>([]);
  const [loadingAlloc, setLoadingAlloc] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "", lowStockThreshold: "", unitPrice: "" });

  // Load allocations for this product
  const loadAllocations = useCallback(async (productId: number) => {
    setLoadingAlloc(true);
    try {
      const res = await fetch("/api/allocations");
      const all: ProductAllocation[] = await res.json();
      setAllocations(Array.isArray(all) ? all.filter((a) => a.productId === productId) : []);
    } finally {
      setLoadingAlloc(false);
    }
  }, []);

  useEffect(() => {
    if (!product) return;
    setEditing(false);
    setForm({
      name: product.name,
      unit: product.unit,
      lowStockThreshold: String(product.lowStockThreshold),
      unitPrice: String(product.unitPrice),
    });
    loadAllocations(product.id);
  }, [product, loadAllocations]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSave() {
    if (!product) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          unit: form.unit.trim(),
          lowStockThreshold: Number(form.lowStockThreshold),
          unitPrice: Number(form.unitPrice),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const isOpen = !!product;
  const isLow = product ? product.warehouseQty <= product.lowStockThreshold : false;
  const allocatedQty = product ? product.totalQty - product.warehouseQty : 0;
  const stockPct = product && product.totalQty > 0
    ? Math.round((product.warehouseQty / product.totalQty) * 100)
    : 0;

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg bg-space-blue border border-glass-border text-text-primary focus:outline-none focus:border-cyan-glow/50 focus:ring-1 focus:ring-cyan-glow/20 transition-all placeholder:text-text-secondary";

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Full Screen Modal */}
      <div
        className={cn(
          "fixed inset-4 sm:inset-10 z-50 flex flex-col rounded-2xl overflow-hidden",
          "bg-deep-space border border-glass-border shadow-[0_10px_40px_rgba(0,0,0,0.5)]",
          "transition-all duration-300 ease-out",
          isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-glass-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-cyan-glow/10 border border-cyan-glow/20 flex items-center justify-center">
              <Package size={18} className="text-cyan-glow" />
            </div>
            <div className="min-w-0">
              {editing ? (
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={cn(inputCls, "text-base font-bold")}
                  autoFocus
                />
              ) : (
                <h2 className="text-base font-bold text-text-primary truncate">{product?.name}</h2>
              )}
              <span className="font-mono text-xs text-cyan-glow bg-cyan-glow/5 px-2 py-0.5 rounded border border-cyan-glow/15">
                {product?.sku}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary glass glass-hover transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-glow/20 text-cyan-glow border border-cyan-glow/30 hover:bg-cyan-glow/30 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium glass glass-hover text-text-secondary hover:text-cyan-glow transition-all"
              >
                <Edit3 size={12} />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg glass glass-hover text-text-secondary hover:text-text-primary transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {product && (
            <>
              {/* Status badge */}
              <div className="flex items-center gap-3">
                {isLow ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/25">
                    <AlertTriangle size={11} /> Low Stock — needs restocking
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/25">
                    <CheckCircle2 size={11} /> Stock Level OK
                  </span>
                )}
              </div>

              {/* Stock level progress bar */}
              <div className="glass rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                  <span className="flex items-center gap-1"><Warehouse size={11} /> Warehouse</span>
                  <span className="font-mono font-semibold text-text-primary">{product.warehouseQty} / {product.totalQty} {product.unit}</span>
                </div>
                <div className="h-2.5 rounded-full bg-space-blue-light overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      isLow
                        ? "bg-gradient-to-r from-warning to-amber-400"
                        : "bg-gradient-to-r from-cyan-glow to-blue-400"
                    )}
                    style={{ width: `${stockPct}%` }}
                  />
                </div>
                <p className="text-xs text-text-secondary">{stockPct}% remaining in warehouse</p>
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Warehouse Qty" value={product.warehouseQty} sub={product.unit} color={isLow ? "warning" : "cyan"} />
                <StatCard label="Allocated to Sites" value={allocatedQty} sub={`${product.unit} dispatched`} color="purple" />
                <StatCard label="Total Qty" value={product.totalQty} sub="Opening + replenishments" />
                <StatCard
                  label="Stock Value"
                  value={`₹${(product.warehouseQty * product.unitPrice).toLocaleString("en-IN")}`}
                  sub={`@ ₹${product.unitPrice}/${product.unit}`}
                  color="success"
                />
              </div>

              {/* Editable fields */}
              <div className="glass rounded-xl p-4 space-y-4">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
                  <Hash size={11} /> Product Details
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">Unit</p>
                    {editing ? (
                      <input
                        value={form.unit}
                        onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                        placeholder="e.g. Piece, Meter, Kg"
                        className={inputCls}
                      />
                    ) : (
                      <p className="text-sm font-medium text-text-primary">{product.unit}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">Unit Price (₹)</p>
                    {editing ? (
                      <input type="number" min={0} step="0.01" value={form.unitPrice} onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))} className={cn(inputCls, "tabular-nums")} />
                    ) : (
                      <p className="text-sm font-medium text-text-primary tabular-nums flex items-center gap-1">
                        <IndianRupee size={12} className="text-success" />{product.unitPrice.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">Low Stock Alert</p>
                    {editing ? (
                      <input type="number" min={0} value={form.lowStockThreshold} onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} className={cn(inputCls, "tabular-nums")} />
                    ) : (
                      <p className="text-sm font-medium text-text-primary tabular-nums">{product.lowStockThreshold} {product.unit}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">Added On</p>
                    <p className="text-sm font-medium text-text-primary">
                      {new Date(product.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {product.invoiceNo && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">Invoice / Bill</p>
                      <p className="text-sm font-medium text-text-primary font-mono">{product.invoiceNo}</p>
                      {product.billUrl && (
                        <a href={product.billUrl} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-glow hover:underline mt-1 bg-cyan-glow/10 px-2 py-0.5 rounded border border-cyan-glow/20 inline-block">
                          View Attached Bill
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Allocation history */}
              <div className="glass rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-glass-border">
                  <BarChart3 size={13} className="text-purple-soft" />
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">Allocation History</p>
                  {!loadingAlloc && (
                    <span className="ml-auto text-xs font-mono text-text-secondary">{allocations.length} records</span>
                  )}
                </div>
                {loadingAlloc ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-space-blue-light rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : allocations.length === 0 ? (
                  <div className="px-4 py-8 text-center text-text-secondary text-sm">
                    <ArrowLeftRight size={28} className="mx-auto mb-2 opacity-30" />
                    No site allocations yet
                  </div>
                ) : (
                  <div className="divide-y divide-glass-border/50 max-h-56 overflow-y-auto">
                    {[...allocations].reverse().map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-4 py-3 table-row-hover">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{a.projectName}</p>
                          <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                            <Calendar size={10} />
                            {new Date(a.allocatedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-sm font-semibold tabular-nums text-purple-soft">
                            <TrendingDown size={11} className="inline mr-0.5" />×{a.quantity}
                          </p>
                          <p className="text-xs text-text-secondary">{product.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
