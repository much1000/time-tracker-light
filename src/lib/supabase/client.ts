import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/env'
import { isHttpsProtocol, sessionCookieOptions } from './cookie-options'

// Supabase-Zugang für den Browser (nur öffentlicher Schlüssel).
export function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  const https = typeof window !== 'undefined' && isHttpsProtocol(window.location.protocol)
  return createBrowserClient(url, anonKey, { cookieOptions: sessionCookieOptions(https) })
}
