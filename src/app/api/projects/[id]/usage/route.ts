/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore, writeStore, nextId } from "@/lib/store";

// GET /api/projects/[id]/usage — get all usage entries for a project
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const projectId = Number(params.id);

  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('usages')
      .select('*, product:products(sku, name, unit)')
      .eq('project_id', projectId)
      .order('used_date', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const usages = (data || []).map(u => ({
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

    return NextResponse.json(usages);
  }

  const store = readStore();
  const usages = store.usages
    .filter((u) => u.projectId === projectId)
    .sort((a, b) => b.usedDate.localeCompare(a.usedDate));
  return NextResponse.json(usages);
}

// POST /api/projects/[id]/usage — record items used at a project site
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const projectId = Number(params.id);
  const body = await req.json();

  const qty = Number(body.quantity);
  if (!qty || qty <= 0) return NextResponse.json({ error: "Quantity must be > 0" }, { status: 400 });

  if (await isSupabaseAvailable()) {
    // 1. Fetch product
    const { data: product, error: pError } = await supabase
      .from('products')
      .select('*')
      .eq('id', Number(body.productId))
      .single();

    if (pError || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    // 2. Fetch project
    const { data: project, error: projError } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    if (projError || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // 3. Check dispatched qty
    const { data: allocations, error: aError } = await supabase
      .from('allocations')
      .select('quantity')
      .eq('project_id', projectId)
      .eq('product_id', product.id);

    if (aError) return NextResponse.json({ error: aError.message }, { status: 500 });
    const dispatched = (allocations || []).reduce((sum, a) => sum + a.quantity, 0);

    // 4. Check already used qty
    const { data: usagesData, error: uError } = await supabase
      .from('usages')
      .select('quantity')
      .eq('project_id', projectId)
      .eq('product_id', product.id);

    if (uError) return NextResponse.json({ error: uError.message }, { status: 500 });
    const alreadyUsed = (usagesData || []).reduce((sum, u) => sum + u.quantity, 0);

    const remaining = dispatched - alreadyUsed;
    if (qty > remaining) {
      return NextResponse.json(
        {
          error: `Only ${remaining} ${product.unit}(s) of ${product.sku} available at this site. (${dispatched} dispatched − ${alreadyUsed} already used)`,
        },
        { status: 409 }
      );
    }

    // 5. Insert usage
    const { data: usage, error: insertError } = await supabase
      .from('usages')
      .insert({
        project_id: projectId,
        product_id: product.id,
        quantity: qty,
        used_date: body.usedDate || new Date().toISOString().split("T")[0],
        notes: body.notes?.trim() || "",
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({
      id: usage.id,
      productId: usage.product_id,
      productName: product.name,
      productSku: product.sku,
      productUnit: product.unit,
      projectId: usage.project_id,
      projectName: project.name,
      quantity: usage.quantity,
      usedDate: usage.used_date,
      notes: usage.notes,
    }, { status: 201 });
  }

  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const store = readStore();
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const product = store.products.find((p) => p.id === Number(body.productId));
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const dispatched = store.allocations
    .filter((a) => a.projectId === projectId && a.productId === product.id)
    .reduce((s, a) => s + a.quantity, 0);

  const alreadyUsed = store.usages
    .filter((u) => u.projectId === projectId && u.productId === product.id)
    .reduce((s, u) => s + u.quantity, 0);

  const remaining = dispatched - alreadyUsed;

  if (qty > remaining) {
    return NextResponse.json(
      {
        error: `Only ${remaining} ${product.unit}(s) of ${product.sku} available at this site. (${dispatched} dispatched − ${alreadyUsed} already used)`,
      },
      { status: 409 }
    );
  }

  const usage = {
    id: nextId(store, "nextUsageId"),
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    productUnit: product.unit,
    projectId,
    projectName: project.name,
    quantity: qty,
    usedDate: body.usedDate || new Date().toISOString().split("T")[0],
    notes: body.notes?.trim() || "",
  };

  store.usages.push(usage);
  writeStore(store);
  return NextResponse.json(usage, { status: 201 });
}
