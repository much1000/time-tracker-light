// Wer darf welche Adresse sehen? Reine Entscheidungslogik des Türstehers (proxy.ts),
// ohne Netzwerk und ohne Next.js, damit sie sich einfach testen lässt.

export type AccessDecision =
  | { action: 'allow' }
  | { action: 'redirect'; to: string }

// Immer erreichbar: löst den Link aus der Reset-Mail ein.
const ALWAYS_PUBLIC = ['/auth/bestaetigen']
// Nur ohne Anmeldung sinnvoll: Angemeldete werden auf die Startseite geleitet.
const PUBLIC_ONLY = ['/login', '/passwort-vergessen']
// Gehört zur Anmeldung, braucht aber eine Sitzung (entsteht durch den Reset-Link).
const SESSION_REQUIRED = ['/passwort-neu']

function matches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}

function matchesAny(pathname: string, bases: string[]): boolean {
  return bases.some((base) => matches(pathname, base))
}

export const LINK_INVALID_PATH = '/passwort-vergessen?fehler=link'

interface AccessInput {
  pathname: string
  search?: string
  signedIn: boolean
}

export function decideAccess({ pathname, search = '', signedIn }: AccessInput): AccessDecision {
  if (matchesAny(pathname, ALWAYS_PUBLIC)) return { action: 'allow' }

  if (matchesAny(pathname, PUBLIC_ONLY)) {
    return signedIn ? { action: 'redirect', to: '/' } : { action: 'allow' }
  }

  if (matchesAny(pathname, SESSION_REQUIRED)) {
    return signedIn
      ? { action: 'allow' }
      : { action: 'redirect', to: LINK_INVALID_PATH }
  }

  // Alles andere ist geschützt, auch unbekannte Adressen (verrät nichts über die App).
  if (signedIn) return { action: 'allow' }

  const wanted = `${pathname}${search}`
  const to = wanted === '/' ? '/login' : `/login?next=${encodeURIComponent(wanted)}`
  return { action: 'redirect', to }
}
