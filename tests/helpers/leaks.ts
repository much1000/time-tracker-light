// Prüft, ob ein Service-Role-Schlüssel oder ein Token ausgeliefert wird. Der Variablenname
// NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY darf vorkommen (die Konfigurationsprüfung lehnt ihn ab),
// ein Schlüssel mit Rolle «service_role» nicht. Der öffentliche anon-Schlüssel ist erlaubt.
export function findLeaks(text: string): string[] {
  const leaks: string[] = []
  if (/service_role/i.test(text.split('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY').join(''))) {
    leaks.push('Text «service_role» ausserhalb des Variablennamens')
  }
  if (/sbp_[A-Za-z0-9]{20,}/.test(text)) leaks.push('Zugriffstoken sbp_…')
  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(text)) leaks.push('Schlüssel sb_secret_…')
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]{10,}\.([A-Za-z0-9_-]{10,})\./g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1], 'base64url').toString())
      if (payload.role && payload.role !== 'anon') leaks.push(`JWT mit Rolle ${payload.role}`)
    } catch {
      // kein JWT
    }
  }
  return leaks
}
