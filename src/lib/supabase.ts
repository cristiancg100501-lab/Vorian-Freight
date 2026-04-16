import { createClient as createClientBase } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERROR: Faltan variables de entorno de Supabase. Revisa tu archivo .env.local");
}

export const createClient = () => createClientBase(supabaseUrl || "", supabaseAnonKey || "")
export const supabase = createClient()
