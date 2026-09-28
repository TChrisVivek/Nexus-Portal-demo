import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// TEMPORARY debug endpoint — remove after fixing env var issues
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const vercel = process.env.VERCEL;

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: url ? `${url.slice(0, 30)}...` : '(empty)',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key ? `${key.slice(0, 20)}...` : '(empty)',
    VERCEL: vercel ?? '(not set)',
    NODE_ENV: process.env.NODE_ENV,
  });
}
