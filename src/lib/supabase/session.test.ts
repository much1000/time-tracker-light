// @vitest-environment node
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateSession } from './session'

const getClaims = vi.fn()
const createServerClient = vi.fn()
const getSupabaseEnv = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}))
vi.mock('@/lib/env', () => ({ getSupabaseEnv: () => getSupabaseEnv() }))

function request(path: string) {
  return new NextRequest(`http://localhost:3000${path}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  getSupabaseEnv.mockReturnValue({ url: 'https://example.supabase.co', anonKey: 'anon' })
  createServerClient.mockReturnValue({ auth: { getClaims } })
})

describe('updateSession', () => {
  it('leitet ohne Anmeldung auf die Anmeldeseite und merkt die Zieladresse', async () => {
    getClaims.mockResolvedValue({ data: null, error: { name: 'AuthSessionMissingError' } })

    const response = await updateSession(request('/status?x=1'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fstatus%3Fx%3D1')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('lässt Angemeldete durch und verbietet das Zwischenspeichern', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null })

    const response = await updateSession(request('/status'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('leitet Angemeldete von der Anmeldeseite auf die Startseite', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null })

    const response = await updateSession(request('/login'))

    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('lässt die Anmeldeseite ohne Anmeldung durch', async () => {
    getClaims.mockResolvedValue({ data: null, error: null })

    const response = await updateSession(request('/login'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })

  it('behandelt eine Anmeldung ohne Nutzerkennung als nicht angemeldet', async () => {
    getClaims.mockResolvedValue({ data: { claims: {} }, error: null })

    const response = await updateSession(request('/'))

    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('fällt bei fehlender Konfiguration auf «nicht angemeldet» zurück (geschützte Seiten bleiben zu)', async () => {
    getSupabaseEnv.mockImplementation(() => {
      throw Object.assign(new Error('Ungültige Konfiguration'), { name: 'EnvError' })
    })

    const protectedPage = await updateSession(request('/status'))
    expect(protectedPage.headers.get('location')).toContain('/login')

    const login = await updateSession(request('/login'))
    expect(login.headers.get('location')).toBeNull()
  })

  it('fällt bei einem Fehler von Supabase auf «nicht angemeldet» zurück', async () => {
    getClaims.mockRejectedValue(new TypeError('Failed to fetch'))

    const response = await updateSession(request('/'))

    expect(response.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('gibt erneuerte Cookies auch bei einer Umleitung mit', async () => {
    createServerClient.mockImplementation(
      (_url: string, _key: string, options: { cookies: { setAll: (c: unknown[]) => void } }) => ({
        auth: {
          getClaims: async () => {
            options.cookies.setAll([{ name: 'sb-token', value: 'neu', options: { path: '/' } }])
            return { data: null, error: null }
          },
        },
      })
    )

    const response = await updateSession(request('/status'))

    expect(response.headers.get('location')).toContain('/login')
    expect(response.cookies.get('sb-token')?.value).toBe('neu')
  })

  it('lässt die Einlösung des Reset-Links immer durch', async () => {
    getClaims.mockResolvedValue({ data: null, error: null })

    const response = await updateSession(request('/auth/bestaetigen?token_hash=x&type=recovery'))

    expect(response.headers.get('location')).toBeNull()
  })
})
