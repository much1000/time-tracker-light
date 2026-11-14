import type { SupabaseClient } from '@supabase/supabase-js'
import { isNetworkFailure, isSessionFailure, type DbError } from '@/lib/supabase/db-errors'
import { TimeEntryError } from './errors'
import type { TimeEntriesRepository } from './repository'
import { monthRange } from './month'
import {
  MONTH_ENTRY_LIMIT,
  type BookableCustomer,
  type EntryFilter,
  type LastTarget,
  type MonthEntries,
  type TimeEntry,
  type TimeEntryInput,
} from './types'

// Echte Datenhaltung in Supabase. Die Regeln (Besitzer, Grenzen, Datum, archivierte Ziele,
// kein Löschen) erzwingt die Datenbank (supabase/migrations/20261113000000_time_entries.sql).
// Hier werden nur Zeilen in Typen übersetzt und Datenbankfehler in TimeEntryError.

// Zeiteintrag samt Projekt und Kunde (Fremdschlüssel-Namen eindeutig angegeben)
const ENTRY_FIELDS =
  'id, project_id, entry_date, duration_minutes, billable_minutes, start_time, end_time, description, created_at'
const PROJECT_EMBED = 'project:projects!time_entries_project_owner_fkey'
const PROJECT_FIELDS = '(id, name, customer:customers!projects_customer_owner_fkey(id, code, name))'
const ENTRY_COLUMNS = `${ENTRY_FIELDS}, ${PROJECT_EMBED}${PROJECT_FIELDS}`
// Mit Kundenfilter: nur Einträge, deren Projekt zum Kunden passt (innere Verknüpfung)
const ENTRY_COLUMNS_INNER = `${ENTRY_FIELDS}, ${PROJECT_EMBED}!inner${PROJECT_FIELDS}`

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

// Neueste Tage zuerst; innerhalb eines Tages mit Uhrzeit nach Start, ohne Uhrzeit danach nach Anlegezeit
function byMonthOrder(a: TimeEntry, b: TimeEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
  if (a.startTime) return -1
  if (b.startTime) return 1
  return a.createdAt.localeCompare(b.createdAt)
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
  // Kein Treffer bei .single() (Eintrag wurde inzwischen gelöscht)
  if (error.code === 'PGRST116') return new TimeEntryError('entry-not-found')
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

  async listMonth(filter: EntryFilter): Promise<MonthEntries> {
    const { from, to } = monthRange(filter.month)
    let query = this.client
      .from('time_entries')
      .select(filter.customerId ? ENTRY_COLUMNS_INNER : ENTRY_COLUMNS)
      .gte('entry_date', from)
      .lt('entry_date', to)
    if (filter.customerId) query = query.eq('project.customer_id', filter.customerId)
    if (filter.withoutDescription) query = query.is('description', null)
    // Eine Zeile mehr holen, um «abgeschnitten» zu erkennen
    const { data, error } = await query
      .order('entry_date', { ascending: false })
      .order('created_at')
      .limit(MONTH_ENTRY_LIMIT + 1)
    if (error) throw toError(error)
    const rows = data as unknown as EntryRow[]
    const truncated = rows.length > MONTH_ENTRY_LIMIT
    const entries = rows.slice(0, MONTH_ENTRY_LIMIT).map(toEntry).sort(byMonthOrder)
    return { entries, truncated }
  }

  async updateEntry(id: string, input: TimeEntryInput): Promise<TimeEntry> {
    const { data, error } = await this.client
      .from('time_entries')
      .update({
        project_id: input.projectId,
        entry_date: input.date,
        duration_minutes: input.durationMinutes,
        billable_minutes: input.billableMinutes,
        start_time: input.startTime,
        end_time: input.endTime,
        description: input.description,
      })
      .eq('id', id)
      .select(ENTRY_COLUMNS)
      .single()
    if (error) throw toError(error)
    return toEntry(data as unknown as EntryRow)
  }

  async deleteEntry(id: string): Promise<void> {
    const { data, error } = await this.client.from('time_entries').delete().eq('id', id).select('id')
    if (error) throw toError(error)
    // Kein gelöschter Eintrag: Er war schon weg (oder gehört nicht dem Nutzer)
    if (!data || data.length === 0) throw new TimeEntryError('entry-not-found')
  }
}
