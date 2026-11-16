import type { TimeEntry } from './types'
import { weekDays, type WeekKey } from './week'

// Zusammenfassung einer Woche für die Wochenübersicht (PROJ-7): aus den Einträgen der Woche werden
// Zeilen (Kunde · Projekt), Zellen (Projekt an einem Tag) und Summen berechnet. Reine Rechnung ohne
// Datenzugriff; alle Summen stammen aus denselben Einträgen und sind minutengenau (keine Rundung).

export interface Sums {
  worked: number
  billable: number
}

export interface WeekCell extends Sums {
  // «2026-11-09»
  date: string
  // Einträge dieser Zelle: nach Startzeit, sonst nach Anlegezeit
  entries: TimeEntry[]
}

export interface WeekRow extends Sums {
  projectId: string
  customerId: string
  customerCode: string
  customerName: string
  projectName: string
  customerArchived: boolean
  projectArchived: boolean
  // Sieben Zellen, Montag bis Sonntag (leere Zellen haben keine Einträge und Summe 0)
  cells: WeekCell[]
}

export interface WeekSummary {
  week: WeekKey
  // Die sieben Tage Montag bis Sonntag
  days: string[]
  // Eine Zeile je Kunde · Projekt mit Einträgen, nach Kürzel, dann Projektname
  rows: WeekRow[]
  // Summe je Tag, gleiche Reihenfolge wie «days»
  dayTotals: Sums[]
  // Summe der ganzen Woche
  total: Sums
}

function byText(a: string, b: string): number {
  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

function byTimeOfDay(a: TimeEntry, b: TimeEntry): number {
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime) || a.createdAt.localeCompare(b.createdAt)
  if (a.startTime) return -1
  if (b.startTime) return 1
  return a.createdAt.localeCompare(b.createdAt)
}

// Einträge ausserhalb der Woche werden ignoriert (Schutz vor veralteten Daten).
export function buildWeekSummary(week: WeekKey, entries: TimeEntry[]): WeekSummary {
  const days = weekDays(week)
  const rowsByProject = new Map<string, WeekRow>()

  for (const entry of entries) {
    const dayIndex = days.indexOf(entry.date)
    if (dayIndex === -1) continue
    let row = rowsByProject.get(entry.projectId)
    if (!row) {
      row = {
        projectId: entry.projectId,
        customerId: entry.customerId,
        customerCode: entry.customerCode,
        customerName: entry.customerName,
        projectName: entry.projectName,
        customerArchived: entry.customerArchived === true,
        projectArchived: entry.projectArchived === true,
        worked: 0,
        billable: 0,
        cells: days.map((date) => ({ date, entries: [], worked: 0, billable: 0 })),
      }
      rowsByProject.set(entry.projectId, row)
    }
    const cell = row.cells[dayIndex]
    cell.entries.push(entry)
    cell.worked += entry.durationMinutes
    cell.billable += entry.billableMinutes
    row.worked += entry.durationMinutes
    row.billable += entry.billableMinutes
  }

  const rows = [...rowsByProject.values()].sort(
    (a, b) => byText(a.customerCode, b.customerCode) || byText(a.projectName, b.projectName) || a.projectId.localeCompare(b.projectId)
  )
  for (const row of rows) for (const cell of row.cells) cell.entries.sort(byTimeOfDay)

  const dayTotals = days.map((_, index) =>
    rows.reduce<Sums>(
      (sum, row) => ({ worked: sum.worked + row.cells[index].worked, billable: sum.billable + row.cells[index].billable }),
      { worked: 0, billable: 0 }
    )
  )
  const total = dayTotals.reduce<Sums>(
    (sum, day) => ({ worked: sum.worked + day.worked, billable: sum.billable + day.billable }),
    { worked: 0, billable: 0 }
  )

  return { week, days, rows, dayTotals, total }
}

// Zeilen mit Einträgen an einem Tag (für die Tageskarten am Handy): Zeile und Zelle des Tages
export function rowsOfDay(summary: WeekSummary, dayIndex: number): { row: WeekRow; cell: WeekCell }[] {
  return summary.rows
    .map((row) => ({ row, cell: row.cells[dayIndex] }))
    .filter(({ cell }) => cell.entries.length > 0)
}

// Zelle (Projekt und Tag) in der Woche suchen; null, wenn es sie nicht mehr gibt oder sie leer ist
export function findCell(summary: WeekSummary, projectId: string, date: string): { row: WeekRow; cell: WeekCell } | null {
  const row = summary.rows.find((candidate) => candidate.projectId === projectId)
  const cell = row?.cells.find((candidate) => candidate.date === date)
  return row && cell && cell.entries.length > 0 ? { row, cell } : null
}
