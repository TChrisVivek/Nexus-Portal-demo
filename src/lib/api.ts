/**
 * CMM Grid — API Client
 * Uses axios@1.7.9 (safe, pinned version — NOT 1.14.1 or 0.30.4 which are malware-infected).
 */
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  totalQty: number;
  warehouseQty: number;
  lowStockThreshold: number;
}

export interface Project {
  id: number;
  name: string;
  siteAddress: string;
  status: "ACTIVE" | "COMPLETED" | "ON_HOLD";
  createdAt: string;
}

export interface Allocation {
  id: number;
  product: Product;
  project: Project;
  quantity: number;
  allocatedDate: string;
  notes?: string;
}

export interface DashboardMetrics {
  totalStockValue: number;
  totalSkus: number;
  activeProjects: number;
  lowStockCount: number;
  warehouseQtyTotal: number;
  allocatedQtyTotal: number;
}

// ─── API Functions ───────────────────────────────────────────────────────────

export const inventoryApi = {
  getAll: () => api.get<Product[]>("/api/inventory"),
  getById: (id: number) => api.get<Product>(`/api/inventory/${id}`),
  create: (data: Omit<Product, "id">) => api.post<Product>("/api/inventory", data),
  update: (id: number, data: Partial<Product>) => api.put<Product>(`/api/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/api/inventory/${id}`),
};

export const projectApi = {
  getAll: () => api.get<Project[]>("/api/projects"),
  getById: (id: number) => api.get<Project>(`/api/projects/${id}`),
  create: (data: Omit<Project, "id" | "createdAt">) => api.post<Project>("/api/projects", data),
};

export const allocationApi = {
  getAll: () => api.get<Allocation[]>("/api/allocations"),
  create: (data: { productId: number; projectId: number; quantity: number; allocatedDate: string; notes?: string }) =>
    api.post<Allocation>("/api/allocations", data),
  batchCreate: (allocations: { productId: number; projectId: number; quantity: number; allocatedDate: string; notes?: string }[]) =>
    api.post<Allocation[]>("/api/allocations/batch", allocations),
};

export const dashboardApi = {
  getMetrics: () => api.get<DashboardMetrics>("/api/dashboard/metrics"),
};
