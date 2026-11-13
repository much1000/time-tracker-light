import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryCustomersRepository } from '@/lib/customers/in-memory-repository'
import { MockTimeEntriesRepository } from '@/lib/time-entries/mock-repository'
import { todayInZurich } from '@/lib/time-entries/zurich'
import { TodayView } from './today-view'

let customers: InMemoryCustomersRepository
let entries: MockTimeEntriesRepository

vi.mock('@/lib/time-entries', async () => {
  const actual = await vi.importActual<typeof import('@/lib/time-entries/errors')>(
    '@/lib/time-entries/errors'
  )
  return {
    ...actual,
    getTimeEntriesRepository: () => entries,
    resetPreviewEntries: () => entries.reset(),
  }
})
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  customers = new InMemoryCustomersRepository(0)
  entries = new MockTimeEntriesRepository(customers, null, 0)
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  // Radix Select braucht diese Browser-Funktionen, die jsdom nicht kennt.
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
})

function click(element: HTMLElement) {
  fireEvent.click(element)
}

function type(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } })
}

// Kunde «MUS» mit Projekt «Allgemein» und ein erster Eintrag, damit Kunde und Projekt vorbelegt sind.
async function seedCustomerWithEntry(extra: Partial<Parameters<typeof entries.createEntry>[0]> = {}) {
  const customer = await customers.createCustomer({ code: 'MUS', name: 'Muster AG' })
  const detail = await customers.getCustomer(customer.id)
  const projectId = detail!.projects[0].id
  await entries.createEntry({
    projectId,
    date: todayInZurich(),
    durationMinutes: 60,
    billableMinutes: 60,
    startTime: null,
    endTime: null,
    description: 'Erster Eintrag',
    ...extra,
  })
  return { customerId: customer.id, projectId }
}

async function openForm() {
  click(await screen.findByRole('button', { name: 'Zeit erfassen' }))
  await screen.findByRole('dialog')
  await screen.findByLabelText('Datum')
}

describe('TodayView', () => {
  it('zeigt ohne Einträge den Leerzustand mit Titel «Heute» und Knopf «Zeit erfassen»', async () => {
    render(<TodayView />)
    expect(await screen.findByText('Heute noch nichts erfasst')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Heute' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Zeit erfassen' }).length).toBeGreaterThan(0)
  })

  it('zeigt die heutigen Einträge mit Tagessumme und ohne Bearbeiten oder Löschen', async () => {
    await seedCustomerWithEntry({ durationMinutes: 150, billableMinutes: 90 })
    render(<TodayView />)
    const list = await screen.findByRole('list')
    expect(within(list).getByText('2:30')).toBeInTheDocument()
    expect(within(list).getByText('verrechenbar 1:30')).toBeInTheDocument()
    expect(within(list).getByText('Erster Eintrag')).toBeInTheDocument()
    expect(screen.getByText('Gearbeitet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /löschen|bearbeiten/i })).not.toBeInTheDocument()
  })

  it('zeigt bei einem Ladefehler eine Meldung mit «Erneut versuchen»', async () => {
    vi.spyOn(entries, 'listEntries').mockRejectedValueOnce(new Error('offline'))
    render(<TodayView />)
    expect(await screen.findByRole('alert')).toHaveTextContent('konnten nicht geladen werden')
    click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(await screen.findByText('Heute noch nichts erfasst')).toBeInTheDocument()
  })
})

