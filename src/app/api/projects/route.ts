import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseAvailable } from "@/lib/supabase";
import { readStore, writeStore, nextId } from "@/lib/store";

export const dynamic = 'force-dynamic';

// GET /api/projects
export async function GET() {
  try {
    if (await isSupabaseAvailable()) {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[GET /api/projects] Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Guard: data can be null on certain Supabase edge cases
      const rows = data ?? [];
      const projects = rows.map(p => ({
        id: p.id,
        name: p.name,
        siteAddress: p.site_address,
        status: p.status,
        budget: p.budget,
        createdAt: p.created_at,
      }));

      return NextResponse.json(projects);
    }

    // Fallback: local store
    const store = readStore();
    return NextResponse.json(store.projects);
  } catch (err) {
    console.error('[GET /api/projects] Unhandled exception:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    if (await isSupabaseAvailable()) {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: body.name.trim(),
          site_address: body.siteAddress?.trim() || "",
          status: body.status || "ACTIVE",
          budget: Number(body.budget) || 0,
        })
        .select()
        .single();

      if (error) {
        console.error('[POST /api/projects] Supabase insert error:', error);
        return NextResponse.json({ error: error.message, details: error.details, hint: error.hint }, { status: 500 });
      }

      return NextResponse.json({
        id: data.id,
        name: data.name,
        siteAddress: data.site_address,
        status: data.status,
        budget: data.budget,
        createdAt: data.created_at,
      }, { status: 201 });
    }

    // On Vercel the filesystem is read-only — cannot use local store for writes
    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: 'Database not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel project\'s Environment Variables and redeploy.' },
        { status: 503 }
      );
    }

    // Fallback: local store
    const store = readStore();
    const newProject = {
      id: nextId(store, "nextProjectId"),
      name: body.name.trim(),
      siteAddress: body.siteAddress?.trim() || "",
      status: (body.status || "ACTIVE") as "ACTIVE" | "COMPLETED" | "ON_HOLD",
      budget: Number(body.budget) || 0,
      createdAt: new Date().toISOString(),
    };
    store.projects.push(newProject);
    writeStore(store);
    return NextResponse.json(newProject, { status: 201 });
  } catch (err) {
    console.error('[POST /api/projects] Unhandled exception:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/projects
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    if (await isSupabaseAvailable()) {
      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name.trim();
      if (body.siteAddress !== undefined) updateData.site_address = body.siteAddress.trim();
      if (body.status !== undefined) updateData.status = body.status;
      if (body.budget !== undefined) updateData.budget = Number(body.budget);

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', body.id)
        .select()
        .single();

      if (error) {
        console.error('[PATCH /api/projects] Supabase error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      return NextResponse.json({
        id: data.id,
        name: data.name,
        siteAddress: data.site_address,
        status: data.status,
        budget: data.budget,
        createdAt: data.created_at,
      });
    }

    // On Vercel the filesystem is read-only — cannot use local store for writes
    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: 'Database not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel project\'s Environment Variables and redeploy.' },
        { status: 503 }
      );
    }

    // Fallback: local store
    const store = readStore();
    const idx = store.projects.findIndex(p => p.id === Number(body.id));
    if (idx === -1) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (body.name !== undefined) store.projects[idx].name = body.name.trim();
    if (body.siteAddress !== undefined) store.projects[idx].siteAddress = body.siteAddress.trim();
    if (body.status !== undefined) store.projects[idx].status = body.status;
    if (body.budget !== undefined) store.projects[idx].budget = Number(body.budget);

    writeStore(store);
    return NextResponse.json(store.projects[idx]);
  } catch (err) {
    console.error('[PATCH /api/projects] Unhandled exception:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
