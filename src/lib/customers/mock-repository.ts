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

// PLATZHALTER nur für die Oberfläche (PROJ-3, Frontend). Die Daten liegen im Browser dieses
// Geräts und nicht in der Datenbank. `/backend` ersetzt diese Datei durch Supabase und löscht sie.
// Sie bildet die Regeln des Spec nach (Eindeutigkeit, Archivieren mit Merkmal, kein Löschen),
// damit die Oberfläche vollständig ausprobiert werden kann.

export const MOCK_STORAGE_KEY = 'tt-preview-customers'
const SIMULATED_DELAY_MS = 120

interface Store {
  customers: Customer[]
  projects: Project[]
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function emptyStore(): Store {
  return { customers: [], projects: [] }
}

function newId(): string {
  return globalThis.crypto.randomUUID()
}

// Gleichheit ohne Beachtung der Gross-/Kleinschreibung (wie in der Datenbank).
function same(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

function byText(a: string, b: string): number {
  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

function cleanNumber(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  return trimmed === '' ? null : trimmed
}

export class MockCustomersRepository implements CustomersRepository {
  private memory: Store = emptyStore()

  constructor(
    private readonly storage: StorageLike | null,
    private readonly delayMs: number = SIMULATED_DELAY_MS
  ) {}

  // ----- Speicher -----

  private read(): Store {
    if (!this.storage) return this.memory
    try {
      const raw = this.storage.getItem(MOCK_STORAGE_KEY)
      if (!raw) return emptyStore()
      const parsed = JSON.parse(raw) as Store
      if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.projects)) return emptyStore()
      return parsed
    } catch {
      return emptyStore()
    }
  }

  private write(store: Store): void {
    if (!this.storage) {
      this.memory = store
      return
    }
    try {
      this.storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(store))
    } catch {
      throw new RepositoryError('unknown')
    }
  }

  // Für den Knopf «Platzhalter-Daten zurücksetzen».
  reset(): void {
    this.memory = emptyStore()
    try {
      this.storage?.removeItem(MOCK_STORAGE_KEY)
    } catch {
      // nichts zu tun
    }
  }

