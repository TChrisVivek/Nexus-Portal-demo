import type { Product } from "@/lib/api";
import type { Project, Allocation } from "@/lib/api";

// ─── Sample Products ─────────────────────────────────────────────────────────

export const sampleProducts: Product[] = [
  { id: 1, sku: "WIR-001", name: "2.5mm² PVC Copper Wire (Red)", unit: "Meter", totalQty: 2000, warehouseQty: 1450, lowStockThreshold: 200 },
  { id: 2, sku: "WIR-002", name: "2.5mm² PVC Copper Wire (Black)", unit: "Meter", totalQty: 2000, warehouseQty: 1380, lowStockThreshold: 200 },
  { id: 3, sku: "WIR-003", name: "4mm² PVC Copper Wire (Yellow)", unit: "Meter", totalQty: 1000, warehouseQty: 820, lowStockThreshold: 100 },
  { id: 4, sku: "WIR-004", name: "6mm² PVC Copper Wire (Green)", unit: "Meter", totalQty: 500, warehouseQty: 95, lowStockThreshold: 100 },
  { id: 5, sku: "MCB-001", name: "MCB 16A Single Pole (Legrand)", unit: "Piece", totalQty: 200, warehouseQty: 142, lowStockThreshold: 20 },
  { id: 6, sku: "MCB-002", name: "MCB 32A Double Pole (Legrand)", unit: "Piece", totalQty: 100, warehouseQty: 67, lowStockThreshold: 15 },
  { id: 7, sku: "MCB-003", name: "RCCB 40A 30mA (Schneider)", unit: "Piece", totalQty: 80, warehouseQty: 8, lowStockThreshold: 10 },
  { id: 8, sku: "FIX-001", name: "LED Downlight 12W (Philips)", unit: "Piece", totalQty: 300, warehouseQty: 215, lowStockThreshold: 30 },
  { id: 9, sku: "FIX-002", name: "LED Panel 24W 600×600 (Havells)", unit: "Piece", totalQty: 150, warehouseQty: 88, lowStockThreshold: 20 },
  { id: 10, sku: "FIX-003", name: "Outdoor Floodlight 50W (Philips)", unit: "Piece", totalQty: 60, warehouseQty: 5, lowStockThreshold: 8 },
  { id: 11, sku: "CON-001", name: "20mm Conduit Pipe (PVC)", unit: "Length (3m)", totalQty: 400, warehouseQty: 310, lowStockThreshold: 50 },
  { id: 12, sku: "CON-002", name: "25mm Conduit Pipe (PVC)", unit: "Length (3m)", totalQty: 300, warehouseQty: 240, lowStockThreshold: 40 },
  { id: 13, sku: "SWT-001", name: "Modular Switch 6A (Anchor)", unit: "Piece", totalQty: 500, warehouseQty: 380, lowStockThreshold: 60 },
  { id: 14, sku: "SWT-002", name: "Modular Socket 16A (Anchor)", unit: "Piece", totalQty: 500, warehouseQty: 355, lowStockThreshold: 60 },
  { id: 15, sku: "CBL-001", name: "4-Core Armoured Cable 6mm²", unit: "Meter", totalQty: 500, warehouseQty: 340, lowStockThreshold: 50 },
];

// ─── Sample Projects ──────────────────────────────────────────────────────────

export const sampleProjects: Project[] = [
  { id: 1, name: "S.R. Associates Site", siteAddress: "Plot 14, Sector 7, Faridabad", status: "ACTIVE", createdAt: "2026-02-01" },
  { id: 2, name: "Greenview Apartments Block-C", siteAddress: "Greenview Colony, Gurgaon", status: "ACTIVE", createdAt: "2026-02-15" },
  { id: 3, name: "Industrial Shed Unit-5", siteAddress: "IMT Manesar, Phase 2", status: "ACTIVE", createdAt: "2026-03-10" },
  { id: 4, name: "Sharma Residence Rewiring", siteAddress: "DLF Phase 3, Gurgaon", status: "COMPLETED", createdAt: "2026-01-05" },
  { id: 5, name: "Metro Commercial Tower", siteAddress: "Cyber City, Gurgaon", status: "ON_HOLD", createdAt: "2026-03-20" },
];

// ─── Sample Allocations ───────────────────────────────────────────────────────

export const sampleAllocations: Allocation[] = [
  { id: 1, product: sampleProducts[0], project: sampleProjects[0], quantity: 300, allocatedDate: "2026-03-28", notes: "Phase 1 internal wiring" },
  { id: 2, product: sampleProducts[4], project: sampleProjects[0], quantity: 30, allocatedDate: "2026-03-28", notes: "Distribution board MCBs" },
  { id: 3, product: sampleProducts[7], project: sampleProjects[1], quantity: 85, allocatedDate: "2026-03-30", notes: "Common areas lighting" },
  { id: 4, product: sampleProducts[2], project: sampleProjects[1], quantity: 120, allocatedDate: "2026-03-30" },
  { id: 5, product: sampleProducts[9], project: sampleProjects[2], quantity: 40, allocatedDate: "2026-04-01", notes: "Perimeter lighting" },
  { id: 6, product: sampleProducts[14], project: sampleProjects[2], quantity: 100, allocatedDate: "2026-04-01", notes: "Main feeder cable" },
];

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export const sampleMetrics = {
  totalStockValue: 2847500,
  totalSkus: sampleProducts.length,
  activeProjects: sampleProjects.filter((p) => p.status === "ACTIVE").length,
  lowStockCount: sampleProducts.filter((p) => p.warehouseQty <= p.lowStockThreshold).length,
  warehouseQtyTotal: sampleProducts.reduce((s, p) => s + p.warehouseQty, 0),
  allocatedQtyTotal: sampleAllocations.reduce((s, a) => s + a.quantity, 0),
};
