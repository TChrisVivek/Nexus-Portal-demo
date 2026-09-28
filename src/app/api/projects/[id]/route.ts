/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore, writeStore } from "@/lib/store";

// GET /api/projects/[id]
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);

  if (await isSupabaseAvailable()) {
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (pError || !project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: allocationsData } = await supabase
      .from('allocations')
      .select('*, product:products(sku, name, unit)')
      .eq('project_id', id)
      .order('allocated_date', { ascending: false });

    const { data: usagesData } = await supabase
      .from('usages')
      .select('*, product:products(sku, name, unit)')
      .eq('project_id', id)
      .order('used_date', { ascending: false });

    const { data: dpData } = await supabase
      .from('direct_purchases')
      .select('*')
      .eq('project_id', id)
      .order('date', { ascending: false });

    const allocations = (allocationsData || []).map(a => ({
      id: a.id,
      productId: a.product_id,
      productSku: (a as any).product?.sku,
      productName: (a as any).product?.name,
      productUnit: (a as any).product?.unit,
      projectId: a.project_id,
      quantity: a.quantity,
      allocatedDate: a.allocated_date,
      notes: a.notes,
    }));

    const usages = (usagesData || []).map(u => ({
      id: u.id,
      productId: u.product_id,
      productSku: (u as any).product?.sku,
      productName: (u as any).product?.name,
      productUnit: (u as any).product?.unit,
      projectId: u.project_id,
      quantity: u.quantity,
      usedDate: u.used_date,
      notes: u.notes,
    }));

    const directPurchases = (dpData || []).map(dp => ({
      id: dp.id,
      projectId: dp.project_id,
      description: dp.description,
      amount: Number(dp.amount),
      date: dp.date,
      invoiceNo: dp.invoice_no,
      notes: dp.notes,
      billUrl: dp.bill_url,
    }));

    const formattedProject = {
      id: project.id,
      name: project.name,
      siteAddress: project.site_address,
      status: project.status,
      budget: Number(project.budget),
      electricalPlans: project.electrical_plans || [],
      createdAt: project.created_at,
    };

    return buildSummaryResponse(formattedProject, allocations, usages, directPurchases);
  }

  // Fallback: local store
  const store = readStore();
  const project = store.projects.find((p) => p.id === id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allocations = store.allocations
    .filter((a) => a.projectId === id)
    .sort((a, b) => b.allocatedDate.localeCompare(a.allocatedDate));

  const usages = store.usages
    .filter((u) => u.projectId === id)
    .sort((a, b) => b.usedDate.localeCompare(a.usedDate));

  const directPurchases = store.directPurchases
    .filter((dp) => dp.projectId === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return buildSummaryResponse(project, allocations, usages, directPurchases);
}

function buildSummaryResponse(project: any, allocations: any[], usages: any[], directPurchases: any[]) {
  // Per-product summary: dispatched vs used vs remaining at site
  const productMap: Record<number, {
    productId: number; sku: string; name: string; unit: string;
    dispatched: number; used: number; remaining: number; entries: number;
  }> = {};

  for (const a of allocations) {
    if (!productMap[a.productId]) {
      productMap[a.productId] = { productId: a.productId, sku: a.productSku, name: a.productName, unit: a.productUnit, dispatched: 0, used: 0, remaining: 0, entries: 0 };
    }
    productMap[a.productId].dispatched += a.quantity;
    productMap[a.productId].entries++;
  }

  for (const u of usages) {
    if (!productMap[u.productId]) {
      productMap[u.productId] = { productId: u.productId, sku: u.productSku, name: u.productName, unit: u.productUnit, dispatched: 0, used: 0, remaining: 0, entries: 0 };
    }
    productMap[u.productId].used += u.quantity;
  }

  for (const item of Object.values(productMap)) {
    item.remaining = item.dispatched - item.used;
  }

  const productSummary = Object.values(productMap).sort((a, b) => b.dispatched - a.dispatched);

  const totalDispatched = allocations.reduce((s, a) => s + a.quantity, 0);
  const totalUsed = usages.reduce((s, u) => s + u.quantity, 0);
  const totalDirectPurchasesCost = directPurchases.reduce((s, dp) => s + dp.amount, 0);

  return NextResponse.json({
    project,
    allocations,
    usages,
    directPurchases,
    productSummary,
    totalDispatched,
    totalUsed,
    totalRemaining: totalDispatched - totalUsed,
    totalEntries: allocations.length,
    totalUsageEntries: usages.length,
    totalDirectPurchasesCost,
  });
}

// PATCH /api/projects/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json();

  if (await isSupabaseAvailable()) {
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.siteAddress !== undefined) updateData.site_address = body.siteAddress.trim();
    if (body.status !== undefined) updateData.status = body.status;
    if (body.budget !== undefined) updateData.budget = Number(body.budget);
    if (body.electricalPlans !== undefined) updateData.electrical_plans = body.electricalPlans;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      id: data.id,
      name: data.name,
      siteAddress: data.site_address,
      status: data.status,
      budget: Number(data.budget),
      electricalPlans: data.electrical_plans || [],
      createdAt: data.created_at,
    });
  }

  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const store = readStore();
  const pIndex = store.projects.findIndex((p) => p.id === id);
  if (pIndex === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  store.projects[pIndex] = { ...store.projects[pIndex], ...body };
  writeStore(store);
  return NextResponse.json(store.projects[pIndex]);
}

// DELETE /api/projects/[id]
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);

  if (await isSupabaseAvailable()) {
    // Manually delete usages and allocations first since they have ON DELETE RESTRICT
    await supabase.from('usages').delete().eq('project_id', id);
    await supabase.from('allocations').delete().eq('project_id', id);

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const store = readStore();
  const pIndex = store.projects.findIndex((p) => p.id === id);
  if (pIndex === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  store.projects.splice(pIndex, 1);
  store.allocations = store.allocations.filter((a) => a.projectId !== id);
  store.usages = store.usages.filter((u) => u.projectId !== id);
  store.directPurchases = store.directPurchases.filter((d) => d.projectId !== id);
  store.clientPayments = store.clientPayments?.filter((c) => c.projectId !== id) || [];
  store.assignments = store.assignments.filter((a) => a.projectId !== id);
  store.attendance = store.attendance.filter((a) => a.projectId !== id);

  writeStore(store);
  return NextResponse.json({ success: true });
}