  private async tick(): Promise<void> {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs))
  }

  // ----- Lesen -----

  async listCustomers(): Promise<CustomerSummary[]> {
    await this.tick()
    const { customers, projects } = this.read()
    return [...customers]
      .sort((a, b) => byText(a.code, b.code))
      .map((customer) => ({
        ...customer,
        activeProjectCount: projects.filter((p) => p.customerId === customer.id && !p.archived)
          .length,
      }))
  }

  async getCustomer(id: string): Promise<CustomerWithProjects | null> {
    await this.tick()
    const { customers, projects } = this.read()
    const customer = customers.find((c) => c.id === id)
    if (!customer) return null
    return {
      customer,
      projects: projects.filter((p) => p.customerId === id).sort((a, b) => byText(a.name, b.name)),
    }
  }

  // ----- Kunden -----

  private checkCustomerUnique(store: Store, input: CustomerInput, selfId?: string): void {
    for (const other of store.customers) {
      if (other.id === selfId) continue
      if (same(other.code, input.code)) {
        throw new RepositoryError('duplicate-code', { inArchive: other.archived })
      }
      if (same(other.name, input.name)) {
        throw new RepositoryError('duplicate-name', { inArchive: other.archived })
      }
    }
  }

  async createCustomer(input: CustomerInput): Promise<Customer> {
    await this.tick()
    const store = this.read()
    this.checkCustomerUnique(store, input)
    const now = new Date().toISOString()
    const customer: Customer = {
      id: newId(),
      code: input.code,
      name: input.name,
      archived: false,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    const general: Project = {
      id: newId(),
      customerId: customer.id,
      name: 'Allgemein',
      number: null,
      archived: false,
      archivedAt: null,
      archivedWithCustomer: false,
      createdAt: now,
      updatedAt: now,
    }
    // Ein Schreibvorgang für beides: entweder beides oder nichts.
    this.write({
      customers: [...store.customers, customer],
      projects: [...store.projects, general],
    })
    return customer
  }

  private requireCustomer(store: Store, id: string): Customer {
    const customer = store.customers.find((c) => c.id === id)
    if (!customer) throw new RepositoryError('not-found')
    return customer
  }

  async updateCustomer(id: string, input: CustomerInput): Promise<Customer> {
    await this.tick()
    const store = this.read()
    const current = this.requireCustomer(store, id)
    this.checkCustomerUnique(store, input, id)
    const updated: Customer = {
      ...current,
      code: input.code,
      name: input.name,
      updatedAt: new Date().toISOString(),
    }
    this.write({
      ...store,
      customers: store.customers.map((c) => (c.id === id ? updated : c)),
    })
    return updated
  }

  async archiveCustomer(id: string): Promise<void> {
    await this.tick()
    const store = this.read()
    const customer = this.requireCustomer(store, id)
    if (customer.archived) return
    const now = new Date().toISOString()
    this.write({
      customers: store.customers.map((c) =>
        c.id === id ? { ...c, archived: true, archivedAt: now, updatedAt: now } : c
      ),
      projects: store.projects.map((p) =>
        p.customerId === id && !p.archived
          ? { ...p, archived: true, archivedAt: now, archivedWithCustomer: true, updatedAt: now }
          : p
      ),
    })
  }

  async reactivateCustomer(id: string): Promise<void> {
    await this.tick()
    const store = this.read()
    const customer = this.requireCustomer(store, id)
    if (!customer.archived) return
    const now = new Date().toISOString()
    this.write({
      customers: store.customers.map((c) =>
        c.id === id ? { ...c, archived: false, archivedAt: null, updatedAt: now } : c
      ),
      projects: store.projects.map((p) =>
        p.customerId === id && p.archivedWithCustomer
          ? { ...p, archived: false, archivedAt: null, archivedWithCustomer: false, updatedAt: now }
          : p
      ),
    })
  }

  // ----- Projekte -----

  private checkProjectUnique(store: Store, customerId: string, name: string, selfId?: string) {
    for (const other of store.projects) {
      if (other.customerId !== customerId || other.id === selfId) continue
      if (same(other.name, name)) {
        throw new RepositoryError('duplicate-project', { inArchive: other.archived })
      }
    }
  }

  private requireProject(store: Store, id: string): Project {
    const project = store.projects.find((p) => p.id === id)
    if (!project) throw new RepositoryError('not-found')
    return project
  }

  async createProject(customerId: string, input: ProjectInput): Promise<Project> {
    await this.tick()
    const store = this.read()
    const customer = this.requireCustomer(store, customerId)
    if (customer.archived) throw new RepositoryError('customer-archived')
    this.checkProjectUnique(store, customerId, input.name)
    const now = new Date().toISOString()
    const project: Project = {
      id: newId(),
      customerId,
      name: input.name,
      number: cleanNumber(input.number),
      archived: false,
      archivedAt: null,
      archivedWithCustomer: false,
      createdAt: now,
      updatedAt: now,
    }
    this.write({ ...store, projects: [...store.projects, project] })
    return project
  }

  async updateProject(id: string, input: ProjectInput): Promise<Project> {
    await this.tick()
    const store = this.read()
    const current = this.requireProject(store, id)
    this.checkProjectUnique(store, current.customerId, input.name, id)
    const updated: Project = {
      ...current,
      name: input.name,
      number: cleanNumber(input.number),
      updatedAt: new Date().toISOString(),
    }
    this.write({ ...store, projects: store.projects.map((p) => (p.id === id ? updated : p)) })
    return updated
  }

  async archiveProject(id: string): Promise<void> {
    await this.tick()
    const store = this.read()
    const project = this.requireProject(store, id)
    if (project.archived) return
    const now = new Date().toISOString()
    this.write({
      ...store,
      projects: store.projects.map((p) =>
        p.id === id
          ? { ...p, archived: true, archivedAt: now, archivedWithCustomer: false, updatedAt: now }
          : p
      ),
    })
  }

  async reactivateProject(id: string): Promise<void> {
    await this.tick()
    const store = this.read()
    const project = this.requireProject(store, id)
    if (!project.archived) return
    const customer = this.requireCustomer(store, project.customerId)
    if (customer.archived) throw new RepositoryError('customer-archived')
    const now = new Date().toISOString()
    this.write({
      ...store,
      projects: store.projects.map((p) =>
        p.id === id
          ? { ...p, archived: false, archivedAt: null, archivedWithCustomer: false, updatedAt: now }
          : p
      ),
    })
  }
}
