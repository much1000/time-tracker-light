import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/env'

// Supabase-Zugang für den Browser (nur öffentlicher Schlüssel).
export function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(url, anonKey)
}
