/**
 * POST /api/settings/reset
 * Admin-only endpoint to wipe all operational data (inventory, projects, workers, etc.)
 * and reset settings to defaults. User accounts in system_users are preserved.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { Store } from "@/lib/store";

interface SessionWithRole {
  user?: { email?: string | null; role?: string };
}

const DEFAULT_SETTINGS = {
  companyName: "CMM Grid",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  defaultLowStockThreshold: 50,
  defaultDailyRate: 600,
  currency: "INR",
  reportFooter: "Confidential",
  companyLogo: "",
};

const DEFAULT_META = {
  nextProductId: 1,
  nextProjectId: 1,
  nextAllocationId: 1,
  nextUsageId: 1,
  nextWorkerId: 1,
  nextAssignmentId: 1,
  nextAttendanceId: 1,
  nextPaymentId: 1,
  nextClientPaymentId: 1,
  nextDirectPurchaseId: 1,
};

export async function POST() {
  // Auth guard — must be an admin
  const session = await getServerSession(authOptions);
  const role = (session as SessionWithRole)?.user?.role;
  if (!session || role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });
  }

  if (await isSupabaseAvailable()) {
    // Clear Supabase tables (preserve system_users)
    const tables = [
      "products", "projects", "allocations", "usages",
      "workers", "assignments", "attendance", "payments",
      "client_payments", "direct_purchases",
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().neq("id", -999999); // delete all rows
      if (error) {
        console.error(`[reset] Failed to clear table ${table}:`, error.message);
      }
    }

    // Reset settings
    await supabase.from("settings").upsert({
      id: 1,
      company_name: DEFAULT_SETTINGS.companyName,
      company_address: DEFAULT_SETTINGS.companyAddress,
      company_phone: DEFAULT_SETTINGS.companyPhone,
      company_email: DEFAULT_SETTINGS.companyEmail,
      default_low_stock_threshold: DEFAULT_SETTINGS.defaultLowStockThreshold,
      default_daily_rate: DEFAULT_SETTINGS.defaultDailyRate,
      currency: DEFAULT_SETTINGS.currency,
      report_footer: DEFAULT_SETTINGS.reportFooter,
      company_logo: DEFAULT_SETTINGS.companyLogo,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, message: "Supabase data cleared" });
  }

  // Fallback: reset the local store.json (preserve users)
  try {
    const { readStore, writeStore } = await import("@/lib/store");
    const existing = readStore();
    const freshStore: Store = {
      products: [],
      projects: [],
      allocations: [],
      usages: [],
      workers: [],
      assignments: [],
      attendance: [],
      payments: [],
      clientPayments: [],
      directPurchases: [],
      users: existing.users, // preserve user accounts!
      settings: DEFAULT_SETTINGS,
      _meta: DEFAULT_META,
    };
    writeStore(freshStore);
    return NextResponse.json({ ok: true, message: "Local store reset" });
  } catch (err) {
    console.error("[reset] Failed to write store:", err);
    return NextResponse.json({ error: "Failed to reset data" }, { status: 500 });
  }
}
