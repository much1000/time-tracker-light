import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryCustomersRepository } from '@/lib/customers/in-memory-repository'
import { formatDuration, formatTime, parseDuration, parseTime } from './duration'
import { describeTimeEntryError, TimeEntryError } from './errors'
import { InMemoryTimeEntriesRepository } from './in-memory-repository'
import {
  findOverlaps,
  sumEntries,
  validateTimeEntry,
  workedMinutes,
  type TimeEntryFormValues,
} from './validation'
import { formatDate, formatLongDate, isValidDate, minutesNowInZurich, todayInZurich } from './zurich'

describe('parseDuration', () => {
  it.each([
    ['1:30', 90],
    ['0:45', 45],
    ['01:05', 65],
    ['24:00', 1440],
    ['1,5', 90],
    ['1.5', 90],
    ['0,25', 15],
    ['0.5', 30],
    ['2', 120],
    ['0', 0],
    ['0:00', 0],
    [' 1:30 ', 90],
  ])('liest «%s» als %i Minuten', (input, minutes) => {
    expect(parseDuration(input)).toEqual({ ok: true, minutes })
  })

  it('rundet Dezimalzahlen auf die Minute', () => {
    expect(parseDuration('0,333')).toEqual({ ok: true, minutes: 20 })
    expect(parseDuration('1,999')).toEqual({ ok: true, minutes: 120 })
  })

  it.each(['90', '100', 'abc', '1:60', '1:5', '-1', '1,5,5', ':30', '1h', '25:00', '24,5', '1:30:00'])(
    'lehnt «%s» ab',
    (input) => {
      expect(parseDuration(input).ok).toBe(false)
    }
  )

  it('lehnt «90» mit dem Hinweis auf Std:Min ab', () => {
    const result = parseDuration('90')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('Std:Min')
  })

  it('verlangt eine Eingabe', () => {
    const result = parseDuration('  ')
    expect(result.ok).toBe(false)
  })
})

describe('Formate', () => {
  it('zeigt Dauern als Std:Min', () => {
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(1440)).toBe('24:00')
    expect(formatDuration(0)).toBe('0:00')
  })

  it('liest und zeigt Uhrzeiten', () => {
    expect(parseTime('8:30')).toBe(510)
    expect(parseTime('08:30')).toBe(510)
    expect(parseTime('23:59')).toBe(1439)
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('12:60')).toBeNull()
    expect(parseTime('abc')).toBeNull()
    expect(formatTime(510)).toBe('08:30')
  })
})

describe('Zürcher Uhr', () => {
  it('bestimmt «heute» nach Zürcher Zeit, nicht nach UTC', () => {
    // 23:30 UTC am 12.11. ist 00:30 am 13.11. in Zürich (Winterzeit, UTC+1)
    const late = new Date('2026-11-12T23:30:00Z')
    expect(todayInZurich(late)).toBe('2026-11-13')
    expect(minutesNowInZurich(late)).toBe(30)
    // 22:30 UTC ist noch 23:30 am selben Tag
    const earlier = new Date('2026-11-12T22:30:00Z')
    expect(todayInZurich(earlier)).toBe('2026-11-12')
    expect(minutesNowInZurich(earlier)).toBe(23 * 60 + 30)
  })

  it('berücksichtigt die Sommerzeit', () => {
    // Juli: UTC+2
    const summer = new Date('2026-07-15T22:30:00Z')
    expect(todayInZurich(summer)).toBe('2026-07-16')
    expect(minutesNowInZurich(summer)).toBe(30)
  })

  it('prüft und formatiert Datumswerte', () => {
    expect(isValidDate('2026-02-28')).toBe(true)
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('13.11.2026')).toBe(false)
    expect(isValidDate('')).toBe(false)
    expect(formatDate('2026-11-05')).toBe('05.11.2026')
    expect(formatLongDate('2026-11-13')).toContain('2026')
  })
})

