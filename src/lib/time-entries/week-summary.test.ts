import { describe, expect, it } from 'vitest'
import type { TimeEntry } from './types'
import { buildWeekSummary, findCell, rowsOfDay } from './week-summary'

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

describe('buildWeekSummary', () => {
  it('leere Woche: sieben Tage, keine Zeilen, Summen 0', () => {
    const summary = buildWeekSummary('2026-W46', [])
    expect(summary.days).toHaveLength(7)
    expect(summary.days[0]).toBe('2026-11-09')
    expect(summary.days[6]).toBe('2026-11-15')
    expect(summary.rows).toEqual([])
    expect(summary.dayTotals).toHaveLength(7)
    expect(summary.dayTotals.every((day) => day.worked === 0 && day.billable === 0)).toBe(true)
    expect(summary.total).toEqual({ worked: 0, billable: 0 })
  })

  it('mehrere Einträge desselben Projekts am selben Tag landen in einer Zelle und werden summiert', () => {
    const a = entry({ durationMinutes: 30, billableMinutes: 15, startTime: '10:00', endTime: '10:30' })
    const b = entry({ durationMinutes: 45, billableMinutes: 45, startTime: '08:00', endTime: '08:45' })
    const summary = buildWeekSummary('2026-W46', [a, b])
    expect(summary.rows).toHaveLength(1)
    const cell = summary.rows[0].cells[0]
    expect(cell.worked).toBe(75)
    expect(cell.billable).toBe(60)
    // Reihenfolge innerhalb der Zelle: nach Startzeit
    expect(cell.entries.map((e) => e.id)).toEqual([b.id, a.id])
  })

  it('Einträge ohne Uhrzeit stehen nach denen mit Uhrzeit, untereinander nach Anlegezeit', () => {
    const noTimeLate = entry({ createdAt: '2026-11-09T12:00:00Z' })
    const noTimeEarly = entry({ createdAt: '2026-11-09T07:00:00Z' })
    const timed = entry({ startTime: '23:00', endTime: '24:00' })
    const summary = buildWeekSummary('2026-W46', [noTimeLate, timed, noTimeEarly])
    expect(summary.rows[0].cells[0].entries.map((e) => e.id)).toEqual([timed.id, noTimeEarly.id, noTimeLate.id])
  })

  it('Zeilen je Projekt, sortiert nach Kürzel, dann Projektname; Zeilensummen und Spaltensummen stimmen', () => {
    const entries = [
      entry({ projectId: 'p3', customerId: 'c2', customerCode: 'ZED', customerName: 'Zed', projectName: 'Alpha', date: '2026-11-10', durationMinutes: 20, billableMinutes: 0 }),
      entry({ projectId: 'p2', customerId: 'c1', projectName: 'Beta', date: '2026-11-09', durationMinutes: 90, billableMinutes: 60 }),
      entry({ projectId: 'p1', customerId: 'c1', projectName: 'Allgemein', date: '2026-11-09', durationMinutes: 30, billableMinutes: 30 }),
      entry({ projectId: 'p1', customerId: 'c1', projectName: 'Allgemein', date: '2026-11-15', durationMinutes: 15, billableMinutes: 15 }),
    ]
    const summary = buildWeekSummary('2026-W46', entries)
    expect(summary.rows.map((row) => `${row.customerCode}·${row.projectName}`)).toEqual(['MUS·Allgemein', 'MUS·Beta', 'ZED·Alpha'])
    expect(summary.rows[0]).toMatchObject({ worked: 45, billable: 45 })
    expect(summary.rows[1]).toMatchObject({ worked: 90, billable: 60 })
    expect(summary.rows[2]).toMatchObject({ worked: 20, billable: 0 })
    // Tagessummen: Montag 30+90, Dienstag 20, Sonntag 15
    expect(summary.dayTotals.map((day) => day.worked)).toEqual([120, 20, 0, 0, 0, 0, 15])
    expect(summary.dayTotals.map((day) => day.billable)).toEqual([90, 0, 0, 0, 0, 0, 15])
    expect(summary.total).toEqual({ worked: 155, billable: 105 })
    // Die Summen stimmen minutengenau mit der Summe der Einträge überein
    expect(summary.total.worked).toBe(entries.reduce((sum, e) => sum + e.durationMinutes, 0))
    expect(summary.total.billable).toBe(entries.reduce((sum, e) => sum + e.billableMinutes, 0))
    expect(summary.rows.reduce((sum, row) => sum + row.worked, 0)).toBe(summary.total.worked)
  })

  it('leere Zellen haben keine Einträge und Summe 0', () => {
    const summary = buildWeekSummary('2026-W46', [entry({ date: '2026-11-11' })])
    const cells = summary.rows[0].cells
    expect(cells).toHaveLength(7)
    expect(cells.map((cell) => cell.entries.length)).toEqual([0, 0, 1, 0, 0, 0, 0])
    expect(cells[0]).toMatchObject({ date: '2026-11-09', worked: 0, billable: 0 })
  })

  it('Eintrag bis 24:00 zählt vollständig zum Tag, an dem er beginnt', () => {
    const late = entry({ date: '2026-11-15', startTime: '22:00', endTime: '24:00', durationMinutes: 120, billableMinutes: 120 })
    const summary = buildWeekSummary('2026-W46', [late])
    expect(summary.dayTotals[6]).toEqual({ worked: 120, billable: 120 })
    expect(summary.dayTotals[0]).toEqual({ worked: 0, billable: 0 })
  })

  it('übernimmt Archiv-Hinweise; ohne Angabe gilt «nicht archiviert»', () => {
    const archived = entry({ projectId: 'p9', customerCode: 'ARC', customerArchived: true, projectArchived: false })
    const plain = entry({ projectId: 'p8', customerCode: 'ZZZ' })
    const summary = buildWeekSummary('2026-W46', [archived, plain])
    expect(summary.rows[0]).toMatchObject({ customerCode: 'ARC', customerArchived: true, projectArchived: false })
    expect(summary.rows[1]).toMatchObject({ customerCode: 'ZZZ', customerArchived: false, projectArchived: false })
  })

  it('ignoriert Einträge ausserhalb der Woche', () => {
    const summary = buildWeekSummary('2026-W46', [
      entry({ date: '2026-11-08' }),
      entry({ date: '2026-11-16' }),
      entry({ date: '2026-11-12', durationMinutes: 10, billableMinutes: 10 }),
    ])
    expect(summary.total).toEqual({ worked: 10, billable: 10 })
    expect(summary.rows).toHaveLength(1)
  })

  it('Woche über den Jahreswechsel: Einträge landen in den richtigen Spalten', () => {
    const summary = buildWeekSummary('2026-W01', [
      entry({ date: '2025-12-29', durationMinutes: 10, billableMinutes: 10 }),
      entry({ date: '2026-01-01', durationMinutes: 20, billableMinutes: 20 }),
      entry({ date: '2026-01-04', durationMinutes: 30, billableMinutes: 30 }),
    ])
    expect(summary.dayTotals.map((day) => day.worked)).toEqual([10, 0, 0, 20, 0, 0, 30])
  })
})

describe('rowsOfDay und findCell', () => {
  const entries = [
    entry({ projectId: 'p1', date: '2026-11-09' }),
    entry({ projectId: 'p2', customerCode: 'ZED', projectName: 'Beta', date: '2026-11-09' }),
    entry({ projectId: 'p1', date: '2026-11-11' }),
  ]
  const summary = buildWeekSummary('2026-W46', entries)

  it('rowsOfDay liefert nur Zeilen mit Einträgen an diesem Tag', () => {
    expect(rowsOfDay(summary, 0).map(({ row }) => row.projectId)).toEqual(['p1', 'p2'])
    expect(rowsOfDay(summary, 2).map(({ row }) => row.projectId)).toEqual(['p1'])
    expect(rowsOfDay(summary, 1)).toEqual([])
  })

  it('findCell findet Zellen mit Einträgen, sonst null', () => {
    expect(findCell(summary, 'p1', '2026-11-09')?.cell.entries).toHaveLength(1)
    expect(findCell(summary, 'p1', '2026-11-10')).toBeNull()
    expect(findCell(summary, 'unbekannt', '2026-11-09')).toBeNull()
    expect(findCell(summary, 'p1', '2026-11-30')).toBeNull()
  })
})
