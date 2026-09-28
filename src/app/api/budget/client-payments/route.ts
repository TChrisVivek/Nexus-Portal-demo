export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore, writeStore, nextId } from "@/lib/store";

/** GET /api/budget/client-payments — list all client payments */
export async function GET() {
  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('client_payments')
      .select(`
        *,
        project:projects(name)
      `)
      .order('payment_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const payments = data.map(val => ({
      id: val.id,
      projectId: val.project_id,
      projectName: val.project?.name || "",
      amount: val.amount,
      paymentDate: val.payment_date,
      invoiceNo: val.invoice_no,
      notes: val.notes,
      billUrl: val.bill_url
    }));

    return NextResponse.json(payments);
  }

  // Fallback: local store
  const store = readStore();
  return NextResponse.json(store.clientPayments);
}

/** POST /api/budget/client-payments — record a new client payment */
export async function POST(req: Request) {
  const body = await req.json();
  const { projectId, amount, paymentDate, invoiceNo, notes, billUrl } = body;

  if (!projectId || !amount || !paymentDate) {
    return NextResponse.json({ error: "projectId, amount, paymentDate required" }, { status: 400 });
  }

  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('client_payments')
      .insert({
        project_id: Number(projectId),
        amount: Number(amount),
        payment_date: paymentDate,
        invoice_no: invoiceNo ?? "",
        notes: notes ?? "",
        bill_url: billUrl ?? "",
      })
      .select(`
        *,
        project:projects(name)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      projectId: data.project_id,
      projectName: data.project?.name || "",
      amount: data.amount,
      paymentDate: data.payment_date,
      invoiceNo: data.invoice_no,
      notes: data.notes,
      billUrl: data.bill_url
    }, { status: 201 });
  }

  // Fallback: local store
  const store = readStore();
  const project = store.projects.find(p => p.id === Number(projectId));
  const payment = {
    id: nextId(store, "nextClientPaymentId"),
    projectId: Number(projectId),
    projectName: project?.name || "Unknown",
    amount: Number(amount),
    paymentDate,
    invoiceNo: invoiceNo ?? "",
    notes: notes ?? "",
    billUrl: billUrl ?? "",
  };
  store.clientPayments.push(payment);
  writeStore(store);
  return NextResponse.json(payment, { status: 201 });
}
