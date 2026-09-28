import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";

// PUT /api/inventory/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json();
  const store = readStore();

  const idx = store.products.findIndex((p) => p.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  store.products[idx] = {
    ...store.products[idx],
    name: body.name?.trim() ?? store.products[idx].name,
    unit: body.unit?.trim() ?? store.products[idx].unit,
    totalQty: body.totalQty !== undefined ? Number(body.totalQty) : store.products[idx].totalQty,
    warehouseQty: body.warehouseQty !== undefined ? Number(body.warehouseQty) : store.products[idx].warehouseQty,
    lowStockThreshold: body.lowStockThreshold !== undefined ? Number(body.lowStockThreshold) : store.products[idx].lowStockThreshold,
    unitPrice: body.unitPrice !== undefined ? Number(body.unitPrice) : store.products[idx].unitPrice,
  };

  writeStore(store);
  return NextResponse.json(store.products[idx]);
}

// DELETE /api/inventory/[id]
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const store = readStore();

  const idx = store.products.findIndex((p) => p.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Block delete if there are active allocations
  const hasAllocations = store.allocations.some((a) => a.productId === id);
  if (hasAllocations) {
    return NextResponse.json(
      { error: "Cannot delete: product has allocation history" },
      { status: 409 }
    );
  }

  store.products.splice(idx, 1);
  writeStore(store);
  return NextResponse.json({ ok: true });
}
