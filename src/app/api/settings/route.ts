import { NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

const DEFAULTS = {
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

export async function GET() {
  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) {
      return NextResponse.json({
        companyName: data.company_name,
        companyAddress: data.company_address,
        companyPhone: data.company_phone,
        companyEmail: data.company_email,
        defaultLowStockThreshold: data.default_low_stock_threshold,
        defaultDailyRate: data.default_daily_rate,
        currency: data.currency,
        reportFooter: data.report_footer,
        companyLogo: data.company_logo ?? "",
      });
    }
  }

  // Fallback: read from local store.json
  try {
    const { readStore } = await import("@/lib/store");
    const store = readStore();
    const s = store.settings;
    if (s) {
      return NextResponse.json({
        companyName: s.companyName ?? DEFAULTS.companyName,
        companyAddress: s.companyAddress ?? DEFAULTS.companyAddress,
        companyPhone: s.companyPhone ?? DEFAULTS.companyPhone,
        companyEmail: s.companyEmail ?? DEFAULTS.companyEmail,
        defaultLowStockThreshold: Number(s.defaultLowStockThreshold) || DEFAULTS.defaultLowStockThreshold,
        defaultDailyRate: Number(s.defaultDailyRate) || DEFAULTS.defaultDailyRate,
        currency: s.currency ?? DEFAULTS.currency,
        reportFooter: s.reportFooter ?? DEFAULTS.reportFooter,
        companyLogo: s.companyLogo ?? "",
      });
    }
  } catch { /* ignore */ }

  return NextResponse.json(DEFAULTS);
}

export async function PUT(req: Request) {
  const body = await req.json();

  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('settings')
      .upsert({
        id: 1,
        company_name: body.companyName ?? DEFAULTS.companyName,
        company_address: body.companyAddress ?? "",
        company_phone: body.companyPhone ?? "",
        company_email: body.companyEmail ?? "",
        default_low_stock_threshold: Number(body.defaultLowStockThreshold) || 50,
        default_daily_rate: Number(body.defaultDailyRate) || 600,
        currency: body.currency ?? "INR",
        report_footer: body.reportFooter ?? "Confidential",
        company_logo: body.companyLogo ?? "",
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      companyName: data.company_name,
      companyAddress: data.company_address,
      companyPhone: data.company_phone,
      companyEmail: data.company_email,
      defaultLowStockThreshold: data.default_low_stock_threshold,
      defaultDailyRate: data.default_daily_rate,
      currency: data.currency,
      reportFooter: data.report_footer,
      companyLogo: data.company_logo ?? "",
    });
  }

  // Fallback: persist to store.json
  const newSettings = {
    companyName: body.companyName ?? DEFAULTS.companyName,
    companyAddress: body.companyAddress ?? "",
    companyPhone: body.companyPhone ?? "",
    companyEmail: body.companyEmail ?? "",
    defaultLowStockThreshold: Number(body.defaultLowStockThreshold) || 50,
    defaultDailyRate: Number(body.defaultDailyRate) || 600,
    currency: body.currency ?? "INR",
    reportFooter: body.reportFooter ?? "Confidential",
    companyLogo: body.companyLogo ?? "",
  };

  try {
    const { readStore, writeStore } = await import("@/lib/store");
    const store = readStore();
    store.settings = newSettings;
    writeStore(store);
  } catch { /* read-only env — just echo back */ }

  return NextResponse.json(newSettings);
}
