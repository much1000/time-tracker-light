import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { decideAccess } from '@/lib/auth/access'
import { getSupabaseEnv } from '@/lib/env'

// Wird vom Türsteher (proxy.ts) bei jedem Aufruf ausgeführt:
// 1. erneuert die Anmeldung (Cookies), damit sie dauerhaft bestehen bleibt,
// 2. entscheidet nach Anmeldestatus, ob die Adresse erreichbar ist.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })
  let signedIn = false

  try {
    const { url, anonKey } = getSupabaseEnv()
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    // Prüft die Signatur der Anmeldung und erneuert sie bei Bedarf.
    const { data } = await supabase.auth.getClaims()
    signedIn = Boolean(data?.claims?.sub)
  } catch {
    // Fehlende Konfiguration oder Supabase nicht erreichbar: im Zweifel nicht angemeldet.
    // Geschützte Seiten bleiben damit zu, die Anmeldeseite zeigt den Grund.
    signedIn = false
  }

  const decision = decideAccess({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    signedIn,
  })

  if (decision.action === 'redirect') {
    const redirect = NextResponse.redirect(new URL(decision.to, request.url))
    // Erneuerte Anmeldung (Cookies) muss auch bei einer Umleitung mitgehen.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    redirect.headers.set('Cache-Control', 'private, no-store')
    return redirect
  }

  // Der Browser darf Seiten nicht für die Zurück-Taste aufbewahren, sonst wären sie
  // nach dem Abmelden noch zu sehen.
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
