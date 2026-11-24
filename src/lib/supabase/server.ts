import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { getSupabaseEnv } from '@/lib/env'
import { isHttpsProtocol, sessionCookieOptions } from './cookie-options'

// Supabase-Zugang für den Server. Liest die Anmeldung aus den Cookies.
export async function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()
  const https = isHttpsProtocol((await headers()).get('x-forwarded-proto'))

  return createServerClient(url, anonKey, {
    cookieOptions: sessionCookieOptions(https),
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Aufruf aus einer Server-Komponente: Cookies dürfen dort nicht gesetzt werden.
          // Das Auffrischen der Anmeldung übernimmt PROJ-2 (Proxy).
        }
      },
    },
  })
}
