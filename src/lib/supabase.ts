import { createClient as createClientBase, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERROR: Faltan variables de entorno de Supabase. Revisa tu archivo .env.local");
}

// Singleton pattern: ensure only ONE client instance exists across the entire app.
// Without this, every component calling createClient() creates a new WebSocket
// connection to Supabase, causing the "Multiple GoTrueClient instances" warning
// and serious performance degradation.
let clientInstance: SupabaseClient | null = null;

export const createClient = (): SupabaseClient => {
  if (!clientInstance) {
    clientInstance = createClientBase(supabaseUrl, supabaseAnonKey);
  }
  return clientInstance;
};

export const supabase = createClient();
