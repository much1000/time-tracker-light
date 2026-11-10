import { describe, expect, it } from 'vitest'
import { decideAccess } from './access'

describe('decideAccess: ohne Anmeldung', () => {
  it('leitet geschützte Adressen zur Anmeldung und merkt die Zieladresse', () => {
    expect(decideAccess({ pathname: '/status', signedIn: false })).toEqual({
      action: 'redirect',
      to: '/login?next=%2Fstatus',
    })
  })

  it('merkt auch die Suchparameter', () => {
    expect(decideAccess({ pathname: '/woche', search: '?tag=2026-11-10', signedIn: false })).toEqual({
      action: 'redirect',
      to: '/login?next=%2Fwoche%3Ftag%3D2026-11-10',
    })
  })

  it('leitet die Startseite ohne Zieladresse zur Anmeldung', () => {
    expect(decideAccess({ pathname: '/', signedIn: false })).toEqual({ action: 'redirect', to: '/login' })
  })

  it('leitet unbekannte Adressen ebenfalls zur Anmeldung (verrät nichts)', () => {
    const decision = decideAccess({ pathname: '/gibt-es-nicht', signedIn: false })
    expect(decision).toEqual({ action: 'redirect', to: '/login?next=%2Fgibt-es-nicht' })
  })

  it('lässt Anmeldung, «Passwort vergessen» und den Einlöse-Punkt durch', () => {
    for (const pathname of ['/login', '/passwort-vergessen', '/auth/bestaetigen']) {
      expect(decideAccess({ pathname, signedIn: false })).toEqual({ action: 'allow' })
    }
  })

  it('schickt «Neues Passwort» ohne Sitzung zur Seite «Link nicht mehr gültig»', () => {
    expect(decideAccess({ pathname: '/passwort-neu', signedIn: false })).toEqual({
      action: 'redirect',
      to: '/passwort-vergessen?fehler=link',
    })
  })

  it('verwechselt ähnliche Adressen nicht mit öffentlichen Seiten', () => {
    for (const pathname of ['/loginbericht', '/login-alt', '/passwort-neu-x', '/auth', '/auth/anderes']) {
      expect(decideAccess({ pathname, signedIn: false }).action).toBe('redirect')
    }
  })
})

describe('decideAccess: mit Anmeldung', () => {
  it('lässt geschützte Adressen durch', () => {
    for (const pathname of ['/', '/status', '/gibt-es-nicht']) {
      expect(decideAccess({ pathname, signedIn: true })).toEqual({ action: 'allow' })
    }
  })

  it('leitet Angemeldete von «Anmelden» und «Passwort vergessen» auf die Startseite', () => {
    expect(decideAccess({ pathname: '/login', signedIn: true })).toEqual({ action: 'redirect', to: '/' })
    expect(decideAccess({ pathname: '/passwort-vergessen', signedIn: true })).toEqual({ action: 'redirect', to: '/' })
  })

  it('lässt «Neues Passwort» mit Sitzung durch', () => {
    expect(decideAccess({ pathname: '/passwort-neu', signedIn: true })).toEqual({ action: 'allow' })
  })

  it('lässt den Einlöse-Punkt auch mit Sitzung durch', () => {
    expect(decideAccess({ pathname: '/auth/bestaetigen', signedIn: true })).toEqual({ action: 'allow' })
  })
})
