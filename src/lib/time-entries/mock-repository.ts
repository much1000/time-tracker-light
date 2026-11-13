import type { CustomersRepository } from '@/lib/customers/repository'
import { TimeEntryError } from './errors'
import type { TimeEntriesRepository } from './repository'
import type {
  BookableCustomer,
  LastTarget,
  TimeEntry,
  TimeEntryInput,
} from './types'
import { todayInZurich } from './zurich'

// PLATZHALTER nur für die Oberfläche (PROJ-4, Frontend). Die Zeiteinträge liegen im Browser dieses
// Geräts und nicht in der Datenbank. `/backend` ersetzt diese Datei durch Supabase und löscht sie.
// Kunden und Projekte kommen aus der echten Datenschicht von PROJ-3 (Supabase).

export const MOCK_TIME_ENTRIES_KEY = 'tt-preview-time-entries'
const SIMULATED_DELAY_MS = 120

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function byText(a: string, b: string): number {
  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

export class MockTimeEntriesRepository implements TimeEntriesRepository {
  private memory: TimeEntry[] = []

  constructor(
    private readonly customers: CustomersRepository,
    private readonly storage: StorageLike | null,
    private readonly delayMs: number = SIMULATED_DELAY_MS
  ) {}

  private read(): TimeEntry[] {
    if (!this.storage) return this.memory
    try {
      const raw = this.storage.getItem(MOCK_TIME_ENTRIES_KEY)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as TimeEntry[]) : []
    } catch {
      return []
    }
  }

  private write(entries: TimeEntry[]): void {
    if (!this.storage) {
      this.memory = entries
      return
    }
    try {
      this.storage.setItem(MOCK_TIME_ENTRIES_KEY, JSON.stringify(entries))
    } catch {
      throw new TimeEntryError('unknown')
    }
  }

  // Für den Knopf «Zurücksetzen» der Vorschau.
  reset(): void {
    this.memory = []
    try {
      this.storage?.removeItem(MOCK_TIME_ENTRIES_KEY)
    } catch {
      // nichts zu tun
    }
  }

  private async tick(): Promise<void> {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs))
  }

  async listEntries(date: string): Promise<TimeEntry[]> {
    await this.tick()
    return this.read()
      .filter((entry) => entry.date === date)
      .sort((a, b) => {
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
        if (a.startTime) return -1
        if (b.startTime) return 1
        return a.createdAt.localeCompare(b.createdAt)
      })
  }

  async listTargets(): Promise<BookableCustomer[]> {
    await this.tick()
    const summaries = await this.customers.listCustomers().catch(() => {
      throw new TimeEntryError('unreachable')
    })
    const active = summaries.filter((customer) => !customer.archived)
    const result: BookableCustomer[] = []
    for (const customer of active) {
      const detail = await this.customers.getCustomer(customer.id).catch(() => null)
      if (!detail) continue
      const projects = detail.projects
        .filter((project) => !project.archived)
        .sort((a, b) => {
          if (a.name === 'Allgemein') return -1
          if (b.name === 'Allgemein') return 1
          return byText(a.name, b.name)
        })
        .map((project) => ({ id: project.id, name: project.name }))
      if (projects.length > 0) {
        result.push({ id: customer.id, code: customer.code, name: customer.name, projects })
      }
    }
    return result.sort((a, b) => byText(a.code, b.code))
  }

  async getLastTarget(): Promise<LastTarget | null> {
    await this.tick()
    const entries = this.read()
    if (entries.length === 0) return null
    const last = entries.reduce((newest, entry) =>
      entry.createdAt > newest.createdAt ? entry : newest
    )
    return { customerId: last.customerId, projectId: last.projectId }
  }

  async createEntry(input: TimeEntryInput): Promise<TimeEntry> {
    await this.tick()
    if (input.date > todayInZurich()) throw new TimeEntryError('unknown')

    const summaries = await this.customers.listCustomers().catch(() => {
      throw new TimeEntryError('unreachable')
    })
    let found: { customerId: string; code: string; name: string; projectName: string } | null = null
    let archived = false
    // Aktive Kunden zuerst: Das Ziel ist fast immer aktiv, so bleiben es wenige Abfragen.
    const ordered = [...summaries].sort((a, b) => Number(a.archived) - Number(b.archived))
    for (const customer of ordered) {
      const detail = await this.customers.getCustomer(customer.id).catch(() => null)
      const project = detail?.projects.find((candidate) => candidate.id === input.projectId)
      if (detail && project) {
        archived = customer.archived || project.archived
        found = {
          customerId: customer.id,
          code: customer.code,
          name: customer.name,
          projectName: project.name,
        }
        break
      }
    }
    if (!found) throw new TimeEntryError('target-not-found')
    if (archived) throw new TimeEntryError('target-archived')

    const entry: TimeEntry = {
      id: globalThis.crypto.randomUUID(),
      projectId: input.projectId,
      customerId: found.customerId,
      customerCode: found.code,
      customerName: found.name,
      projectName: found.projectName,
      date: input.date,
      durationMinutes: input.durationMinutes,
      billableMinutes: input.billableMinutes,
      startTime: input.startTime,
      endTime: input.endTime,
      description: input.description,
      createdAt: new Date().toISOString(),
    }
    this.write([...this.read(), entry])
    return entry
  }
}
