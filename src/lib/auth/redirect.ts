// Seiten der Anmeldung. Sie sind kein sinnvolles Ziel nach dem Login (Schleife).
const AUTH_PATHS = ['/login', '/passwort-vergessen', '/passwort-neu', '/auth']

function isAuthPath(path: string): boolean {
  return AUTH_PATHS.some(
    (authPath) =>
      path === authPath ||
      path.startsWith(`${authPath}/`) ||
      path.startsWith(`${authPath}?`) ||
      path.startsWith(`${authPath}#`)
  )
}

// Liefert die Zieladresse nach dem Login. Akzeptiert werden nur Adressen innerhalb
// der App, die mit genau einem «/» beginnen. Alles andere (fremde Adressen,
// «//evil.com», Backslashes, Steuerzeichen, Anmeldeseiten) ergibt die Startseite.
// Schützt vor Umleitung auf fremde Seiten (Open Redirect).
export function getSafeRedirect(
  next: string | null | undefined,
  fallback = '/'
): string {
  if (typeof next !== 'string' || next.length === 0 || next.length > 2000) {
    return fallback
  }
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  // Browser behandeln «\» wie «/», Steuerzeichen und Leerzeichen am Anfang sind verdächtig.
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback
  if (isAuthPath(next)) return fallback
  return next
}
