/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const projectId = Number(params.id);

  if (await isSupabaseAvailable()) {
    // 1. Fetch project to ensure it exists
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (pError || !project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // 2. Fetch all assignments for this project
    const { data: assignmentsData } = await supabase
      .from('assignments')
      .select('*, worker:workers(*)')
      .eq('project_id', projectId);

    const assignments = assignmentsData || [];
    const workerIds = Array.from(new Set(assignments.map((a: any) => a.worker_id)));

    // 3. Fetch all attendance for this project
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .in('worker_id', workerIds.length > 0 ? workerIds : [0]) // Avoid empty IN clause error
      .eq('present', true);

    const allAttendance = attendanceData || [];

    // Build per-worker summary
    const summary = workerIds.map((wid: any) => {
      // Find the specific assignment that links this worker to this project
      const assignment = assignments.find((a: any) => a.worker_id === wid);
      const worker = assignment?.worker;

      // Filter attendance explicitly linked to THIS project
      const projectAttendance = allAttendance.filter(
        (a: any) => a.worker_id === wid && a.project_id === projectId
      );

      // We also look for general attendance (project_id = 0) that falls within the assignment date range
      // This matches the local store logic where if they were marked present generally, it counts for their active site
      const generalAttendance = allAttendance.filter((a: any) => {
        if (a.worker_id !== wid || a.project_id !== 0) return false;
        return a.date >= assignment.start_date && (!assignment.end_date || a.date <= assignment.end_date);
      });

      const allDays = Array.from(new Set([
        ...projectAttendance.map((a: any) => a.date),
        ...generalAttendance.map((a: any) => a.date),
      ])).sort();

      const daysWorked = allDays.length;
      const dailyRate = Number(worker?.daily_rate || 0);
      const totalCost = daysWorked * dailyRate;

      return {
        workerId: wid,
        workerName: worker?.name || "Unknown",
        workerTrade: worker?.trade || "",
        phone: worker?.phone || "",
        dailyRate,
        isActive: !assignment.end_date,
        startDate: assignment.start_date,
        endDate: assignment.end_date || "",
        daysWorked,
        totalCost,
        attendanceDates: allDays,
      };
    });

    return NextResponse.json({
      projectId,
      projectName: project.name,
      workers: summary,
      totalDays: summary.reduce((s: number, w: any) => s + w.daysWorked, 0),
      totalCost: summary.reduce((s: number, w: any) => s + w.totalCost, 0),
    });
  }

  // Fallback: local store
  if (process.env.VERCEL) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const store = readStore();
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const assignments = store.assignments.filter((a) => a.projectId === projectId);
  const workerIds = Array.from(new Set(assignments.map((a) => a.workerId)));

  const summary = workerIds.map((wid) => {
    const worker = store.workers.find((w) => w.id === wid);
    const assignment = assignments.find((a) => a.workerId === wid);

    const projectAttendance = store.attendance.filter(
      (a) => a.workerId === wid && a.projectId === projectId && a.present
    );

    const generalAttendance = store.attendance.filter((a) => {
      if (a.workerId !== wid || !a.present || a.projectId !== 0) return false;
      const asgn = assignments.find(
        (as) => as.workerId === wid &&
        as.projectId === projectId &&
        as.startDate <= a.date &&
        (!as.endDate || as.endDate >= a.date)
      );
      return !!asgn;
    });

    const allDays = Array.from(new Set([
      ...projectAttendance.map((a) => a.date),
      ...generalAttendance.map((a) => a.date),
    ])).sort();

    const daysWorked = allDays.length;
    const dailyRate = worker?.dailyRate ?? 0;
    const totalCost = daysWorked * dailyRate;

    return {
      workerId: wid,
      workerName: worker?.name ?? assignment?.workerName ?? "Unknown",
      workerTrade: worker?.trade ?? assignment?.workerTrade ?? "",
      phone: worker?.phone ?? "",
      dailyRate,
      isActive: !assignment?.endDate,
      startDate: assignment?.startDate ?? "",
      endDate: assignment?.endDate ?? "",
      daysWorked,
      totalCost,
      attendanceDates: allDays,
    };
  });

  return NextResponse.json({
    projectId,
    projectName: project.name,
    workers: summary,
    totalDays: summary.reduce((s, w) => s + w.daysWorked, 0),
    totalCost: summary.reduce((s, w) => s + w.totalCost, 0),
  });
}
