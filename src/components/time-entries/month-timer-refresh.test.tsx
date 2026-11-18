import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryCustomersRepository } from '@/lib/customers/in-memory-repository'
import { InMemoryTimeEntriesRepository } from '@/lib/time-entries/in-memory-repository'
import { currentMonth } from '@/lib/time-entries/month'
import { MonthView } from './month-view'

// PROJ-8: Stoppt der Timer (oder wird eine Zeit erfasst), zählt der «Einträge geändert»-Zähler hoch,
// und die Monatsauswertung lädt ohne manuelles Neuladen neu.

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
  usePathname: () => '/monat',
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

describe('Monat: Aktualisierung durch den Timer', () => {
  it('lädt neu und zeigt Summen und Rundung des neuen Eintrags, sobald der Zähler steigt', async () => {
    const customer = await customers.createCustomer({ code: 'MUS', name: 'Muster AG' })
    const projectId = (await customers.getCustomer(customer.id))!.projects[0].id
    const view = render(<MonthView />)
    expect(await screen.findByText('Keine Einträge in diesem Monat')).toBeTruthy()

    await entries.createEntry({
      projectId, date: `${currentMonth()}-01`, durationMinutes: 40, billableMinutes: 40,
      startTime: null, endTime: null, description: 'Vom Timer',
    })
    version = 1
    view.rerender(<MonthView />)

    const total = within(await screen.findByLabelText('Summe des Monats'))
    await waitFor(() => expect(total.getByText('Verrechenbar gerundet auf 15 Min.').nextElementSibling?.textContent).toBe('0:45'))
    expect(screen.queryByText('Keine Einträge in diesem Monat')).toBeNull()
  })
})
