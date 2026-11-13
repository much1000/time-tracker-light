import { createClient } from '@/lib/supabase/client'
import type { TimerRepository } from './repository'
import { SupabaseTimerRepository } from './supabase-repository'

// Einzige Stelle, die entscheidet, welche Datenhaltung die Oberfläche nutzt: Supabase.
let repository: TimerRepository | null = null

export function getTimerRepository(): TimerRepository {
  if (!repository) repository = new SupabaseTimerRepository(createClient())
  return repository
}

export { TimerError, describeTimerError } from './errors'
export type * from './types'
