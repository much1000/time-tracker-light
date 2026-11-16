import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryCustomersRepository } from '@/lib/customers/in-memory-repository'
import { InMemoryTimeEntriesRepository } from '@/lib/time-entries/in-memory-repository'
import { addDays, currentWeek, formatWeekLabel, shiftWeek, weekStart } from '@/lib/time-entries/week'
import { formatLongDate, todayInZurich } from '@/lib/time-entries/zurich'
import { WeekView } from './week-view'

let customers: InMemoryCustomersRepository
let entries: InMemoryTimeEntriesRepository
let search = new URLSearchParams()
const push = vi.fn()

vi.mock('@/lib/time-entries', async () => {
  const actual = await vi.importActual<typeof import('@/lib/time-entries/errors')>('@/lib/time-entries/errors')
  return { ...actual, getTimeEntriesRepository: () => entries }
})
vi.mock('@/lib/customers', () => ({ getCustomersRepository: () => customers }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/woche',
  useSearchParams: () => search,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

beforeEach(() => {
  customers = new InMemoryCustomersRepository(0)
  entries = new InMemoryTimeEntriesRepository(customers, 0)
  search = new URLSearchParams()
  push.mockReset()
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
})

const click = (element: HTMLElement) => fireEvent.click(element)
const type = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } })

async function seedProject(code: string, name: string) {
  const customer = await customers.createCustomer({ code, name })
  const detail = await customers.getCustomer(customer.id)
  return { customerId: customer.id, projectId: detail!.projects[0].id }
}

function entryInput(projectId: string, overrides: Partial<Parameters<typeof entries.createEntry>[0]> = {}) {
  return {
    projectId,
    date: todayInZurich(),
    durationMinutes: 60,
    billableMinutes: 60,
    startTime: null,
    endTime: null,
    description: 'Beschrieben',
    ...overrides,
  }
}

const grid = () => within(screen.getByTestId('week-grid'))
const cards = () => within(screen.getByTestId('week-day-cards'))
// Wartet, bis die Woche geladen ist (Raster bzw. Tageskarten sind erst danach da)
async function loadedGrid() {
  return within(await screen.findByTestId('week-grid'))
}
async function loadedCards() {
  return within(await screen.findByTestId('week-day-cards'))
}

