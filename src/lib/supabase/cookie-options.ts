// Sitzungs-Cookie der Anmeldung: «Secure», sobald die Seite über HTTPS läuft (Produktion).
// Lokal unter http://localhost bleibt das Flag aus, sonst würde die Anmeldung in manchen Browsern (z. B. Safari)
// nicht gespeichert. Dazu kommt HSTS (security headers), das den Wechsel auf HTTP schon verhindert.

// «https», «https:» oder eine Liste wie «https,http» (Header x-forwarded-proto: der erste Eintrag zählt)
export function isHttpsProtocol(value: string | null | undefined): boolean {
  const first = (value ?? '').split(',')[0].trim().toLowerCase()
  return first === 'https' || first === 'https:'
}

export function sessionCookieOptions(isHttps: boolean): { secure?: boolean } {
  return isHttps ? { secure: true } : {}
}
