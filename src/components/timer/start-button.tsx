'use client'

import { Circle, LoaderCircle, Play } from 'lucide-react'
import { useTimer } from '@/components/timer/timer-provider'
import { Button } from '@/components/ui/button'

// Start-Knopf bei einem Projekt (Startseite und Kundenseite). Läuft der Timer schon bei diesem Projekt,
// steht stattdessen die Markierung «Läuft» (Symbol und Text, nicht nur Farbe).
export function StartButton({
  projectId,
  projectName,
  customerCode,
}: {
  projectId: string
  projectName: string
  customerCode: string
}) {
  const { timer, busy, start } = useTimer()

  if (timer?.projectId === projectId) {
    return (
      <span className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-medium text-success">
        <Circle className="h-3 w-3 fill-current" aria-hidden="true" />
        Läuft
      </span>
    )
  }

  const starting = busy?.kind === 'start' && busy.projectId === projectId
  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy !== null}
      onClick={() => void start(projectId)}
      aria-label={`Timer starten: ${customerCode} · ${projectName}`}
    >
      {starting ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          Wird gestartet …
        </>
      ) : (
        <>
          <Play aria-hidden="true" />
          Start
        </>
      )}
    </Button>
  )
}
