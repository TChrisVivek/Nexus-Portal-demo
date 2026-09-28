import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _supabase: SupabaseClient | null = null;
let _adminSupabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[supabase] Credentials missing — local store fallback will be used for reads.');
    }
    _supabase = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder'
    );
  }
  return _supabase;
}

/**
 * Returns true when Supabase credentials are present in the environment.
 * We no longer do a live network ping — that caused false negatives when
 * the health-check table was blocked by RLS or the project was briefly slow.
 * Real query errors are surfaced directly by each route handler.
 */
export function isSupabaseAvailable(): boolean {
  const configured = !!(supabaseUrl && supabaseAnonKey);
  if (!configured) {
    console.warn('[supabase] Credentials missing — local store fallback will be used for reads.');
  }
  return configured;
}

export const supabase = getClient();

export const adminSupabase = (() => {
  if (!_adminSupabase && supabaseUrl && supabaseServiceKey) {
    _adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _adminSupabase || getClient(); // fallback to regular client if no service key
})();

