import { describe, expect, it } from 'vitest'
import { CSV_BOM, CSV_HEADER, csvFileName, csvText, entriesToCsv, entryToCsvRow, formatCsvDate, formatCsvHours } from './csv'
import type { TimeEntry } from './types'

function entry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    projectId: 'p1',
    customerId: 'c1',
    customerCode: 'MUS',
    customerName: 'Muster AG',
    projectName: 'Allgemein',
    date: '2026-11-03',
    durationMinutes: 105,
    billableMinutes: 90,
    startTime: '08:30',
    endTime: '10:15',
    description: 'Konzept',
    createdAt: '2026-11-03T08:00:00Z',
    ...overrides,
  }
}

describe('formatCsvHours', () => {
  it.each([
    [0, '0,00'],
    [1, '0,02'],
    [15, '0,25'],
    [20, '0,33'],
    [40, '0,67'],
    [59, '0,98'],
    [60, '1,00'],
    [105, '1,75'],
    [450, '7,50'],
    [1440, '24,00'],
  ])('%i Minuten → «%s»', (minutes, text) => {
    expect(formatCsvHours(minutes)).toBe(text)
  })
})

describe('formatCsvDate', () => {
  it('schreibt TT.MM.JJJJ', () => {
    expect(formatCsvDate('2026-11-03')).toBe('03.11.2026')
    expect(formatCsvDate('2012-02-29')).toBe('29.02.2012')
  })
})

describe('csvText', () => {
  it('lässt einfachen Text unverändert und leere Werte leer', () => {
    expect(csvText('Konzept')).toBe('Konzept')
    expect(csvText(null)).toBe('')
    expect(csvText('')).toBe('')
  })

  it('setzt Text mit Semikolon, Anführungszeichen oder Zeilenumbruch in Anführungszeichen', () => {
    expect(csvText('a;b')).toBe('"a;b"')
    expect(csvText('sagte "hallo"')).toBe('"sagte ""hallo"""')
    expect(csvText('Zeile 1\nZeile 2')).toBe('"Zeile 1\nZeile 2"')
    expect(csvText('Zeile 1\r\nZeile 2')).toBe('"Zeile 1\r\nZeile 2"')
  })

  it.each(['=SUMME(A1)', '+1', '-1', '@cmd', '\tTab', '=HYPERLINK("x";"y")'])(
    'entschärft «%s» mit vorangestelltem Apostroph',
    (value) => {
      expect(csvText(value).replace(/^"/, '').startsWith("'")).toBe(true)
    }
  )

  it('entschärft und maskiert zugleich', () => {
    expect(csvText('=A1;B1')).toBe('"\'=A1;B1"')
  })

  it('lässt Formelzeichen in der Mitte unberührt', () => {
    expect(csvText('a=b')).toBe('a=b')
    expect(csvText('Mail an x@y.ch')).toBe('Mail an x@y.ch')
  })

  it('behält Umlaute und Sonderzeichen', () => {
    expect(csvText('Büro – Überprüfung ✓')).toBe('Büro – Überprüfung ✓')
  })
})

describe('entryToCsvRow', () => {
  it('schreibt alle elf Spalten in der festgelegten Reihenfolge', () => {
    expect(entryToCsvRow(entry())).toBe('03.11.2026;Muster AG;MUS;Allgemein;Konzept;08:30;10:15;105;1,75;90;1,50')
  })

  it('lässt Von und Bis bei Einträgen nur mit Dauer leer, auch ohne Beschreibung', () => {
    expect(entryToCsvRow(entry({ startTime: null, endTime: null, description: null }))).toBe(
      '03.11.2026;Muster AG;MUS;Allgemein;;;;105;1,75;90;1,50'
    )
  })

  it('schreibt 0 Minuten bei nicht verrechenbaren Einträgen und «24:00» unverändert', () => {
    expect(entryToCsvRow(entry({ billableMinutes: 0, startTime: '23:00', endTime: '24:00', durationMinutes: 60 }))).toBe(
      '03.11.2026;Muster AG;MUS;Allgemein;Konzept;23:00;24:00;60;1,00;0;0,00'
    )
  })

  it('entschärft auch Kunde und Projekt', () => {
    const row = entryToCsvRow(entry({ customerName: '-Test', projectName: '=X' }))
    expect(row).toContain(";'-Test;")
    expect(row).toContain(";'=X;")
  })

  it('hält eine Beschreibung mit Zeilenumbruch in einer Zelle', () => {
    expect(entryToCsvRow(entry({ description: 'a\nb;c' }))).toContain(';"a\nb;c";')
  })
})

describe('entriesToCsv', () => {
  it('beginnt mit BOM und Kopfzeile, Zeilenende Windows, am Ende ein Zeilenende', () => {
    const text = entriesToCsv([entry(), entry({ id: 'e2', description: null })])
    expect(text.startsWith(CSV_BOM + CSV_HEADER.join(';') + '\r\n')).toBe(true)
    expect(text.endsWith('\r\n')).toBe(true)
    expect(text.split('\r\n')).toHaveLength(4)
  })

  it('hat elf Spalten pro Zeile', () => {
    expect(CSV_HEADER).toHaveLength(11)
    for (const line of entriesToCsv([entry()]).replace(CSV_BOM, '').trim().split('\r\n')) {
      expect(line.split(';')).toHaveLength(11)
    }
  })

  it('ergibt ohne Einträge nur die Kopfzeile', () => {
    expect(entriesToCsv([])).toBe(CSV_BOM + CSV_HEADER.join(';') + '\r\n')
  })

  it('verändert die Reihenfolge nicht', () => {
    const text = entriesToCsv([entry({ date: '2026-11-05' }), entry({ date: '2026-11-01' })])
    expect(text.indexOf('05.11.2026')).toBeLessThan(text.indexOf('01.11.2026'))
  })
})

describe('csvFileName', () => {
  it('heisst zeiten-JJJJ-MM-TT.csv', () => {
    expect(csvFileName('2026-11-18')).toBe('zeiten-2026-11-18.csv')
  })
})
