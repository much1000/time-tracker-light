import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkDatabase, UNREACHABLE_MESSAGE } from './health'

describe('checkDatabase', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('meldet ok, wenn der Health-Endpunkt antwortet', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkDatabase()).resolves.toEqual({ status: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/auth/v1/health',
      expect.objectContaining({ headers: { apikey: 'anon-key' } })
    )
  })

  it('meldet unreachable bei einer Fehlerantwort (z. B. pausiertes Projekt)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 540 }))

    await expect(checkDatabase()).resolves.toEqual({
      status: 'unreachable',
      message: UNREACHABLE_MESSAGE,
    })
  })

  it('meldet unreachable, wenn das Netzwerk ausfällt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    await expect(checkDatabase()).resolves.toEqual({
      status: 'unreachable',
      message: UNREACHABLE_MESSAGE,
    })
  })

  it('meldet config-error mit Variablennamen, wenn eine Variable fehlt', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await checkDatabase()

    expect(result).toMatchObject({
      status: 'config-error',
      variables: ['NEXT_PUBLIC_SUPABASE_URL'],
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
