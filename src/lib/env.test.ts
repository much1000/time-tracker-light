import { describe, expect, it } from 'vitest'
import { EnvError, getSupabaseEnv } from './env'

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
}

describe('getSupabaseEnv', () => {
  it('liefert URL und öffentlichen Schlüssel bei gültiger Konfiguration', () => {
    expect(getSupabaseEnv(valid)).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    })
  })

  it('nennt den Namen einer fehlenden Variable', () => {
    expect.assertions(3)
    try {
      getSupabaseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: undefined })
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError)
      expect((error as EnvError).variables).toEqual(['NEXT_PUBLIC_SUPABASE_URL'])
      expect((error as EnvError).message).toContain('NEXT_PUBLIC_SUPABASE_URL')
    }
  })

  it('nennt alle fehlenden Variablen', () => {
    expect.assertions(1)
    try {
      getSupabaseEnv({})
    } catch (error) {
      expect((error as EnvError).variables).toEqual([
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      ])
    }
  })

  it('behandelt einen leeren Wert wie eine fehlende Variable', () => {
    expect(() =>
      getSupabaseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' })
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/)
  })

  it('lehnt eine ungültige URL ab', () => {
    expect(() =>
      getSupabaseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'keine-url' })
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('lehnt einen Service-Role-Schlüssel mit NEXT_PUBLIC_-Präfix ab', () => {
    expect(() =>
      getSupabaseEnv({ ...valid, NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 'geheim' })
    ).toThrow(/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/)
  })
})
