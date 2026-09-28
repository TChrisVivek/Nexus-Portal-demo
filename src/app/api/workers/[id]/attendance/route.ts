import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore, writeStore, nextId } from "@/lib/store";

// GET /api/workers/[id]/attendance
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const workerId = Number(params.id);

  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        project:projects(name)
      `)
      .eq('worker_id', workerId)
      .order('date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const records = data.map(val => ({
      id: val.id,
      workerId: val.worker_id,
      date: val.date,
      present: val.present,
      projectId: val.project_id,
      projectName: val.project?.name || "",
      notes: val.notes
    }));

    return NextResponse.json(records);
  }

  // Fallback: local store
  const store = readStore();
  const records = store.attendance.filter(a => a.workerId === workerId);
  return NextResponse.json(records);
}

// POST /api/workers/[id]/attendance — mark a day present/absent
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const workerId = Number(params.id);
  const body = await req.json();
  const date = body.date || new Date().toISOString().split("T")[0];

  if (await isSupabaseAvailable()) {
    if (body.present === null) {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('worker_id', workerId)
        .eq('date', date);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ deleted: true });
    }

    const { data, error } = await supabase
      .from('attendance')
      .upsert({
        worker_id: workerId,
        project_id: body.projectId ? Number(body.projectId) : null,
        date: date,
        present: body.present !== false,
        notes: body.notes?.trim() || "",
      }, {
        onConflict: 'worker_id,date'
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
      workerId: data.worker_id,
      date: data.date,
      present: data.present,
      projectId: data.project_id,
      projectName: data.project?.name || "",
      notes: data.notes
    }, { status: 201 });
  }

  // Fallback: local store
  const store = readStore();

  if (body.present === null) {
    store.attendance = store.attendance.filter(a => !(a.workerId === workerId && a.date === date));
    writeStore(store);
    return NextResponse.json({ deleted: true });
  }

  const existingIdx = store.attendance.findIndex(a => a.workerId === workerId && a.date === date);
  const worker = store.workers.find(w => w.id === workerId);
  const project = body.projectId ? store.projects.find(p => p.id === Number(body.projectId)) : null;

  const record = {
    id: existingIdx >= 0 ? store.attendance[existingIdx].id : nextId(store, "nextAttendanceId"),
    workerId,
    workerName: worker?.name || "Unknown",
    date,
    present: body.present !== false,
    projectId: body.projectId ? Number(body.projectId) : 0,
    projectName: project?.name || "",
    notes: body.notes?.trim() || "",
  };

  if (existingIdx >= 0) {
    store.attendance[existingIdx] = record;
  } else {
    store.attendance.push(record);
  }

  writeStore(store);
  return NextResponse.json(record, { status: 201 });
}
