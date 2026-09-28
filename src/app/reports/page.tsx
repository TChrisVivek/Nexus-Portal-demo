"use client";

import { useEffect, useState, useCallback } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import XLSX from "xlsx-js-style";
import {
  BarChart3, Download, FileText, Package, FolderKanban,
  ChevronDown, CheckCircle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
interface Product {
  id: number; name: string; sku: string; unit: string;
  totalQty: number; warehouseQty: number; unitPrice: number;
  lowStockThreshold: number; createdAt: string;
}
interface Project {
  id: number; name: string; siteAddress: string; status: string; createdAt: string;
}
interface ProjectDetail {
  project: Project;
  allocations: Array<{ productName: string; productSku: string; productUnit: string; quantity: number; allocatedDate: string; notes: string }>;
  usages: Array<{ productName: string; productSku: string; productUnit: string; quantity: number; usedDate: string; notes: string }>;
  directPurchases: Array<{ description: string; amount: number; date: string; invoiceNo: string; notes: string }>;
  productSummary: Array<{ sku: string; name: string; unit: string; dispatched: number; used: number; remaining: number }>;
  totalDispatched: number; totalUsed: number; totalRemaining: number;
}
interface LabourDetail {
  workers: Array<{ workerId: number; workerName: string; workerTrade: string; phone: string; dailyRate: number; daysWorked: number; totalCost: number; attendanceDates: string[] }>;
  totalDays: number; totalCost: number;
}

/* ─── Helpers ─── */
function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ─── Style presets ─── */
const S = {
  // Company header
  company: { font: { bold: true, sz: 14, color: { rgb: "FFFFFF" }, name: "Calibri" }, fill: { fgColor: { rgb: "1B2B4B" } }, alignment: { horizontal: "center", vertical: "center" } },
  // Report title row
  title: { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" }, name: "Calibri" }, fill: { fgColor: { rgb: "2D4F82" } }, alignment: { horizontal: "left", vertical: "center" } },
  // Column header
  header: { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" }, name: "Calibri" }, fill: { fgColor: { rgb: "1F4E79" } }, alignment: { horizontal: "center", vertical: "center" }, border: { top: { style: "thin", color: { rgb: "AAAAAA" } }, bottom: { style: "medium", color: { rgb: "4472C4" } }, left: { style: "thin", color: { rgb: "AAAAAA" } }, right: { style: "thin", color: { rgb: "AAAAAA" } } } },
  // Even data row
  row0: { font: { sz: 10, name: "Calibri" }, fill: { fgColor: { rgb: "FFFFFF" } }, border: { top: { style: "hair", color: { rgb: "CCCCCC" } }, bottom: { style: "hair", color: { rgb: "CCCCCC" } }, left: { style: "thin", color: { rgb: "DDDDDD" } }, right: { style: "thin", color: { rgb: "DDDDDD" } } }, alignment: { vertical: "center" } },
  // Odd data row
  row1: { font: { sz: 10, name: "Calibri" }, fill: { fgColor: { rgb: "EEF4FB" } }, border: { top: { style: "hair", color: { rgb: "CCCCCC" } }, bottom: { style: "hair", color: { rgb: "CCCCCC" } }, left: { style: "thin", color: { rgb: "DDDDDD" } }, right: { style: "thin", color: { rgb: "DDDDDD" } } }, alignment: { vertical: "center" } },
  // Total / footer row
  total: { font: { bold: true, sz: 10, color: { rgb: "1B2B4B" }, name: "Calibri" }, fill: { fgColor: { rgb: "D9E8F8" } }, border: { top: { style: "medium", color: { rgb: "4472C4" } }, bottom: { style: "medium", color: { rgb: "4472C4" } }, left: { style: "thin", color: { rgb: "DDDDDD" } }, right: { style: "thin", color: { rgb: "DDDDDD" } } }, alignment: { vertical: "center" } },
  // Status: OK
  ok: { font: { bold: true, sz: 10, color: { rgb: "1A7A40" }, name: "Calibri" }, fill: { fgColor: { rgb: "D6F0E0" } } },
  // Status: Low Stock
  low: { font: { bold: true, sz: 10, color: { rgb: "7A5200" }, name: "Calibri" }, fill: { fgColor: { rgb: "FFF3CD" } } },
  // Status: Out of Stock
  out: { font: { bold: true, sz: 10, color: { rgb: "7A1A1A" }, name: "Calibri" }, fill: { fgColor: { rgb: "FFE0E0" } } },
};

type CellStyle = typeof S.row0;

function sc(v: string | number, s: CellStyle | object) {
  return { v, s, t: typeof v === "number" ? "n" : "s" };
}

function buildSheet(
  rows: Array<Array<{ v: string | number; s: object; t: string }>>,
  colWidths: number[],
  headerRows = 1,
  merges: XLSX.Range[] = [],
) {
  const ws: XLSX.WorkSheet = {};
  rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      ws[ref] = cell;
    });
  });
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: colWidths.length - 1 } });
  ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  ws["!rows"] = rows.map((_, i) => ({ hpt: i < headerRows ? 22 : 18 }));
  if (merges.length) ws["!merges"] = merges;
  ws["!freeze"] = { xSplit: 0, ySplit: headerRows };
  return ws;
}

