import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore, writeStore, nextId } from "@/lib/store";

// GET /api/workers/[id]/payments
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workerId = Number(params.id);

  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('worker_id', workerId)
      .order('paid_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const payments = data.map(val => ({
      id: val.id,
      workerId: val.worker_id,
      amount: val.amount,
      baseWage: val.base_wage,
      foodAllowance: val.food_allowance,
      travelAllowance: val.travel_allowance,
      otherAllowance: val.other_allowance,
      weekStart: val.week_start,
      weekEnd: val.week_end,
      paidDate: val.paid_date,
      daysWorked: val.days_worked,
      notes: val.notes
    }));

    return NextResponse.json(payments);
  }

  // Fallback: local store
  const store = readStore();
  const payments = store.payments.filter(p => p.workerId === workerId);
  return NextResponse.json(payments);
}

// POST /api/workers/[id]/payments — record a weekly payment
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const workerId = Number(params.id);
  const body = await req.json();

  const baseWage       = Number(body.baseWage)       || 0;
  const foodAllowance  = Number(body.foodAllowance)  || 0;
  const travelAllowance= Number(body.travelAllowance)|| 0;
  const otherAllowance = Number(body.otherAllowance) || 0;
  const totalAmount    = baseWage + foodAllowance + travelAllowance + otherAllowance;

  if (totalAmount <= 0) return NextResponse.json({ error: "Total amount must be > 0" }, { status: 400 });

  if (await isSupabaseAvailable()) {
    if (body.weekStart) {
      const { data: alreadyPaid } = await supabase
        .from('payments')
        .select('amount, paid_date')
        .eq('worker_id', workerId)
        .eq('week_start', body.weekStart)
        .single();

      if (alreadyPaid) {
        return NextResponse.json(
          { error: `Payment for week starting ${body.weekStart} already recorded (₹${Number(alreadyPaid.amount).toLocaleString("en-IN")} on ${alreadyPaid.paid_date}).` },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        worker_id: workerId,
        amount: totalAmount,
        base_wage: baseWage,
        food_allowance: foodAllowance,
        travel_allowance: travelAllowance,
        other_allowance: otherAllowance,
        week_start: body.weekStart || null,
        week_end: body.weekEnd || null,
        paid_date: body.paidDate || new Date().toISOString().split("T")[0],
        days_worked: Number(body.daysWorked) || 0,
        notes: body.notes?.trim() || "",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      workerId: data.worker_id,
      amount: data.amount,
      baseWage: data.base_wage,
      foodAllowance: data.food_allowance,
      travelAllowance: data.travel_allowance,
      otherAllowance: data.other_allowance,
      weekStart: data.week_start,
      weekEnd: data.week_end,
      paidDate: data.paid_date,
      daysWorked: data.days_worked,
      notes: data.notes
    }, { status: 201 });
  }

  // Fallback: local store
  const store = readStore();

  if (body.weekStart) {
    const alreadyPaid = store.payments.find(
      p => p.workerId === workerId && p.weekStart === body.weekStart
    );
    if (alreadyPaid) {
      return NextResponse.json(
        { error: `Payment for week starting ${body.weekStart} already recorded.` },
        { status: 409 }
      );
    }
  }

  const worker = store.workers.find(w => w.id === workerId);
  const payment = {
    id: nextId(store, "nextPaymentId"),
    workerId,
    workerName: worker?.name || "Unknown",
    amount: totalAmount,
    baseWage,
    foodAllowance,
    travelAllowance,
    otherAllowance,
    weekStart: body.weekStart || "",
    weekEnd: body.weekEnd || "",
    paidDate: body.paidDate || new Date().toISOString().split("T")[0],
    daysWorked: Number(body.daysWorked) || 0,
    notes: body.notes?.trim() || "",
  };

  store.payments.push(payment);
  writeStore(store);
  return NextResponse.json(payment, { status: 201 });
}
