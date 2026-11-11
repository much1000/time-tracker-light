import type {
  Customer,
  CustomerInput,
  CustomerSummary,
  CustomerWithProjects,
  Project,
  ProjectInput,
} from './types'

// Schnittstelle zur Datenhaltung für Kunden und Projekte.
// Die Oberfläche kennt nur diese Schnittstelle. Heute steht dahinter ein Platzhalter im
// Browser (mock-repository.ts), `/backend` ersetzt ihn durch Supabase mit denselben Regeln.
// Alle Methoden werfen bei Fehlern einen RepositoryError (siehe errors.ts).
export interface CustomersRepository {
  // Alle Kunden des Nutzers (aktiv und archiviert) mit Zahl der aktiven Projekte, nach Kürzel sortiert.
  listCustomers(): Promise<CustomerSummary[]>
  // Ein Kunde mit all seinen Projekten (aktiv und archiviert), nach Name sortiert.
  // Gibt null zurück, wenn es ihn nicht gibt oder er nicht dem Nutzer gehört.
  getCustomer(id: string): Promise<CustomerWithProjects | null>

  // Legt den Kunden und sein Projekt «Allgemein» in einem Schritt an (beides oder nichts).
  createCustomer(input: CustomerInput): Promise<Customer>
  updateCustomer(id: string, input: CustomerInput): Promise<Customer>
  // Archiviert den Kunden und alle noch aktiven Projekte (diese merken sich das).
  archiveCustomer(id: string): Promise<void>
  // Aktiviert den Kunden und nur die Projekte, die mit ihm archiviert wurden.
  reactivateCustomer(id: string): Promise<void>

  createProject(customerId: string, input: ProjectInput): Promise<Project>
  updateProject(id: string, input: ProjectInput): Promise<Project>
  archiveProject(id: string): Promise<void>
  // Nicht möglich, solange der Kunde archiviert ist.
  reactivateProject(id: string): Promise<void>
}
