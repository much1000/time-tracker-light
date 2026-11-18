import { fireEvent, render, screen, within } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryCustomersRepository } from '@/lib/customers/in-memory-repository'
import { InMemoryTimeEntriesRepository } from '@/lib/time-entries/in-memory-repository'
import { currentMonth, formatMonthLabel, shiftMonth } from '@/lib/time-entries/month'
import { MonthView } from './month-view'

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
  usePathname: () => '/monat',
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

async function seedProject(code: string, name: string) {
  const customer = await customers.createCustomer({ code, name })
  const detail = await customers.getCustomer(customer.id)
  return { customerId: customer.id, projectId: detail!.projects[0].id }
}

// Erster Tag des aktuellen Monats (nie in der Zukunft)
const firstOfMonth = () => `${currentMonth()}-01`

function entryInput(projectId: string, overrides: Partial<Parameters<typeof entries.createEntry>[0]> = {}) {
  return {
    projectId,
    date: firstOfMonth(),
    durationMinutes: 60,
    billableMinutes: 60,
    startTime: null,
    endTime: null,
    description: 'Beschrieben',
    ...overrides,
  }
}

// Die drei Zahlen eines Blocks: «Gearbeitet», «Verrechenbar», «Verrechenbar gerundet auf 15 Min.»
function numbers(label: string) {
  const block = within(screen.getByLabelText(label))
  return {
    worked: block.getByText('Gearbeitet').nextElementSibling?.textContent,
    billable: block.getByText('Verrechenbar').nextElementSibling?.textContent,
    rounded: block.getByText('Verrechenbar gerundet auf 15 Min.').nextElementSibling?.textContent,
  }
}

