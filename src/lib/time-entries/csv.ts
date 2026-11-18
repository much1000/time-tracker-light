import type { TimeEntry } from './types'

// CSV-Datei für den Export (PROJ-9): feste Spalten, Semikolon, UTF-8 mit BOM, Dezimalkomma.
// Reine Rechenfunktionen ohne Datenbank und Oberfläche. Die Rundung auf 15 Minuten gehört nicht hierher
// (siehe Spec): alle Werte sind minutengenau.

export const CSV_BOM = '﻿'
const SEPARATOR = ';'
const LINE_END = '\r\n'

export const CSV_HEADER = [
  'Datum',
  'Kunde',
  'Kundenkürzel',
  'Projekt',
  'Beschreibung',
  'Von',
  'Bis',
  'Dauer (Minuten)',
  'Dauer (Stunden)',
  'Verrechenbar (Minuten)',
  'Verrechenbar (Stunden)',
] as const

// «2026-11-13» → «13.11.2026»
export function formatCsvDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year}`
}

// Minuten → Stunden mit Dezimalkomma und zwei Nachkommastellen (105 → «1,75», 1 → «0,02»).
// Gerechnet wird in ganzen Hundertsteln; Viertelwerte wie x,5 kommen bei Minuten ÷ 60 nie vor.
export function formatCsvHours(minutes: number): string {
  const hundredths = Math.round((minutes * 5) / 3)
  const whole = Math.floor(hundredths / 100)
  const rest = String(hundredths % 100).padStart(2, '0')
  return `${whole},${rest}`
}

// Texte, die in Excel als Formel laufen würden (=, +, -, @, Tabulator, Zeilenumbruch am Anfang), bekommen
// einen Apostroph vorangestellt. Danach wird maskiert, wenn Trennzeichen, Anführungszeichen oder
// Zeilenumbrüche vorkommen (Anführungszeichen werden verdoppelt).
export function csvText(value: string | null): string {
  if (value === null || value === '') return ''
  const safe = /^[=+\-@\t\r\n]/.test(value) ? `'${value}` : value
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function entryToCsvRow(entry: TimeEntry): string {
  return [
    formatCsvDate(entry.date),
    csvText(entry.customerName),
    csvText(entry.customerCode),
    csvText(entry.projectName),
    csvText(entry.description),
    entry.startTime ?? '',
    entry.endTime ?? '',
    String(entry.durationMinutes),
    formatCsvHours(entry.durationMinutes),
    String(entry.billableMinutes),
    formatCsvHours(entry.billableMinutes),
  ].join(SEPARATOR)
}

// Ganze Datei: BOM, Kopfzeile, eine Zeile je Eintrag (Reihenfolge wie übergeben)
export function entriesToCsv(entries: TimeEntry[]): string {
  const lines = [CSV_HEADER.join(SEPARATOR), ...entries.map(entryToCsvRow)]
  return CSV_BOM + lines.join(LINE_END) + LINE_END
}

// «zeiten-2026-11-18.csv»
export function csvFileName(today: string): string {
  return `zeiten-${today}.csv`
}
