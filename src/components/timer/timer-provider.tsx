'use client'

import { usePathname } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import {
  describeTimerError,
  getTimerRepository,
  TimerError,
  type FinishedTimer,
  type RunningTimer,
} from '@/lib/timer'
import {
  clockOffsetMs,
  elapsedMs,
  formatElapsedMinutes,
  stripTimerTitle,
  timerTitle,
} from '@/lib/timer/format'
import type { TimerRepository } from '@/lib/timer/repository'

export type TimerBusy =
  | { kind: 'start'; projectId: string }
  | { kind: 'stop' }
  | { kind: 'discard' }
  | null

interface TimerContextValue {
  status: 'loading' | 'ready' | 'error'
  timer: RunningTimer | null
  // Serveruhr minus Geräteuhr (für die Anzeige der laufenden Zeit)
  offsetMs: number
  busy: TimerBusy
  // Zählt hoch, wenn Einträge entstanden sind: Die Liste «Heute» lädt dann neu.
  entriesVersion: number
  start: (projectId: string) => Promise<boolean>
  stop: (description: string) => Promise<boolean>
  discard: () => Promise<boolean>
  saveDescription: (description: string) => Promise<boolean>
  reload: () => void
}

// Ohne Anbindung (zum Beispiel in Tests einzelner Komponenten) läuft nie ein Timer.
const IDLE: TimerContextValue = {
  status: 'ready',
  timer: null,
  offsetMs: 0,
  busy: null,
  entriesVersion: 0,
  start: async () => false,
  stop: async () => false,
  discard: async () => false,
  saveDescription: async () => false,
  reload: () => undefined,
}

const TimerContext = createContext<TimerContextValue>(IDLE)

export function useTimer(): TimerContextValue {
  return useContext(TimerContext)
}

function label(finished: FinishedTimer): string {
  return `${finished.customerCode} · ${finished.projectName}`
}

function savedMessage(finished: FinishedTimer): string {
  return finished.tooShort
    ? 'Unter einer Minute, nicht gespeichert.'
    : `${label(finished)}: ${formatElapsedMinutes(finished.totalMinutes * 60_000)} gespeichert.`
}

