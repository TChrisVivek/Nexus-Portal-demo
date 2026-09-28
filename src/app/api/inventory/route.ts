import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore, writeStore, nextId } from "@/lib/store";

export const dynamic = 'force-dynamic';

// GET /api/inventory
export async function GET() {
  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const products = data.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      totalQty: p.total_qty,
      warehouseQty: p.warehouse_qty,
      lowStockThreshold: p.low_stock_threshold,
      unitPrice: p.unit_price,
      createdAt: p.created_at,
      invoiceNo: p.invoice_no,
      billUrl: p.bill_url,
    }));

    return NextResponse.json(products);
  }

  // Fallback: local store
  const store = readStore();
  return NextResponse.json(store.products);
}

// POST /api/inventory
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.sku || !body.name) {
    return NextResponse.json({ error: "SKU and name are required" }, { status: 400 });
  }

  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        sku: body.sku.toUpperCase().trim(),
        name: body.name.trim(),
        unit: body.unit?.trim() || "Piece",
        total_qty: Number(body.totalQty) || 0,
        warehouse_qty: Number(body.totalQty) || 0,
        low_stock_threshold: Number(body.lowStockThreshold) || 10,
        unit_price: Number(body.unitPrice) || 0,
        invoice_no: body.invoiceNo?.trim() || "",
        bill_url: body.billUrl || "",
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const product = {
      id: data.id,
      sku: data.sku,
      name: data.name,
      unit: data.unit,
      totalQty: data.total_qty,
      warehouseQty: data.warehouse_qty,
      lowStockThreshold: data.low_stock_threshold,
      unitPrice: data.unit_price,
      createdAt: data.created_at,
      invoiceNo: data.invoice_no,
      billUrl: data.bill_url,
    };

    return NextResponse.json(product, { status: 201 });
  }

  // Fallback: local store
  const store = readStore();
  const sku = body.sku.toUpperCase().trim();
  if (store.products.some(p => p.sku === sku)) {
    return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
  }

  const newProduct = {
    id: nextId(store, "nextProductId"),
    sku,
    name: body.name.trim(),
    unit: body.unit?.trim() || "Piece",
    totalQty: Number(body.totalQty) || 0,
    warehouseQty: Number(body.totalQty) || 0,
    lowStockThreshold: Number(body.lowStockThreshold) || 10,
    unitPrice: Number(body.unitPrice) || 0,
    createdAt: new Date().toISOString(),
    invoiceNo: body.invoiceNo?.trim() || "",
    billUrl: body.billUrl || "",
  };

  store.products.push(newProduct);
  writeStore(store);
  return NextResponse.json(newProduct, { status: 201 });
}
