import { PASSWORD_MIN_LENGTH } from './schemas'

export type AuthErrorKind =
  | 'invalid-credentials'
  | 'rate-limit'
  | 'unreachable'
  | 'config'
  | 'link-invalid'
  | 'same-password'
  | 'weak-password'
  | 'unknown'

export interface AuthFailure {
  kind: AuthErrorKind
  message: string
}

const MESSAGES: Record<AuthErrorKind, string> = {
  // Bewusst allgemein: verrät nicht, ob eine E-Mail-Adresse ein Konto hat.
  'invalid-credentials': 'E-Mail oder Passwort stimmt nicht.',
  'rate-limit': 'Zu viele Versuche. Bitte warte ein paar Minuten.',
  unreachable:
    'Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es später erneut.',
  config:
    'Die App ist nicht vollständig eingerichtet. Die Konfiguration fehlt oder ist fehlerhaft.',
  'link-invalid': 'Dieser Link ist nicht mehr gültig.',
  'same-password': 'Das neue Passwort muss sich vom bisherigen unterscheiden.',
  'weak-password': `Das Passwort ist zu schwach. Es braucht mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`,
  unknown: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
}

interface ErrorLike {
  name?: unknown
  code?: unknown
  status?: unknown
  message?: unknown
}

function classify(error: unknown): AuthErrorKind {
  const e = (error ?? {}) as ErrorLike
  const name = typeof e.name === 'string' ? e.name : ''
  const code = typeof e.code === 'string' ? e.code : ''
  const status = typeof e.status === 'number' ? e.status : undefined
  const message = typeof e.message === 'string' ? e.message : ''

  if (name === 'EnvError') return 'config'
  if (
    code === 'over_request_rate_limit' ||
    code === 'over_email_send_rate_limit' ||
    status === 429
  ) {
    return 'rate-limit'
  }
  // Netzwerkfehler: kein Kontakt zum Dienst (Supabase meldet Status 0 oder wirft TypeError).
  if (
    name === 'AuthRetryableFetchError' ||
    name === 'AuthUnknownError' ||
    status === 0 ||
    (error instanceof TypeError && /fetch|network/i.test(message))
  ) {
    return 'unreachable'
  }
  if (
    code === 'invalid_credentials' ||
    code === 'email_not_confirmed' ||
    code === 'user_not_found' ||
    code === 'validation_failed'
  ) {
    return 'invalid-credentials'
  }
  if (
    name === 'AuthSessionMissingError' ||
    code === 'session_not_found' ||
    code === 'session_expired' ||
    code === 'otp_expired' ||
    code === 'bad_jwt'
  ) {
    return 'link-invalid'
  }
  if (code === 'same_password') return 'same-password'
  if (code === 'weak_password') return 'weak-password'
  if (status !== undefined && status >= 500) return 'unreachable'
  return 'unknown'
}

// Übersetzt Fehler von Supabase und dem Browser in die vereinbarten deutschen Meldungen.
export function describeAuthError(error: unknown): AuthFailure {
  const kind = classify(error)
  return { kind, message: MESSAGES[kind] }
}
