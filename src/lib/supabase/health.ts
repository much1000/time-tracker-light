import { EnvError, getSupabaseEnv } from '@/lib/env'

export type DatabaseStatus =
  | { status: 'ok' }
  | { status: 'config-error'; variables: string[]; message: string }
  | { status: 'unreachable'; message: string }

const TIMEOUT_MS = 5000

export const UNREACHABLE_MESSAGE =
  'Datenbank nicht erreichbar. Ist das Supabase-Projekt pausiert?'

// Prüft, ob Supabase erreichbar ist. Braucht keine Tabellen:
// Es wird der Health-Endpunkt des Auth-Dienstes aufgerufen.
export async function checkDatabase(): Promise<DatabaseStatus> {
  let env
  try {
    env = getSupabaseEnv()
  } catch (error) {
    if (error instanceof EnvError) {
      return {
        status: 'config-error',
        variables: error.variables,
        message: error.message,
      }
    }
    throw error
  }

  try {
    const response = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.anonKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })

    if (!response.ok) {
      return { status: 'unreachable', message: UNREACHABLE_MESSAGE }
    }
    return { status: 'ok' }
  } catch {
    return { status: 'unreachable', message: UNREACHABLE_MESSAGE }
  }
}
