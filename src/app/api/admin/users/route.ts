export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { adminSupabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore, writeStore } from "@/lib/store";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

interface SessionWithRole {
  user?: { name?: string | null; email?: string | null; image?: string | null; role?: string };
}

// ─── GET: List all users ──────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session as SessionWithRole)?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try Supabase first
  if (await isSupabaseAvailable()) {
    const { data, error } = await adminSupabase
      .from('system_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Normalise Supabase snake_case → camelCase for the UI
      const normalised = data.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        image: u.image || "",
        role: u.role,
        createdAt: u.created_at,
      }));
      return NextResponse.json({ users: normalised });
    }
  }

  // Fallback: local store
  try {
    const store = readStore();
    // Sort newest first
    const sorted = [...store.users].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ users: sorted });
  } catch {
    return NextResponse.json({ users: [] });
  }
}

// ─── PATCH: Update a user's role ──────────────────────────────────────────────
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session as SessionWithRole)?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, role } = await req.json();
    if (!email || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const validRoles = ["ADMIN", "USER", "PENDING", "REJECTED"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Try Supabase first
    if (await isSupabaseAvailable()) {
      // Prevent demotion of the last admin
      if (role !== "ADMIN") {
        const { data: adminUsers } = await adminSupabase
          .from('system_users')
          .select('email')
          .eq('role', 'ADMIN');

        if (adminUsers && adminUsers.length <= 1 && adminUsers[0]?.email === email) {
          return NextResponse.json(
            { error: "Cannot demote the last remaining administrator." },
            { status: 400 }
          );
        }
      }

      const { data, error } = await adminSupabase
        .from('system_users')
        .update({ role })
        .eq('email', email)
        .select()
        .single();

      if (!error && data) {
        // Also sync to local store so both sources stay in sync
        try {
          const store = readStore();
          const idx = store.users.findIndex((u) => u.email === email);
          if (idx !== -1) {
            store.users[idx].role = role as "ADMIN" | "USER" | "PENDING" | "REJECTED";
            writeStore(store);
          }
        } catch { /* ignore — Vercel is read-only */ }

        return NextResponse.json({ success: true, user: data });
      }
    }

    // Fallback: local store only
    const store = readStore();

    // Prevent demotion of the last admin in local store
    if (role !== "ADMIN") {
      const admins = store.users.filter((u) => u.role === "ADMIN");
      if (admins.length <= 1 && admins[0]?.email === email) {
        return NextResponse.json(
          { error: "Cannot demote the last remaining administrator." },
          { status: 400 }
        );
      }
    }

    const idx = store.users.findIndex((u) => u.email === email);
    if (idx === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    store.users[idx].role = role as "ADMIN" | "USER" | "PENDING" | "REJECTED";
    writeStore(store);

    return NextResponse.json({ success: true, user: store.users[idx] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
