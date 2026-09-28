import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";

// POST /api/workers/[id]/status
// Toggle active/inactive status. If marking inactive, automatically close open assignments.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const workerId = Number(params.id);
  const body = await req.json();
  const isActive = Boolean(body.isActive);

  const store = readStore();
  const workerIndex = store.workers.findIndex(w => w.id === workerId);
  if (workerIndex === -1) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  // Update worker status
  store.workers[workerIndex].isActive = isActive;

  // Smart feature: If marking inactive, end current active assignments
  if (!isActive) {
    const today = new Date().toISOString().split("T")[0];
    for (const assignment of store.assignments) {
      if (assignment.workerId === workerId && !assignment.endDate) {
        assignment.endDate = today;
      }
    }
  }

  writeStore(store);
  return NextResponse.json({ success: true, worker: store.workers[workerIndex] });
}
