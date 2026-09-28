"use client";

import { useState, useMemo } from "react";
import { Search, ArrowUpDown, AlertTriangle, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface StockTableProps {
  products: Product[];
  isLoading?: boolean;
  onDelete?: (id: number) => void | Promise<void>;
  onRowClick?: (product: Product) => void;
}

type SortKey = keyof Pick<Product, "sku" | "name" | "totalQty" | "warehouseQty">;
type SortDir = "asc" | "desc";

export function StockTable({ products, isLoading = false, onDelete, onRowClick }: StockTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sku");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const productsSafe = useMemo(() => Array.isArray(products) ? products : [], [products]);

  const filtered = useMemo(() => {
    let data = [...productsSafe];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      );
    }
    if (showLowStockOnly) {
      data = data.filter((p) => p.warehouseQty <= p.lowStockThreshold);
    }
    data.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [productsSafe, search, sortKey, sortDir, showLowStockOnly]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown size={12} className="text-text-secondary" />;
    return sortDir === "asc" ? <ChevronUp size={12} className="text-cyan-glow" /> : <ChevronDown size={12} className="text-cyan-glow" />;
  };

  const ThBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors"
    >
      {label}
      <SortIcon k={k} />
    </button>
  );

  const lowStockCount = productsSafe.filter((p) => p.warehouseQty <= p.lowStockThreshold).length;

  return (
    <div className="glass rounded-2xl overflow-hidden shadow-card animate-fade-in">
      {/* Toolbar */}
      <div className="p-4 border-b border-glass-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search SKU or product name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-space-blue border border-glass-border text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-cyan-glow/50 focus:ring-1 focus:ring-cyan-glow/20 transition-all"
          />
        </div>
        <button
          onClick={() => setShowLowStockOnly((s) => !s)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all whitespace-nowrap",
            showLowStockOnly
              ? "bg-warning/10 border-warning/30 text-warning"
              : "border-glass-border text-text-secondary hover:border-warning/30 hover:text-warning"
          )}
        >
          <AlertTriangle size={13} />
          Low Stock{lowStockCount > 0 && <span className="ml-0.5">({lowStockCount})</span>}
        </button>
      </div>

      {/* Scrollable table wrapper for mobile */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px]">
          <thead>
            <tr className="border-b border-glass-border">
              <th className="px-5 py-3 text-left"><ThBtn k="sku" label="SKU" /></th>
              <th className="px-5 py-3 text-left"><ThBtn k="name" label="Product" /></th>
              <th className="px-5 py-3 text-left hidden md:table-cell">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Unit</span>
              </th>
              <th className="px-5 py-3 text-right"><ThBtn k="warehouseQty" label="Warehouse" /></th>
              <th className="px-5 py-3 text-right"><ThBtn k="totalQty" label="Total" /></th>
              <th className="px-5 py-3 text-center">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</span>
              </th>
              {onDelete && <th className="px-3 py-3" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-glass-border/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-space-blue-light rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-text-secondary text-sm">
                  No products found.
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const isLow = product.warehouseQty <= product.lowStockThreshold;
                const allocatedQty = product.totalQty - product.warehouseQty;
                return (
                  <tr
                    key={product.id}
                    onClick={() => onRowClick?.(product)}
                    className={cn(
                      "border-b border-glass-border/50 table-row-hover transition-colors",
                      onRowClick && "cursor-pointer hover:ring-1 hover:ring-inset hover:ring-cyan-glow/20"
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-cyan-glow bg-cyan-glow/5 px-2 py-1 rounded border border-cyan-glow/15">
                        {product.sku}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-primary font-medium">{product.name}</td>
                    <td className="px-5 py-3.5 hidden md:table-cell text-sm text-text-secondary">{product.unit}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={cn("text-sm font-semibold tabular-nums", isLow ? "text-warning" : "text-text-primary")}>
                        {product.warehouseQty}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-text-secondary tabular-nums">
                      {product.totalQty}
                      {allocatedQty > 0 && (
                        <span className="text-xs text-purple-soft ml-1">({allocatedQty} out)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/25">
                          <AlertTriangle size={10} />Low
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/25">OK</span>
                      )}
                    </td>
                    {onDelete && (
                      <td className="px-3 py-3.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}
                          className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-all"
                          title="Delete product"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-glass-border flex items-center justify-between text-xs text-text-secondary">
        <span>{filtered.length} of {products.length} products</span>
        {lowStockCount > 0 && (
          <span className="text-warning flex items-center gap-1">
            <AlertTriangle size={10} />{lowStockCount} item{lowStockCount !== 1 ? "s" : ""} need restocking
          </span>
        )}
      </div>
    </div>
  );
}