describe('Seite «Woche»: Anzeige', () => {
  it('zeigt die aktuelle Woche mit Raster, Zellen, Summen und der Markierung «Heute»', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 90, billableMinutes: 60 }))
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 30, billableMinutes: 30, description: null }))
    render(<WeekView />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Woche' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: formatWeekLabel(currentWeek()) })).toBeInTheDocument()
    // Wochensumme: 1:30 + 0:30 = 2:00 gearbeitet, 1:30 verrechenbar
    expect(await screen.findByText('Gearbeitet in der Woche')).toBeInTheDocument()
    expect(screen.getByText('2:00', { selector: 'p.text-2xl' })).toBeInTheDocument()
    expect(screen.getByText('1:30', { selector: 'p.text-2xl' })).toBeInTheDocument()

    // Raster: Tabelle mit Zeilenkopf «MUS · Allgemein», Zelle mit Name für Screenreader, Summen
    const table = grid().getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Projekt' })).toBeInTheDocument()
    expect(within(table).getByRole('rowheader', { name: /MUS.*Allgemein.*Muster AG/ })).toBeInTheDocument()
    expect(grid().getByRole('button', { name: `Muster AG Allgemein, ${formatLongDate(todayInZurich())}, 2 Stunden` })).toHaveTextContent('2:00')
    expect(grid().getByText('Heute')).toBeInTheDocument()
    expect(grid().getByText('2:00 gearbeitet')).toBeInTheDocument()
    expect(grid().getByText('1:30 verrechenbar')).toBeInTheDocument()
    expect(grid().getByRole('rowheader', { name: 'Gearbeitet' })).toBeInTheDocument()
    expect(grid().getByRole('rowheader', { name: 'Verrechenbar' })).toBeInTheDocument()
    // Sieben Tage als Spalten plus Projekt und Summe
    expect(within(table).getAllByRole('columnheader')).toHaveLength(9)
  })

  it('zeigt dieselben Daten als Tageskarten mit Markierung «Heute»', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 45, billableMinutes: 45 }))
    render(<WeekView />)

    const todayCard = (await (await loadedCards()).findByRole('heading', { level: 3, name: new RegExp(formatLongDate(todayInZurich())) })).closest(
      'section'
    ) as HTMLElement
    expect(within(todayCard).getByText('Heute')).toBeInTheDocument()
    expect(within(todayCard).getByText('0:45 gearbeitet · 0:45 verrechenbar')).toBeInTheDocument()
    expect(within(todayCard).getByRole('button', { name: /Muster AG Allgemein/ })).toHaveTextContent('0:45')
    // Sieben Karten, Tage ohne Einträge zeigen «–» (für Screenreader «Keine Einträge»)
    expect(cards().getAllByRole('heading', { level: 3 })).toHaveLength(7)
    expect(cards().getAllByText('Keine Einträge').length).toBeGreaterThanOrEqual(6)
  })

  it('zeigt Einträge anderer Wochen nicht und markiert archivierte Kunden', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const old = await seedProject('OLD', 'Alt GmbH')
    await entries.createEntry(entryInput(mus.projectId))
    await entries.createEntry(entryInput(old.projectId))
    await customers.archiveCustomer(old.customerId)
    const previous = shiftWeek(currentWeek(), -1)
    await entries.createEntry(entryInput(mus.projectId, { date: weekStart(previous), description: 'Vorwoche' }))
    render(<WeekView />)

    await (await loadedGrid()).findByRole('rowheader', { name: /MUS/ })
    expect(grid().getAllByRole('rowheader', { name: /archiviert/ })).toHaveLength(1)
    // Eine Zeile je Projekt mit Einträgen in dieser Woche (die Vorwoche zählt nicht)
    expect(grid().getByRole('rowheader', { name: /OLD.*archiviert/ })).toBeInTheDocument()
    expect(grid().queryAllByRole('button', { name: /Muster AG/ })).toHaveLength(1)
  })

  it('zeigt den Leerzustand mit «Zeit erfassen» und bei einem Ladefehler «Erneut versuchen»', async () => {
    vi.spyOn(entries, 'listWeek').mockRejectedValueOnce(new Error('offline'))
    render(<WeekView />)
    expect(await screen.findByRole('alert')).toHaveTextContent('konnten nicht geladen werden')
    click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(await screen.findByText('Keine Einträge in dieser Woche')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Zeit erfassen' }).length).toBeGreaterThan(0)
    // Die Wochennavigation bleibt bedienbar
    expect(screen.getByRole('button', { name: 'Vorherige Woche' })).toBeEnabled()
  })

  it('weist bei zu vielen Einträgen auf unvollständige Zahlen hin', async () => {
    vi.spyOn(entries, 'listWeek').mockResolvedValueOnce({ entries: [], truncated: true })
    render(<WeekView />)
    expect(await screen.findByText(/Die Zahlen dieser Woche sind unvollständig/)).toBeInTheDocument()
  })
})

