'use client'

import { ProjectStartList } from '@/components/timer/project-start-list'
import { TimerCard } from '@/components/timer/timer-card'
import { useTimer } from '@/components/timer/timer-provider'

// Abschnitt «Timer» auf der Startseite: laufender Timer (Karte) und die Liste «Projekt starten».
export function TimerSection() {
  const { status, timer } = useTimer()
  return (
    <section aria-labelledby="timer-heading" className="space-y-4">
      <h2 id="timer-heading" className="text-lg font-semibold">
        Timer
      </h2>
      {status === 'loading' && !timer && (
        <div role="status" aria-label="Timer wird geladen" className="sr-only">
          Timer wird geladen
        </div>
      )}
      <TimerCard />
      <ProjectStartList />
    </section>
  )
}
