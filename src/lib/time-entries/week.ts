import { todayInZurich } from './zurich'

// Wochen für die Wochenübersicht (PROJ-7). Eine Woche ist ein Text «2026-W46» (ISO-Kalenderwoche,
// Montag bis Sonntag). Gerechnet wird nur mit Kalenderdaten («2026-11-09»), nie mit Uhrzeiten und
// Zeitzonen, damit Sommer-/Winterzeit und Jahreswechsel nichts verschieben. «Aktuell» richtet sich
// nach der Zürcher Uhr.

export type WeekKey = string

const WEEK_PATTERN = /^(\d{4})-W(\d{2})$/
const MIN_YEAR = 2000
const MAX_YEAR = 2100
const DAY_MS = 24 * 60 * 60 * 1000

const SHORT_DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
// Eigene Liste statt Intl: die Schreibweise der Abkürzungen hängt sonst von der Laufzeitumgebung ab
const SHORT_MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.']

function toUtc(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function fromUtc(ms: number): string {
  const date = new Date(ms)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}-${day}`
}

// 0 = Montag … 6 = Sonntag
function weekdayIndex(ms: number): number {
  return (new Date(ms).getUTCDay() + 6) % 7
}

// Datum um ganze Tage verschieben («2026-11-09», 7 -> «2026-11-16»)
export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS)
}

// Montag der ersten Woche eines ISO-Jahres: die Woche, die den 4. Januar enthält
function firstMondayMs(isoYear: number): number {
  const jan4 = Date.UTC(isoYear, 0, 4)
  return jan4 - weekdayIndex(jan4) * DAY_MS
}

export function weekKey(isoYear: number, week: number): WeekKey {
  return `${isoYear}-W${String(week).padStart(2, '0')}`
}

// Woche, zu der ein Datum gehört (ISO: die Woche gehört zu dem Jahr, in dem ihr Donnerstag liegt)
export function weekOfDate(date: string): WeekKey {
  const ms = toUtc(date)
  const thursday = ms - weekdayIndex(ms) * DAY_MS + 3 * DAY_MS
  const isoYear = new Date(thursday).getUTCFullYear()
  const week = 1 + Math.round((thursday - firstMondayMs(isoYear) - 3 * DAY_MS) / (7 * DAY_MS))
  return weekKey(isoYear, week)
}

function weeksInYear(isoYear: number): number {
  // Der 28. Dezember liegt immer in der letzten Woche des ISO-Jahres
  return Number(weekOfDate(`${isoYear}-12-28`).slice(-2))
}

export function parseWeek(value: string | null | undefined): { year: number; week: number } | null {
  const match = value ? WEEK_PATTERN.exec(value) : null
  if (!match) return null
  const year = Number(match[1])
  const week = Number(match[2])
  if (year < MIN_YEAR || year > MAX_YEAR) return null
  if (week < 1 || week > weeksInYear(year)) return null
  return { year, week }
}

export function currentWeek(now: Date = new Date()): WeekKey {
  return weekOfDate(todayInZurich(now))
}

export function isCurrentWeek(key: WeekKey, now: Date = new Date()): boolean {
  return key === currentWeek(now)
}

// Gültige Woche, die nicht in der Zukunft liegt; sonst die aktuelle Woche.
export function resolveWeek(value: string | null | undefined, now: Date = new Date()): WeekKey {
  const current = currentWeek(now)
  return parseWeek(value) && (value as string) <= current ? (value as string) : current
}

// Montag der Woche als Datum («2026-11-09»)
export function weekStart(key: WeekKey): string {
  const parsed = parseWeek(key)
  if (!parsed) throw new Error(`Ungültige Woche: ${key}`)
  return fromUtc(firstMondayMs(parsed.year) + (parsed.week - 1) * 7 * DAY_MS)
}

// Vor- und zurückblättern (delta = -1 oder 1), über Jahresgrenzen hinweg
export function shiftWeek(key: WeekKey, delta: number): WeekKey {
  if (!parseWeek(key)) return key
  return weekOfDate(addDays(weekStart(key), delta * 7))
}

// Montag und Montag der Folgewoche (ausschliesslich) als Datum
export function weekRange(key: WeekKey): { from: string; to: string } {
  const from = weekStart(key)
  return { from, to: addDays(from, 7) }
}

// Die sieben Tage Montag bis Sonntag
export function weekDays(key: WeekKey): string[] {
  const from = weekStart(key)
  return Array.from({ length: 7 }, (_, index) => addDays(from, index))
}

// «Mo» … «So» zu einem Datum
export function shortWeekday(date: string): string {
  return SHORT_DAYS[weekdayIndex(toUtc(date))]
}

// «Mo 9.»
export function formatDayShort(date: string): string {
  return `${shortWeekday(date)} ${Number(date.slice(8, 10))}.`
}

// «KW 46 · 9.–15. Nov. 2026», über Monatsgrenzen «KW 40 · 28. Sept. – 4. Okt. 2026»,
// über Jahresgrenzen «KW 1 · 29. Dez. 2025 – 4. Jan. 2026»
export function formatWeekLabel(key: WeekKey): string {
  const parsed = parseWeek(key)
  if (!parsed) return key
  const { from, to } = weekRange(key)
  const end = addDays(to, -1)
  const [startYear, startMonth, startDay] = from.split('-').map(Number)
  const [endYear, endMonth, endDay] = end.split('-').map(Number)
  const label = `KW ${parsed.week} · `
  if (startYear !== endYear) {
    return `${label}${startDay}. ${SHORT_MONTHS[startMonth - 1]} ${startYear} – ${endDay}. ${SHORT_MONTHS[endMonth - 1]} ${endYear}`
  }
  if (startMonth !== endMonth) {
    return `${label}${startDay}. ${SHORT_MONTHS[startMonth - 1]} – ${endDay}. ${SHORT_MONTHS[endMonth - 1]} ${endYear}`
  }
  return `${label}${startDay}.–${endDay}. ${SHORT_MONTHS[endMonth - 1]} ${endYear}`
}
