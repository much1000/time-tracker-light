import { describe, expect, it } from 'vitest'
import {
  clockOffsetMs,
  elapsedMs,
  formatElapsed,
  formatElapsedMinutes,
  formatStartClock,
  isLongRunning,
  LONG_RUNNING_MS,
  stripTimerTitle,
  timerTitle,
} from './format'

describe('formatElapsed', () => {
  it('zeigt Stunden, Minuten und Sekunden', () => {
    expect(formatElapsed(0)).toBe('0:00:00')
    expect(formatElapsed(5_000)).toBe('0:00:05')
    expect(formatElapsed(47 * 60_000)).toBe('0:47:00')
    expect(formatElapsed(3_725_000)).toBe('1:02:05')
    expect(formatElapsed(26 * 3_600_000 + 59_000)).toBe('26:00:59')
  })

  it('schneidet Millisekunden ab', () => {
    expect(formatElapsed(59_999)).toBe('0:00:59')
  })
})

describe('formatElapsedMinutes', () => {
  it('zeigt nur Stunden und Minuten, Sekunden werden abgeschnitten', () => {
    expect(formatElapsedMinutes(0)).toBe('0:00')
    expect(formatElapsedMinutes(59_999)).toBe('0:00')
    expect(formatElapsedMinutes(47 * 60_000 + 59_000)).toBe('0:47')
    expect(formatElapsedMinutes(10 * 3_600_000)).toBe('10:00')
  })
})

describe('elapsedMs und clockOffsetMs', () => {
  const startedAt = '2026-11-13T09:00:00+00:00'

  it('rechnet mit der Serveruhr, nicht mit der Geräteuhr', () => {
    // Geräteuhr geht 10 Minuten nach: Gerät 09:20, Server 09:30
    const device = Date.parse('2026-11-13T09:20:00Z')
    const offset = clockOffsetMs('2026-11-13T09:30:00+00:00', device)
    expect(offset).toBe(10 * 60_000)
    // Eine Minute später auf dem Gerät: Serverzeit 09:31, seit Start 31 Minuten
    expect(elapsedMs(startedAt, device + 60_000, offset)).toBe(31 * 60_000)
  })

  it('wird nie negativ (Startzeit knapp in der Zukunft)', () => {
    expect(elapsedMs('2026-11-13T09:00:05+00:00', Date.parse('2026-11-13T09:00:00Z'), 0)).toBe(0)
  })

  it('ignoriert eine ungültige Serverzeit', () => {
    expect(clockOffsetMs('kaputt', 123)).toBe(0)
  })
})

describe('isLongRunning', () => {
  it('warnt ab 10 Stunden', () => {
    expect(isLongRunning(LONG_RUNNING_MS - 1)).toBe(false)
    expect(isLongRunning(LONG_RUNNING_MS)).toBe(true)
  })
})

describe('formatStartClock', () => {
  it('zeigt die Uhrzeit in Zürich (Winter UTC+1, Sommer UTC+2)', () => {
    expect(formatStartClock('2026-11-13T07:47:12Z')).toBe('08:47')
    expect(formatStartClock('2026-07-15T07:47:12Z')).toBe('09:47')
    expect(formatStartClock('2026-11-13T23:05:00Z')).toBe('00:05')
  })
})

describe('Tab-Titel', () => {
  it('setzt Zeit und Kürzel vor den Grundtitel', () => {
    expect(timerTitle('Time Tracker Light', 47 * 60_000, 'MUS')).toBe('0:47 · MUS · Time Tracker Light')
    expect(timerTitle('Kunden · Time Tracker Light', 3_700_000, 'ABC')).toBe('1:01 · ABC · Kunden · Time Tracker Light')
  })

  it('ersetzt einen vorhandenen Timer-Titel statt ihn zu verdoppeln', () => {
    const once = timerTitle('Time Tracker Light', 60_000, 'MUS')
    expect(timerTitle(once, 120_000, 'MUS')).toBe('0:02 · MUS · Time Tracker Light')
    expect(stripTimerTitle(once)).toBe('Time Tracker Light')
    expect(stripTimerTitle('Kunden · Time Tracker Light')).toBe('Kunden · Time Tracker Light')
  })
})
