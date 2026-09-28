export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore, writeStore, nextId } from "@/lib/store";

// GET /api/workers
export async function GET() {
  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const workers = data.map(w => ({
      id: w.id,
      name: w.name,
      phone: w.phone,
      trade: w.trade,
      dailyRate: w.daily_rate,
      isActive: w.is_active,
      createdAt: w.created_at,
    }));

    return NextResponse.json(workers);
  }

  // Fallback: local store
  const store = readStore();
  return NextResponse.json(store.workers);
}

// POST /api/workers
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Worker name is required" }, { status: 400 });
  }

  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('workers')
      .insert({
        name: body.name.trim(),
        phone: body.phone?.trim() || "",
        trade: body.trade?.trim() || "Electrician",
        daily_rate: Number(body.dailyRate) || 0,
        is_active: body.isActive !== undefined ? body.isActive : true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      phone: data.phone,
      trade: data.trade,
      dailyRate: data.daily_rate,
      isActive: data.is_active,
      createdAt: data.created_at,
    }, { status: 201 });
  }

  // Fallback: local store
  const store = readStore();
  const worker = {
    id: nextId(store, "nextWorkerId"),
    name: body.name.trim(),
    phone: body.phone?.trim() || "",
    trade: body.trade?.trim() || "Electrician",
    dailyRate: Number(body.dailyRate) || 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  store.workers.push(worker);
  writeStore(store);
  return NextResponse.json(worker, { status: 201 });
}

// DELETE /api/workers?id=<id>
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "Worker ID is required" }, { status: 400 });
  }

  if (await isSupabaseAvailable()) {
    // Also remove all related records for this worker
    await supabase.from('assignments').delete().eq('worker_id', id);
    await supabase.from('attendance').delete().eq('worker_id', id);
    await supabase.from('payments').delete().eq('worker_id', id);

    const { error } = await supabase.from('workers').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Fallback: local store
  const store = readStore();
  const exists = store.workers.find(w => w.id === id);
  if (!exists) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  // Remove worker and all related records
  store.workers = store.workers.filter(w => w.id !== id);
  store.assignments = store.assignments.filter(a => a.workerId !== id);
  store.attendance = store.attendance.filter(a => a.workerId !== id);
  store.payments = store.payments.filter(p => p.workerId !== id);
  writeStore(store);
  return NextResponse.json({ ok: true });
}
