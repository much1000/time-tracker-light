// «Heute» und «jetzt» nach der Uhr in Zürich (unabhängig von der Zeitzone des Geräts).
// Die Datenbank verwendet dieselbe Zeitzone (siehe Tech Design PROJ-4).

export const TIME_ZONE = 'Europe/Zurich'

function parts(now: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const result: Record<string, string> = {}
  for (const part of formatter.formatToParts(now)) result[part.type] = part.value
  return result
}

// «2026-11-13»
export function todayInZurich(now: Date = new Date()): string {
  const p = parts(now)
  return `${p.year}-${p.month}-${p.day}`
}

// Minuten seit Mitternacht in Zürich
export function minutesNowInZurich(now: Date = new Date()): number {
  const p = parts(now)
  return Number(p.hour) * 60 + Number(p.minute)
}

export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return (
    date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3])
  )
}

// «2026-11-05» -> «05.11.2026»
export function formatDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

// «2026-11-13» -> «Freitag, 13. November 2026»
export function formatLongDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}
