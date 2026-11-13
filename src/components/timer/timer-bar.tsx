'use client'

import { AlertTriangle, Circle, LoaderCircle, Square } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Elapsed, useIsLongRunning } from '@/components/timer/elapsed'
import { useTimer } from '@/components/timer/timer-provider'
import { Button } from '@/components/ui/button'
import type { RunningTimer } from '@/lib/timer'

// Schmale Leiste mit dem laufenden Timer auf allen Seiten ausser der Startseite (dort steht die Karte).
// Am Handy fest über der Tab-Leiste, am Laptop oben im Inhaltsbereich.
function BarContent({ timer }: { timer: RunningTimer }) {
  const { offsetMs, busy, stop, status } = useTimer()
  const long = useIsLongRunning(timer.startedAt, offsetMs)
  const stopping = busy?.kind === 'stop'

  return (
    <div
      role="region"
      aria-label="Laufender Timer"
      className="flex items-center gap-2 rounded-lg border bg-card p-1.5 shadow-md"
    >
      <Link
        href="/"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={`Timer läuft bei ${timer.customerCode} · ${timer.projectName}. Zur Startseite`}
      >
        <Circle className="h-3 w-3 shrink-0 fill-current text-success" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          <span className="font-mono">{timer.customerCode}</span>
          <span className="text-muted-foreground"> · </span>
          {timer.projectName}
        </span>
        {long && <AlertTriangle className="h-4 w-4 shrink-0" aria-label="Läuft schon sehr lange" />}
        {status === 'error' && <span className="shrink-0 text-xs text-muted-foreground">Keine Verbindung</span>}
        <Elapsed
          startedAt={timer.startedAt}
          offsetMs={offsetMs}
          className="shrink-0 text-sm font-semibold tabular-nums"
        />
      </Link>
      <Button type="button" size="sm" className="h-11 shrink-0" disabled={busy !== null} onClick={() => void stop(timer.description ?? '')}>
        {stopping ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <Square aria-hidden="true" />
        )}
        {stopping ? 'Wird gespeichert …' : 'Stopp'}
      </Button>
    </div>
  )
}

// Laptop: oben im Inhaltsbereich (klebt beim Scrollen)
export function TimerBarDesktop() {
  const { timer } = useTimer()
  const pathname = usePathname()
  if (!timer || pathname === '/') return null
  return (
    <div className="sticky top-4 z-30 mb-4 hidden md:block">
      <BarContent timer={timer} />
    </div>
  )
}

// Handy: fest über der Tab-Leiste, mit Platzhalter am Seitenende, damit nichts verdeckt wird
export function TimerBarMobile() {
  const { timer } = useTimer()
  const pathname = usePathname()
  if (!timer || pathname === '/') return null
  return (
    <>
      <div className="h-16 md:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 px-3 md:hidden">
        <BarContent timer={timer} />
      </div>
    </>
  )
}
