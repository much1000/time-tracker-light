// Marker, dass die Sitzung aus einem Reset-Link stammt (BUG-2 in PROJ-2).
// «Neues Passwort» ist nur damit erreichbar, nicht mit einer gewöhnlichen Anmeldung.
// Der Marker lebt kurz, ist nicht per Skript lesbar und wird nach dem Speichern gelöscht.
export const RECOVERY_COOKIE = 'tt-recovery'
export const RECOVERY_MAX_AGE_SECONDS = 15 * 60

export function recoveryCookieOptions(maxAge: number = RECOVERY_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}
