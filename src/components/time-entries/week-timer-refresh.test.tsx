import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryCustomersRepository } from '@/lib/customers/in-memory-repository'
import { InMemoryTimeEntriesRepository } from '@/lib/time-entries/in-memory-repository'
import { todayInZurich } from '@/lib/time-entries/zurich'
import { WeekView } from './week-view'

// PROJ-7 QA: Stoppt der Timer (oder wird eine Zeit erfasst), zählt der «Einträge geändert»-Zähler hoch,
// und die Woche lädt ohne manuelles Neuladen neu.

let customers: InMemoryCustomersRepository
let entries: InMemoryTimeEntriesRepository
let version = 0

vi.mock('@/lib/time-entries', async () => {
  const actual = await vi.importActual<typeof import('@/lib/time-entries/errors')>('@/lib/time-entries/errors')
  return { ...actual, getTimeEntriesRepository: () => entries }
})
vi.mock('@/lib/customers', () => ({ getCustomersRepository: () => customers }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/woche',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/timer/timer-provider', () => ({ useTimer: () => ({ entriesVersion: version }) }))

beforeEach(() => {
  customers = new InMemoryCustomersRepository(0)
  entries = new InMemoryTimeEntriesRepository(customers, 0)
  version = 0
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})

describe('Woche: Aktualisierung durch den Timer', () => {
  it('lädt neu und zeigt den neuen Eintrag samt Summen, sobald der Zähler steigt', async () => {
    const customer = await customers.createCustomer({ code: 'MUS', name: 'Muster AG' })
    const projectId = (await customers.getCustomer(customer.id))!.projects[0].id
    const view = render(<WeekView />)
    expect(await screen.findByText('Keine Einträge in dieser Woche')).toBeTruthy()

    await entries.createEntry({
      projectId, date: todayInZurich(), durationMinutes: 45, billableMinutes: 45,
      startTime: null, endTime: null, description: 'Vom Timer',
    })
    version = 1
    view.rerender(<WeekView />)

    const grid = within(await screen.findByTestId('week-grid'))
    await waitFor(() => expect(grid.getAllByText('0:45').length).toBeGreaterThan(0))
    expect(screen.queryByText('Keine Einträge in dieser Woche')).toBeNull()
  })
})