function downloadXLSX(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

/* ─── Main Page ─── */
export default function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(0);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [labourDetail, setLabourDetail] = useState<LabourDetail | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingProject, setLoadingProject] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [pRes, prRes] = await Promise.all([fetch("/api/inventory"), fetch("/api/projects")]);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProducts(Array.isArray(pData) ? pData : []);
      }
      if (prRes.ok) {
        const prData = await prRes.json();
        setProjects(Array.isArray(prData) ? prData : []);
      }
    } catch (err) {
      console.error("[reports] load error:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useAutoRefresh(load);

  useEffect(() => {
    if (!selectedProjectId) { setProjectDetail(null); setLabourDetail(null); return; }
    setLoadingProject(true);
    Promise.all([
      fetch(`/api/projects/${selectedProjectId}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/projects/${selectedProjectId}/labour`).then(r => r.ok ? r.json() : null),
    ]).then(([detail, labour]) => {
      setProjectDetail(detail);
      setLabourDetail(labour);
    }).catch(err => {
      console.error("[reports] project detail load error:", err);
      setProjectDetail(null);
      setLabourDetail(null);
    }).finally(() => {
      setLoadingProject(false);
    });
  }, [selectedProjectId]);

  /* ── Report 1: Inventory XLSX (styled) ── */
  function handleInventoryDownload() {
    setDownloading("inventory");
    const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const COLS = 11;
    const colWidths = [12, 32, 8, 13, 16, 18, 13, 14, 16, 13, 14];

    const headerLabels = ["SKU", "Product Name", "Unit", "Total Stock",
      "Warehouse Stock", "Dispatched", "Unit Price (\u20B9)", "Stock Value (\u20B9)",
      "Low Stock Alert", "Status", "Added On"];

    const rows: Array<Array<{ v: string | number; s: object; t: string }>> = [
      // Row 0: Company header (spans all columns)
      Array.from({ length: COLS }, (_, c) => sc(c === 0 ? "CMM ELECTRICALS" : "", S.company)),
      // Row 1: Report title
      Array.from({ length: COLS }, (_, c) => sc(c === 0 ? `Inventory Report  \u2014  Generated: ${now}` : "", S.title)),
      // Row 2: Column headers
      headerLabels.map((h) => sc(h, S.header)),
      // Data rows
      ...products.map((p, i) => {
        const base = i % 2 === 0 ? S.row0 : S.row1;
        const dispatched = p.totalQty - p.warehouseQty;
        const value = p.warehouseQty * p.unitPrice;
        const statusLabel = p.warehouseQty <= 0 ? "Out of Stock" : p.warehouseQty <= p.lowStockThreshold ? "Low Stock" : "OK";
        const statusStyle = p.warehouseQty <= 0 ? S.out : p.warehouseQty <= p.lowStockThreshold ? S.low : S.ok;
        return [
          sc(p.sku, { ...base, font: { ...base.font, bold: true } }),
          sc(p.name, base),
          sc(p.unit, { ...base, alignment: { horizontal: "center" } }),
          sc(p.totalQty, { ...base, alignment: { horizontal: "right" } }),
          sc(p.warehouseQty, { ...base, alignment: { horizontal: "right" } }),
          sc(dispatched, { ...base, alignment: { horizontal: "right" } }),
          sc(p.unitPrice, { ...base, alignment: { horizontal: "right" }, numFmt: "#,##0.00" }),
          sc(value, { ...base, alignment: { horizontal: "right" }, numFmt: "#,##0.00" }),
          sc(p.lowStockThreshold, { ...base, alignment: { horizontal: "right" } }),
          sc(statusLabel, { ...base, ...statusStyle, alignment: { horizontal: "center" } }),
          sc(fmtDate(p.createdAt), { ...base, alignment: { horizontal: "center" } }),
        ];
      }),
      // Total row
      [
        sc("", S.total), sc(`Total: ${products.length} products`, S.total),
        sc("", S.total),
        sc(products.reduce((s, p) => s + p.totalQty, 0), { ...S.total, alignment: { horizontal: "right" } }),
        sc(products.reduce((s, p) => s + p.warehouseQty, 0), { ...S.total, alignment: { horizontal: "right" } }),
        sc(products.reduce((s, p) => s + (p.totalQty - p.warehouseQty), 0), { ...S.total, alignment: { horizontal: "right" } }),
        sc("", S.total),
        sc(products.reduce((s, p) => s + p.warehouseQty * p.unitPrice, 0), { ...S.total, alignment: { horizontal: "right" }, numFmt: "#,##0.00" }),
        sc("", S.total), sc("", S.total), sc("", S.total),
      ],
    ];

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } }, // Company header
      { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } }, // Title
    ];

    const ws = buildSheet(rows, colWidths, 3, merges);
    ws["!autofilter"] = { ref: `A3:K3` };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    downloadXLSX(wb, `CMM_Inventory_${new Date().toISOString().split("T")[0]}.xlsx`);
    setTimeout(() => setDownloading(null), 1200);
  }

  /* ── Report 2: Project XLSX — 5 styled sheets ── */
  function handleProjectDownload() {
    if (!projectDetail) return;
    setDownloading("project");
    const { project, productSummary, allocations, usages, directPurchases } = projectDetail;
    const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const meta = `${project.name}  |  Site: ${project.siteAddress || "N/A"}  |  Status: ${project.status}  |  ${now}`;

    /* ── Sheet 1: Stock Summary ── */
    const sumCols = 7;
    const sumWidths = [12, 30, 8, 18, 14, 18, 13];
    const sumHeaders = ["SKU", "Product Name", "Unit", "Dispatched to Site", "Used on Site", "Remaining", "% Consumed"];
    const sumRows: Array<Array<{ v: string | number; s: object; t: string }>> = [
      Array.from({ length: sumCols }, (_, c) => sc(c === 0 ? "CMM ELECTRICALS" : "", S.company)),
      Array.from({ length: sumCols }, (_, c) => sc(c === 0 ? meta : "", S.title)),
      sumHeaders.map((h) => sc(h, S.header)),
      ...productSummary.map((p, i) => {
        const base = i % 2 === 0 ? S.row0 : S.row1;
        const pct = p.dispatched > 0 ? Math.round((p.used / p.dispatched) * 100) : 0;
        const pctStyle = pct >= 90 ? S.out : pct >= 70 ? S.low : S.ok;
        return [
          sc(p.sku, { ...base, font: { ...base.font, bold: true } }),
          sc(p.name, base),
          sc(p.unit, { ...base, alignment: { horizontal: "center" } }),
          sc(p.dispatched, { ...base, alignment: { horizontal: "right" } }),
          sc(p.used, { ...base, alignment: { horizontal: "right" } }),
          sc(p.remaining, { ...base, alignment: { horizontal: "right" } }),
          sc(`${pct}%`, { ...base, ...pctStyle, alignment: { horizontal: "center" } }),
        ];
      }),
      [
        sc("", S.total), sc("TOTALS", S.total), sc("", S.total),
        sc(projectDetail.totalDispatched, { ...S.total, alignment: { horizontal: "right" } }),
        sc(projectDetail.totalUsed, { ...S.total, alignment: { horizontal: "right" } }),
        sc(projectDetail.totalRemaining, { ...S.total, alignment: { horizontal: "right" } }),
        sc("", S.total),
      ],
    ];
    const wsSummary = buildSheet(sumRows, sumWidths, 3, [
      { s: { r: 0, c: 0 }, e: { r: 0, c: sumCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: sumCols - 1 } },
    ]);
    wsSummary["!autofilter"] = { ref: "A3:G3" };

    /* ── Sheet 2: Dispatch Log ── */
    const dCols = 6, dWidths = [14, 12, 30, 8, 16, 32];
    const dHeaders = ["Date", "SKU", "Product Name", "Unit", "Qty Dispatched", "Notes"];
    const dRows: Array<Array<{ v: string | number; s: object; t: string }>> = [
      Array.from({ length: dCols }, (_, c) => sc(c === 0 ? "CMM ELECTRICALS  \u2014  Dispatch Log" : "", S.company)),
      Array.from({ length: dCols }, (_, c) => sc(c === 0 ? meta : "", S.title)),
      dHeaders.map((h) => sc(h, S.header)),
      ...allocations.map((a, i) => {
        const base = i % 2 === 0 ? S.row0 : S.row1;
        return [
          sc(a.allocatedDate, { ...base, alignment: { horizontal: "center" } }),
          sc(a.productSku, { ...base, font: { ...base.font, bold: true } }),
          sc(a.productName, base),
          sc(a.productUnit, { ...base, alignment: { horizontal: "center" } }),
          sc(a.quantity, { ...base, alignment: { horizontal: "right" } }),
          sc(a.notes || "", base),
        ];
      }),
    ];
    const wsDispatch = buildSheet(dRows, dWidths, 3, [
      { s: { r: 0, c: 0 }, e: { r: 0, c: dCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: dCols - 1 } },
    ]);

    /* ── Sheet 3: Consumption Log ── */
    const uCols = 6, uWidths = [14, 12, 30, 8, 14, 32];
    const uHeaders = ["Date", "SKU", "Product Name", "Unit", "Qty Used", "Notes"];
    const uRows: Array<Array<{ v: string | number; s: object; t: string }>> = [
      Array.from({ length: uCols }, (_, c) => sc(c === 0 ? "CMM ELECTRICALS  \u2014  Consumption Log" : "", S.company)),
      Array.from({ length: uCols }, (_, c) => sc(c === 0 ? meta : "", S.title)),
      uHeaders.map((h) => sc(h, S.header)),
      ...usages.map((u, i) => {
        const base = i % 2 === 0 ? S.row0 : S.row1;
        return [
          sc(u.usedDate, { ...base, alignment: { horizontal: "center" } }),
          sc(u.productSku, { ...base, font: { ...base.font, bold: true } }),
          sc(u.productName, base),
          sc(u.productUnit, { ...base, alignment: { horizontal: "center" } }),
          sc(u.quantity, { ...base, alignment: { horizontal: "right" } }),
          sc(u.notes || "", base),
        ];
      }),
    ];
    const wsUsage = buildSheet(uRows, uWidths, 3, [
      { s: { r: 0, c: 0 }, e: { r: 0, c: uCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: uCols - 1 } },
    ]);

    // Sheet 4: Labour
    const lCols = 7, lWidths = [20, 16, 14, 14, 12, 14, 16];
    const lHeaders = ["Worker Name", "Trade", "Phone", "Daily Rate (\u20B9)", "Days Worked", "Total Cost (\u20B9)", "Attendance Dates"];
    const lRows: Array<Array<{ v: string | number; s: object; t: string }>> = [
      Array.from({ length: lCols }, (_, c) => sc(c === 0 ? "CMM ELECTRICALS  \u2014  Labour Summary" : "", S.company)),
      Array.from({ length: lCols }, (_, c) => sc(c === 0 ? meta : "", S.title)),
      lHeaders.map((h) => sc(h, S.header)),
      ...(labourDetail?.workers ?? []).map((w, i) => {
        const base = i % 2 === 0 ? S.row0 : S.row1;
        return [
          sc(w.workerName, { ...base, font: { ...base.font, bold: true } }),
          sc(w.workerTrade, base),
          sc(w.phone || "", { ...base, alignment: { horizontal: "center" } }),
          sc(w.dailyRate, { ...base, alignment: { horizontal: "right" }, numFmt: "#,##0.00" }),
          sc(w.daysWorked, { ...base, alignment: { horizontal: "center" } }),
          sc(w.totalCost, { ...base, alignment: { horizontal: "right" }, numFmt: "#,##0.00" }),
          sc(w.attendanceDates.join(", "), base),
        ];
      }),
      [
        sc("", S.total), sc("TOTAL", S.total), sc("", S.total), sc("", S.total),
        sc(labourDetail?.totalDays ?? 0, { ...S.total, alignment: { horizontal: "center" } }),
        sc(labourDetail?.totalCost ?? 0, { ...S.total, alignment: { horizontal: "right" }, numFmt: "#,##0.00" }),
        sc("", S.total),
      ],
    ];
    const wsLabour = buildSheet(lRows, lWidths, 3, [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lCols - 1 } },
    ]);

    // Sheet 5: Direct Purchases
    const dpCols = 5, dpWidths = [14, 30, 16, 16, 32];
    const dpHeaders = ["Date", "Description", "Cost (\u20B9)", "Invoice No", "Notes"];
    const dpRows: Array<Array<{ v: string | number; s: object; t: string }>> = [
      Array.from({ length: dpCols }, (_, c) => sc(c === 0 ? "CMM ELECTRICALS  \u2014  Direct Purchases" : "", S.company)),
      Array.from({ length: dpCols }, (_, c) => sc(c === 0 ? meta : "", S.title)),
      dpHeaders.map((h) => sc(h, S.header)),
      ...(directPurchases || []).map((dp, i) => {
        const base = i % 2 === 0 ? S.row0 : S.row1;
        return [
          sc(dp.date, { ...base, alignment: { horizontal: "center" } }),
          sc(dp.description, { ...base, font: { ...base.font, bold: true } }),
          sc(dp.amount, { ...base, alignment: { horizontal: "right" }, numFmt: "#,##0.00" }),
          sc(dp.invoiceNo || "", { ...base, alignment: { horizontal: "center" } }),
          sc(dp.notes || "", base),
        ];
      }),
      [
        sc("", S.total), sc("TOTAL", S.total),
        sc((directPurchases || []).reduce((s, dp) => s + dp.amount, 0), { ...S.total, alignment: { horizontal: "right" }, numFmt: "#,##0.00" }),
        sc("", S.total), sc("", S.total),
      ],
    ];
    const wsDirect = buildSheet(dpRows, dpWidths, 3, [
      { s: { r: 0, c: 0 }, e: { r: 0, c: dpCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: dpCols - 1 } },
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Stock Summary");
    XLSX.utils.book_append_sheet(wb, wsDispatch, "Dispatch Log");
    XLSX.utils.book_append_sheet(wb, wsUsage, "Consumption Log");
    XLSX.utils.book_append_sheet(wb, wsLabour, "Labour");
    XLSX.utils.book_append_sheet(wb, wsDirect, "Direct Purchases");
    downloadXLSX(wb, `CMM_Project_${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
    setTimeout(() => setDownloading(null), 1200);
  }

  /* ── Inventory stats ── */
  const totalValue = products.reduce((s, p) => s + p.warehouseQty * p.unitPrice, 0);
  const lowStockCount = products.filter((p) => p.warehouseQty > 0 && p.warehouseQty <= p.lowStockThreshold).length;
  const outOfStockCount = products.filter((p) => p.warehouseQty <= 0).length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} className="text-cyan-glow" />
            <span className="text-xs font-mono text-cyan-glow uppercase tracking-widest">Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Download Reports</h1>
          <p className="text-text-secondary text-sm mt-1">Export inventory snapshots and project usage data as CSV files.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg glass glass-hover text-text-secondary hover:text-text-primary text-xs transition-all">
          <RefreshCw size={13} />Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Card 1: Inventory Report ── */}
        <div className="glass rounded-2xl border border-glass-border overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-5 border-b border-glass-border flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-accent/10 border border-purple-accent/20">
              <Package size={18} className="text-purple-soft" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Full Inventory Report</h2>
              <p className="text-xs text-text-secondary mt-0.5">All products — stock levels, values, and status</p>
            </div>
          </div>

          {/* Stats */}
          {loadingProducts ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-5 bg-space-blue-light rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-space-blue border border-glass-border p-3 text-center">
                  <p className="text-xl font-bold text-text-primary">{products.length}</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">Products</p>
                </div>
                <div className={cn("rounded-xl border p-3 text-center", lowStockCount > 0 ? "bg-warning/5 border-warning/20" : "bg-space-blue border-glass-border")}>
                  <p className={cn("text-xl font-bold", lowStockCount > 0 ? "text-warning" : "text-text-primary")}>{lowStockCount}</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">Low Stock</p>
                </div>
                <div className={cn("rounded-xl border p-3 text-center", outOfStockCount > 0 ? "bg-danger/5 border-danger/20" : "bg-space-blue border-glass-border")}>
                  <p className={cn("text-xl font-bold", outOfStockCount > 0 ? "text-danger" : "text-text-primary")}>{outOfStockCount}</p>
                  <p className="text-[10px] text-text-secondary mt-0.5">Out of Stock</p>
                </div>
              </div>

              <div className="rounded-xl bg-space-blue border border-glass-border px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-text-secondary">Total Warehouse Value</span>
                <span className="text-sm font-bold text-purple-soft">₹{totalValue.toLocaleString("en-IN")}</span>
              </div>

              {/* Preview table */}
              {products.length > 0 && (
                <div className="rounded-xl border border-glass-border overflow-hidden">
                  <div className="px-3 py-2 bg-space-blue border-b border-glass-border">
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider">Preview (first 3 rows)</span>
                  </div>
                  <div className="divide-y divide-glass-border/50">
                    {products.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="font-mono text-[10px] text-cyan-glow bg-cyan-glow/5 px-1.5 py-0.5 rounded border border-cyan-glow/15 flex-shrink-0">{p.sku}</span>
                        <span className="text-xs text-text-primary flex-1 truncate">{p.name}</span>
                        <span className={cn("text-xs font-semibold tabular-nums flex-shrink-0",
                          p.warehouseQty <= 0 ? "text-danger" :
                            p.warehouseQty <= p.lowStockThreshold ? "text-warning" : "text-success"
                        )}>{p.warehouseQty} {p.unit}</span>
                      </div>
                    ))}
                    {products.length > 3 && (
                      <div className="px-3 py-2 text-center text-[10px] text-text-secondary">
                        +{products.length - 3} more rows in download
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Download button */}
              <button
                onClick={handleInventoryDownload}
                disabled={products.length === 0 || downloading === "inventory"}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-bold shadow-cyan-sm hover:shadow-cyan-glow transition-all disabled:opacity-50"
              >
                {downloading === "inventory"
                  ? <><CheckCircle size={16} className="animate-bounce" /> Downloading…</>
                  : <><Download size={16} /> Download Inventory (.xlsx)</>
                }
              </button>
              <p className="text-center text-[10px] text-text-secondary">
                Native Excel file · 1 sheet with all products, values, and status
              </p>
            </div>
          )}
        </div>

        {/* ── Card 2: Project Report ── */}
        <div className="glass rounded-2xl border border-glass-border overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-5 border-b border-glass-border flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-glow/10 border border-cyan-glow/20">
              <FolderKanban size={18} className="text-cyan-glow" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">Project Usage Report</h2>
              <p className="text-xs text-text-secondary mt-0.5">Dispatched stock, items consumed, and remaining per project</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Project selector */}
            <div>
              <label className="block text-xs text-text-secondary mb-1.5 font-medium">Select Project</label>
              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 text-sm rounded-lg bg-space-blue border border-glass-border text-text-primary focus:outline-none focus:border-cyan-glow/50 appearance-none pr-9"
                >
                  <option value={0}>Choose a project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — {p.status}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Project detail preview */}
            {loadingProject ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-5 bg-space-blue-light rounded animate-pulse" />)}
              </div>
            ) : projectDetail ? (
              <div className="space-y-3 animate-fade-in">
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-space-blue border border-glass-border p-3 text-center">
                    <p className="text-lg font-bold text-purple-soft tabular-nums">{projectDetail.totalDispatched}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">Dispatched</p>
                  </div>
                  <div className="rounded-xl bg-space-blue border border-glass-border p-3 text-center">
                    <p className="text-lg font-bold text-warning tabular-nums">{projectDetail.totalUsed}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">Used</p>
                  </div>
                  <div className="rounded-xl bg-space-blue border border-glass-border p-3 text-center">
                    <p className="text-lg font-bold text-success tabular-nums">{projectDetail.totalRemaining}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">Remaining</p>
                  </div>
                </div>

                {/* Per-product preview */}
                {projectDetail.productSummary.length > 0 && (
                  <div className="rounded-xl border border-glass-border overflow-hidden">
                    <div className="px-3 py-2 bg-space-blue border-b border-glass-border grid grid-cols-4 gap-2">
                      <span className="text-[10px] text-text-secondary uppercase col-span-2">Product</span>
                      <span className="text-[10px] text-text-secondary uppercase text-center">Dispatched</span>
                      <span className="text-[10px] text-text-secondary uppercase text-center">Used</span>
                    </div>
                    <div className="divide-y divide-glass-border/50 max-h-44 overflow-y-auto">
                      {projectDetail.productSummary.map((p) => (
                        <div key={p.sku} className="grid grid-cols-4 gap-2 px-3 py-2.5 items-center">
                          <div className="col-span-2 min-w-0">
                            <p className="text-xs text-text-primary truncate">{p.name}</p>
                            <span className="font-mono text-[10px] text-cyan-glow">{p.sku}</span>
                          </div>
                          <p className="text-xs font-semibold text-purple-soft text-center tabular-nums">{p.dispatched}</p>
                          <p className="text-xs font-semibold text-warning text-center tabular-nums">{p.used}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <FileText size={11} className="text-cyan-glow" />
                  <span>Report includes: stock summary + dispatch log + consumption log + labour + direct purchases</span>
                </div>

                {/* Download button */}
                <button
                  onClick={handleProjectDownload}
                  disabled={downloading === "project"}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-cyan-glow-grad text-deep-space text-sm font-bold shadow-cyan-sm hover:shadow-cyan-glow transition-all disabled:opacity-50"
                >
                  {downloading === "project"
                    ? <><CheckCircle size={16} className="animate-bounce" />Downloading…</>
                    : <><Download size={16} />Download Project (.xlsx)</>
                  }
                </button>
                <p className="text-center text-[10px] text-text-secondary">
                  {projectDetail.project.name} · 5 Excel sheets: Summary, Dispatch, Consumption, Labour, Purchases
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderKanban size={28} className="text-text-secondary mb-3" />
                <p className="text-text-secondary text-sm">Select a project above to preview its report</p>
                <p className="text-text-secondary text-xs mt-1">The CSV will include stock summary, dispatch log, and usage log</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="glass rounded-xl px-5 py-4 border border-glass-border flex items-start gap-3">
        <FileText size={14} className="text-cyan-glow mt-0.5 flex-shrink-0" />
        <p className="text-xs text-text-secondary leading-relaxed">
          All files download as native <span className="text-text-primary font-medium">.xlsx</span> Excel workbooks — open directly in Microsoft Excel, Google Sheets, or LibreOffice Calc.
          Inventory values are calculated as <span className="text-text-primary font-medium">Warehouse Qty × Unit Price</span>.
          Project reports have 5 separate sheets: <span className="text-text-primary font-medium">Stock Summary</span>, <span className="text-text-primary font-medium">Dispatch Log</span>, <span className="text-text-primary font-medium">Consumption Log</span>, <span className="text-text-primary font-medium">Labour</span>, and <span className="text-text-primary font-medium">Direct Purchases</span>.
        </p>
      </div>
    </div>
  );
}
