export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore, writeStore, nextId } from "@/lib/store";

// GET /api/assignments — optionally filter by ?projectId=X or ?workerId=X
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const workerId = searchParams.get("workerId");

  if (await isSupabaseAvailable()) {
    let query = supabase
      .from('assignments')
      .select(`
        *,
        worker:workers(name, trade),
        project:projects(name)
      `);

    if (projectId) query = query.eq('project_id', Number(projectId));
    if (workerId) query = query.eq('worker_id', Number(workerId));

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const assignments = data.map(a => ({
      id: a.id,
      workerId: a.worker_id,
      workerName: a.worker?.name,
      workerTrade: a.worker?.trade,
      projectId: a.project_id,
      projectName: a.project?.name,
      startDate: a.start_date,
      endDate: a.end_date || "",
      notes: a.notes
    }));

    assignments.sort((a, b) => {
      if (!a.endDate && b.endDate) return -1;
      if (a.endDate && !b.endDate) return 1;
      return b.startDate.localeCompare(a.startDate);
    });

    return NextResponse.json(assignments);
  }

  // Fallback: local store
  const store = readStore();
  let assignments = store.assignments;
  if (projectId) assignments = assignments.filter(a => a.projectId === Number(projectId));
  if (workerId) assignments = assignments.filter(a => a.workerId === Number(workerId));

  assignments.sort((a, b) => {
    if (!a.endDate && b.endDate) return -1;
    if (a.endDate && !b.endDate) return 1;
    return b.startDate.localeCompare(a.startDate);
  });

  return NextResponse.json(assignments);
}

// POST /api/assignments
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (await isSupabaseAvailable()) {
    const { data: existing } = await supabase
      .from('assignments')
      .select('id')
      .eq('worker_id', body.workerId)
      .eq('project_id', body.projectId)
      .is('end_date', null)
      .single();

    if (existing) {
      return NextResponse.json({ error: `Worker is already active on this project` }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert({
        worker_id: Number(body.workerId),
        project_id: Number(body.projectId),
        start_date: body.startDate || new Date().toISOString().split("T")[0],
        notes: body.notes?.trim() || "",
      })
      .select(`
        *,
        worker:workers(name, trade),
        project:projects(name)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      workerId: data.worker_id,
      workerName: data.worker?.name,
      workerTrade: data.worker?.trade,
      projectId: data.project_id,
      projectName: data.project?.name,
      startDate: data.start_date,
      endDate: data.end_date || "",
      notes: data.notes
    }, { status: 201 });
  }

  // Fallback: local store
  const store = readStore();
  const existingLocal = store.assignments.find(
    a => a.workerId === Number(body.workerId) && a.projectId === Number(body.projectId) && !a.endDate
  );
  if (existingLocal) {
    return NextResponse.json({ error: `Worker is already active on this project` }, { status: 409 });
  }

  const worker = store.workers.find(w => w.id === Number(body.workerId));
  const project = store.projects.find(p => p.id === Number(body.projectId));

  const assignment = {
    id: nextId(store, "nextAssignmentId"),
    workerId: Number(body.workerId),
    workerName: worker?.name || "Unknown",
    workerTrade: worker?.trade || "Unknown",
    projectId: Number(body.projectId),
    projectName: project?.name || "Unknown",
    startDate: body.startDate || new Date().toISOString().split("T")[0],
    endDate: "",
    notes: body.notes?.trim() || "",
  };

  store.assignments.push(assignment);
  writeStore(store);
  return NextResponse.json(assignment, { status: 201 });
}

// PATCH /api/assignments
export async function PATCH(req: NextRequest) {
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
  }

  if (await isSupabaseAvailable()) {
    const updateData: Record<string, unknown> = {};
    if (body.endDate !== undefined) updateData.end_date = body.endDate || new Date().toISOString().split("T")[0];
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data, error } = await supabase
      .from('assignments')
      .update(updateData)
      .eq('id', Number(body.id))
      .select(`
        *,
        worker:workers(name, trade),
        project:projects(name)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      workerId: data.worker_id,
      workerName: data.worker?.name,
      workerTrade: data.worker?.trade,
      projectId: data.project_id,
      projectName: data.project?.name,
      startDate: data.start_date,
      endDate: data.end_date || "",
      notes: data.notes
    });
  }

  // Fallback: local store
  const store = readStore();
  const idx = store.assignments.findIndex(a => a.id === Number(body.id));
  if (idx === -1) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  if (body.endDate !== undefined) store.assignments[idx].endDate = body.endDate || new Date().toISOString().split("T")[0];
  if (body.notes !== undefined) store.assignments[idx].notes = body.notes;

  writeStore(store);
  return NextResponse.json(store.assignments[idx]);
}
