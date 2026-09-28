import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  const store = readStore();

  const idx = store.directPurchases.findIndex((p) => p.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  store.directPurchases.splice(idx, 1);
  writeStore(store);

  return NextResponse.json({ ok: true });
}
