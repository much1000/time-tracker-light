import { describe, expect, it } from 'vitest'
import { entryToFormValues, targetsWithCurrent } from './form-values'
import type { BookableCustomer, TimeEntry } from './types'
import { validateTimeEntry, workedMinutes } from './validation'

function entry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    projectId: 'p1',
    customerId: 'c1',
    customerCode: 'MUS',
    customerName: 'Muster AG',
    projectName: 'Allgemein',
    date: '2026-11-13',
    durationMinutes: 90,
    billableMinutes: 60,
    startTime: null,
    endTime: null,
    description: null,
    createdAt: '2026-11-13T10:00:00Z',
    ...overrides,
  }
}

const targets: BookableCustomer[] = [
  { id: 'c1', code: 'MUS', name: 'Muster AG', projects: [{ id: 'p1', name: 'Allgemein' }] },
  { id: 'c2', code: 'ZED', name: 'Zed GmbH', projects: [{ id: 'p9', name: 'Allgemein' }] },
]

describe('entryToFormValues', () => {
  it('belegt einen Eintrag ohne Uhrzeiten als «Nur Dauer» vor', () => {
    expect(entryToFormValues(entry({ description: 'Notiz' }))).toEqual({
      customerId: 'c1',
      projectId: 'p1',
      date: '2026-11-13',
      mode: 'duration',
      duration: '1:30',
      start: '',
      end: '',
      endMidnight: false,
      billable: '1:00',
      description: 'Notiz',
    })
  })

  it('wählt «Von–bis» bei vorhandenen Uhrzeiten', () => {
    const values = entryToFormValues(entry({ startTime: '08:30', endTime: '10:00' }))
    expect(values).toMatchObject({ mode: 'range', start: '08:30', end: '10:00', endMidnight: false })
  })

  it('bildet ein Ende 24:00 über «Bis Mitternacht» ab und speichert es unverändert zurück', () => {
    const original = entry({ startTime: '22:00', endTime: '24:00', durationMinutes: 120, billableMinutes: 120 })
    const values = entryToFormValues(original)
    expect(values).toMatchObject({ mode: 'range', start: '22:00', end: '', endMidnight: true })
    expect(workedMinutes(values)).toBe(120)
    const result = validateTimeEntry(values, new Date('2026-11-20T12:00:00Z'))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.input).toMatchObject({ startTime: '22:00', endTime: '24:00', durationMinutes: 120 })
  })
})

describe('«Bis Mitternacht» beim Erfassen', () => {
  const base = entryToFormValues(entry())
  const now = new Date('2026-11-20T12:00:00Z')

  it('nimmt 24:00 als Ende, ohne dass das Feld «Bis» gefüllt ist', () => {
    const result = validateTimeEntry(
      { ...base, mode: 'range', start: '23:00', end: '', endMidnight: true, billable: '1:00' },
      now
    )
    expect(result.ok && result.input).toMatchObject({ startTime: '23:00', endTime: '24:00', durationMinutes: 60 })
  })

  it('lehnt 24:00 für heute ab (liegt in der Zukunft)', () => {
    const result = validateTimeEntry(
      { ...base, date: '2026-11-20', mode: 'range', start: '23:00', end: '', endMidnight: true, billable: '1:00' },
      now
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.end).toMatch(/Zukunft/)
  })
})

describe('targetsWithCurrent', () => {
  it('lässt die Auswahl unverändert, wenn das Ziel aktiv ist', () => {
    expect(targetsWithCurrent(targets, entry())).toBe(targets)
  })

  it('nimmt ein archiviertes Projekt eines aktiven Kunden als gekennzeichneten Wert auf', () => {
    const result = targetsWithCurrent(targets, entry({ projectId: 'p-alt', projectName: 'Alt' }))
    expect(result[0].projects).toEqual([
      { id: 'p1', name: 'Allgemein' },
      { id: 'p-alt', name: 'Alt', archived: true },
    ])
    expect(result[1]).toBe(targets[1])
  })

  it('nimmt einen archivierten Kunden samt Projekt nach Kürzel sortiert auf', () => {
    const result = targetsWithCurrent(
      targets,
      entry({ customerId: 'c0', customerCode: 'ARC', customerName: 'Archiv AG', projectId: 'p0' })
    )
    expect(result.map((customer) => customer.code)).toEqual(['ARC', 'MUS', 'ZED'])
    expect(result[0]).toMatchObject({ archived: true, projects: [{ id: 'p0', archived: true }] })
  })
})
