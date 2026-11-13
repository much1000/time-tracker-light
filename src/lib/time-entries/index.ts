import { createClient } from '@/lib/supabase/client'
import type { TimeEntriesRepository } from './repository'
import { SupabaseTimeEntriesRepository } from './supabase-repository'

// Einzige Stelle, die entscheidet, welche Datenhaltung die Oberfläche nutzt: Supabase.
let repository: TimeEntriesRepository | null = null

export function getTimeEntriesRepository(): TimeEntriesRepository {
  if (!repository) repository = new SupabaseTimeEntriesRepository(createClient())
  return repository
}

export { TimeEntryError, describeTimeEntryError } from './errors'
export type * from './types'
