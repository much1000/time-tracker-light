import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { LINK_INVALID_PATH } from '@/lib/auth/access'
import { RECOVERY_COOKIE, recoveryCookieOptions } from '@/lib/auth/recovery'
import { createClient } from '@/lib/supabase/server'

// Löst den Link aus der Reset-Mail ein. Zwei Formen werden verstanden:
// - «code»: Die Standardvorlage von Supabase (Free-Plan). Der Code lässt sich nur im selben
//   Browser einlösen, in dem «Passwort vergessen» ausgelöst wurde.
// - «token_hash» mit «type=recovery»: Eine angepasste Vorlage (eigener SMTP-Server), die auch
//   auf einem anderen Gerät funktioniert. Wird heute nicht gebraucht, bleibt aber lauffähig.
const querySchema = z.union([
  z.object({ code: z.string().min(1).max(512) }),
  z.object({
    token_hash: z.string().min(1).max(512),
    type: z.literal('recovery'),
  }),
])

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))

  let verified = false
  if (parsed.success) {
    try {
      const supabase = await createClient()
      const params = parsed.data
      const { error } =
        'code' in params
          ? await supabase.auth.exchangeCodeForSession(params.code)
          : await supabase.auth.verifyOtp({ type: 'recovery', token_hash: params.token_hash })
      verified = !error
    } catch {
      verified = false
    }
  }

  // Nur ein eingelöster Reset-Link berechtigt zu «Neues Passwort».
  if (verified) {
    try {
      const cookieStore = await cookies()
      cookieStore.set(RECOVERY_COOKIE, '1', recoveryCookieOptions())
    } catch {
      verified = false
    }
  }

  // Das Ziel ist fest vorgegeben. Eine Adresse aus dem Link wird nie übernommen,
  // damit niemand den Nutzer über einen manipulierten Link umleiten kann.
  // (redirect() wirft absichtlich und steht deshalb ausserhalb von try/catch.)
  redirect(verified ? '/passwort-neu' : LINK_INVALID_PATH)
}
