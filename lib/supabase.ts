import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Retrieve credentials from environment variables
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT_ID')) {
  console.warn(
    '[Doubt Chain] SUPABASE_URL is not configured yet. Please update your .env file with your project URL from https://supabase.com'
  );
}

if (!supabaseAnonKey || supabaseAnonKey.includes('YOUR_ANON_KEY_HERE')) {
  console.warn(
    '[Doubt Chain] SUPABASE_ANON_KEY is not configured yet. Please update your .env file with your public anon key from https://supabase.com'
  );
}

/**
 * Strongly-typed Supabase client for Doubt Chain backend services and client calls.
 * Initialized with Database schema types including tables, relationships, and RPCs.
 */
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export type SupabaseClient = typeof supabase;
export * from './database.types';
