import { formatDuration } from './duration'
import type { BookableCustomer, TimeEntry } from './types'
import type { TimeEntryFormValues } from './validation'

// Bearbeiten-Modus des Formulars (PROJ-5): Werte eines Eintrags und Auswahl der Ziele. Reine Funktionen.

// Alle Felder des Formulars mit den aktuellen Werten des Eintrags vorbelegen.
// «Von–bis» ist gewählt, wenn der Eintrag Uhrzeiten hat; ein Ende «24:00» wird über den Schalter «Bis Mitternacht» abgebildet.
export function entryToFormValues(entry: TimeEntry): TimeEntryFormValues {
  const hasTimes = entry.startTime !== null && entry.endTime !== null
  const midnight = hasTimes && entry.endTime === '24:00'
  return {
    customerId: entry.customerId,
    projectId: entry.projectId,
    date: entry.date,
    mode: hasTimes ? 'range' : 'duration',
    duration: formatDuration(entry.durationMinutes),
    start: entry.startTime ?? '',
    end: hasTimes && !midnight ? (entry.endTime ?? '') : '',
    endMidnight: midnight,
    billable: formatDuration(entry.billableMinutes),
    description: entry.description ?? '',
  }
}

// Die Auswahl enthält nur aktive Kunden und Projekte. Das aktuelle Ziel des Eintrags muss trotzdem wählbar
// bleiben, auch wenn es inzwischen archiviert ist (mit Kennzeichnung): Der Eintrag lässt sich so ohne Verschieben speichern.
export function targetsWithCurrent(targets: BookableCustomer[], entry: TimeEntry): BookableCustomer[] {
  const customer = targets.find((candidate) => candidate.id === entry.customerId)
  if (!customer) {
    // Kunde archiviert: nur sein aktuelles Projekt als Wert, die übrigen Kunden bleiben frei wählbar
    const archivedCustomer: BookableCustomer = {
      id: entry.customerId,
      code: entry.customerCode,
      name: entry.customerName,
      archived: true,
      projects: [{ id: entry.projectId, name: entry.projectName, archived: true }],
    }
    return [...targets, archivedCustomer].sort((a, b) => a.code.localeCompare(b.code))
  }
  if (customer.projects.some((project) => project.id === entry.projectId)) return targets
  return targets.map((candidate) =>
    candidate.id === customer.id
      ? {
          ...candidate,
          projects: [...candidate.projects, { id: entry.projectId, name: entry.projectName, archived: true }],
        }
      : candidate
  )
}
