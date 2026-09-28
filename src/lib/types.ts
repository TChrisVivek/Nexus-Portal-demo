export interface Product {
  id: number;
  sku: string;
  name: string;
  unit: string;
  totalQty: number;
  warehouseQty: number;
  lowStockThreshold: number;
  unitPrice: number;
  createdAt: string;
  invoiceNo?: string;
  billUrl?: string;
}

export interface SystemUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: "ADMIN" | "USER" | "PENDING" | "REJECTED";
  createdAt: string;
}

export interface Project {
  id: number;
  name: string;
  siteAddress: string;
  status: "ACTIVE" | "COMPLETED" | "ON_HOLD";
  createdAt: string;
  budget?: number;
  electricalPlans?: {
    id: string;
    name: string;
    url: string;
    addedAt: string;
  }[];
}

export interface Allocation {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  productUnit: string;
  projectId: number;
  projectName: string;
  quantity: number;
  allocatedDate: string;
  notes: string;
}

export interface Usage {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  productUnit: string;
  projectId: number;
  projectName: string;
  quantity: number;
  usedDate: string;
  notes: string;
}

export interface Worker {
  id: number;
  name: string;
  phone: string;
  trade: string;
  dailyRate: number;
  createdAt: string;
  isActive?: boolean;
}

export interface Assignment {
  id: number;
  workerId: number;
  workerName: string;
  workerTrade: string;
  projectId: number;
  projectName: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface Attendance {
  id: number;
  workerId: number;
  workerName: string;
  date: string;
  present: boolean;
  projectId: number;
  projectName: string;
  notes: string;
}

export interface Payment {
  id: number;
  workerId: number;
  workerName: string;
  amount: number;
  baseWage: number;
  foodAllowance: number;
  travelAllowance: number;
  otherAllowance: number;
  weekStart: string;
  weekEnd: string;
  paidDate: string;
  daysWorked: number;
  notes: string;
}

export interface ClientPayment {
  id: number;
  projectId: number;
  projectName: string;
  amount: number;
  paymentDate: string;
  invoiceNo: string;
  notes: string;
  billUrl?: string;
}

export interface DirectPurchase {
  id: number;
  projectId: number;
  projectName: string;
  description: string;
  amount: number;
  date: string;
  invoiceNo?: string;
  notes: string;
  billUrl?: string;
}
