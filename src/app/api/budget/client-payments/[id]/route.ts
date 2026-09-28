import { NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";

/** DELETE /api/budget/client-payments/[id] */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const store = readStore();
  const before = (store.clientPayments ?? []).length;
  store.clientPayments = (store.clientPayments ?? []).filter((cp) => cp.id !== id);
  if (store.clientPayments.length === before) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  writeStore(store);
  return NextResponse.json({ ok: true });
}
