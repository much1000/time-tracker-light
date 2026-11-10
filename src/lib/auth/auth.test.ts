import { describe, expect, it } from 'vitest'
import { describeAuthError } from './errors'
import { getSafeRedirect } from './redirect'
import {
  forgotPasswordSchema,
  loginSchema,
  newPasswordSchema,
  PASSWORD_MIN_LENGTH,
} from './schemas'

describe('loginSchema', () => {
  it('akzeptiert gültige Eingaben und normalisiert die E-Mail', () => {
    const result = loginSchema.safeParse({
      email: '  Michael@Example.CH ',
      password: 'geheim',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('michael@example.ch')
  })

  it('verlangt E-Mail und Passwort', () => {
    const result = loginSchema.safeParse({ email: '', password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message)
      expect(messages).toContain('Bitte gib deine E-Mail-Adresse ein.')
      expect(messages).toContain('Bitte gib dein Passwort ein.')
    }
  })

  it('lehnt ungültige E-Mail-Adressen ab', () => {
    const result = loginSchema.safeParse({ email: 'keine-adresse', password: 'x' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Bitte gib eine gültige E-Mail-Adresse ein.'
      )
    }
  })

  it('lässt Passwörter unverändert (Leerzeichen und Sonderzeichen bleiben)', () => {
    const password = '  pässwörd mit Leerzeichen!  '
    const result = loginSchema.safeParse({ email: 'a@b.ch', password })
    expect(result.success && result.data.password).toBe(password)
  })

  it('akzeptiert sehr lange Passwörter', () => {
    const result = loginSchema.safeParse({ email: 'a@b.ch', password: 'x'.repeat(200) })
    expect(result.success).toBe(true)
  })
})

describe('forgotPasswordSchema', () => {
  it('verlangt eine gültige E-Mail-Adresse', () => {
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false)
    expect(forgotPasswordSchema.safeParse({ email: 'a@b' }).success).toBe(false)
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.ch' }).success).toBe(true)
  })
})

describe('newPasswordSchema', () => {
  it(`verlangt mindestens ${PASSWORD_MIN_LENGTH} Zeichen`, () => {
    const short = newPasswordSchema.safeParse({ password: 'x'.repeat(PASSWORD_MIN_LENGTH - 1) })
    expect(short.success).toBe(false)
    if (!short.success) {
      expect(short.error.issues[0].message).toContain(`${PASSWORD_MIN_LENGTH} Zeichen`)
    }
    expect(newPasswordSchema.safeParse({ password: 'x'.repeat(PASSWORD_MIN_LENGTH) }).success).toBe(true)
  })

  it('verlangt ein Passwort', () => {
    const result = newPasswordSchema.safeParse({ password: '' })
    expect(result.success).toBe(false)
  })
})

describe('getSafeRedirect', () => {
  it('lässt Adressen innerhalb der App durch', () => {
    expect(getSafeRedirect('/status')).toBe('/status')
    expect(getSafeRedirect('/status?x=1#y')).toBe('/status?x=1#y')
  })

  it('fällt ohne oder mit leerem Wert auf die Startseite zurück', () => {
    expect(getSafeRedirect(undefined)).toBe('/')
    expect(getSafeRedirect(null)).toBe('/')
    expect(getSafeRedirect('')).toBe('/')
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '///evil.example',
    '/\\evil.example',
    '\\evil.example',
    'javascript:alert(1)',
    'status',
    '/status\n',
    '/sta\u0000tus',
  ])('lehnt die fremde oder unsichere Adresse %j ab', (value) => {
    expect(getSafeRedirect(value)).toBe('/')
  })

  it('lehnt Adressen der Anmeldeseiten ab (keine Schleife)', () => {
    expect(getSafeRedirect('/login')).toBe('/')
    expect(getSafeRedirect('/login?next=/status')).toBe('/')
    expect(getSafeRedirect('/passwort-neu')).toBe('/')
    expect(getSafeRedirect('/auth/bestaetigen')).toBe('/')
  })

  it('verwechselt ähnliche Adressen nicht mit Anmeldeseiten', () => {
    expect(getSafeRedirect('/loginbericht')).toBe('/loginbericht')
  })

  it('lehnt übermässig lange Werte ab', () => {
    expect(getSafeRedirect(`/${'a'.repeat(3000)}`)).toBe('/')
  })

  it('nutzt die angegebene Ersatzadresse', () => {
    expect(getSafeRedirect('//x', '/status')).toBe('/status')
  })
})

describe('describeAuthError', () => {
  it('übersetzt falsche Anmeldedaten in die allgemeine Meldung', () => {
    const failure = describeAuthError({ name: 'AuthApiError', code: 'invalid_credentials', status: 400 })
    expect(failure).toEqual({
      kind: 'invalid-credentials',
      message: 'E-Mail oder Passwort stimmt nicht.',
    })
  })

  it('verrät bei unbekanntem Konto oder unbestätigter E-Mail nichts Zusätzliches', () => {
    expect(describeAuthError({ code: 'user_not_found' }).message).toBe('E-Mail oder Passwort stimmt nicht.')
    expect(describeAuthError({ code: 'email_not_confirmed' }).message).toBe('E-Mail oder Passwort stimmt nicht.')
  })

  it('erkennt zu viele Versuche an Code oder Status', () => {
    const expected = 'Zu viele Versuche. Bitte warte ein paar Minuten.'
    expect(describeAuthError({ code: 'over_request_rate_limit' }).message).toBe(expected)
    expect(describeAuthError({ code: 'over_email_send_rate_limit' }).message).toBe(expected)
    expect(describeAuthError({ status: 429 }).message).toBe(expected)
  })

  it('erkennt Netzwerkfehler und Serverfehler als «nicht erreichbar»', () => {
    const expected =
      'Die Anmeldung ist gerade nicht erreichbar. Bitte versuche es später erneut.'
    expect(describeAuthError({ name: 'AuthRetryableFetchError', status: 0 }).message).toBe(expected)
    expect(describeAuthError(new TypeError('Failed to fetch')).message).toBe(expected)
    expect(describeAuthError({ status: 503 }).message).toBe(expected)
  })

  it('erkennt eine fehlende Konfiguration', () => {
    expect(describeAuthError({ name: 'EnvError' }).kind).toBe('config')
  })

  it('erkennt ungültige, abgelaufene oder fehlende Sitzungen als ungültigen Link', () => {
    expect(describeAuthError({ name: 'AuthSessionMissingError' }).kind).toBe('link-invalid')
    expect(describeAuthError({ code: 'otp_expired' }).kind).toBe('link-invalid')
  })

  it('erkennt gleiches und zu schwaches Passwort', () => {
    expect(describeAuthError({ code: 'same_password' }).kind).toBe('same-password')
    expect(describeAuthError({ code: 'weak_password' }).kind).toBe('weak-password')
  })

  it('fällt bei Unbekanntem auf eine allgemeine Meldung zurück', () => {
    expect(describeAuthError(undefined).kind).toBe('unknown')
    expect(describeAuthError('kaputt').kind).toBe('unknown')
    expect(describeAuthError({ code: 'etwas_neues' }).kind).toBe('unknown')
  })
})
