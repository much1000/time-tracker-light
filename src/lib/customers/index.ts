import { createClient } from '@/lib/supabase/client'
import type { CustomersRepository } from './repository'
import { SupabaseCustomersRepository } from './supabase-repository'

// Einzige Stelle, die entscheidet, welche Datenhaltung die Oberfläche nutzt: Supabase.
let repository: CustomersRepository | null = null

export function getCustomersRepository(): CustomersRepository {
  if (!repository) repository = new SupabaseCustomersRepository(createClient())
  return repository
}

export { RepositoryError, describeRepositoryError } from './errors'
export type * from './types'
