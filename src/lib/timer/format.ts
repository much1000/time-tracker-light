import { formatDuration } from '@/lib/time-entries/duration'
import { TIME_ZONE } from '@/lib/time-entries/zurich'

// Anzeige des laufenden Timers. Die Zeit wird aus Startzeit und Serverzeit berechnet (nicht aus einem
// mitlaufenden Zähler), darum stimmt sie nach Schlaf und Tab-Wechsel und bei falscher Geräteuhr.

// Ab dieser Laufzeit erscheint der Hinweis «Läuft schon sehr lange» (Spec: 10 Stunden).
export const LONG_RUNNING_MS = 10 * 60 * 60 * 1000

// Vergangene Zeit seit dem Start in Millisekunden (nie negativ). «offsetMs» ist der Unterschied
// zwischen Serveruhr und Geräteuhr zum Zeitpunkt des Ladens.
export function elapsedMs(startedAt: string, nowMs: number, offsetMs: number): number {
  return Math.max(0, nowMs + offsetMs - Date.parse(startedAt))
}

// Serveruhr minus Geräteuhr, gemessen beim Laden des Zustands
export function clockOffsetMs(serverNow: string, deviceNowMs: number): number {
  const server = Date.parse(serverNow)
  return Number.isNaN(server) ? 0 : server - deviceNowMs
}

// 2_820_000 -> «0:47:00», 3_725_000 -> «1:02:05»
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// Nur Stunden und Minuten (für Tab-Titel und Meldungen), Sekunden werden abgeschnitten: «0:47»
export function formatElapsedMinutes(ms: number): string {
  return formatDuration(Math.floor(ms / 60000))
}

export function isLongRunning(ms: number): boolean {
  return ms >= LONG_RUNNING_MS
}

// Startzeit als Uhrzeit in Zürich: «08:47»
export function formatStartClock(startedAt: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(startedAt))
}

// Tab-Titel: «0:47 · MUS · Time Tracker Light». Der Grundtitel bleibt erhalten.
const TITLE_PREFIX = /^\d+:\d{2} · [^·]+ · /

export function stripTimerTitle(title: string): string {
  return title.replace(TITLE_PREFIX, '')
}

export function timerTitle(baseTitle: string, ms: number, customerCode: string): string {
  return `${formatElapsedMinutes(ms)} · ${customerCode} · ${stripTimerTitle(baseTitle)}`
}
