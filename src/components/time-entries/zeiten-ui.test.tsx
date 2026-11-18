import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryCustomersRepository } from '@/lib/customers/in-memory-repository'
import { InMemoryTimeEntriesRepository } from '@/lib/time-entries/in-memory-repository'
import { currentMonth, shiftMonth } from '@/lib/time-entries/month'
import { todayInZurich } from '@/lib/time-entries/zurich'
import { ZeitenView } from './zeiten-view'

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
  usePathname: () => '/zeiten',
  useSearchParams: () => search,
}))
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

describe('Seite «Zeiten»', () => {
  it('zeigt den Knopf «Als CSV exportieren» auch in einem leeren Monat', async () => {
    search = new URLSearchParams({ monat: shiftMonth(currentMonth(), -1) })
    render(<ZeitenView />)
    expect(await screen.findByRole('button', { name: 'Als CSV exportieren' })).toBeEnabled()
    expect(screen.getAllByRole('button', { name: /Zeit erfassen/ }).length).toBeGreaterThan(0)
  })

  it('zeigt den aktuellen Monat mit Summen, Tagesgruppen und der Markierung «Keine Beschreibung»', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 90, billableMinutes: 60 }))
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 30, billableMinutes: 30, description: null }))
    render(<ZeitenView />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Zeiten' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /^\p{L}+ \d{4}$/u })).toBeInTheDocument()
    // Monatssumme: 1:30 + 0:30 = 2:00 gearbeitet, 1:30 verrechenbar
    expect(await screen.findByText('Gearbeitet im Monat')).toBeInTheDocument()
    expect(screen.getByText('2:00', { selector: 'p.text-2xl' })).toBeInTheDocument()
    expect(screen.getByText('1:30', { selector: 'p.text-2xl' })).toBeInTheDocument()
    expect(screen.getByText('2:00 gearbeitet · 1:30 verrechenbar')).toBeInTheDocument()
    expect(screen.getByText('Keine Beschreibung')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nächster Monat' })).toBeDisabled()
  })

  it('blättert über die Adresse in den Vormonat und lädt dessen Einträge', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const lastMonth = shiftMonth(currentMonth(), -1)
    await entries.createEntry(entryInput(mus.projectId, { date: `${lastMonth}-05`, description: 'Vormonat' }))
    search = new URLSearchParams({ monat: lastMonth })
    render(<ZeitenView />)

    expect(await screen.findByText('Vormonat')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nächster Monat' })).toBeEnabled()
    click(screen.getByRole('button', { name: 'Nächster Monat' }))
    expect(push).toHaveBeenCalledWith('/zeiten', { scroll: false })
    click(screen.getByRole('button', { name: 'Vorheriger Monat' }))
    expect(push).toHaveBeenCalledWith(`/zeiten?monat=${shiftMonth(lastMonth, -1)}`, { scroll: false })
  })

  it('fällt bei einem ungültigen oder zukünftigen Monat auf den aktuellen zurück', async () => {
    search = new URLSearchParams({ monat: shiftMonth(currentMonth(), 1) })
    render(<ZeitenView />)
    expect(await screen.findByText(/Keine Einträge im/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nächster Monat' })).toBeDisabled()
  })

  it('filtert nach Kunde und «ohne Beschreibung» aus der Adresse, mit «Filter zurücksetzen»', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const abc = await seedProject('ABC', 'Abc GmbH')
    await entries.createEntry(entryInput(mus.projectId, { description: 'Muster mit Text' }))
    await entries.createEntry(entryInput(abc.projectId, { description: 'Abc mit Text' }))
    await entries.createEntry(entryInput(abc.projectId, { description: null }))
    search = new URLSearchParams({ kunde: abc.customerId, 'ohne-beschreibung': '1' })
    render(<ZeitenView />)

    expect(await screen.findByText('Keine Beschreibung')).toBeInTheDocument()
    expect(screen.queryByText('Muster mit Text')).not.toBeInTheDocument()
    expect(screen.queryByText('Abc mit Text')).not.toBeInTheDocument()
    click(screen.getByRole('button', { name: 'Filter zurücksetzen' }))
    expect(push).toHaveBeenCalledWith('/zeiten', { scroll: false })
  })

  it('zeigt bei einem Filter ohne Treffer «Keine Einträge für diesen Filter»', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const abc = await seedProject('ABC', 'Abc GmbH')
    await entries.createEntry(entryInput(mus.projectId))
    search = new URLSearchParams({ kunde: abc.customerId })
    render(<ZeitenView />)
    expect(await screen.findByText('Keine Einträge für diesen Filter')).toBeInTheDocument()
  })

  it('zeigt den Leerzustand mit «Zeit erfassen» und bei einem Ladefehler «Erneut versuchen»', async () => {
    vi.spyOn(entries, 'listMonth').mockRejectedValueOnce(new Error('offline'))
    render(<ZeitenView />)
    expect(await screen.findByRole('alert')).toHaveTextContent('konnten nicht geladen werden')
    click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(await screen.findByText(/Keine Einträge im/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Zeit erfassen' }).length).toBeGreaterThan(0)
  })

  it('weist bei zu vielen Einträgen auf die Obergrenze hin', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId))
    vi.spyOn(entries, 'listMonth').mockResolvedValueOnce({
      entries: (await entries.listEntries(todayInZurich())).slice(0, 1),
      truncated: true,
    })
    render(<ZeitenView />)
    expect(await screen.findByText(/Es werden nicht alle Einträge angezeigt, bitte Filter nutzen/)).toBeInTheDocument()
  })
})