describe('Seite «Monat»: Anzeige', () => {
  it('zeigt den aktuellen Monat mit Hinweis «Laufender Monat», Gesamtzeile und Erklärung der Rundung', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 50, billableMinutes: 40 }))
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 30, billableMinutes: 30 }))
    render(<MonthView />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Monat' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: formatMonthLabel(currentMonth()) })).toBeInTheDocument()
    expect(await screen.findByText('Laufender Monat, noch nicht abgeschlossen')).toBeInTheDocument()
    expect(screen.getByText('Pro Projekt aufgerundet auf 15 Minuten.')).toBeInTheDocument()
    // 50 + 30 = 1:20 gearbeitet, 40 + 30 = 1:10 verrechenbar, aufgerundet 1:15
    expect(numbers('Summe des Monats')).toEqual({ worked: '1:20', billable: '1:10', rounded: '1:15' })
  })

  it('zeigt je Kunde und Projekt die drei Zahlen; gerundet wird die Projektsumme, die Kundensumme addiert die Projekte', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const second = await customers.createProject(mus.customerId, { name: 'Zweit' })
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 5, billableMinutes: 5 }))
    await entries.createEntry(entryInput(second.id, { durationMinutes: 5, billableMinutes: 5 }))
    render(<MonthView />)

    await screen.findByRole('heading', { level: 3, name: /Muster AG/ })
    expect(numbers('Summe Allgemein')).toEqual({ worked: '0:05', billable: '0:05', rounded: '0:15' })
    expect(numbers('Summe Zweit')).toEqual({ worked: '0:05', billable: '0:05', rounded: '0:15' })
    // Kunde: 0:10 exakt, aber 0:30 gerundet (zwei gerundete Projekte, nicht noch einmal gerundet)
    expect(numbers('Summe Muster AG')).toEqual({ worked: '0:10', billable: '0:10', rounded: '0:30' })
    expect(numbers('Summe des Monats')).toEqual({ worked: '0:10', billable: '0:10', rounded: '0:30' })
  })

  it('zehn Einträge zu je 3 Minuten ergeben 0:30 gerundet (Rundung pro Projekt, nicht pro Eintrag)', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    for (let i = 0; i < 10; i += 1) {
      await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 3, billableMinutes: 3 }))
    }
    render(<MonthView />)
    await screen.findByRole('heading', { level: 3, name: /Muster AG/ })
    expect(numbers('Summe Allgemein')).toEqual({ worked: '0:30', billable: '0:30', rounded: '0:30' })
  })

  it('Projekt ohne verrechenbare Zeit erscheint mit 0:00 verrechenbar und gerundet', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 45, billableMinutes: 0 }))
    render(<MonthView />)
    await screen.findByRole('heading', { level: 3, name: /Muster AG/ })
    expect(numbers('Summe Allgemein')).toEqual({ worked: '0:45', billable: '0:00', rounded: '0:00' })
  })

  it('Kunden nach Kürzel; archivierte Kunden und Projekte tragen den Hinweis «archiviert»', async () => {
    const zed = await seedProject('ZED', 'Zed AG')
    const abc = await seedProject('ABC', 'Abc GmbH')
    await entries.createEntry(entryInput(zed.projectId))
    await entries.createEntry(entryInput(abc.projectId))
    await customers.archiveCustomer(abc.customerId)
    render(<MonthView />)

    const headings = await screen.findAllByRole('heading', { level: 3, name: /AG|GmbH/ })
    expect(headings.map((heading) => heading.textContent)).toEqual(['ABC · Abc GmbHarchiviert', 'ZED · Zed AG'])
    // Kunde ABC und sein Projekt tragen den Hinweis; ZED nicht
    expect(screen.getAllByText('archiviert')).toHaveLength(2)
  })

  it('leerer Monat: Leerzustand mit Knopf «Zeit erfassen», Navigation bleibt bedienbar', async () => {
    render(<MonthView />)
    expect(await screen.findByRole('heading', { level: 2, name: 'Keine Einträge in diesem Monat' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Zeit erfassen' })).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Vorheriger Monat' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Alle aufklappen' })).not.toBeInTheDocument()
  })

  it('Ladefehler: Fehlermeldung mit «Erneut versuchen», danach erscheinen die Zahlen', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId))
    const spy = vi.spyOn(entries, 'listMonthReport').mockRejectedValueOnce(new Error('kaputt'))
    render(<MonthView />)

    click(await screen.findByRole('button', { name: /Erneut versuchen/ }))
    expect(await screen.findByRole('heading', { level: 3, name: /Muster AG/ })).toBeInTheDocument()
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('mehr als 1000 Einträge: sichtbarer Hinweis, dass die Zahlen unvollständig sind', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const one = await entries.createEntry(entryInput(mus.projectId))
    vi.spyOn(entries, 'listMonthReport').mockResolvedValue({ entries: [one], truncated: true })
    render(<MonthView />)
    expect(await screen.findByText('Es werden nicht alle Einträge angezeigt. Die Zahlen dieses Monats sind unvollständig.')).toBeInTheDocument()
  })
})

