export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore } from "@/lib/store";

/**
 * GET /api/settings/backup
 * Returns the full dataset as a downloadable JSON backup.
 * Uses Supabase in production, local store in dev.
 */
export async function GET() {
  const filename = `CMM_Grid_Backup_${new Date().toISOString().split("T")[0]}.json`;

  if (await isSupabaseAvailable()) {
    const [
      { data: products },
      { data: projects },
      { data: allocations },
      { data: workers },
      { data: assignments },
      { data: attendance },
      { data: payments },
      { data: clientPayments },
      { data: directPurchases },
      { data: settings },
    ] = await Promise.all([
      supabase.from('products').select('*').order('id'),
      supabase.from('projects').select('*').order('id'),
      supabase.from('allocations').select('*').order('id'),
      supabase.from('workers').select('*').order('id'),
      supabase.from('assignments').select('*').order('id'),
      supabase.from('attendance').select('*').order('id'),
      supabase.from('payments').select('*').order('id'),
      supabase.from('client_payments').select('*').order('id'),
      supabase.from('direct_purchases').select('*').order('id'),
      supabase.from('settings').select('*').eq('id', 1).single(),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      source: "supabase",
      products: products || [],
      projects: projects || [],
      allocations: allocations || [],
      workers: workers || [],
      assignments: assignments || [],
      attendance: attendance || [],
      payments: payments || [],
      clientPayments: clientPayments || [],
      directPurchases: directPurchases || [],
      settings: settings || {},
    };

    return NextResponse.json(backup, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // Fallback: local store
  const store = readStore();
  const backup = { exportedAt: new Date().toISOString(), source: "local", ...store };

  return NextResponse.json(backup, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