// Lädt den laufenden Timer (auch beim Zurückkehren in den Tab), führt Start, Stopp, Wechsel und
// Verwerfen aus, meldet das Ergebnis und hält den Tab-Titel aktuell.
export function TimerProvider({
  children,
  repository,
}: {
  children: ReactNode
  // Nur für Tests: andere Datenhaltung
  repository?: TimerRepository
}) {
  const repo = repository ?? getTimerRepository()
  const repoRef = useRef(repo)
  repoRef.current = repo

  const [status, setStatus] = useState<TimerContextValue['status']>('loading')
  const [timer, setTimer] = useState<RunningTimer | null>(null)
  const [offsetMs, setOffsetMs] = useState(0)
  const [busy, setBusy] = useState<TimerBusy>(null)
  const [entriesVersion, setEntriesVersion] = useState(0)
  const busyRef = useRef(false)
  const lastLoad = useRef(0)

  const apply = useCallback((next: RunningTimer | null, serverNow: string) => {
    setTimer(next)
    setOffsetMs(clockOffsetMs(serverNow, Date.now()))
    setStatus('ready')
  }, [])

  const load = useCallback(async () => {
    lastLoad.current = Date.now()
    try {
      const snapshot = await repoRef.current.getTimer()
      apply(snapshot.timer, snapshot.serverNow)
    } catch {
      // Der zuletzt bekannte Timer bleibt sichtbar («Keine Verbindung»)
      setStatus('error')
    }
  }, [apply])

  useEffect(() => {
    void load()
  }, [load])

  // Zurück im Tab oder Fenster: Zustand neu laden (Änderungen von einem anderen Gerät)
  useEffect(() => {
    function refresh() {
      if (document.visibilityState === 'hidden') return
      if (Date.now() - lastLoad.current < 2000) return
      void load()
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  // Ablauf einer Aktion: nie zwei gleichzeitig, Fehler als Meldung, Zustand bleibt dann unverändert.
  const run = useCallback(
    async (kind: NonNullable<TimerBusy>, action: () => Promise<void>): Promise<boolean> => {
      if (busyRef.current) return false
      busyRef.current = true
      setBusy(kind)
      try {
        await action()
        return true
      } catch (error) {
        toast.error(describeTimerError(error))
        // Der Timer wurde auf einem anderen Gerät beendet: Anzeige abgleichen
        if (error instanceof TimerError && error.kind === 'no-timer') void load()
        return false
      } finally {
        busyRef.current = false
        setBusy(null)
      }
    },
    [load]
  )

  const start = useCallback(
    (projectId: string) =>
      run({ kind: 'start', projectId }, async () => {
        const result = await repoRef.current.startTimer(projectId)
        apply(result.timer, result.serverNow)
        const target = `${result.timer.customerCode} · ${result.timer.projectName}`
        if (result.alreadyRunning) {
          toast.success(`Der Timer läuft schon bei ${target}.`)
          return
        }
        if (result.finished) {
          toast.success(`${savedMessage(result.finished)} Timer für ${target} gestartet.`)
          if (!result.finished.tooShort) setEntriesVersion((version) => version + 1)
        } else {
          toast.success(`Timer für ${target} gestartet.`)
        }
      }),
    [apply, run]
  )

  const stop = useCallback(
    (description: string) =>
      run({ kind: 'stop' }, async () => {
        const result = await repoRef.current.stopTimer(description)
        apply(null, result.serverNow)
        toast.success(savedMessage(result.finished))
        if (!result.finished.tooShort) setEntriesVersion((version) => version + 1)
      }),
    [apply, run]
  )

  const discard = useCallback(
    () =>
      run({ kind: 'discard' }, async () => {
        const discarded = await repoRef.current.discardTimer()
        setTimer(null)
        toast.success(discarded ? 'Timer verworfen.' : 'Der Timer war schon beendet.')
      }),
    [run]
  )

  const timerRef = useRef<RunningTimer | null>(null)
  timerRef.current = timer

  // Beschreibung speichern: leise, ohne Sperre der anderen Aktionen
  const saveDescription = useCallback(
    async (description: string) => {
      const current = timerRef.current
      if (!current) return false
      try {
        await repoRef.current.saveDescription(current.id, description)
        setTimer((existing) =>
          existing && existing.id === current.id
            ? { ...existing, description: description.trim() === '' ? null : description.trim() }
            : existing
        )
        return true
      } catch (error) {
        if (error instanceof TimerError && error.kind === 'no-timer') void load()
        return false
      }
    },
    [load]
  )
  // Tab-Titel: «0:47 · MUS · Time Tracker Light», jede Minute aktualisiert
  const pathname = usePathname()
  useEffect(() => {
    if (!timer) return
    const code = timer.customerCode
    function update() {
      const ms = elapsedMs(timer!.startedAt, Date.now(), offsetMs)
      const next = timerTitle(document.title, ms, code)
      if (document.title !== next) document.title = next
    }
    update()
    const interval = window.setInterval(update, 60_000)
    // Andere Seiten setzen ihren eigenen Titel (Kundenseite, Seitenwechsel): Präfix wieder voranstellen
    const titleElement = document.querySelector('title')
    const observer = titleElement
      ? new MutationObserver(() => {
          if (!/^\d+:\d{2} · [^·]+ · /.test(document.title)) update()
        })
      : null
    if (titleElement && observer) observer.observe(titleElement, { childList: true, characterData: true, subtree: true })
    return () => {
      window.clearInterval(interval)
      observer?.disconnect()
      document.title = stripTimerTitle(document.title)
    }
  }, [timer, offsetMs, pathname])

  const value = useMemo<TimerContextValue>(
    () => ({
      status,
      timer,
      offsetMs,
      busy,
      entriesVersion,
      start,
      stop,
      discard,
      saveDescription,
      reload: () => void load(),
    }),
    [status, timer, offsetMs, busy, entriesVersion, start, stop, discard, saveDescription, load]
  )

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
}
