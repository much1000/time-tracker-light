// Kunden und Projekte (PROJ-3). Felder und Regeln stehen im Spec «Datenmodell».

export interface Customer {
  id: string
  // Kürzel: 2 bis 10 Zeichen, Grossbuchstaben, Ziffern, Bindestrich
  code: string
  name: string
  archived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  customerId: string
  name: string
  // Freier Text, optional
  number: string | null
  archived: boolean
  archivedAt: string | null
  // Merkt, ob das Projekt erst durch das Archivieren des Kunden archiviert wurde.
  // Nur diese Projekte werden beim Reaktivieren des Kunden wieder aktiv.
  archivedWithCustomer: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomerSummary extends Customer {
  activeProjectCount: number
}

export interface CustomerWithProjects {
  customer: Customer
  projects: Project[]
}

export interface CustomerInput {
  code: string
  name: string
}

export interface ProjectInput {
  name: string
  // Leer oder fehlend bedeutet «keine Nummer»
  number?: string | null
}
