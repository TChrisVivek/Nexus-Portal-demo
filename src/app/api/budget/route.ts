export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore } from "@/lib/store";

/**
 * GET /api/budget
 *
 * Aggregates financial data for the budget overview:
 * - materialCost per project (allocations × unit price)
 * - labourCost per project (project attendance × worker daily rate)
 * - clientPaymentsReceived per project
 * - directPurchaseCost per project
 * - totals
 */

type ProjectBudget = {
  projectId: number;
  projectName: string;
  status: string;
  materialCost: number;
  labourCost: number;
  labourDays: number;
  directPurchaseCost: number;
  totalSpent: number;
  clientReceived: number;
  netPL: number;
  invoices: {
    id: number;
    projectId: number;
    projectName: string;
    amount: number;
    paymentDate: string;
    invoiceNo: string;
    notes: string;
    billUrl?: string;
  }[];
};

export async function GET() {

  // ─── Supabase path ────────────────────────────────────────────────────────
  if (await isSupabaseAvailable()) {
    const [
      { data: projects },
      { data: products },
      { data: workers },
      { data: allocations },
      { data: attendance },
      { data: clientPayments },
      { data: directPurchases },
    ] = await Promise.all([
      supabase.from('projects').select('id, name, status'),
      supabase.from('products').select('id, unit_price'),
      supabase.from('workers').select('id, daily_rate'),
      supabase.from('allocations').select('project_id, product_id, quantity'),
      supabase.from('attendance').select('project_id, worker_id, present'),
      supabase.from('client_payments').select('id, project_id, amount, payment_date, invoice_no, notes, bill_url'),
      supabase.from('direct_purchases').select('project_id, amount'),
    ]);

    if (!projects) return NextResponse.json({ projects: [], totals: zerototals() });

    // Build lookup maps
    const productPrice: Record<number, number> = {};
    for (const p of products || []) productPrice[p.id] = Number(p.unit_price) || 0;

    const workerRate: Record<number, number> = {};
    for (const w of workers || []) workerRate[w.id] = Number(w.daily_rate) || 0;

    const budgetMap = new Map<number, ProjectBudget>();
    for (const p of projects) {
      budgetMap.set(p.id, {
        projectId: p.id, projectName: p.name, status: p.status,
        materialCost: 0, labourCost: 0, labourDays: 0,
        directPurchaseCost: 0, totalSpent: 0, clientReceived: 0, netPL: 0, invoices: [],
      });
    }

    for (const a of allocations || []) {
      const entry = budgetMap.get(a.project_id);
      if (entry) entry.materialCost += Number(a.quantity) * (productPrice[a.product_id] ?? 0);
    }

    for (const att of attendance || []) {
      const entry = budgetMap.get(att.project_id);
      if (entry && att.present) {
        entry.labourCost += workerRate[att.worker_id] ?? 0;
        entry.labourDays += 1;
      }
    }

    for (const cp of clientPayments || []) {
      const entry = budgetMap.get(cp.project_id);
      if (entry) {
        entry.clientReceived += Number(cp.amount);
        entry.invoices.push({
          id: cp.id,
          projectId: cp.project_id,
          projectName: entry.projectName,
          amount: Number(cp.amount),
          paymentDate: cp.payment_date,
          invoiceNo: cp.invoice_no || "",
          notes: cp.notes || "",
          billUrl: cp.bill_url || "",
        });
      }
    }

    for (const dp of directPurchases || []) {
      const entry = budgetMap.get(dp.project_id);
      if (entry) entry.directPurchaseCost += Number(dp.amount);
    }

    return NextResponse.json(buildResponse(budgetMap));
  }

  // ─── Local store fallback ─────────────────────────────────────────────────
  const store = readStore();

  const productPrice: Record<number, number> = {};
  for (const p of store.products) productPrice[p.id] = p.unitPrice;

  const workerRate: Record<number, number> = {};
  for (const w of store.workers) workerRate[w.id] = w.dailyRate;

  const budgetMap = new Map<number, ProjectBudget>();
  for (const p of store.projects) {
    budgetMap.set(p.id, {
      projectId: p.id, projectName: p.name, status: p.status,
      materialCost: 0, labourCost: 0, labourDays: 0,
      directPurchaseCost: 0, totalSpent: 0, clientReceived: 0, netPL: 0, invoices: [],
    });
  }

  for (const a of store.allocations) {
    const entry = budgetMap.get(a.projectId);
    if (entry) entry.materialCost += a.quantity * (productPrice[a.productId] ?? 0);
  }

  for (const att of store.attendance) {
    const entry = budgetMap.get(att.projectId);
    if (entry && att.present) {
      entry.labourCost += workerRate[att.workerId] ?? 0;
      entry.labourDays += 1;
    }
  }

  for (const cp of store.clientPayments) {
    const entry = budgetMap.get(cp.projectId);
    if (entry) {
      entry.clientReceived += cp.amount;
      entry.invoices.push({
        id: cp.id,
        projectId: cp.projectId,
        projectName: cp.projectName,
        amount: cp.amount,
        paymentDate: cp.paymentDate,
        invoiceNo: cp.invoiceNo,
        notes: cp.notes,
        billUrl: cp.billUrl,
      });
    }
  }

  for (const dp of store.directPurchases) {
    const entry = budgetMap.get(dp.projectId);
    if (entry) entry.directPurchaseCost += dp.amount;
  }

  return NextResponse.json(buildResponse(budgetMap));
}

function buildResponse(budgetMap: Map<number, ProjectBudget>) {
  const projects: ProjectBudget[] = [];
  for (const entry of Array.from(budgetMap.values())) {
    entry.totalSpent = entry.materialCost + entry.labourCost + entry.directPurchaseCost;
    entry.netPL = entry.clientReceived - entry.totalSpent;
    projects.push(entry);
  }
  projects.sort((a, b) => {
    if (a.status === b.status) return a.projectName.localeCompare(b.projectName);
    return a.status === "ACTIVE" ? -1 : 1;
  });
  return { projects, totals: zerototals(projects) };
}

function zerototals(projects: ProjectBudget[] = []) {
  return {
    totalMaterial:        projects.reduce((s, p) => s + p.materialCost,        0),
    totalLabour:          projects.reduce((s, p) => s + p.labourCost,          0),
    totalDirectPurchases: projects.reduce((s, p) => s + p.directPurchaseCost,  0),
    totalSpent:           projects.reduce((s, p) => s + p.totalSpent,          0),
    totalReceived:        projects.reduce((s, p) => s + p.clientReceived,      0),
    netPL:                projects.reduce((s, p) => s + p.netPL,               0),
  };
}
