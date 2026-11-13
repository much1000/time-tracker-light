import {
  formatDuration,
  formatTime,
  MAX_DURATION_MINUTES,
  parseDuration,
  parseTime,
} from './duration'
import type { TimeEntry, TimeEntryInput } from './types'
import { isValidDate, minutesNowInZurich, todayInZurich } from './zurich'

// Prüfregeln für das Zeiterfassungs-Formular (Spec PROJ-4). Reine Funktionen, ohne Oberfläche.
// Dieselben Grenzen erzwingt später die Datenbank (Dauer, verrechenbar, Uhrzeiten, Datum, Länge).

export const DESCRIPTION_MAX_LENGTH = 1000

export type TimeEntryMode = 'duration' | 'range'

export interface TimeEntryFormValues {
  customerId: string
  projectId: string
  // «2026-11-13»
  date: string
  mode: TimeEntryMode
  duration: string
  start: string
  end: string
  billable: string
  description: string
}

export type TimeEntryField = keyof TimeEntryFormValues
export type TimeEntryErrors = Partial<Record<TimeEntryField, string>>

export type ValidationResult =
  | { ok: true; input: TimeEntryInput }
  | { ok: false; errors: TimeEntryErrors }

// Gearbeitete Dauer in Minuten, soweit aus den Eingaben ableitbar (sonst null). Für Anzeige und Vorbelegung.
export function workedMinutes(values: Pick<TimeEntryFormValues, 'mode' | 'duration' | 'start' | 'end'>) {
  if (values.mode === 'range') {
    const start = parseTime(values.start)
    const end = parseTime(values.end)
    if (start === null || end === null || end <= start) return null
    return end - start
  }
  const parsed = parseDuration(values.duration)
  return parsed.ok && parsed.minutes >= 1 ? parsed.minutes : null
}

export function validateTimeEntry(
  values: TimeEntryFormValues,
  now: Date = new Date()
): ValidationResult {
  const errors: TimeEntryErrors = {}

  if (values.customerId === '') errors.customerId = 'Bitte wähle einen Kunden.'
  if (values.projectId === '') errors.projectId = 'Bitte wähle ein Projekt.'

  const today = todayInZurich(now)
  if (values.date.trim() === '' || !isValidDate(values.date)) {
    errors.date = 'Bitte gib ein gültiges Datum ein.'
  } else if (values.date > today) {
    errors.date = 'Das Datum darf nicht in der Zukunft liegen.'
  }

  let durationMinutes: number | null = null
  let startTime: string | null = null
  let endTime: string | null = null

  if (values.mode === 'duration') {
    const parsed = parseDuration(values.duration)
    if (!parsed.ok) errors.duration = parsed.message
    else if (parsed.minutes < 1) errors.duration = 'Die Dauer muss mindestens 1 Minute sein.'
    else durationMinutes = parsed.minutes
  } else {
    const start = parseTime(values.start)
    const end = parseTime(values.end)
    if (start === null) {
      errors.start = values.start.trim() === '' ? 'Bitte gib eine Startzeit ein.' : 'Bitte gib eine gültige Uhrzeit ein, z. B. 08:30.'
    }
    if (end === null) {
      errors.end = values.end.trim() === '' ? 'Bitte gib eine Endzeit ein.' : 'Bitte gib eine gültige Uhrzeit ein, z. B. 10:00.'
    }
    if (start !== null && end !== null) {
      if (end <= start) {
        errors.end =
          'Das Ende muss nach dem Start liegen. Für Arbeit über Mitternacht legst du zwei Einträge an.'
      } else if (values.date === today && end > minutesNowInZurich(now)) {
        errors.end = 'Die Endzeit liegt in der Zukunft.'
      } else {
        durationMinutes = end - start
        startTime = formatTime(start)
        endTime = formatTime(end)
      }
    }
  }

  let billableMinutes: number | null = null
  const billable = parseDuration(values.billable)
  if (!billable.ok) {
    errors.billable = values.billable.trim() === '' ? 'Bitte gib die verrechenbare Dauer ein (0 für keine).' : billable.message
  } else if (durationMinutes !== null && billable.minutes > durationMinutes) {
    errors.billable = `Die verrechenbare Dauer darf nicht grösser sein als die gearbeitete Dauer (${formatDuration(durationMinutes)}).`
  } else {
    billableMinutes = billable.minutes
  }

  const description = values.description.trim()
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Die Beschreibung darf höchstens ${DESCRIPTION_MAX_LENGTH} Zeichen haben.`
  }

  if (
    Object.keys(errors).length > 0 ||
    durationMinutes === null ||
    billableMinutes === null ||
    durationMinutes > MAX_DURATION_MINUTES
  ) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    input: {
      projectId: values.projectId,
      date: values.date,
      durationMinutes,
      billableMinutes,
      startTime,
      endTime,
      description: description === '' ? null : description,
    },
  }
}

// Bestehende Einträge mit Uhrzeiten, die sich mit dem Zeitraum überschneiden (Minuten seit Mitternacht).
export function findOverlaps(entries: TimeEntry[], startMinutes: number, endMinutes: number) {
  return entries.filter((entry) => {
    if (entry.startTime === null || entry.endTime === null) return false
    const start = parseTime(entry.startTime)
    const end = parseTime(entry.endTime)
    if (start === null || end === null) return false
    return startMinutes < end && endMinutes > start
  })
}

// Summen für die Tagesübersicht.
export function sumEntries(entries: TimeEntry[]) {
  return entries.reduce(
    (sum, entry) => ({
      worked: sum.worked + entry.durationMinutes,
      billable: sum.billable + entry.billableMinutes,
    }),
    { worked: 0, billable: 0 }
  )
}
