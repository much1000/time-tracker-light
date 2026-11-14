import { todayInZurich } from './zurich'

// Monate für die Seite «Zeiten» (PROJ-5). Ein Monat ist ein Text «2026-11». Der Monat eines Eintrags
// richtet sich nach seinem Datum (nicht nach der Uhrzeit), «aktuell» nach der Zürcher Uhr.

export type MonthKey = string

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const MIN_YEAR = 2000
const MAX_YEAR = 2100

export function parseMonth(value: string | null | undefined): { year: number; month: number } | null {
  const match = value ? MONTH_PATTERN.exec(value) : null
  if (!match) return null
  const year = Number(match[1])
  if (year < MIN_YEAR || year > MAX_YEAR) return null
  return { year, month: Number(match[2]) }
}

export function monthKey(year: number, month: number): MonthKey {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function currentMonth(now: Date = new Date()): MonthKey {
  return todayInZurich(now).slice(0, 7)
}

// Gültiger Monat, der nicht in der Zukunft liegt; sonst der aktuelle Monat.
export function resolveMonth(value: string | null | undefined, now: Date = new Date()): MonthKey {
  const current = currentMonth(now)
  return parseMonth(value) && (value as string) <= current ? (value as string) : current
}

// Vor- und zurückblättern (delta = -1 oder 1), über Jahresgrenzen hinweg
export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const parsed = parseMonth(key)
  if (!parsed) return key
  const index = parsed.year * 12 + (parsed.month - 1) + delta
  return monthKey(Math.floor(index / 12), (index % 12) + 1)
}

// Erster Tag des Monats und erster Tag des Folgemonats (ausschliesslich) als Datum «2026-11-01»
export function monthRange(key: MonthKey): { from: string; to: string } {
  const parsed = parseMonth(key)
  if (!parsed) throw new Error(`Ungültiger Monat: ${key}`)
  return { from: `${key}-01`, to: `${shiftMonth(key, 1)}-01` }
}

export function isCurrentMonth(key: MonthKey, now: Date = new Date()): boolean {
  return key === currentMonth(now)
}

// «November 2026»
export function formatMonthLabel(key: MonthKey): string {
  const parsed = parseMonth(key)
  if (!parsed) return key
  return new Intl.DateTimeFormat('de-CH', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(parsed.year, parsed.month - 1, 1))
  )
}
