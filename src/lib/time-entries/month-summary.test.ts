import { describe, expect, it } from 'vitest'
import { buildMonthSummary } from './month-summary'
import type { TimeEntry } from './types'

let counter = 0
function entry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  counter += 1
  return {
    id: `e${counter}`,
    projectId: 'p1',
    customerId: 'c1',
    customerCode: 'MUS',
    customerName: 'Muster AG',
    projectName: 'Allgemein',
    date: '2026-11-09',
    durationMinutes: 60,
    billableMinutes: 60,
    startTime: null,
    endTime: null,
    description: null,
    createdAt: `2026-11-09T08:00:${String(counter).padStart(2, '0')}Z`,
    ...overrides,
  }
}

describe('buildMonthSummary', () => {
  it('leerer Monat: keine Kunden, Summen 0', () => {
    const summary = buildMonthSummary('2026-11', [])
    expect(summary.month).toBe('2026-11')
    expect(summary.customers).toEqual([])
    expect(summary.total).toEqual({ worked: 0, billable: 0, billableRounded: 0 })
  })

  it('summiert pro Projekt minutengenau und rundet erst die Projektsumme auf 15 Minuten', () => {
    const summary = buildMonthSummary('2026-11', [
      entry({ durationMinutes: 50, billableMinutes: 40 }),
      entry({ durationMinutes: 30, billableMinutes: 30, date: '2026-11-10' }),
    ])
    const project = summary.customers[0].projects[0]
    expect(project).toMatchObject({ worked: 80, billable: 70, billableRounded: 75 })
    expect(summary.total).toEqual({ worked: 80, billable: 70, billableRounded: 75 })
  })

  it('zehn Einträge zu je 3 Minuten ergeben 0:30 und nicht 2:30 (Rundung pro Projekt, nie pro Eintrag)', () => {
    const entries = Array.from({ length: 10 }, () => entry({ durationMinutes: 3, billableMinutes: 3 }))
    const project = buildMonthSummary('2026-11', entries).customers[0].projects[0]
    expect(project.billable).toBe(30)
    expect(project.billableRounded).toBe(30)
  })

  it('eine Summe genau auf 15 Minuten wird nicht weiter aufgerundet', () => {
    const project = buildMonthSummary('2026-11', [entry({ durationMinutes: 105, billableMinutes: 105 })]).customers[0].projects[0]
    expect(project.billableRounded).toBe(105)
  })

  it('Kundensumme gerundet ist die Summe der gerundeten Projekte, nicht noch einmal gerundet', () => {
    const summary = buildMonthSummary('2026-11', [
      entry({ projectId: 'p1', projectName: 'A', durationMinutes: 5, billableMinutes: 5 }),
      entry({ projectId: 'p2', projectName: 'B', durationMinutes: 5, billableMinutes: 5 }),
    ])
    const customer = summary.customers[0]
    expect(customer.projects.map((p) => p.billableRounded)).toEqual([15, 15])
    // exakt 10 Minuten; gerundet 30 (zwei Projekte zu je 15), nicht 15
    expect(customer).toMatchObject({ worked: 10, billable: 10, billableRounded: 30 })
    expect(summary.total).toMatchObject({ billable: 10, billableRounded: 30 })
  })

  it('Projekt mit Einträgen, aber ohne verrechenbare Zeit: erscheint mit 0:00 verrechenbar und gerundet', () => {
    const summary = buildMonthSummary('2026-11', [entry({ durationMinutes: 45, billableMinutes: 0 })])
    expect(summary.customers[0].projects[0]).toMatchObject({ worked: 45, billable: 0, billableRounded: 0 })
  })

  it('Projekt mit gemischten Einträgen: verrechenbar zählt nur die verrechenbaren Minuten, gearbeitet alles', () => {
    const project = buildMonthSummary('2026-11', [
      entry({ durationMinutes: 60, billableMinutes: 0 }),
      entry({ durationMinutes: 20, billableMinutes: 20 }),
    ]).customers[0].projects[0]
    expect(project).toMatchObject({ worked: 80, billable: 20, billableRounded: 30 })
  })

  it('Kunden nach Kürzel, Projekte nach Name, mit Archiv-Hinweisen', () => {
    const summary = buildMonthSummary('2026-11', [
      entry({ customerId: 'c2', customerCode: 'ZED', customerName: 'Zed', projectId: 'p3', projectName: 'X' }),
      entry({ customerId: 'c1', projectId: 'p2', projectName: 'Zweit', projectArchived: true, customerArchived: true }),
      entry({ customerId: 'c1', projectId: 'p1', projectName: 'Allgemein', customerArchived: true }),
    ])
    expect(summary.customers.map((c) => c.customerCode)).toEqual(['MUS', 'ZED'])
    expect(summary.customers[0].projects.map((p) => p.projectName)).toEqual(['Allgemein', 'Zweit'])
    expect(summary.customers[0].customerArchived).toBe(true)
    expect(summary.customers[0].projects[1].projectArchived).toBe(true)
    expect(summary.customers[1].customerArchived).toBe(false)
  })

  it('Einträge eines Projekts: älteste zuerst, am selben Tag nach Startzeit, dann nach Anlegezeit', () => {
    const late = entry({ date: '2026-11-12', startTime: '14:00', endTime: '15:00' })
    const early = entry({ date: '2026-11-12', startTime: '08:00', endTime: '09:00' })
    const first = entry({ date: '2026-11-03' })
    const noTimeA = entry({ date: '2026-11-12' })
    const noTimeB = entry({ date: '2026-11-12' })
    const project = buildMonthSummary('2026-11', [noTimeB, late, noTimeA, first, early]).customers[0].projects[0]
    expect(project.entries.map((e) => e.id)).toEqual([first.id, early.id, late.id, noTimeA.id, noTimeB.id])
  })

  it('Einträge am ersten und letzten Tag zählen, Einträge ausserhalb des Monats werden ignoriert', () => {
    const summary = buildMonthSummary('2026-11', [
      entry({ date: '2026-10-31', durationMinutes: 600, billableMinutes: 600 }),
      entry({ date: '2026-11-01', durationMinutes: 10, billableMinutes: 10 }),
      entry({ date: '2026-11-30', durationMinutes: 1440, billableMinutes: 1440, startTime: '00:00', endTime: '24:00' }),
      entry({ date: '2026-12-01', durationMinutes: 600, billableMinutes: 600 }),
    ])
    expect(summary.total).toMatchObject({ worked: 1450, billable: 1450 })
  })

  it('Monate mit Zeitumstellung: Kalenderdaten, kein Eintrag rutscht in den Nachbarmonat', () => {
    const march = buildMonthSummary('2026-03', [
      entry({ date: '2026-03-29', durationMinutes: 60, billableMinutes: 60 }),
      entry({ date: '2026-04-01', durationMinutes: 60, billableMinutes: 60 }),
    ])
    expect(march.total.worked).toBe(60)
    const october = buildMonthSummary('2026-10', [entry({ date: '2026-10-25' }), entry({ date: '2026-11-01' })])
    expect(october.total.worked).toBe(60)
  })

  it('Summen stimmen mit den Einträgen überein, gerundet ≥ exakt und je Projekt weniger als 15 Minuten mehr', () => {
    const entries = Array.from({ length: 40 }, (_, i) =>
      entry({
        projectId: `p${i % 5}`,
        projectName: `P${i % 5}`,
        customerId: `c${i % 2}`,
        customerCode: `K${i % 2}`,
        date: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`,
        durationMinutes: 7 + i,
        billableMinutes: 3 + (i % 7),
      })
    )
    const summary = buildMonthSummary('2026-11', entries)
    expect(summary.total.worked).toBe(entries.reduce((sum, e) => sum + e.durationMinutes, 0))
    expect(summary.total.billable).toBe(entries.reduce((sum, e) => sum + e.billableMinutes, 0))
    const projects = summary.customers.flatMap((c) => c.projects)
    for (const project of projects) {
      expect(project.billableRounded).toBeGreaterThanOrEqual(project.billable)
      expect(project.billableRounded - project.billable).toBeLessThan(15)
      expect(project.entries.reduce((sum, e) => sum + e.billableMinutes, 0)).toBe(project.billable)
    }
    expect(summary.total.billableRounded).toBe(projects.reduce((sum, p) => sum + p.billableRounded, 0))
    expect(summary.customers.reduce((sum, c) => sum + c.billableRounded, 0)).toBe(summary.total.billableRounded)
  })
})
