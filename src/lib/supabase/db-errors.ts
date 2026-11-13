// Gemeinsame Erkennung von Verbindungs- und Sitzungsfehlern bei Datenbankzugriffen über Supabase.

export interface DbError {
  code?: string
  message?: string
  details?: string
  status?: number
}

// Netzwerk weg oder Dienst nicht erreichbar (kein Fehler der Anfrage selbst).
export function isNetworkFailure(error: DbError): boolean {
  const message = (error.message ?? '').toLowerCase()
  return (
    error.status === 0 ||
    (error.status !== undefined && error.status >= 500) ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('fetch failed')
  )
}

// Anmeldung abgelaufen oder fehlt.
export function isSessionFailure(error: DbError): boolean {
  const message = (error.message ?? '').toLowerCase()
  return (
    error.status === 401 ||
    error.code === 'PGRST301' ||
    error.code === '28000' ||
    message.includes('jwt') ||
    message.includes('not_authenticated')
  )
}
