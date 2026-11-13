import type { SupabaseClient } from '@supabase/supabase-js'
import { isNetworkFailure, isSessionFailure, type DbError } from '@/lib/supabase/db-errors'
import { TimerError } from './errors'
import type { TimerRepository } from './repository'
import type {
  FinishedTimer,
  RunningTimer,
  SavedEntry,
  StartResult,
  StopResult,
  TimerSnapshot,
} from './types'

// Echte Datenhaltung in Supabase. Die Regeln (ein Timer pro Nutzer, nur aktive eigene Projekte,
// Serveruhr, Aufteilung nach Tagen, kein Löschen von Einträgen) erzwingt die Datenbank
// (supabase/migrations/20261114000000_running_timers.sql). Hier werden JSON-Antworten in Typen
// übersetzt und Datenbankfehler in TimerError.

interface TimerJson {
  id: string
  project_id: string
  project_name: string
  customer_id: string
  customer_code: string
  customer_name: string
  started_at: string
  description: string | null
}

interface FinishedJson {
  project_id: string
  project_name: string
  customer_code: string
  customer_name: string
  too_short: boolean
  total_minutes: number
  entries: {
    id: string
    entry_date: string
    duration_minutes: number
    start_time: string
    end_time: string
  }[]
}

function toTimer(json: TimerJson): RunningTimer {
  return {
    id: json.id,
    projectId: json.project_id,
    projectName: json.project_name,
    customerId: json.customer_id,
    customerCode: json.customer_code,
    customerName: json.customer_name,
    startedAt: json.started_at,
    description: json.description,
  }
}

// Datenbank liefert «23:30:00», angezeigt wird «23:30»
function toClock(value: string): string {
  return value.slice(0, 5)
}

function toFinished(json: FinishedJson): FinishedTimer {
  return {
    projectId: json.project_id,
    projectName: json.project_name,
    customerCode: json.customer_code,
    customerName: json.customer_name,
    tooShort: json.too_short,
    totalMinutes: json.total_minutes,
    entries: json.entries.map(
      (entry): SavedEntry => ({
        id: entry.id,
        date: entry.entry_date,
        durationMinutes: entry.duration_minutes,
        startTime: toClock(entry.start_time),
        endTime: toClock(entry.end_time),
      })
    ),
  }
}

function toError(error: DbError): TimerError {
  if (isSessionFailure(error)) return new TimerError('session')
  if (isNetworkFailure(error)) return new TimerError('unreachable')
  const text = `${error.message ?? ''} ${error.details ?? ''}`
  if (text.includes('target_archived')) return new TimerError('target-archived')
  if (text.includes('target_not_found') || error.code === '23503') {
    return new TimerError('target-not-found')
  }
  if (text.includes('no_timer')) return new TimerError('no-timer')
  if (text.includes('description_too_long') || text.includes('running_timers_description_length')) {
    return new TimerError('description-too-long')
  }
  return new TimerError('unknown')
}

export class SupabaseTimerRepository implements TimerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getTimer(): Promise<TimerSnapshot> {
    const { data, error } = await this.client.rpc('get_timer')
    if (error) throw toError(error)
    const json = data as { timer: TimerJson | null; server_now: string }
    return { timer: json.timer ? toTimer(json.timer) : null, serverNow: json.server_now }
  }

  async startTimer(projectId: string): Promise<StartResult> {
    const { data, error } = await this.client.rpc('start_timer', { p_project_id: projectId })
    if (error) throw toError(error)
    const json = data as {
      timer: TimerJson
      finished: FinishedJson | null
      already_running: boolean
      server_now: string
    }
    return {
      timer: toTimer(json.timer),
      finished: json.finished ? toFinished(json.finished) : null,
      alreadyRunning: json.already_running,
      serverNow: json.server_now,
    }
  }

  async stopTimer(description?: string): Promise<StopResult> {
    const { data, error } = await this.client.rpc('stop_timer', {
      p_description: description === undefined ? null : description,
    })
    if (error) throw toError(error)
    const json = data as { finished: FinishedJson; server_now: string }
    return { finished: toFinished(json.finished), serverNow: json.server_now }
  }

  async discardTimer(): Promise<boolean> {
    const { data, error } = await this.client.rpc('discard_timer')
    if (error) throw toError(error)
    return (data as { discarded: boolean }).discarded
  }

  async saveDescription(timerId: string, description: string): Promise<void> {
    const trimmed = description.trim()
    const { data, error } = await this.client
      .from('running_timers')
      .update({ description: trimmed === '' ? null : trimmed })
      .eq('id', timerId)
      .select('id')
    if (error) throw toError(error)
    // Kein Treffer: Der Timer wurde inzwischen beendet (oder gehört nicht dem Nutzer)
    if (!data || data.length === 0) throw new TimerError('no-timer')
  }
}