describe('Formular «Zeit erfassen»', () => {
  it('weist ohne aktiven Kunden auf die Kundenverwaltung hin', async () => {
    render(<TodayView />)
    await openForm().catch(() => undefined)
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(/Lege zuerst einen Kunden an/)).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Zu den Kunden' })).toHaveAttribute('href', '/kunden')
    expect(within(dialog).queryByRole('button', { name: 'Speichern' })).not.toBeInTheDocument()
  })

  it('belegt Kunde, Projekt und Datum vor und folgt mit «Verrechenbar» der Dauer', async () => {
    await seedCustomerWithEntry()
    render(<TodayView />)
    await openForm()

    expect(screen.getByLabelText('Datum')).toHaveValue(todayInZurich())
    expect(screen.getByLabelText('Kunde')).toHaveTextContent('MUS · Muster AG')
    expect(screen.getByLabelText('Projekt')).toHaveTextContent('Allgemein')

    type(screen.getByLabelText('Dauer'), '1,5')
    await waitFor(() => expect(screen.getByLabelText('Verrechenbar')).toHaveValue('1:30'))

    // Von Hand geändert: bleibt stehen, auch wenn sich die Dauer ändert
    type(screen.getByLabelText('Verrechenbar'), '1:00')
    type(screen.getByLabelText('Dauer'), '2:00')
    await waitFor(() => expect(screen.getByLabelText('Dauer')).toHaveValue('2:00'))
    expect(screen.getByLabelText('Verrechenbar')).toHaveValue('1:00')
  })

  it('speichert einen Eintrag: Formular schliesst, Eintrag und Tagessumme erscheinen', async () => {
    await seedCustomerWithEntry()
    render(<TodayView />)
    await openForm()

    type(screen.getByLabelText('Dauer'), '1:30')
    type(screen.getByLabelText('Beschreibung (optional)'), 'Konzept überarbeitet')
    click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Konzept überarbeitet')).toBeInTheDocument()
    // 1:00 (Erster Eintrag) + 1:30 = 2:30, gearbeitet und verrechenbar
    expect(screen.getAllByText('2:30', { selector: 'p.text-2xl' })).toHaveLength(2)
  })

  it('meldet Pflichtfelder und mehrdeutige Dauer am Feld und speichert nichts', async () => {
    await seedCustomerWithEntry()
    render(<TodayView />)
    await openForm()

    click(screen.getByRole('button', { name: 'Speichern' }))
    expect(await screen.findByText('Bitte gib eine Dauer ein.')).toBeInTheDocument()
    expect(screen.getByLabelText('Dauer')).toHaveAttribute('aria-invalid', 'true')

    type(screen.getByLabelText('Dauer'), '90')
    click(screen.getByRole('button', { name: 'Speichern' }))
    expect(await screen.findByText(/Bitte als Std:Min eingeben/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await entries.listEntries(todayInZurich())).toHaveLength(1)
  })

  it('lehnt eine verrechenbare Dauer über der gearbeiteten ab, die Eingabe bleibt erhalten', async () => {
    await seedCustomerWithEntry()
    render(<TodayView />)
    await openForm()
    type(screen.getByLabelText('Dauer'), '1:00')
    type(screen.getByLabelText('Verrechenbar'), '2:00')
    click(screen.getByRole('button', { name: 'Speichern' }))
    expect(await screen.findByText(/nicht grösser sein als die gearbeitete Dauer/)).toBeInTheDocument()
    expect(screen.getByLabelText('Verrechenbar')).toHaveValue('2:00')
  })

  it('lehnt ein Datum in der Zukunft ab', async () => {
    await seedCustomerWithEntry()
    render(<TodayView />)
    await openForm()
    type(screen.getByLabelText('Datum'), '2999-01-01')
    type(screen.getByLabelText('Dauer'), '1:00')
    click(screen.getByRole('button', { name: 'Speichern' }))
    expect(await screen.findByText('Das Datum darf nicht in der Zukunft liegen.')).toBeInTheDocument()
  })

  it('berechnet bei von–bis die Dauer und weist auf Überschneidungen hin, Speichern bleibt möglich', async () => {
    await seedCustomerWithEntry({ startTime: '08:00', endTime: '09:00' })
    render(<TodayView />)
    await openForm()

    // Radix Tabs reagieren auf mouseDown
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Von–bis' }), { button: 0, ctrlKey: false })
    type(await screen.findByLabelText('Von'), '08:30')
    type(screen.getByLabelText('Bis'), '09:45')

    expect(await screen.findByText('Dauer: 1:15')).toBeInTheDocument()
    expect(await screen.findByText(/Überschneidung mit MUS · Allgemein \(08:00–09:00\)/)).toBeInTheDocument()
    expect(screen.getByLabelText('Verrechenbar')).toHaveValue('1:15')
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeEnabled()
  })

  it('zeigt bei einem Speicherfehler eine Meldung und behält die Eingaben', async () => {
    await seedCustomerWithEntry()
    vi.spyOn(entries, 'createEntry').mockRejectedValueOnce(new Error('offline'))
    render(<TodayView />)
    await openForm()
    type(screen.getByLabelText('Dauer'), '1:30')
    click(screen.getByRole('button', { name: 'Speichern' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Das hat nicht geklappt')
    expect(screen.getByLabelText('Dauer')).toHaveValue('1:30')
  })
})
