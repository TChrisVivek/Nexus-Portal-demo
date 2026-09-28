import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { 
  Product, Project, Allocation, Usage, Worker, 
  Assignment, Attendance, Payment, ClientPayment, 
  DirectPurchase, SystemUser 
} from "./types";

interface StoreMeta {
  nextProductId: number;
  nextProjectId: number;
  nextAllocationId: number;
  nextUsageId: number;
  nextWorkerId: number;
  nextAssignmentId: number;
  nextAttendanceId: number;
  nextPaymentId: number;
  nextClientPaymentId: number;
  nextDirectPurchaseId: number;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  defaultLowStockThreshold: number;
  defaultDailyRate: number;
  currency: string;
  reportFooter: string;
  companyLogo: string;
}

export interface Store {
  products: Product[];
  projects: Project[];
  allocations: Allocation[];
  usages: Usage[];
  workers: Worker[];
  assignments: Assignment[];
  attendance: Attendance[];
  payments: Payment[];
  clientPayments: ClientPayment[];
  directPurchases: DirectPurchase[];
  users: SystemUser[];
  settings?: AppSettings;
  _meta: StoreMeta;
}


const STORE_PATH = path.join(process.cwd(), "src", "data", "store.json");

export function readStore(): Store {
  try {
    const raw = readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    // Migrate older store files
    if (!parsed.usages)          parsed.usages = [];
    if (!parsed.workers)         parsed.workers = [];
    if (!parsed.assignments)     parsed.assignments = [];
    if (!parsed.attendance)      parsed.attendance = [];
    if (!parsed.payments)        parsed.payments = [];
    if (!parsed.clientPayments)  parsed.clientPayments = [];
    if (!parsed.directPurchases) parsed.directPurchases = [];
    if (!parsed.users)           parsed.users = [];
    if (!parsed._meta.nextUsageId)         parsed._meta.nextUsageId = 1;
    if (!parsed._meta.nextWorkerId)        parsed._meta.nextWorkerId = 1;
    if (!parsed._meta.nextAssignmentId)    parsed._meta.nextAssignmentId = 1;
    if (!parsed._meta.nextAttendanceId)    parsed._meta.nextAttendanceId = 1;
    if (!parsed._meta.nextPaymentId)       parsed._meta.nextPaymentId = 1;
    if (!parsed._meta.nextClientPaymentId) parsed._meta.nextClientPaymentId = 1;
    if (!parsed._meta.nextDirectPurchaseId) parsed._meta.nextDirectPurchaseId = 1;
    return parsed as Store;
  } catch {
    return {
      products: [], projects: [], allocations: [], usages: [],
      workers: [], assignments: [], attendance: [], payments: [],
      clientPayments: [], directPurchases: [], users: [],
      _meta: {
        nextProductId: 1, nextProjectId: 1, nextAllocationId: 1,
        nextUsageId: 1, nextWorkerId: 1, nextAssignmentId: 1,
        nextAttendanceId: 1, nextPaymentId: 1, nextClientPaymentId: 1,
        nextDirectPurchaseId: 1,
      },
    };
  }
}

export function writeStore(store: Store): void {
  try {
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err: unknown) {
    const isReadOnly =
      err instanceof Error &&
      (err.message.includes('EROFS') || err.message.includes('read-only'));
    if (isReadOnly) {
      throw new Error(
        'This deployment uses a read-only filesystem. ' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
        'in your Vercel project environment variables to enable database writes.'
      );
    }
    throw err;
  }
}

export function nextId(store: Store, key: keyof StoreMeta): number {
  const id = store._meta[key];
  store._meta[key] = id + 1;
  return id;
}
