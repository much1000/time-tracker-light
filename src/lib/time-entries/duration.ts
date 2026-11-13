// Dauer und Uhrzeiten: lesen, prüfen, anzeigen. Alles rechnet in ganzen Minuten.
// Eine einzige Stelle für Formular, Anzeige und später Timer und Auswertung.

export const MAX_DURATION_MINUTES = 24 * 60

export type ParseResult = { ok: true; minutes: number } | { ok: false; message: string }

const HINT = 'Bitte als Std:Min eingeben, z. B. 1:30, oder als Dezimalzahl, z. B. 1,5.'

// Erlaubt: «1:30», «0:45», «1,5», «1.5», «0,25», «2» (ganze Stunden bis 24).
// Abgelehnt: «90» und andere ganze Zahlen über 24 (Minuten oder Stunden?), Text, Negatives.
export function parseDuration(input: string): ParseResult {
  const text = input.trim()
  if (text === '') return { ok: false, message: 'Bitte gib eine Dauer ein.' }

  const clock = /^(\d{1,2}):(\d{2})$/.exec(text)
  if (clock) {
    const hours = Number(clock[1])
    const minutes = Number(clock[2])
    if (minutes > 59) return { ok: false, message: 'Die Minuten müssen zwischen 00 und 59 liegen.' }
    return withinLimit(hours * 60 + minutes)
  }

  const decimal = /^(\d+)(?:[.,](\d+))?$/.exec(text)
  if (decimal) {
    if (decimal[2] === undefined) {
      // Ganze Zahl ohne Trennzeichen: nur als ganze Stunden (bis 24), sonst mehrdeutig.
      const hours = Number(decimal[1])
      if (hours > 24) return { ok: false, message: HINT }
      return withinLimit(hours * 60)
    }
    const hours = Number(`${decimal[1]}.${decimal[2]}`)
    return withinLimit(Math.round(hours * 60))
  }

  return { ok: false, message: HINT }
}

function withinLimit(minutes: number): ParseResult {
  if (minutes > MAX_DURATION_MINUTES) {
    return { ok: false, message: 'Eine Dauer darf höchstens 24:00 sein.' }
  }
  return { ok: true, minutes }
}

// 90 -> «1:30», 600 -> «10:00»
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours}:${String(rest).padStart(2, '0')}`
}

// «8:30» oder «08:30» -> Minuten seit Mitternacht, sonst null
export function parseTime(input: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(input.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

// Minuten seit Mitternacht -> «08:30»
export function formatTime(minutesSinceMidnight: number): string {
  const hours = Math.floor(minutesSinceMidnight / 60)
  const minutes = minutesSinceMidnight % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}
