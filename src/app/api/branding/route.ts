/**
 * Public branding endpoint — returns company name and logo.
 * No auth required; used on the login/pending/blocked screens.
 */
import { NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET() {
  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('settings')
      .select('company_name, company_logo')
      .eq('id', 1)
      .single();

    if (!error && data) {
      return NextResponse.json({
        companyName: data.company_name ?? "CMM Grid",
        companyLogo: data.company_logo ?? "",
      });
    }
  }

  // Fallback: read from store.json
  try {
    const { readStore } = await import("@/lib/store");
    const store = readStore();
    const s = store.settings;
    if (s) {
      return NextResponse.json({
        companyName: s.companyName || "CMM Grid",
        companyLogo: s.companyLogo || "",
      });
    }
  } catch { /* ignore */ }

  return NextResponse.json({ companyName: "CMM Grid", companyLogo: "" });
}
