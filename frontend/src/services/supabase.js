// Supabase Client Integration for Rizzolve / Doubt Chain
// Connects to Supabase if VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are provided.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_PROJECT_ID') &&
  !supabaseAnonKey.includes('YOUR_ANON_KEY')
);

let supabaseClient = null;

export async function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!supabaseClient) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    } catch {
      console.warn('[Supabase] @supabase/supabase-js not installed in frontend. Running in local mock mode.');
      return null;
    }
  }
  return supabaseClient;
}

// Helper: Query doubts from Supabase (or fallback)
export async function fetchDoubtsFromDb() {
  const client = await getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('doubts')
      .select('*, profiles(name, avatar_url, reputation), communities(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error, falling back:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Supabase fetch exception:', err);
    return null;
  }
}

// Helper: Real-time duplicate similarity search via pg_trgm RPC
export async function searchSimilarDoubts(query, threshold = 0.25, limit = 5) {
  const client = await getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client.rpc('search_similar_doubts', {
      search_query: query,
      similarity_threshold: threshold,
      match_limit: limit,
    });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('Error querying search_similar_doubts RPC:', err);
    return [];
  }
}

