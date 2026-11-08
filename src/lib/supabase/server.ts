import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/env'

// Supabase-Zugang für den Server. Liest die Anmeldung aus den Cookies.
export async function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
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
