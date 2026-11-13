// Zeiteinträge (PROJ-4). Felder und Regeln stehen im Spec «Datenmodell».

export interface TimeEntry {
  id: string
  projectId: string
  customerId: string
  // Anzeige: Kürzel und Namen des Kunden und Projekts (aktueller Stand)
  customerCode: string
  customerName: string
  projectName: string
  // «2026-11-13»
  date: string
  durationMinutes: number
  billableMinutes: number
  // «08:30», beide gesetzt oder beide null
  startTime: string | null
  endTime: string | null
  description: string | null
  createdAt: string
}

export interface TimeEntryInput {
  projectId: string
  date: string
  durationMinutes: number
  billableMinutes: number
  startTime: string | null
  endTime: string | null
  description: string | null
}

// Auswahl im Formular: nur aktive Kunden und deren aktive Projekte.
export interface BookableProject {
  id: string
  name: string
}

export interface BookableCustomer {
  id: string
  code: string
  name: string
  projects: BookableProject[]
}

export interface LastTarget {
  customerId: string
  projectId: string
}
