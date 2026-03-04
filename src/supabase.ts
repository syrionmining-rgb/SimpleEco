import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON as string

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('Supabase não configurado — usando credenciais locais de fallback.')
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON ?? '')
