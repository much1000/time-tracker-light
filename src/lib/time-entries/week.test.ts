import { describe, expect, it } from 'vitest'
import {
  addDays,
  currentWeek,
  formatDayShort,
  formatWeekLabel,
  isCurrentWeek,
  parseWeek,
  resolveWeek,
  shiftWeek,
  weekDays,
  weekOfDate,
  weekRange,
  weekStart,
} from './week'

// Montag, 16. November 2026, 12:00 Uhr in Zürich
const NOW = new Date('2026-11-16T11:00:00Z')

describe('weekOfDate', () => {
  it('ordnet Tage der ISO-Kalenderwoche zu', () => {
    expect(weekOfDate('2026-11-09')).toBe('2026-W46')
    expect(weekOfDate('2026-11-15')).toBe('2026-W46')
    expect(weekOfDate('2026-11-16')).toBe('2026-W47')
  })

  it('Jahreswechsel: Dezember kann zu KW 1 des Folgejahres gehören, Januar zur letzten Woche des Vorjahres', () => {
    expect(weekOfDate('2025-12-29')).toBe('2026-W01')
    expect(weekOfDate('2026-01-01')).toBe('2026-W01')
    expect(weekOfDate('2027-01-03')).toBe('2026-W53')
    expect(weekOfDate('2027-01-04')).toBe('2027-W01')
    expect(weekOfDate('2021-01-03')).toBe('2020-W53')
    expect(weekOfDate('2024-12-30')).toBe('2025-W01')
  })

  it('Schaltjahr: 29. Februar', () => {
    expect(weekOfDate('2024-02-29')).toBe('2024-W09')
  })
})

describe('parseWeek', () => {
  it('akzeptiert gültige Wochen, auch die 53. in langen Jahren', () => {
    expect(parseWeek('2026-W46')).toEqual({ year: 2026, week: 46 })
    expect(parseWeek('2026-W53')).toEqual({ year: 2026, week: 53 })
    expect(parseWeek('2025-W52')).toEqual({ year: 2025, week: 52 })
  })

  it('lehnt ungültige Werte ab', () => {
    expect(parseWeek('2025-W53')).toBeNull() // 2025 hat nur 52 Wochen
    expect(parseWeek('2026-W00')).toBeNull()
    expect(parseWeek('2026-W54')).toBeNull()
    expect(parseWeek('2026-W5')).toBeNull()
    expect(parseWeek('2026-46')).toBeNull()
    expect(parseWeek('1999-W10')).toBeNull()
    expect(parseWeek('2101-W10')).toBeNull()
    expect(parseWeek('2026-w46')).toBeNull()
    expect(parseWeek('')).toBeNull()
    expect(parseWeek(null)).toBeNull()
    expect(parseWeek(undefined)).toBeNull()
  })
})

describe('aktuelle Woche und resolveWeek', () => {
  it('«aktuell» richtet sich nach der Zürcher Uhr', () => {
    expect(currentWeek(NOW)).toBe('2026-W47')
    expect(isCurrentWeek('2026-W47', NOW)).toBe(true)
    expect(isCurrentWeek('2026-W46', NOW)).toBe(false)
    // Im November gilt UTC+1: Sonntag 22:59 UTC ist in Zürich noch Sonntag 23:59 (Woche 46),
    // ab 23:00 UTC ist es Montag 00:00 (Woche 47)
    expect(currentWeek(new Date('2026-11-15T22:59:00Z'))).toBe('2026-W46')
    expect(currentWeek(new Date('2026-11-15T23:00:00Z'))).toBe('2026-W47')
    expect(currentWeek(new Date('2026-11-15T22:30:00-08:00'))).toBe('2026-W47')
  })

  it('übernimmt gültige vergangene Wochen, sonst die aktuelle', () => {
    expect(resolveWeek('2026-W46', NOW)).toBe('2026-W46')
    expect(resolveWeek('2026-W47', NOW)).toBe('2026-W47')
    expect(resolveWeek('2026-W48', NOW)).toBe('2026-W47')
    expect(resolveWeek('2027-W01', NOW)).toBe('2026-W47')
    expect(resolveWeek('Quatsch', NOW)).toBe('2026-W47')
    expect(resolveWeek(null, NOW)).toBe('2026-W47')
    expect(resolveWeek('2025-W53', NOW)).toBe('2026-W47')
  })
})

describe('Bereich und Tage einer Woche', () => {
  it('Montag bis Sonntag, Ende ausschliesslich', () => {
    expect(weekStart('2026-W46')).toBe('2026-11-09')
    expect(weekRange('2026-W46')).toEqual({ from: '2026-11-09', to: '2026-11-16' })
    expect(weekDays('2026-W46')).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ])
  })

  it('über Monats- und Jahresgrenzen', () => {
    expect(weekRange('2026-W01')).toEqual({ from: '2025-12-29', to: '2026-01-05' })
    expect(weekDays('2026-W01')[6]).toBe('2026-01-04')
    expect(weekRange('2026-W53')).toEqual({ from: '2026-12-28', to: '2027-01-04' })
  })

  it('Sommer-/Winterzeit verschiebt nichts (Zeitumstellung 25. Oktober 2026)', () => {
    expect(weekDays('2026-W43')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
    expect(weekRange('2026-W44')).toEqual({ from: '2026-10-26', to: '2026-11-02' })
  })

  it('wirft bei einer ungültigen Woche', () => {
    expect(() => weekRange('Quatsch')).toThrow()
  })
})

describe('shiftWeek', () => {
  it('blättert vor und zurück, auch über das Jahr', () => {
    expect(shiftWeek('2026-W46', 1)).toBe('2026-W47')
    expect(shiftWeek('2026-W46', -1)).toBe('2026-W45')
    expect(shiftWeek('2026-W01', -1)).toBe('2025-W52')
    expect(shiftWeek('2025-W52', 1)).toBe('2026-W01')
    expect(shiftWeek('2026-W53', 1)).toBe('2027-W01')
    expect(shiftWeek('2027-W01', -1)).toBe('2026-W53')
  })

  it('lässt eine ungültige Woche unverändert', () => {
    expect(shiftWeek('Quatsch', 1)).toBe('Quatsch')
  })
})

describe('Beschriftungen', () => {
  it('Woche innerhalb eines Monats', () => {
    expect(formatWeekLabel('2026-W46')).toBe('KW 46 · 9.–15. Nov. 2026')
  })

  it('Woche über eine Monatsgrenze', () => {
    expect(formatWeekLabel('2026-W40')).toBe('KW 40 · 28. Sept. – 4. Okt. 2026')
  })

  it('Woche über eine Jahresgrenze', () => {
    expect(formatWeekLabel('2026-W01')).toBe('KW 1 · 29. Dez. 2025 – 4. Jan. 2026')
  })

  it('Tage kurz', () => {
    expect(formatDayShort('2026-11-09')).toBe('Mo 9.')
    expect(formatDayShort('2026-11-15')).toBe('So 15.')
    expect(formatDayShort('2026-11-10')).toBe('Di 10.')
  })

  it('addDays rechnet über Monats- und Jahresgrenzen', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
  })
})