describe('validateTimeEntry', () => {
  const NOW = new Date('2026-11-13T10:00:00Z') // 11:00 in Zürich
  const base: TimeEntryFormValues = {
    customerId: 'c1',
    projectId: 'p1',
    date: '2026-11-13',
    mode: 'duration',
    duration: '1:30',
    start: '',
    end: '',
    billable: '1:30',
    description: '',
  }

  function check(overrides: Partial<TimeEntryFormValues>) {
    return validateTimeEntry({ ...base, ...overrides }, NOW)
  }

  it('übersetzt gültige Eingaben in einen Eintrag ohne Uhrzeiten', () => {
    expect(check({})).toEqual({
      ok: true,
      input: {
        projectId: 'p1',
        date: '2026-11-13',
        durationMinutes: 90,
        billableMinutes: 90,
        startTime: null,
        endTime: null,
        description: null,
      },
    })
  })

  it('berechnet die Dauer aus von–bis und speichert die Uhrzeiten', () => {
    const result = check({ mode: 'range', start: '8:30', end: '10:00', duration: '', billable: '1:00', description: '  Konzept  ' })
    expect(result).toMatchObject({
      ok: true,
      input: { durationMinutes: 90, billableMinutes: 60, startTime: '08:30', endTime: '10:00', description: 'Konzept' },
    })
  })

  it('verlangt Kunde, Projekt, Datum und Dauer', () => {
    const result = check({ customerId: '', projectId: '', date: '', duration: '' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['customerId', 'date', 'duration', 'projectId'])
  })

  it('lehnt ein Datum in der Zukunft ab, erlaubt aber frühere Tage', () => {
    expect(check({ date: '2026-11-14' }).ok).toBe(false)
    expect(check({ date: '2020-01-01' }).ok).toBe(true)
    expect(check({ date: '2026-02-30' }).ok).toBe(false)
  })

  it('beurteilt «heute» nach der Zürcher Uhr', () => {
    // 23:30 UTC am 12.11. = 13.11. 00:30 in Zürich: der 13.11. ist erlaubt, der 14. nicht
    const lateUtc = new Date('2026-11-12T23:30:00Z')
    expect(validateTimeEntry({ ...base, date: '2026-11-13' }, lateUtc).ok).toBe(true)
    expect(validateTimeEntry({ ...base, date: '2026-11-14' }, lateUtc).ok).toBe(false)
  })

  it('verlangt eine Dauer von mindestens einer Minute bis höchstens 24 Stunden', () => {
    expect(check({ duration: '0:00', billable: '0' }).ok).toBe(false)
    expect(check({ duration: '0:01', billable: '0' }).ok).toBe(true)
    expect(check({ duration: '24:00', billable: '24:00' }).ok).toBe(true)
    expect(check({ duration: '24:01' }).ok).toBe(false)
    expect(check({ duration: '90' }).ok).toBe(false)
  })

  it('lässt verrechenbar 0 zu, aber nicht mehr als gearbeitet', () => {
    expect(check({ billable: '0' }).ok).toBe(true)
    expect(check({ billable: '0:00' }).ok).toBe(true)
    const tooMuch = check({ billable: '1:31' })
    expect(tooMuch.ok).toBe(false)
    if (!tooMuch.ok) expect(tooMuch.errors.billable).toContain('nicht grösser')
    expect(check({ billable: 'abc' }).ok).toBe(false)
    expect(check({ billable: '' }).ok).toBe(false)
  })

  it('verlangt bei von–bis beide Uhrzeiten und ein Ende nach dem Start', () => {
    const range = { mode: 'range' as const, duration: '' }
    expect(check({ ...range, start: '', end: '' }).ok).toBe(false)
    expect(check({ ...range, start: '09:00', end: '' }).ok).toBe(false)
    expect(check({ ...range, start: 'abc', end: '10:00' }).ok).toBe(false)
    const same = check({ ...range, start: '09:00', end: '09:00' })
    expect(same.ok).toBe(false)
    if (!same.ok) expect(same.errors.end).toContain('Mitternacht')
    expect(check({ ...range, start: '10:00', end: '09:00' }).ok).toBe(false)
  })

  it('lehnt eine Endzeit in der Zukunft ab, nur am heutigen Tag', () => {
    // jetzt 11:00 in Zürich
    const future = check({ mode: 'range', start: '10:00', end: '11:30', duration: '', billable: '1:00' })
    expect(future.ok).toBe(false)
    if (!future.ok) expect(future.errors.end).toContain('Zukunft')
    expect(check({ mode: 'range', start: '10:00', end: '11:00', duration: '', billable: '1:00' }).ok).toBe(true)
    expect(check({ date: '2026-11-12', mode: 'range', start: '10:00', end: '23:00', duration: '', billable: '1:00' }).ok).toBe(true)
  })

  it('begrenzt die Beschreibung auf 1000 Zeichen und macht leere zu «keine»', () => {
    expect(check({ description: 'x'.repeat(1000) }).ok).toBe(true)
    expect(check({ description: 'x'.repeat(1001) }).ok).toBe(false)
    expect(check({ description: 'x'.repeat(1000) + '   ' }).ok).toBe(true)
    const empty = check({ description: '   ' })
    expect(empty).toMatchObject({ ok: true, input: { description: null } })
  })

  it('lässt HTML und SQL-Zeichen unverändert als Text durch', () => {
    const evil = `<img src=x onerror=alert(1)> '; drop table time_entries;--`
    expect(check({ description: evil })).toMatchObject({ ok: true, input: { description: evil } })
  })
})

describe('workedMinutes, findOverlaps, sumEntries', () => {
  it('leitet die gearbeitete Dauer aus beiden Modi ab', () => {
    expect(workedMinutes({ mode: 'duration', duration: '1,5', start: '', end: '' })).toBe(90)
    expect(workedMinutes({ mode: 'duration', duration: 'abc', start: '', end: '' })).toBeNull()
    expect(workedMinutes({ mode: 'duration', duration: '0:00', start: '', end: '' })).toBeNull()
    expect(workedMinutes({ mode: 'range', duration: '', start: '08:00', end: '09:15' })).toBe(75)
    expect(workedMinutes({ mode: 'range', duration: '', start: '09:00', end: '08:00' })).toBeNull()
  })

  const entry = (id: string, start: string | null, end: string | null) => ({
    id,
    projectId: 'p',
    customerId: 'c',
    customerCode: 'MUS',
    customerName: 'Muster',
    projectName: 'Allgemein',
    date: '2026-11-13',
    durationMinutes: 60,
    billableMinutes: 30,
    startTime: start,
    endTime: end,
    description: null,
    createdAt: '2026-11-13T08:00:00Z',
  })

  it('findet Überschneidungen nur bei Einträgen mit Uhrzeiten', () => {
    const entries = [entry('a', '08:00', '09:00'), entry('b', null, null), entry('c', '10:00', '11:00')]
    expect(findOverlaps(entries, 8 * 60 + 30, 9 * 60 + 30).map((e) => e.id)).toEqual(['a'])
    // Berühren ist keine Überschneidung
    expect(findOverlaps(entries, 9 * 60, 10 * 60)).toEqual([])
    expect(findOverlaps(entries, 7 * 60, 12 * 60).map((e) => e.id)).toEqual(['a', 'c'])
  })

  // QA-1 (PROJ-6): Der Stopp über Mitternacht erzeugt Einträge mit Ende «24:00». parseTime kennt 24:00
  // nicht, darum wird ein solcher Eintrag beim Überschneidungs-Hinweis (PROJ-4) übersehen.
  // Sobald behoben, `it.fails` zu `it` ändern.
  it.fails('findet Überschneidungen auch mit Einträgen, die um 24:00 enden (BUG QA-1)', () => {
    const entries = [entry('a', '22:00', '24:00')]
    expect(findOverlaps(entries, 23 * 60, 23 * 60 + 30).map((e) => e.id)).toEqual(['a'])
  })

  it('summiert gearbeitet und verrechenbar', () => {
    expect(sumEntries([entry('a', null, null), entry('b', null, null)])).toEqual({ worked: 120, billable: 60 })
    expect(sumEntries([])).toEqual({ worked: 0, billable: 0 })
  })
})

describe('describeTimeEntryError', () => {
  it('übersetzt Fehlerarten in verständliche Meldungen', () => {
    expect(describeTimeEntryError(new TimeEntryError('target-archived'))).toContain('archiviert')
    expect(describeTimeEntryError(new TimeEntryError('session'))).toContain('Anmeldung')
    expect(describeTimeEntryError(new TimeEntryError('unreachable'))).toContain('nicht erreichbar')
    expect(describeTimeEntryError(new Error('boom'))).toContain('nicht geklappt')
  })
})

describe('InMemoryTimeEntriesRepository', () => {
  let customers: InMemoryCustomersRepository
  let repo: InMemoryTimeEntriesRepository
  let projectId: string
  let customerId: string

  beforeEach(async () => {
    customers = new InMemoryCustomersRepository(0)
    repo = new InMemoryTimeEntriesRepository(customers, 0)
    const customer = await customers.createCustomer({ code: 'MUS', name: 'Muster AG' })
    customerId = customer.id
    const detail = await customers.getCustomer(customer.id)
    projectId = detail!.projects[0].id
  })

  const input = (overrides = {}) => ({
    projectId,
    date: todayInZurich(),
    durationMinutes: 90,
    billableMinutes: 60,
    startTime: null,
    endTime: null,
    description: null,
    ...overrides,
  })

  async function kind(promise: Promise<unknown>) {
    try {
      await promise
    } catch (error) {
      return error instanceof TimeEntryError ? error.kind : 'other'
    }
    return undefined
  }

  it('legt Einträge mit Kunden- und Projektnamen an und listet sie pro Tag', async () => {
    const entry = await repo.createEntry(input({ description: 'Konzept' }))
    expect(entry).toMatchObject({ customerCode: 'MUS', projectName: 'Allgemein', durationMinutes: 90 })
    expect(await repo.listEntries(todayInZurich())).toHaveLength(1)
    expect(await repo.listEntries('2020-01-01')).toHaveLength(0)
  })

  it('sortiert nach Startzeit, Einträge ohne Uhrzeit danach nach Anlegezeit', async () => {
    await repo.createEntry(input({ description: 'ohne' }))
    await repo.createEntry(input({ startTime: '10:00', endTime: '11:00', description: 'spät' }))
    await repo.createEntry(input({ startTime: '08:00', endTime: '09:00', description: 'früh' }))
    const list = await repo.listEntries(todayInZurich())
    expect(list.map((e) => e.description)).toEqual(['früh', 'spät', 'ohne'])
  })

  it('bietet nur aktive Kunden und Projekte an, «Allgemein» zuerst', async () => {
    const detail = await customers.getCustomer(customerId)
    await customers.createProject(customerId, { name: 'Abc' })
    const targets = await repo.listTargets()
    expect(targets).toHaveLength(1)
    expect(targets[0].projects.map((p) => p.name)).toEqual(['Allgemein', 'Abc'])
    await customers.archiveProject(detail!.projects[0].id)
    expect((await repo.listTargets())[0].projects.map((p) => p.name)).toEqual(['Abc'])
    await customers.archiveCustomer(customerId)
    expect(await repo.listTargets()).toEqual([])
  })

  it('merkt sich das zuletzt benutzte Ziel', async () => {
    expect(await repo.getLastTarget()).toBeNull()
    await repo.createEntry(input())
    expect(await repo.getLastTarget()).toEqual({ customerId, projectId })
  })

  it('lehnt archivierte und unbekannte Ziele sowie Daten in der Zukunft ab', async () => {
    expect(await kind(repo.createEntry(input({ projectId: 'gibt-es-nicht' })))).toBe('target-not-found')
    expect(await kind(repo.createEntry(input({ date: '2999-01-01' })))).toBe('unknown')
    await customers.archiveCustomer(customerId)
    expect(await kind(repo.createEntry(input()))).toBe('target-archived')
  })
})
