import { NextResponse, type NextRequest } from 'next/server'
import { RECOVERY_COOKIE, recoveryCookieOptions } from '@/lib/auth/recovery'

// Wird nach dem Speichern des neuen Passworts aufgerufen: löscht den Reset-Marker
// und führt auf die Startseite. Das Ziel ist fest vorgegeben.
export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url))
  response.cookies.set(RECOVERY_COOKIE, '', recoveryCookieOptions(0))
  return response
}
