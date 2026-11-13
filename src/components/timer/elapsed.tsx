'use client'

import { useEffect, useState } from 'react'
import { elapsedMs, formatElapsed, formatElapsedMinutes, isLongRunning } from '@/lib/timer/format'

// Laufende Zeit seit dem Start. Läuft mit einer eigenen Uhr (jede Sekunde) und rechnet aus Startzeit
// und Serveruhr, damit nichts neu gerendert wird ausser dieser Zahl. Für Screenreader wird die Zeit
// nicht sekündlich vorgelesen (role="timer" ist standardmässig «aus»).
export function Elapsed({
  startedAt,
  offsetMs,
  seconds = true,
  className,
}: {
  startedAt: string
  offsetMs: number
  seconds?: boolean
  className?: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), seconds ? 1000 : 15_000)
    return () => window.clearInterval(interval)
  }, [startedAt, seconds])

  const ms = elapsedMs(startedAt, now, offsetMs)
  return (
    <span role="timer" className={className}>
      {seconds ? formatElapsed(ms) : formatElapsedMinutes(ms)}
    </span>
  )
}

// Hinweis ab 10 Stunden Laufzeit; prüft jede Minute neu.
export function useIsLongRunning(startedAt: string, offsetMs: number): boolean {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [startedAt])
  return isLongRunning(elapsedMs(startedAt, now, offsetMs))
}
