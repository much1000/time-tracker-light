import { describe, expect, it } from 'vitest'
import {
  currentMonth,
  formatMonthLabel,
  isCurrentMonth,
  monthRange,
  parseMonth,
  resolveMonth,
  shiftMonth,
} from './month'

// Zürich im November: UTC+1. 23:30 UTC am 30.11. ist schon der 1.12. in Zürich.
const NOW = new Date('2026-11-14T10:00:00Z')

describe('parseMonth', () => {
  it('liest gültige Monate', () => {
    expect(parseMonth('2026-11')).toEqual({ year: 2026, month: 11 })
    expect(parseMonth('2000-01')).toEqual({ year: 2000, month: 1 })
    expect(parseMonth('2100-12')).toEqual({ year: 2100, month: 12 })
  })

  it.each(['', '2026-13', '2026-00', '2026-1', '26-11', '2026/11', 'abc', '1999-12', '2101-01', '2026-11-01'])(
    'lehnt «%s» ab',
    (value) => {
      expect(parseMonth(value)).toBeNull()
    }
  )

  it('lehnt null und undefined ab', () => {
    expect(parseMonth(null)).toBeNull()
    expect(parseMonth(undefined)).toBeNull()
  })
})

describe('currentMonth und resolveMonth', () => {
  it('bestimmt den aktuellen Monat nach Zürcher Uhr', () => {
    expect(currentMonth(NOW)).toBe('2026-11')
    expect(currentMonth(new Date('2026-11-30T23:30:00Z'))).toBe('2026-12')
    expect(currentMonth(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01')
  })

  it('übernimmt vergangene Monate und den aktuellen', () => {
    expect(resolveMonth('2026-10', NOW)).toBe('2026-10')
    expect(resolveMonth('2026-11', NOW)).toBe('2026-11')
    expect(resolveMonth('2019-05', NOW)).toBe('2019-05')
  })

  it('fällt bei ungültigen und zukünftigen Monaten auf den aktuellen zurück', () => {
    expect(resolveMonth('2026-12', NOW)).toBe('2026-11')
    expect(resolveMonth('2027-01', NOW)).toBe('2026-11')
    expect(resolveMonth('quatsch', NOW)).toBe('2026-11')
    expect(resolveMonth(null, NOW)).toBe('2026-11')
    expect(resolveMonth('2026-13', NOW)).toBe('2026-11')
  })

  it('erkennt den aktuellen Monat', () => {
    expect(isCurrentMonth('2026-11', NOW)).toBe(true)
    expect(isCurrentMonth('2026-10', NOW)).toBe(false)
  })
})

describe('shiftMonth', () => {
  it('blättert vor und zurück, auch über Jahresgrenzen', () => {
    expect(shiftMonth('2026-11', -1)).toBe('2026-10')
    expect(shiftMonth('2026-11', 1)).toBe('2026-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
    expect(shiftMonth('2026-01', -13)).toBe('2024-12')
  })

  it('lässt ungültige Monate unverändert', () => {
    expect(shiftMonth('kaputt', 1)).toBe('kaputt')
  })
})

describe('monthRange', () => {
  it('liefert den ersten Tag und den ersten Tag des Folgemonats', () => {
    expect(monthRange('2026-11')).toEqual({ from: '2026-11-01', to: '2026-12-01' })
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' })
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-03-01' })
  })

  it('wirft bei ungültigen Monaten', () => {
    expect(() => monthRange('kaputt')).toThrow()
  })
})

describe('formatMonthLabel', () => {
  it('zeigt Monatsname und Jahr', () => {
    expect(formatMonthLabel('2026-11')).toBe('November 2026')
    expect(formatMonthLabel('2027-01')).toBe('Januar 2027')
    expect(formatMonthLabel('2026-03')).toBe('März 2026')
  })
})
