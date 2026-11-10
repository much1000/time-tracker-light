import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/session'

// Türsteher vor allen Seiten (in Next.js 16 heisst die frühere «Middleware» «Proxy»).
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // Alles ausser Next.js-Dateien, Icons und Bildern.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
