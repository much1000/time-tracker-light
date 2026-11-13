import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TimerError } from '@/lib/timer/errors'
import type { TimerRepository } from '@/lib/timer/repository'
import type { FinishedTimer, RunningTimer, StartResult, StopResult } from '@/lib/timer/types'
import { StartButton } from './start-button'
import { TimerBarDesktop } from './timer-bar'
import { TimerCard } from './timer-card'
import { TimerProvider } from './timer-provider'

let pathname = '/kunden'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const SERVER_NOW = '2026-11-14T10:00:00+00:00'

function timerOf(projectId: string, startedAt: string, extra: Partial<RunningTimer> = {}): RunningTimer {
  return {
    id: `timer-${projectId}`,
    projectId,
    projectName: projectId === 'p1' ? 'Allgemein' : 'Relaunch',
    customerId: 'c1',
    customerCode: projectId === 'p1' ? 'MUS' : 'ABC',
    customerName: projectId === 'p1' ? 'Muster AG' : 'Abc GmbH',
    startedAt,
    description: null,
    ...extra,
  }
}

function finished(overrides: Partial<FinishedTimer> = {}): FinishedTimer {
  return {
    projectId: 'p1',
    projectName: 'Allgemein',
    customerCode: 'MUS',
    customerName: 'Muster AG',
    tooShort: false,
    totalMinutes: 47,
    entries: [{ id: 'e1', date: '2026-11-14', durationMinutes: 47, startTime: '10:00', endTime: '10:47' }],
    ...overrides,
  }
}

// Fake-Datenhaltung: ein laufender Timer, Aufrufe werden aufgezeichnet
function fakeRepository(initial: RunningTimer | null) {
  let current = initial
  const repo = {
    getTimer: vi.fn(async () => ({ timer: current, serverNow: SERVER_NOW })),
    startTimer: vi.fn(async (projectId: string): Promise<StartResult> => {
      const previous = current
      current = timerOf(projectId, SERVER_NOW)
      return {
        timer: current,
        finished: previous ? finished({ projectId: previous.projectId }) : null,
        alreadyRunning: false,
        serverNow: SERVER_NOW,
      }
    }),
    stopTimer: vi.fn(async (): Promise<StopResult> => {
      current = null
      return { finished: finished(), serverNow: SERVER_NOW }
    }),
    discardTimer: vi.fn(async () => {
      const had = current !== null
      current = null
      return had
    }),
    saveDescription: vi.fn(async () => undefined),
  }
  return repo satisfies TimerRepository
}

// Timer, der vor 47 Minuten (laut Serveruhr) gestartet wurde
const RUNNING = timerOf('p1', '2026-11-14T09:13:00+00:00')

function renderWith(repo: TimerRepository, ui: React.ReactNode) {
  return render(<TimerProvider repository={repo}>{ui}</TimerProvider>)
}

beforeEach(() => {
  pathname = '/kunden'
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  document.title = 'Time Tracker Light'
})

afterEach(() => {
  vi.useRealTimers()
})

