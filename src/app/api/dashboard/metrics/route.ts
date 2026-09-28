export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore } from "@/lib/store";

// GET /api/dashboard/metrics
export async function GET() {
  if (await isSupabaseAvailable()) {
    const { data: products, error: pError } = await supabase.from('products').select('*');
    const { count: activeProjects, error: prError } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE');
    const { count: completedProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED');
    const { count: totalProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    const { data: allocations, error: aError } = await supabase.from('allocations').select('quantity');

    if (pError || prError || aError) {
      return NextResponse.json({ error: "Failed to fetch dashboard metrics" }, { status: 500 });
    }

    const productsSafe = products || [];
    const allocationsSafe = allocations || [];

    const totalStockValue = productsSafe.reduce(
      (sum, p) => sum + (Number(p.warehouse_qty) * (Number(p.unit_price) || 0)),
      0
    );
    const lowStockCount = productsSafe.filter(
      (p) => p.warehouse_qty <= p.low_stock_threshold
    ).length;

    const warehouseQtyTotal = productsSafe.reduce((s, p) => s + Number(p.warehouse_qty), 0);
    const allocatedQtyTotal = allocationsSafe.reduce((s, a) => s + Number(a.quantity), 0);

    return NextResponse.json({
      totalStockValue,
      totalSkus: productsSafe.length,
      activeProjects: activeProjects || 0,
      lowStockCount,
      warehouseQtyTotal,
      allocatedQtyTotal,
      completedProjects: completedProjects || 0,
      totalProjects: totalProjects || 0,
      totalAllocations: allocationsSafe.length,
    });
  }

  // Fallback: local store
  const store = readStore();
  const products = store.products;
  const allocations = store.allocations;

  const totalStockValue = products.reduce(
    (sum, p) => sum + (p.warehouseQty * (p.unitPrice || 0)),
    0
  );
  const lowStockCount = products.filter(
    (p) => p.warehouseQty <= p.lowStockThreshold
  ).length;
  const warehouseQtyTotal = products.reduce((s, p) => s + p.warehouseQty, 0);
  const allocatedQtyTotal = allocations.reduce((s, a) => s + a.quantity, 0);

  return NextResponse.json({
    totalStockValue,
    totalSkus: products.length,
    activeProjects: store.projects.filter(p => p.status === "ACTIVE").length,
    lowStockCount,
    warehouseQtyTotal,
    allocatedQtyTotal,
    completedProjects: store.projects.filter(p => p.status === "COMPLETED").length,
    totalProjects: store.projects.length,
    totalAllocations: allocations.length,
  });
}