describe('Bearbeiten auf der Seite «Zeiten»', () => {
  it('öffnet das Formular vorausgefüllt, speichert die Änderung und aktualisiert die Liste', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 90, billableMinutes: 60, description: 'Alt' }))
    render(<ZeitenView />)

    const day = todayInZurich().split('-')
    click(await screen.findByRole('button', { name: `Eintrag von ${day[2]}.${day[1]}., MUS · Allgemein, 1:30 bearbeiten` }))
    const dialog = await screen.findByRole('dialog', { name: 'Zeit bearbeiten' })
    expect(await within(dialog).findByLabelText('Dauer')).toHaveValue('1:30')
    expect(within(dialog).getByLabelText('Verrechenbar')).toHaveValue('1:00')
    expect(within(dialog).getByLabelText('Beschreibung (optional)')).toHaveValue('Alt')
    expect(within(dialog).getByLabelText('Kunde')).toHaveTextContent('MUS · Muster AG')

    type(within(dialog).getByLabelText('Dauer'), '2:00')
    // Die verrechenbare Dauer ist ein bewusster Wert und folgt beim Bearbeiten nicht
    expect(within(dialog).getByLabelText('Verrechenbar')).toHaveValue('1:00')
    type(within(dialog).getByLabelText('Beschreibung (optional)'), 'Neu')
    click(within(dialog).getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Neu')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Änderung gespeichert.')
    expect(screen.getByText('2:00 gearbeitet · 1:00 verrechenbar')).toBeInTheDocument()
  })

  it('wählt bei einem Eintrag mit Uhrzeiten «Von–bis» und bewahrt das Ende 24:00', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const yesterday = shiftDay(todayInZurich(), -1)
    await entries.createEntry(
      entryInput(mus.projectId, { date: yesterday, durationMinutes: 120, billableMinutes: 120, startTime: '22:00', endTime: '24:00' })
    )
    render(<ZeitenView />)

    click(await screen.findByRole('button', { name: /bearbeiten$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Zeit bearbeiten' })
    expect(await within(dialog).findByLabelText('Von')).toHaveValue('22:00')
    expect(within(dialog).getByLabelText('Bis Mitternacht (24:00)')).toBeChecked()
    expect(within(dialog).getByLabelText('Bis')).toBeDisabled()

    click(within(dialog).getByRole('button', { name: 'Speichern' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const [saved] = (await entries.listMonth({ month: yesterday.slice(0, 7) })).entries.filter((e) => e.date === yesterday)
    expect(saved).toMatchObject({ startTime: '22:00', endTime: '24:00', durationMinutes: 120 })
  })

  it('zeigt bei einem inzwischen gelöschten Eintrag den Hinweis und behält die Eingaben', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const created = await entries.createEntry(entryInput(mus.projectId, { description: 'Alt' }))
    render(<ZeitenView />)
    click(await screen.findByRole('button', { name: /bearbeiten$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Zeit bearbeiten' })
    await within(dialog).findByLabelText('Dauer')

    await entries.deleteEntry(created.id)
    type(within(dialog).getByLabelText('Beschreibung (optional)'), 'Neu')
    click(within(dialog).getByRole('button', { name: 'Speichern' }))

    expect(await within(dialog).findByText(/Dieser Eintrag existiert nicht mehr/)).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Beschreibung (optional)')).toHaveValue('Neu')
  })
})

describe('Löschen', () => {
  it('fragt mit Angaben zum Eintrag nach, Fokus auf «Abbrechen», und löscht nach Bestätigung', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { description: 'Erster' }))
    await entries.createEntry(entryInput(mus.projectId, { description: 'Zweiter', durationMinutes: 30, billableMinutes: 30 }))
    render(<ZeitenView />)

    click(await screen.findByRole('button', { name: /MUS · Allgemein, 0:30 löschen$/ }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/Zweiter/)).toBeInTheDocument()
    expect(within(dialog).getByText(/endgültig/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Abbrechen' })).toHaveFocus()

    click(within(dialog).getByRole('button', { name: 'Löschen' }))
    await waitFor(() => expect(screen.queryByText('Zweiter')).not.toBeInTheDocument())
    expect(screen.getByText('Erster')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Eintrag gelöscht.')
    expect(screen.getByText('1:00 gearbeitet · 1:00 verrechenbar')).toBeInTheDocument()
  })

  it('lässt bei «Abbrechen» alles unverändert', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { description: 'Bleibt' }))
    render(<ZeitenView />)
    click(await screen.findByRole('button', { name: /löschen$/ }))
    click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Abbrechen' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByText('Bleibt')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('meldet einen Fehler und behält den Eintrag', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { description: 'Bleibt' }))
    vi.spyOn(entries, 'deleteEntry').mockRejectedValueOnce(new Error('offline'))
    render(<ZeitenView />)
    click(await screen.findByRole('button', { name: /löschen$/ }))
    click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Löschen' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(screen.getByText('Bleibt')).toBeInTheDocument()
  })

  it('meldet «existiert nicht mehr», wenn der Eintrag schon gelöscht wurde, und lädt neu', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const created = await entries.createEntry(entryInput(mus.projectId, { description: 'Weg' }))
    render(<ZeitenView />)
    click(await screen.findByRole('button', { name: /löschen$/ }))
    const dialog = await screen.findByRole('alertdialog')
    await entries.deleteEntry(created.id)
    click(within(dialog).getByRole('button', { name: 'Löschen' }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('existiert nicht mehr'))
    )
    await waitFor(() => expect(screen.queryByText('Weg')).not.toBeInTheDocument())
  })
})

function shiftDay(date: string, delta: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + delta)).toISOString().slice(0, 10)
}
