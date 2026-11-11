import type { SupabaseClient } from '@supabase/supabase-js'
import { RepositoryError } from './errors'
import type { CustomersRepository } from './repository'
import type {
  Customer,
  CustomerInput,
  CustomerSummary,
  CustomerWithProjects,
  Project,
  ProjectInput,
} from './types'

// Echte Datenhaltung in Supabase. Die Regeln (Eindeutigkeit, Längen, Besitzer, kein Löschen,
// Archivieren) erzwingt die Datenbank (supabase/migrations/20261111000000_customers_projects.sql).
// Hier werden nur Zeilen in Typen übersetzt und Datenbankfehler in RepositoryError.

interface CustomerRow {
  id: string
  code: string
  name: string
  archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

interface ProjectRow {
  id: string
  customer_id: string
  name: string
  number: string | null
  archived: boolean
  archived_at: string | null
  archived_with_customer: boolean
  created_at: string
  updated_at: string
}

interface DbError {
  code?: string
  message?: string
  details?: string
  status?: number
}

const CUSTOMER_COLUMNS = 'id, code, name, archived, archived_at, created_at, updated_at'
const PROJECT_COLUMNS =
  'id, customer_id, name, number, archived, archived_at, archived_with_customer, created_at, updated_at'
// Sicherheitsgrenze für Listen (Spec: bis 100 Kunden und 500 Projekte)
const LIST_LIMIT = 1000

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    archived: row.archived,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    customerId: row.customer_id,
    name: row.name,
    number: row.number,
    archived: row.archived,
    archivedAt: row.archived_at,
    archivedWithCustomer: row.archived_with_customer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function cleanNumber(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

function byText(a: string, b: string): number {
  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

// Maskiert Platzhalter von ilike, damit nur auf Gleichheit (ohne Gross-/Kleinschreibung) geprüft wird.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function isNetworkFailure(error: DbError): boolean {
  const message = (error.message ?? '').toLowerCase()
  return (
    error.status === 0 ||
    (error.status !== undefined && error.status >= 500) ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('fetch failed')
  )
}

function isSessionFailure(error: DbError): boolean {
  const message = (error.message ?? '').toLowerCase()
  return (
    error.status === 401 ||
    error.code === 'PGRST301' ||
    error.code === '28000' ||
    message.includes('jwt') ||
    message.includes('not_authenticated')
  )
}

export class SupabaseCustomersRepository implements CustomersRepository {
  constructor(private readonly client: SupabaseClient) {}

  // Fehler, die in jeder Operation gleich zu behandeln sind.
  private baseError(error: DbError): RepositoryError {
    if (isSessionFailure(error)) return new RepositoryError('session')
    if (isNetworkFailure(error)) return new RepositoryError('unreachable')
    if (error.code === 'P0002' || error.code === 'PGRST116') return new RepositoryError('not-found')
    if (error.code === '22P02') return new RepositoryError('not-found') // ungültige Kennung
    if (error.code === '23514' && (error.message ?? '').includes('customer_archived')) {
      return new RepositoryError('customer-archived')
    }
    return new RepositoryError('unknown')
  }

  private async customerError(error: DbError, input: CustomerInput, selfId?: string) {
    if (error.code === '23505') {
      const text = `${error.message ?? ''} ${error.details ?? ''}`
      if (text.includes('customers_owner_code_key') || text.includes('(owner_id, code)')) {
        return new RepositoryError('duplicate-code', {
          inArchive: await this.isArchivedMatch('code', input.code, selfId),
        })
      }
      if (text.includes('customers_owner_name_lower_idx') || text.includes('lower(name')) {
        return new RepositoryError('duplicate-name', {
          inArchive: await this.isArchivedMatch('name', input.name, selfId),
        })
      }
    }
    return this.baseError(error)
  }

  // Liegt der Treffer im Archiv? (Nur für den Zusatz «(im Archiv)» im Hinweis.)
  private async isArchivedMatch(column: 'code' | 'name', value: string, selfId?: string) {
    try {
      let query = this.client.from('customers').select('archived').ilike(column, escapeLike(value))
      if (selfId) query = query.neq('id', selfId)
      const { data } = await query.limit(1)
      return data?.[0]?.archived === true
    } catch {
      return false
    }
  }

  private async projectError(error: DbError, customerId: string, name: string, selfId?: string) {
    if (error.code === '23505') {
      let archived = false
      try {
        let query = this.client
          .from('projects')
          .select('archived')
          .eq('customer_id', customerId)
          .ilike('name', escapeLike(name))
        if (selfId) query = query.neq('id', selfId)
        const { data } = await query.limit(1)
        archived = data?.[0]?.archived === true
      } catch {
        archived = false
      }
      return new RepositoryError('duplicate-project', { inArchive: archived })
    }
    return this.baseError(error)
  }

  // ----- Lesen -----

  async listCustomers(): Promise<CustomerSummary[]> {
    const [customersResult, projectsResult] = await Promise.all([
      this.client.from('customers').select(CUSTOMER_COLUMNS).order('code').limit(LIST_LIMIT),
      this.client.from('projects').select('customer_id').eq('archived', false).limit(LIST_LIMIT),
    ])
    if (customersResult.error) throw this.baseError(customersResult.error)
    if (projectsResult.error) throw this.baseError(projectsResult.error)

    const counts = new Map<string, number>()
    for (const row of projectsResult.data ?? []) {
      counts.set(row.customer_id, (counts.get(row.customer_id) ?? 0) + 1)
    }
    return ((customersResult.data ?? []) as CustomerRow[])
      .map(toCustomer)
      .sort((a, b) => byText(a.code, b.code))
      .map((customer) => ({ ...customer, activeProjectCount: counts.get(customer.id) ?? 0 }))
  }

  async getCustomer(id: string): Promise<CustomerWithProjects | null> {
    if (!UUID_PATTERN.test(id)) return null
    const customerResult = await this.client
      .from('customers')
      .select(CUSTOMER_COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (customerResult.error) throw this.baseError(customerResult.error)
    if (!customerResult.data) return null

    const projectsResult = await this.client
      .from('projects')
      .select(PROJECT_COLUMNS)
      .eq('customer_id', id)
      .limit(LIST_LIMIT)
    if (projectsResult.error) throw this.baseError(projectsResult.error)

    return {
      customer: toCustomer(customerResult.data as CustomerRow),
      projects: ((projectsResult.data ?? []) as ProjectRow[])
        .map(toProject)
        .sort((a, b) => byText(a.name, b.name)),
    }
  }

  // ----- Kunden -----

  async createCustomer(input: CustomerInput): Promise<Customer> {
    const { data, error } = await this.client.rpc('create_customer', {
      p_code: input.code,
      p_name: input.name,
    })
    if (error) throw await this.customerError(error, input)
    return toCustomer(data as CustomerRow)
  }

  async updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
    const { data, error } = await this.client
      .from('customers')
      .update({ code: input.code, name: input.name })
      .eq('id', id)
      .select(CUSTOMER_COLUMNS)
      .single()
    if (error) throw await this.customerError(error, input, id)
    return toCustomer(data as CustomerRow)
  }

  async archiveCustomer(id: string): Promise<void> {
    const { error } = await this.client.rpc('archive_customer', { p_id: id })
    if (error) throw this.baseError(error)
  }

  async reactivateCustomer(id: string): Promise<void> {
    const { error } = await this.client.rpc('reactivate_customer', { p_id: id })
    if (error) throw this.baseError(error)
  }

  // ----- Projekte -----

  async createProject(customerId: string, input: ProjectInput): Promise<Project> {
    const { data, error } = await this.client
      .from('projects')
      .insert({ customer_id: customerId, name: input.name, number: cleanNumber(input.number) })
      .select(PROJECT_COLUMNS)
      .single()
    if (error) throw await this.projectError(error, customerId, input.name)
    return toProject(data as ProjectRow)
  }

  async updateProject(id: string, input: ProjectInput): Promise<Project> {
    const { data, error } = await this.client
      .from('projects')
      .update({ name: input.name, number: cleanNumber(input.number) })
      .eq('id', id)
      .select(PROJECT_COLUMNS)
      .single()
    if (error) {
      const customerId = await this.customerIdOf(id)
      throw customerId
        ? await this.projectError(error, customerId, input.name, id)
        : this.baseError(error)
    }
    return toProject(data as ProjectRow)
  }

  private async customerIdOf(projectId: string): Promise<string | null> {
    try {
      const { data } = await this.client
        .from('projects')
        .select('customer_id')
        .eq('id', projectId)
        .maybeSingle()
      return data?.customer_id ?? null
    } catch {
      return null
    }
  }

  async archiveProject(id: string): Promise<void> {
    const { data, error } = await this.client
      .from('projects')
      .update({ archived: true, archived_at: new Date().toISOString(), archived_with_customer: false })
      .eq('id', id)
      .eq('archived', false)
      .select('id')
    if (error) throw this.baseError(error)
    if (!data || data.length === 0) await this.requireProject(id)
  }

  async reactivateProject(id: string): Promise<void> {
    const { data, error } = await this.client
      .from('projects')
      .update({ archived: false, archived_at: null, archived_with_customer: false })
      .eq('id', id)
      .eq('archived', true)
      .select('id')
    if (error) throw this.baseError(error)
    if (!data || data.length === 0) await this.requireProject(id)
  }

  // Kein Treffer beim Ändern: schon im gewünschten Zustand (in Ordnung) oder nicht vorhanden.
  private async requireProject(id: string): Promise<void> {
    const { data, error } = await this.client.from('projects').select('id').eq('id', id).maybeSingle()
    if (error) throw this.baseError(error)
    if (!data) throw new RepositoryError('not-found')
  }
}
