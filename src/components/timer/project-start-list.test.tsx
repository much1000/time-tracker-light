import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookableCustomer } from '@/lib/time-entries'
import { ProjectStartList } from './project-start-list'
import { TimerProvider } from './timer-provider'

let listTargets: () => Promise<BookableCustomer[]>

vi.mock('@/lib/time-entries', () => ({
  getTimeEntriesRepository: () => ({ listTargets: () => listTargets() }),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const targets: BookableCustomer[] = [
  {
    id: 'c1',
    code: 'ABC',
    name: 'Abc GmbH',
    projects: [
      { id: 'p1', name: 'Allgemein' },
      { id: 'p2', name: 'Relaunch' },
    ],
  },
  { id: 'c2', code: 'MUS', name: 'Muster AG', projects: [{ id: 'p3', name: 'Allgemein' }] },
]

const idleRepository = {
  getTimer: vi.fn(async () => ({ timer: null, serverNow: '2026-11-14T10:00:00+00:00' })),
  startTimer: vi.fn(),
  stopTimer: vi.fn(),
  discardTimer: vi.fn(),
  saveDescription: vi.fn(),
}

function renderList() {
  return render(
    <TimerProvider repository={idleRepository}>
      <ProjectStartList />
    </TimerProvider>
  )
}

beforeEach(() => {
  listTargets = vi.fn(async () => targets)
  // Einfacher Speicher statt jsdom-localStorage (in dieser Umgebung nicht verfügbar)
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
    },
  })
})

describe('ProjectStartList', () => {
  it('zeigt alle aktiven Projekte nach Kunde gruppiert, je mit Start-Knopf', async () => {
    renderList()

    expect(await screen.findByRole('heading', { level: 3, name: 'Projekt starten (3)' })).toBeInTheDocument()
    expect(screen.getByText('Abc GmbH', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Muster AG', { exact: false })).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: /Timer starten/ })
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Timer starten: ABC · Allgemein',
      'Timer starten: ABC · Relaunch',
      'Timer starten: MUS · Allgemein',
    ])
    const abc = screen.getByText('Relaunch').closest('ul') as HTMLElement
    expect(within(abc).getAllByRole('listitem')).toHaveLength(2)
  })

  it('weist ohne aktive Kunden auf die Kundenverwaltung hin', async () => {
    listTargets = vi.fn(async () => [])
    renderList()
    expect(await screen.findByText(/Lege zuerst einen Kunden an/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zu den Kunden' })).toHaveAttribute('href', '/kunden')
    expect(screen.queryByRole('button', { name: /Timer starten/ })).not.toBeInTheDocument()
  })

  it('zeigt bei einem Ladefehler «Erneut versuchen» und danach die Liste', async () => {
    listTargets = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(targets)
    renderList()
    expect(await screen.findByRole('alert')).toHaveTextContent('konnten nicht geladen werden')
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Timer starten/ })).toHaveLength(3))
  })

  it('zeigt zuerst einen Ladezustand', async () => {
    let resolveTargets: (value: BookableCustomer[]) => void = () => undefined
    listTargets = vi.fn(() => new Promise<BookableCustomer[]>((resolve) => (resolveTargets = resolve)))
    renderList()
    expect(screen.getByRole('status', { name: 'Wird geladen' })).toBeInTheDocument()
    resolveTargets(targets)
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Wird geladen' })).not.toBeInTheDocument())
  })

  it('lässt sich einklappen und aufklappen, die Wahl bleibt erhalten', async () => {
    const first = renderList()
    const toggle = await screen.findByRole('button', { name: /Projekt starten \(3\)/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: /Timer starten/ })).not.toBeInTheDocument()
    expect(window.localStorage.getItem('tt-start-list-open')).toBe('0')

    // Neu geladen: bleibt eingeklappt
    first.unmount()
    renderList()
    const again = await screen.findByRole('button', { name: /Projekt starten \(3\)/ })
    expect(again).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: /Timer starten/ })).not.toBeInTheDocument()

    fireEvent.click(again)
    expect(screen.getAllByRole('button', { name: /Timer starten/ })).toHaveLength(3)
    expect(window.localStorage.getItem('tt-start-list-open')).toBe('1')
  })

  it('ist ohne gemerkte Wahl aufgeklappt', async () => {
    renderList()
    expect(await screen.findByRole('button', { name: /Projekt starten \(3\)/ })).toHaveAttribute('aria-expanded', 'true')
  })
})