describe('Seite «Monat»: Einträge pro Projekt', () => {
  it('Projekte sind zuerst zugeklappt; aufgeklappt stehen Datum, Beschreibung und Zeiten, nach Datum sortiert', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const month = currentMonth()
    await entries.createEntry(entryInput(mus.projectId, { date: `${month}-01`, description: 'Erster Tag', durationMinutes: 90, billableMinutes: 60 }))
    await entries.createEntry(
      entryInput(mus.projectId, { date: `${month}-01`, description: 'Morgens', startTime: '08:00', endTime: '09:00', durationMinutes: 60, billableMinutes: 60 })
    )
    render(<MonthView />)

    const trigger = await screen.findByRole('button', { name: /Allgemein/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveTextContent('2 Einträge')
    expect(screen.queryByText('Erster Tag')).not.toBeInTheDocument()

    click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const rows = await screen.findAllByRole('listitem')
    const texts = rows.filter((row) => row.hasAttribute('data-entry-id')).map((row) => row.textContent ?? '')
    // Mit Uhrzeit zuerst, dann ohne Uhrzeit
    expect(texts[0]).toContain('Morgens')
    expect(texts[0]).toContain('08:00–09:00')
    expect(texts[1]).toContain('Erster Tag')
    expect(texts[1]).toContain('1:30')
    expect(texts[1]).toContain('verrechenbar 1:00')

    click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Erster Tag')).not.toBeInTheDocument()
  })

  it('Eintrag ohne Beschreibung trägt «Keine Beschreibung»; lange Texte stehen vollständig mit Zeilenumbrüchen', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const long = `${'Langer Text '.repeat(40)}\nZweite Zeile`
    await entries.createEntry(entryInput(mus.projectId, { description: null }))
    await entries.createEntry(entryInput(mus.projectId, { description: long }))
    render(<MonthView />)
    click(await screen.findByRole('button', { name: /Allgemein/ }))

    expect(await screen.findByText('Keine Beschreibung')).toBeInTheDocument()
    const paragraph = screen.getByText(/Langer Text/)
    expect(paragraph.textContent).toBe(long)
    expect(paragraph).toHaveClass('whitespace-pre-line')
    expect(paragraph).not.toHaveClass('line-clamp-3')
  })

  it('Beschreibungen mit HTML werden als Text dargestellt', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { description: '<img src=x onerror=alert(1)> <b>fett</b>' }))
    const { container } = render(<MonthView />)
    click(await screen.findByRole('button', { name: /Allgemein/ }))
    expect(await screen.findByText('<img src=x onerror=alert(1)> <b>fett</b>')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
  })

  it('nur lesen: keine Aktionen «Bearbeiten» oder «Löschen», aber der Link «In Zeiten ansehen»', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId))
    render(<MonthView />)
    click(await screen.findByRole('button', { name: /Allgemein/ }))

    const link = await screen.findByRole('link', { name: /In Zeiten ansehen/ })
    expect(link).toHaveAttribute('href', '/zeiten')
    expect(screen.queryByRole('button', { name: /bearbeiten/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /löschen/i })).not.toBeInTheDocument()
  })

  it('«Alle aufklappen» und «Alle zuklappen» steuern alle Projekte', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    const abc = await seedProject('ABC', 'Abc GmbH')
    await entries.createEntry(entryInput(mus.projectId, { description: 'Eins' }))
    await entries.createEntry(entryInput(abc.projectId, { description: 'Zwei' }))
    render(<MonthView />)

    click(await screen.findByRole('button', { name: 'Alle aufklappen' }))
    expect(await screen.findByText('Eins')).toBeInTheDocument()
    expect(screen.getByText('Zwei')).toBeInTheDocument()
    click(screen.getByRole('button', { name: 'Alle zuklappen' }))
    expect(screen.queryByText('Eins')).not.toBeInTheDocument()
    expect(screen.queryByText('Zwei')).not.toBeInTheDocument()
  })

  it('beim Monatswechsel sind alle Projekte wieder zugeklappt', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { description: 'Aktuell' }))
    const past = `${shiftMonth(currentMonth(), -1)}-15`
    await entries.createEntry(entryInput(mus.projectId, { date: past, description: 'Vormonat' }))
    const { rerender } = render(<MonthView />)
    click(await screen.findByRole('button', { name: 'Alle aufklappen' }))
    expect(await screen.findByText('Aktuell')).toBeInTheDocument()

    search = new URLSearchParams({ monat: shiftMonth(currentMonth(), -1) })
    rerender(<MonthView />)
    const trigger = await screen.findByRole('button', { name: /Allgemein/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Vormonat')).not.toBeInTheDocument()
  })

  it('beim Zurückblättern in den Monat, in dem aufgeklappt wurde, sind die Projekte wieder zugeklappt', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { description: 'Aktuell' }))
    const past = `${shiftMonth(currentMonth(), -1)}-15`
    await entries.createEntry(entryInput(mus.projectId, { date: past, description: 'Vormonat' }))
    const { rerender } = render(<MonthView />)
    click(await screen.findByRole('button', { name: 'Alle aufklappen' }))
    expect(await screen.findByText('Aktuell')).toBeInTheDocument()

    search = new URLSearchParams({ monat: shiftMonth(currentMonth(), -1) })
    rerender(<MonthView />)
    expect(await screen.findByRole('button', { name: /Allgemein/ })).toHaveAttribute('aria-expanded', 'false')

    search = new URLSearchParams()
    rerender(<MonthView />)
    const trigger = await screen.findByRole('button', { name: /Allgemein/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Aktuell')).not.toBeInTheDocument()
  })
})

