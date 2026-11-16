import type { CustomersRepository } from '@/lib/customers/repository'
import { TimeEntryError } from './errors'
import { monthRange } from './month'
import type { TimeEntriesRepository } from './repository'
import {
  MONTH_ENTRY_LIMIT,
  type BookableCustomer,
  type EntryFilter,
  type LastTarget,
  type MonthEntries,
  type TimeEntry,
  type TimeEntryInput,
  type WeekEntries,
} from './types'
import { weekRange } from './week'
import { todayInZurich } from './zurich'

// Test-Double: bildet die Regeln der Datenbank im Speicher nach (aktive Ziele, Datum). Wird nur in
// Tests genutzt, die Oberfläche läuft gegen SupabaseTimeEntriesRepository. Kunden und Projekte kommen
// aus einer CustomersRepository (in Tests die In-Memory-Variante).

function byText(a: string, b: string): number {
  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

export class InMemoryTimeEntriesRepository implements TimeEntriesRepository {
  private memory: TimeEntry[] = []

  constructor(
    private readonly customers: CustomersRepository,
    private readonly delayMs: number = 0
  ) {}

  private read(): TimeEntry[] {
    return this.memory
  }

  private write(entries: TimeEntry[]): void {
    this.memory = entries
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

  // Projekt samt Kunde nachschlagen (aktive Kunden zuerst: Das Ziel ist fast immer aktiv, so bleiben es
  // wenige Abfragen). Wirft «target-not-found», wenn es das Projekt nicht gibt.
  private async findProject(projectId: string) {
    const summaries = await this.customers.listCustomers().catch(() => {
      throw new TimeEntryError('unreachable')
    })
    const ordered = [...summaries].sort((a, b) => Number(a.archived) - Number(b.archived))
    for (const customer of ordered) {
      const detail = await this.customers.getCustomer(customer.id).catch(() => null)
      const project = detail?.projects.find((candidate) => candidate.id === projectId)
      if (detail && project) {
        return {
          archived: customer.archived || project.archived,
          customerArchived: customer.archived,
          projectArchived: project.archived,
          customerId: customer.id,
          code: customer.code,
          name: customer.name,
          projectName: project.name,
        }
      }
    }
    throw new TimeEntryError('target-not-found')
  }

  async createEntry(input: TimeEntryInput): Promise<TimeEntry> {
    await this.tick()
    if (input.date > todayInZurich()) throw new TimeEntryError('unknown')
    const found = await this.findProject(input.projectId)
    if (found.archived) throw new TimeEntryError('target-archived')

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

  async listMonth(filter: EntryFilter): Promise<MonthEntries> {
    await this.tick()
    const { from, to } = monthRange(filter.month)
    const matching = this.read()
      .filter((entry) => entry.date >= from && entry.date < to)
      .filter((entry) => !filter.customerId || entry.customerId === filter.customerId)
      .filter((entry) => !filter.withoutDescription || entry.description === null)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
        if (a.startTime) return -1
        if (b.startTime) return 1
        return a.createdAt.localeCompare(b.createdAt)
      })
    return { entries: matching.slice(0, MONTH_ENTRY_LIMIT), truncated: matching.length > MONTH_ENTRY_LIMIT }
  }

  // Archiv-Hinweise werden bei der Abfrage aus dem aktuellen Stand der Kunden und Projekte ergänzt
  async listWeek(week: string): Promise<WeekEntries> {
    await this.tick()
    const { from, to } = weekRange(week)
    const matching = this.read()
      .filter((entry) => entry.date >= from && entry.date < to)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1
        if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime)
        if (a.startTime) return -1
        if (b.startTime) return 1
        return a.createdAt.localeCompare(b.createdAt)
      })
    const visible = matching.slice(0, MONTH_ENTRY_LIMIT)
    const flags = new Map<string, { customerArchived: boolean; projectArchived: boolean }>()
    for (const projectId of new Set(visible.map((entry) => entry.projectId))) {
      const found = await this.findProject(projectId)
      flags.set(projectId, { customerArchived: found.customerArchived, projectArchived: found.projectArchived })
    }
    return {
      entries: visible.map((entry) => ({ ...entry, ...flags.get(entry.projectId) })),
      truncated: matching.length > MONTH_ENTRY_LIMIT,
    }
  }

  // Wie die Datenbank: Datum nur bei Änderung gegen die Zukunft prüfen, Ziel nur bei Wechsel auf «aktiv»
  async updateEntry(id: string, input: TimeEntryInput): Promise<TimeEntry> {
    await this.tick()
    const current = this.read().find((entry) => entry.id === id)
    if (!current) throw new TimeEntryError('entry-not-found')
    if (input.date !== current.date && input.date > todayInZurich()) {
      throw new TimeEntryError('date-in-future')
    }
    const found = await this.findProject(input.projectId)
    if (input.projectId !== current.projectId && found.archived) {
      throw new TimeEntryError('target-archived')
    }
    const updated: TimeEntry = {
      ...current,
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
    }
    this.write(this.read().map((entry) => (entry.id === id ? updated : entry)))
    return updated
  }

  async deleteEntry(id: string): Promise<void> {
    await this.tick()
    const entries = this.read()
    if (!entries.some((entry) => entry.id === id)) throw new TimeEntryError('entry-not-found')
    this.write(entries.filter((entry) => entry.id !== id))
  }
}
