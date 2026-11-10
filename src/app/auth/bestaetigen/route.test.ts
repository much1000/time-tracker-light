// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

const verifyOtp = vi.fn()
const exchangeCodeForSession = vi.fn()
const createClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClient(),
}))
// redirect() wirft in Next.js. Hier wird das Ziel als Fehler sichtbar gemacht.
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`)
  },
}))

const INVALID = 'REDIRECT:/passwort-vergessen?fehler=link'

async function call(query: string) {
  const request = new NextRequest(`http://localhost:3000/auth/bestaetigen${query}`)
  try {
    await GET(request)
  } catch (error) {
    return (error as Error).message
  }
  return 'keine Weiterleitung'
}

beforeEach(() => {
  vi.clearAllMocks()
  createClient.mockResolvedValue({ auth: { verifyOtp, exchangeCodeForSession } })
})

describe('GET /auth/bestaetigen mit Code (Standardvorlage)', () => {
  it('löst einen gültigen Code ein und leitet auf «Neues Passwort»', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: null })

    expect(await call('?code=abc123')).toBe('REDIRECT:/passwort-neu')
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123')
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('leitet bei ungültigem Code (z. B. anderer Browser, abgelaufen, benutzt) auf «Link nicht mehr gültig»', async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { code: 'flow_state_not_found', status: 404 },
    })

    expect(await call('?code=abc123')).toBe(INVALID)
  })

  it('lehnt übermässig lange Codes ab, ohne Supabase anzufragen', async () => {
    expect(await call(`?code=${'a'.repeat(600)}`)).toBe(INVALID)
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('übernimmt nie eine Zieladresse aus dem Link (kein Open Redirect)', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: null })

    expect(await call('?code=abc&next=https://evil.example&redirect_to=//evil.example')).toBe(
      'REDIRECT:/passwort-neu'
    )
  })

  it('leitet auf «Link nicht mehr gültig», wenn Supabase einen Fehler in der Adresse mitgibt', async () => {
    expect(await call('?error=access_denied&error_code=otp_expired')).toBe(INVALID)
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })
})

describe('GET /auth/bestaetigen mit Einmal-Schlüssel (angepasste Vorlage)', () => {
  it('löst einen gültigen Schlüssel ein und leitet auf «Neues Passwort»', async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null })

    expect(await call('?token_hash=abc123&type=recovery')).toBe('REDIRECT:/passwort-neu')
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc123' })
  })

  it('leitet bei abgelaufenem oder benutztem Schlüssel auf «Link nicht mehr gültig»', async () => {
    verifyOtp.mockResolvedValue({ data: null, error: { code: 'otp_expired', status: 403 } })

    expect(await call('?token_hash=abc123&type=recovery')).toBe(INVALID)
  })

  it('lehnt andere Typen als «recovery» ab (kein anderer Anmeldeweg über diese Adresse)', async () => {
    expect(await call('?token_hash=abc&type=magiclink')).toBe(INVALID)
    expect(await call('?token_hash=abc&type=signup')).toBe(INVALID)
    expect(await call('?token_hash=abc')).toBe(INVALID)
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('lehnt übermässig lange Schlüssel ab', async () => {
    expect(await call(`?token_hash=${'a'.repeat(600)}&type=recovery`)).toBe(INVALID)
    expect(verifyOtp).not.toHaveBeenCalled()
  })
})

describe('GET /auth/bestaetigen ohne gültige Angaben', () => {
  it('leitet ohne Parameter auf «Link nicht mehr gültig», ohne Supabase anzufragen', async () => {
    expect(await call('')).toBe(INVALID)
    expect(await call('?type=recovery')).toBe(INVALID)
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('leitet bei Fehlern von Supabase (Netzwerk, Konfiguration) auf «Link nicht mehr gültig»', async () => {
    exchangeCodeForSession.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await call('?code=abc')).toBe(INVALID)

    createClient.mockRejectedValue(Object.assign(new Error('Ungültige Konfiguration'), { name: 'EnvError' }))
    expect(await call('?code=abc')).toBe(INVALID)
    expect(await call('?token_hash=abc&type=recovery')).toBe(INVALID)
  })
})