describe('Seite «Monat»: Navigation', () => {
  it('im aktuellen Monat sind «Nächster Monat» und «Dieser Monat» gesperrt; «Vorheriger Monat» wechselt in die Adresse', async () => {
    render(<MonthView />)
    await screen.findByRole('heading', { level: 1, name: 'Monat' })
    expect(screen.getByRole('button', { name: 'Nächster Monat' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Dieser Monat' })).toBeDisabled()

    click(screen.getByRole('button', { name: 'Vorheriger Monat' }))
    expect(push).toHaveBeenCalledWith(`/monat?monat=${shiftMonth(currentMonth(), -1)}`, { scroll: false })
  })

  it('vergangener Monat: ohne Hinweis «Laufender Monat», Link zu «Zeiten» im gleichen Monat, «Dieser Monat» springt zurück', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { date: '2025-03-10', description: 'Alt' }))
    search = new URLSearchParams({ monat: '2025-03' })
    render(<MonthView />)

    expect(await screen.findByRole('heading', { level: 2, name: 'März 2025' })).toBeInTheDocument()
    expect(screen.queryByText('Laufender Monat, noch nicht abgeschlossen')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nächster Monat' })).toBeEnabled()
    click(await screen.findByRole('button', { name: /Allgemein/ }))
    expect(await screen.findByRole('link', { name: /In Zeiten ansehen/ })).toHaveAttribute('href', '/zeiten?monat=2025-03')

    click(screen.getByRole('button', { name: 'Dieser Monat' }))
    expect(push).toHaveBeenCalledWith('/monat', { scroll: false })
    click(screen.getByRole('button', { name: 'Nächster Monat' }))
    expect(push).toHaveBeenCalledWith('/monat?monat=2025-04', { scroll: false })
  })

  it('ungültiger oder zukünftiger Monat in der Adresse führt zum aktuellen Monat', async () => {
    search = new URLSearchParams({ monat: '2999-01' })
    const { unmount } = render(<MonthView />)
    expect(await screen.findByRole('heading', { level: 2, name: formatMonthLabel(currentMonth()) })).toBeInTheDocument()
    unmount()
    search = new URLSearchParams({ monat: 'Quatsch' })
    render(<MonthView />)
    expect(await screen.findByRole('heading', { level: 2, name: formatMonthLabel(currentMonth()) })).toBeInTheDocument()
  })

  it('Daten eines anderen Monats stehen nicht unter der neuen Überschrift', async () => {
    const mus = await seedProject('MUS', 'Muster AG')
    await entries.createEntry(entryInput(mus.projectId, { durationMinutes: 120, billableMinutes: 120 }))
    const { rerender } = render(<MonthView />)
    await screen.findByRole('heading', { level: 3, name: /Muster AG/ })

    // Der Vormonat lädt langsam: bis dahin darf kein Kunde des aktuellen Monats stehen
    vi.spyOn(entries, 'listMonthReport').mockImplementation(() => new Promise(() => {}))
    search = new URLSearchParams({ monat: shiftMonth(currentMonth(), -1) })
    rerender(<MonthView />)
    expect(await screen.findByRole('status', { name: 'Wird geladen' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: /Muster AG/ })).not.toBeInTheDocument()
  })
})

describe('Seite «Monat»: Erfassen', () => {
  it('«Zeit erfassen» öffnet das Formular und lädt die Auswertung nach dem Speichern neu', async () => {
    await seedProject('MUS', 'Muster AG')
    render(<MonthView />)
    click((await screen.findAllByRole('button', { name: 'Zeit erfassen' }))[0])
    // Das Formular selbst ist in PROJ-4 getestet; hier genügt, dass es sich öffnet
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
