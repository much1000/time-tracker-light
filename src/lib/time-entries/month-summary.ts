import { roundUpToBillingUnit } from './rounding'
import { monthRange, type MonthKey } from './month'
import type { TimeEntry } from './types'

// Zusammenfassung eines Monats für die Monatsauswertung (PROJ-8): aus den Einträgen des Monats werden
// Kunden, Projekte und Summen berechnet. Reine Rechnung ohne Datenzugriff, alles in ganzen Minuten.
// «worked» und «billable» sind minutengenau; «billableRounded» ist die verrechenbare Zeit eines Projekts auf
// 15 Minuten aufgerundet. Kunden- und Monatssumme addieren die gerundeten Projektwerte (kein zweites Runden).

export interface MonthSums {
  worked: number
  billable: number
  billableRounded: number
}

export interface MonthProject extends MonthSums {
  projectId: string
  projectName: string
  projectArchived: boolean
  // Einträge des Projekts im Monat: älteste zuerst, am selben Tag nach Startzeit, sonst nach Anlegezeit
  entries: TimeEntry[]
}

export interface MonthCustomer extends MonthSums {
  customerId: string
  customerCode: string
  customerName: string
  customerArchived: boolean
  // Projekte mit Einträgen, nach Projektname
  projects: MonthProject[]
}

export interface MonthSummary {
  month: MonthKey
  // Kunden mit Einträgen, nach Kürzel
  customers: MonthCustomer[]
  total: MonthSums
}

function byText(a: string, b: string): number {
  return a.localeCompare(b, 'de', { sensitivity: 'base' })
}

function byDateAndTime(a: TimeEntry, b: TimeEntry): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime) || a.createdAt.localeCompare(b.createdAt)
  if (a.startTime) return -1
  if (b.startTime) return 1
  return a.createdAt.localeCompare(b.createdAt)
}

function emptySums(): MonthSums {
  return { worked: 0, billable: 0, billableRounded: 0 }
}

// Einträge ausserhalb des Monats werden ignoriert (Schutz vor veralteten Daten).
export function buildMonthSummary(month: MonthKey, entries: TimeEntry[]): MonthSummary {
  const { from, to } = monthRange(month)
  const customersById = new Map<string, MonthCustomer>()
  const projectsById = new Map<string, MonthProject>()

  for (const entry of entries) {
    if (entry.date < from || entry.date >= to) continue
    let customer = customersById.get(entry.customerId)
    if (!customer) {
      customer = {
        customerId: entry.customerId,
        customerCode: entry.customerCode,
        customerName: entry.customerName,
        customerArchived: entry.customerArchived === true,
        projects: [],
        ...emptySums(),
      }
      customersById.set(entry.customerId, customer)
    }
    let project = projectsById.get(entry.projectId)
    if (!project) {
      project = {
        projectId: entry.projectId,
        projectName: entry.projectName,
        projectArchived: entry.projectArchived === true,
        entries: [],
        ...emptySums(),
      }
      projectsById.set(entry.projectId, project)
      customer.projects.push(project)
    }
    project.entries.push(entry)
    project.worked += entry.durationMinutes
    project.billable += entry.billableMinutes
  }

  // Erst nach dem Summieren aller Einträge runden: gerundet wird die Projektsumme, nie ein Eintrag.
  const customers = [...customersById.values()].sort(
    (a, b) => byText(a.customerCode, b.customerCode) || a.customerId.localeCompare(b.customerId)
  )
  const total = emptySums()
  for (const customer of customers) {
    customer.projects.sort((a, b) => byText(a.projectName, b.projectName) || a.projectId.localeCompare(b.projectId))
    for (const project of customer.projects) {
      project.entries.sort(byDateAndTime)
      project.billableRounded = roundUpToBillingUnit(project.billable)
      customer.worked += project.worked
      customer.billable += project.billable
      customer.billableRounded += project.billableRounded
    }
    total.worked += customer.worked
    total.billable += customer.billable
    total.billableRounded += customer.billableRounded
  }

  return { month, customers, total }
}