describe('StartButton', () => {
  it('startet den Timer und zeigt danach «Läuft» statt des Knopfs', async () => {
    const repo = fakeRepository(null)
    renderWith(repo, <StartButton projectId="p1" projectName="Allgemein" customerCode="MUS" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Timer starten: MUS · Allgemein' }))

    expect(await screen.findByText('Läuft')).toBeInTheDocument()
    expect(repo.startTimer).toHaveBeenCalledWith('p1')
    expect(screen.queryByRole('button', { name: /Timer starten/ })).not.toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Timer für MUS · Allgemein gestartet.')
  })

  it('zeigt bei einem anderen Projekt weiter den Start-Knopf', async () => {
    renderWith(fakeRepository(RUNNING), <StartButton projectId="p2" projectName="Relaunch" customerCode="ABC" />)
    expect(await screen.findByRole('button', { name: 'Timer starten: ABC · Relaunch' })).toBeEnabled()
  })

  it('wechselt: meldet den gespeicherten alten Timer und den neuen', async () => {
    const repo = fakeRepository(RUNNING)
    renderWith(repo, <StartButton projectId="p2" projectName="Relaunch" customerCode="ABC" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Timer starten: ABC · Relaunch' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith(
      'MUS · Allgemein: 0:47 gespeichert. Timer für ABC · Relaunch gestartet.'
    )
  })

  it('meldet bei einem Wechsel unter einer Minute «nicht gespeichert»', async () => {
    const repo = fakeRepository(RUNNING)
    repo.startTimer.mockImplementationOnce(async (projectId: string) => ({
      timer: timerOf(projectId, SERVER_NOW),
      finished: finished({ tooShort: true, totalMinutes: 0, entries: [] }),
      alreadyRunning: false,
      serverNow: SERVER_NOW,
    }))
    renderWith(repo, <StartButton projectId="p2" projectName="Relaunch" customerCode="ABC" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Timer starten: ABC · Relaunch' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith(
      'Unter einer Minute, nicht gespeichert. Timer für ABC · Relaunch gestartet.'
    )
  })

  it('meldet einen Fehler und lässt den Zustand unverändert', async () => {
    const repo = fakeRepository(null)
    repo.startTimer.mockRejectedValueOnce(new TimerError('unreachable'))
    renderWith(repo, <StartButton projectId="p1" projectName="Allgemein" customerCode="MUS" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Timer starten: MUS · Allgemein' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(vi.mocked(toast.error).mock.calls[0][0]).toContain('Keine Verbindung')
    expect(screen.getByRole('button', { name: 'Timer starten: MUS · Allgemein' })).toBeEnabled()
  })
})

describe('TimerCard', () => {
  it('zeigt Kunde, Projekt, Startzeit und die laufende Zeit seit dem Start (Serveruhr)', async () => {
    renderWith(fakeRepository(RUNNING), <TimerCard />)

    const card = await screen.findByRole('region', { name: 'Laufender Timer' })
    expect(within(card).getByText('Timer läuft')).toBeInTheDocument()
    expect(within(card).getByText('MUS')).toBeInTheDocument()
    expect(within(card).getByText(/Muster AG · gestartet um 10:13/)).toBeInTheDocument()
    expect(within(card).getByRole('timer')).toHaveTextContent(/^0:47:\d\d$/)
    expect(within(card).getByRole('button', { name: 'Stopp' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Verwerfen' })).toBeInTheDocument()
  })

  it('zeigt nichts, wenn kein Timer läuft', async () => {
    renderWith(fakeRepository(null), <TimerCard />)
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Laufender Timer' })).not.toBeInTheDocument())
  })

  it('warnt ab 10 Stunden Laufzeit', async () => {
    renderWith(fakeRepository(timerOf('p1', '2026-11-14T00:00:00+00:00')), <TimerCard />)
    expect(await screen.findByText('Läuft schon sehr lange. Vergessen zu stoppen?')).toBeInTheDocument()
  })

  it('warnt nicht bei kurzer Laufzeit', async () => {
    renderWith(fakeRepository(RUNNING), <TimerCard />)
    await screen.findByText('Timer läuft')
    expect(screen.queryByText(/Läuft schon sehr lange/)).not.toBeInTheDocument()
  })

  it('stoppt mit dem aktuellen Text der Beschreibung, meldet die Dauer und entfernt die Karte', async () => {
    const repo = fakeRepository(RUNNING)
    renderWith(repo, <TimerCard />)

    fireEvent.change(await screen.findByLabelText('Beschreibung (optional)'), { target: { value: 'Konzept besprochen' } })
    fireEvent.click(screen.getByRole('button', { name: 'Stopp' }))

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Laufender Timer' })).not.toBeInTheDocument())
    expect(repo.stopTimer).toHaveBeenCalledWith('Konzept besprochen')
    expect(toast.success).toHaveBeenCalledWith('MUS · Allgemein: 0:47 gespeichert.')
  })

  it('meldet bei unter einer Minute «nicht gespeichert»', async () => {
    const repo = fakeRepository(RUNNING)
    repo.stopTimer.mockResolvedValueOnce({
      finished: finished({ tooShort: true, totalMinutes: 0, entries: [] }),
      serverNow: SERVER_NOW,
    })
    renderWith(repo, <TimerCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'Stopp' }))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Unter einer Minute, nicht gespeichert.'))
  })

  it('lässt den Timer bei einem Fehler weiterlaufen und behält die Beschreibung', async () => {
    const repo = fakeRepository(RUNNING)
    repo.stopTimer.mockRejectedValueOnce(new TimerError('unreachable'))
    renderWith(repo, <TimerCard />)

    fireEvent.change(await screen.findByLabelText('Beschreibung (optional)'), { target: { value: 'Text bleibt' } })
    fireEvent.click(screen.getByRole('button', { name: 'Stopp' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByRole('region', { name: 'Laufender Timer' })).toBeInTheDocument()
    expect(screen.getByLabelText('Beschreibung (optional)')).toHaveValue('Text bleibt')
    expect(screen.getByRole('button', { name: 'Stopp' })).toBeEnabled()
  })

  it('sperrt «Stopp» bei einer Beschreibung über 1000 Zeichen und zeigt den Hinweis', async () => {
    renderWith(fakeRepository(RUNNING), <TimerCard />)
    fireEvent.change(await screen.findByLabelText('Beschreibung (optional)'), { target: { value: 'x'.repeat(1001) } })
    expect(screen.getByText('Die Beschreibung darf höchstens 1000 Zeichen haben.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stopp' })).toBeDisabled()
  })

  it('fragt vor dem Verwerfen zurück, verwirft nur nach Bestätigung', async () => {
    const repo = fakeRepository(RUNNING)
    renderWith(repo, <TimerCard />)

    fireEvent.click(await screen.findByRole('button', { name: 'Verwerfen' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Timer verwerfen?')).toBeInTheDocument()
    expect(within(dialog).getByText(/0:47.*wird nicht gespeichert/)).toBeInTheDocument()

    // Abbrechen: der Timer läuft weiter
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(repo.discardTimer).not.toHaveBeenCalled()
    expect(screen.getByRole('region', { name: 'Laufender Timer' })).toBeInTheDocument()

    // Bestätigen
    fireEvent.click(screen.getByRole('button', { name: 'Verwerfen' }))
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Verwerfen' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Laufender Timer' })).not.toBeInTheDocument())
    expect(repo.discardTimer).toHaveBeenCalledTimes(1)
    expect(repo.stopTimer).not.toHaveBeenCalled()
    expect(toast.success).toHaveBeenCalledWith('Timer verworfen.')
  })

  it('speichert die Beschreibung nach einer Pause in der Eingabe', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const repo = fakeRepository(RUNNING)
    renderWith(repo, <TimerCard />)

    const field = await screen.findByLabelText('Beschreibung (optional)')
    fireEvent.change(field, { target: { value: 'Erste Zeile' } })
    expect(repo.saveDescription).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(repo.saveDescription).toHaveBeenCalledWith('timer-p1', 'Erste Zeile')
  })

  it('speichert die Beschreibung beim Verlassen des Feldes sofort', async () => {
    const repo = fakeRepository(RUNNING)
    renderWith(repo, <TimerCard />)
    const field = await screen.findByLabelText('Beschreibung (optional)')
    fireEvent.change(field, { target: { value: 'Sofort' } })
    fireEvent.blur(field)
    await waitFor(() => expect(repo.saveDescription).toHaveBeenCalledWith('timer-p1', 'Sofort'))
  })

  it('zeigt die gespeicherte Beschreibung eines laufenden Timers an (anderes Gerät)', async () => {
    renderWith(fakeRepository(timerOf('p1', '2026-11-14T09:13:00+00:00', { description: 'Von woanders' })), <TimerCard />)
    expect(await screen.findByLabelText('Beschreibung (optional)')).toHaveValue('Von woanders')
  })
})

describe('TimerBar', () => {
  it('zeigt auf anderen Seiten Projekt, Zeit und «Stopp»; der Link führt zur Startseite', async () => {
    renderWith(fakeRepository(RUNNING), <TimerBarDesktop />)

    const bar = await screen.findByRole('region', { name: 'Laufender Timer' })
    expect(within(bar).getByText('Allgemein')).toBeInTheDocument()
    expect(within(bar).getByRole('timer')).toHaveTextContent(/^0:47:\d\d$/)
    expect(within(bar).getByRole('link')).toHaveAttribute('href', '/')
    expect(within(bar).getByRole('button', { name: 'Stopp' })).toBeInTheDocument()
  })

  it('stoppt aus der Leiste', async () => {
    const repo = fakeRepository(RUNNING)
    renderWith(repo, <TimerBarDesktop />)
    fireEvent.click(await screen.findByRole('button', { name: 'Stopp' }))
    await waitFor(() => expect(repo.stopTimer).toHaveBeenCalledWith(''))
  })

  it('ist auf der Startseite ausgeblendet (dort steht die Karte)', async () => {
    pathname = '/'
    const repo = fakeRepository(RUNNING)
    renderWith(repo, <TimerBarDesktop />)
    await waitFor(() => expect(repo.getTimer).toHaveBeenCalled())
    expect(screen.queryByRole('region', { name: 'Laufender Timer' })).not.toBeInTheDocument()
  })

  it('ist ohne laufenden Timer nicht da', async () => {
    const repo = fakeRepository(null)
    renderWith(repo, <TimerBarDesktop />)
    await waitFor(() => expect(repo.getTimer).toHaveBeenCalled())
    expect(screen.queryByRole('region', { name: 'Laufender Timer' })).not.toBeInTheDocument()
  })
})

describe('Tab-Titel', () => {
  it('zeigt Zeit und Kürzel vor dem Titel und stellt ihn nach dem Stopp wieder her', async () => {
    const repo = fakeRepository(RUNNING)
    renderWith(repo, <TimerCard />)

    await waitFor(() => expect(document.title).toBe('0:47 · MUS · Time Tracker Light'))
    fireEvent.click(screen.getByRole('button', { name: 'Stopp' }))
    await waitFor(() => expect(document.title).toBe('Time Tracker Light'))
  })
})
