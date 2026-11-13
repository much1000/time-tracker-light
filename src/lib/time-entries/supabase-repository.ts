import type { SupabaseClient } from '@supabase/supabase-js'
import { isNetworkFailure, isSessionFailure, type DbError } from '@/lib/supabase/db-errors'
import { TimeEntryError } from './errors'
import type { TimeEntriesRepository } from './repository'
import type { BookableCustomer, LastTarget, TimeEntry, TimeEntryInput } from './types'

// Echte Datenhaltung in Supabase. Die Regeln (Besitzer, Grenzen, Datum, archivierte Ziele,
// kein Löschen) erzwingt die Datenbank (supabase/migrations/20261113000000_time_entries.sql).
// Hier werden nur Zeilen in Typen übersetzt und Datenbankfehler in TimeEntryError.

// Zeiteintrag samt Projekt und Kunde (Fremdschlüssel-Namen eindeutig angegeben)
const ENTRY_COLUMNS =
  'id, project_id, entry_date, duration_minutes, billable_minutes, start_time, end_time, description, created_at, ' +
  'project:projects!time_entries_project_owner_fkey(id, name, customer:customers!projects_customer_owner_fkey(id, code, name))'

interface EntryRow {
  id: string
  project_id: string
  entry_date: string
  duration_minutes: number
  billable_minutes: number
  start_time: string | null
  end_time: string | null
  description: string | null
  created_at: string
  project: {
    id: string
    name: string
    customer: { id: string; code: string; name: string }
  }
}

// Sicherheitsgrenze für Listen (ein Tag hat nie so viele Einträge)
const LIST_LIMIT = 500

// Datenbank liefert «08:30:00», angezeigt wird «08:30»
function toClock(value: string | null): string | null {
  return value === null ? null : value.slice(0, 5)
}

function toEntry(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    customerId: row.project.customer.id,
    customerCode: row.project.customer.code,
    customerName: row.project.customer.name,
    projectName: row.project.name,
    date: row.entry_date,
    durationMinutes: row.duration_minutes,
    billableMinutes: row.billable_minutes,
    startTime: toClock(row.start_time),
    endTime: toClock(row.end_time),
    description: row.description,
    createdAt: row.created_at,
  }
}

function byText(a: string, b: string): number {
  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

function toError(error: DbError): TimeEntryError {
  if (isSessionFailure(error)) return new TimeEntryError('session')
  if (isNetworkFailure(error)) return new TimeEntryError('unreachable')
  const text = `${error.message ?? ''} ${error.details ?? ''}`
  if (text.includes('target_archived')) return new TimeEntryError('target-archived')
  if (text.includes('target_not_found') || error.code === '23503') {
    return new TimeEntryError('target-not-found')
  }
  if (text.includes('date_in_future')) return new TimeEntryError('date-in-future')
  return new TimeEntryError('unknown')
}

export class SupabaseTimeEntriesRepository implements TimeEntriesRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listEntries(date: string): Promise<TimeEntry[]> {
    const { data, error } = await this.client
      .from('time_entries')
      .select(ENTRY_COLUMNS)
      .eq('entry_date', date)
      .order('created_at')
      .limit(LIST_LIMIT)
    if (error) throw toError(error)
    return (data as unknown as EntryRow[]).map(toEntry).sort((a, b) => {
      // Mit Uhrzeit zuerst nach Startzeit, ohne Uhrzeit danach nach Anlegezeit (schon sortiert)
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
      if (a.startTime) return -1
      if (b.startTime) return 1
      return a.createdAt.localeCompare(b.createdAt)
    })
  }

  async listTargets(): Promise<BookableCustomer[]> {
    const { data, error } = await this.client
      .from('customers')
      .select('id, code, name, projects:projects!projects_customer_owner_fkey(id, name)')
      .eq('archived', false)
      .eq('projects.archived', false)
      .limit(LIST_LIMIT)
    if (error) throw toError(error)
    const rows = data as unknown as {
      id: string
      code: string
      name: string
      projects: { id: string; name: string }[]
    }[]
    return rows
      .filter((customer) => customer.projects.length > 0)
      .map((customer) => ({
        id: customer.id,
        code: customer.code,
        name: customer.name,
        projects: [...customer.projects].sort((a, b) => {
          if (a.name === 'Allgemein') return -1
          if (b.name === 'Allgemein') return 1
          return byText(a.name, b.name)
        }),
      }))
      .sort((a, b) => byText(a.code, b.code))
  }

  async getLastTarget(): Promise<LastTarget | null> {
    const { data, error } = await this.client
      .from('time_entries')
      .select('project_id, project:projects!time_entries_project_owner_fkey(customer_id)')
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) throw toError(error)
    const row = (data as unknown as { project_id: string; project: { customer_id: string } }[])[0]
    return row ? { customerId: row.project.customer_id, projectId: row.project_id } : null
  }

  async createEntry(input: TimeEntryInput): Promise<TimeEntry> {
    const { data, error } = await this.client
      .from('time_entries')
      .insert({
        project_id: input.projectId,
        entry_date: input.date,
        duration_minutes: input.durationMinutes,
        billable_minutes: input.billableMinutes,
        start_time: input.startTime,
        end_time: input.endTime,
        description: input.description,
      })
      .select(ENTRY_COLUMNS)
      .single()
    if (error) throw toError(error)
    return toEntry(data as unknown as EntryRow)
  }
}