describe('Seite «Woche»: Navigation', () => {
  it('blättert über die Adresse: zurück, vor und «Diese Woche»', async () => {
    const previous = shiftWeek(currentWeek(), -1)
    search = new URLSearchParams({ woche: previous })
    render(<WeekView />)

    expect(await screen.findByRole('heading', { level: 2, name: formatWeekLabel(previous) })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nächste Woche' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Diese Woche' })).toBeEnabled()

    click(screen.getByRole('button', { name: 'Vorherige Woche' }))
    expect(push).toHaveBeenLastCalledWith(`/woche?woche=${shiftWeek(previous, -1)}`, { scroll: false })
    // Die nächste Woche nach der Vorwoche ist die aktuelle: Adresse ohne Parameter
    click(screen.getByRole('button', { name: 'Nächste Woche' }))
    expect(push).toHaveBeenLastCalledWith('/woche', { scroll: false })
    click(screen.getByRole('button', { name: 'Diese Woche' }))
    expect(push).toHaveBeenLastCalledWith('/woche', { scroll: false })
  })

  it('sperrt «Nächste Woche» und «Diese Woche» in der aktuellen Woche', async () => {
    render(<WeekView />)
    await screen.findByText('Keine Einträge in dieser Woche')
    expect(screen.getByRole('button', { name: 'Nächste Woche' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Diese Woche' })).toBeDisabled()
  })

  it.each([['Quatsch'], [shiftWeek(currentWeek(), 1)], ['2025-W53'], ['']])(
    'fällt bei der ungültigen oder zukünftigen Woche «%s» auf die aktuelle Woche zurück',
    async (value) => {
      search = new URLSearchParams({ woche: value })
      render(<WeekView />)
      expect(await screen.findByRole('heading', { level: 2, name: formatWeekLabel(currentWeek()) })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Nächste Woche' })).toBeDisabled()
    }
  )

  it('lädt beim Wechsel der Woche deren Einträge', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const previous = shiftWeek(currentWeek(), -1)
    await entries.createEntry(entryInput(mus.projectId, { date: weekStart(previous), durationMinutes: 150, billableMinutes: 150 }))
    search = new URLSearchParams({ woche: previous })
    render(<WeekView />)
    expect(await (await loadedGrid()).findByRole('button', { name: /Muster AG Allgemein/ })).toHaveTextContent('2:30')
  })
})

describe('Seite «Woche»: Detail einer Zelle', () => {
  it('öffnet beim Antippen einer Zelle die Einträge mit Beschreibung und Aktionen', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 90, billableMinutes: 60, description: 'Konzept\nzweite Zeile', startTime: '08:00', endTime: '09:30' }))
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 30, billableMinutes: 30, description: null }))
    render(<WeekView />)

    click(await (await loadedGrid()).findByRole('button', { name: /Muster AG Allgemein/ }))
    const dialog = await screen.findByRole('dialog', { name: `MUS · Allgemein, ${formatLongDate(todayInZurich())}` })
    expect(within(dialog).getByText('2:00 gearbeitet · 1:30 verrechenbar')).toBeInTheDocument()
    expect(within(dialog).getByText(/Konzept/)).toBeInTheDocument()
    expect(within(dialog).getByText('08:00–09:30')).toBeInTheDocument()
    expect(within(dialog).getByText('Keine Beschreibung')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('button', { name: /bearbeiten$/ })).toHaveLength(2)
    expect(within(dialog).getAllByRole('button', { name: /löschen$/ })).toHaveLength(2)
  })

  it('öffnet dasselbe Detail aus einer Tageskarte', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { description: 'Aus der Karte' }))
    render(<WeekView />)
    click(await (await loadedCards()).findByRole('button', { name: /Muster AG Allgemein/ }))
    const dialog = await screen.findByRole('dialog', { name: /MUS · Allgemein/ })
    expect(within(dialog).getByText('Aus der Karte')).toBeInTheDocument()
  })

  it('gibt den Fokus nach dem Schliessen an die auslösende Zelle zurück', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId))
    render(<WeekView />)
    const cell = await (await loadedGrid()).findByRole('button', { name: /Muster AG Allgemein/ })
    cell.focus()
    click(cell)
    await screen.findByRole('dialog', { name: /MUS · Allgemein/ })
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(cell).toHaveFocus())
  })

  it('bearbeitet einen Eintrag im Detail; Detail, Raster und Summen zeigen sofort die neuen Werte', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 60, billableMinutes: 60, description: 'Alt' }))
    render(<WeekView />)

    click(await (await loadedGrid()).findByRole('button', { name: /Muster AG Allgemein/ }))
    const detail = await screen.findByRole('dialog', { name: /MUS · Allgemein/ })
    click(within(detail).getByRole('button', { name: /bearbeiten$/ }))
    const form = await screen.findByRole('dialog', { name: 'Zeit bearbeiten' })
    type(await within(form).findByLabelText('Dauer'), '2:00')
    type(within(form).getByLabelText('Beschreibung (optional)'), 'Neu')
    click(within(form).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Zeit bearbeiten' })).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalledWith('Änderung gespeichert.')
    // Das Detail bleibt offen und zeigt den neuen Stand
    const reopened = await screen.findByRole('dialog', { name: /MUS · Allgemein/ })
    expect(await within(reopened).findByText('Neu')).toBeInTheDocument()
    expect(within(reopened).getByText('2:00 gearbeitet · 1:00 verrechenbar')).toBeInTheDocument()
    expect(screen.getByText('2:00', { selector: 'p.text-2xl' })).toBeInTheDocument()
  })

  it('schliesst das Detail, wenn der letzte Eintrag der Zelle gelöscht wird, und zeigt den Leerzustand', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { description: 'Einziger' }))
    render(<WeekView />)

    click(await (await loadedGrid()).findByRole('button', { name: /Muster AG Allgemein/ }))
    const detail = await screen.findByRole('dialog', { name: /MUS · Allgemein/ })
    click(within(detail).getByRole('button', { name: /löschen$/ }))
    const confirm = await screen.findByRole('alertdialog')
    expect(within(confirm).getByText(/Einziger/)).toBeInTheDocument()
    click(within(confirm).getByRole('button', { name: 'Löschen' }))

    expect(await screen.findByText('Keine Einträge in dieser Woche')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalledWith('Eintrag gelöscht.')
    // Fokus auf der Wochenüberschrift (die Zelle gibt es nicht mehr)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Woche' })).toHaveFocus())
  })

  it('lässt das Detail offen, wenn nach dem Löschen noch ein Eintrag in der Zelle bleibt', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { description: 'Bleibt', durationMinutes: 60, billableMinutes: 60 }))
    await entries.createEntry(entryInput(mus.projectId, { description: 'Weg', durationMinutes: 30, billableMinutes: 30 }))
    render(<WeekView />)

    click(await (await loadedGrid()).findByRole('button', { name: /Muster AG Allgemein/ }))
    const detail = await screen.findByRole('dialog', { name: /MUS · Allgemein/ })
    click(within(detail).getByRole('button', { name: /0:30 löschen$/ }))
    click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Löschen' }))

    await waitFor(() => expect(screen.queryByText('Weg')).not.toBeInTheDocument())
    const stillOpen = screen.getByRole('dialog', { name: /MUS · Allgemein/ })
    expect(within(stillOpen).getByText('Bleibt')).toBeInTheDocument()
    expect(within(stillOpen).getByText('1:00 gearbeitet · 1:00 verrechenbar')).toBeInTheDocument()
  })

  it('verschiebt man einen Eintrag in die Vorwoche, verschwindet er aus Zelle, Raster und Summen', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const today = todayInZurich()
    await entries.createEntry(entryInput(mus.projectId, { date: today, description: 'Bleibt hier', durationMinutes: 30, billableMinutes: 30 }))
    await entries.createEntry(entryInput(mus.projectId, { date: today, description: 'Wandert', durationMinutes: 60, billableMinutes: 60 }))
    render(<WeekView />)

    click(await (await loadedGrid()).findByRole('button', { name: /Muster AG Allgemein/ }))
    const detail = await screen.findByRole('dialog', { name: /MUS · Allgemein/ })
    click(within(detail).getByRole('button', { name: /1:00 bearbeiten$/ }))
    const form = await screen.findByRole('dialog', { name: 'Zeit bearbeiten' })
    type(await within(form).findByLabelText('Datum'), addDays(weekStart(currentWeek()), -1))
    click(within(form).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Zeit bearbeiten' })).not.toBeInTheDocument())
    await waitFor(() => expect(screen.queryByText('Wandert')).not.toBeInTheDocument())
    const stillOpen = screen.getByRole('dialog', { name: /MUS · Allgemein/ })
    expect(within(stillOpen).getByText('Bleibt hier')).toBeInTheDocument()
    expect(within(stillOpen).getByText('0:30 gearbeitet · 0:30 verrechenbar')).toBeInTheDocument()
    // Gearbeitet und verrechenbar zeigen beide 0:30
    expect(screen.getAllByText('0:30', { selector: 'p.text-2xl' })).toHaveLength(2)
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/^Gespeichert am \d{2}\.\d{2}\.\d{4}\.$/))
  })
})
