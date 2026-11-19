import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryCustomersRepository } from '@/lib/customers/in-memory-repository'
import { TimeEntryError } from '@/lib/time-entries/errors'
import { InMemoryTimeEntriesRepository } from '@/lib/time-entries/in-memory-repository'
import { todayInZurich } from '@/lib/time-entries/zurich'
import { CsvExportButton } from './csv-export-button'

let customers: InMemoryCustomersRepository
let entries: InMemoryTimeEntriesRepository

vi.mock('@/lib/time-entries', async () => {
  const actual = await vi.importActual<typeof import('@/lib/time-entries/errors')>('@/lib/time-entries/errors')
  return { ...actual, getTimeEntriesRepository: () => entries }
})
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

let blobs: Blob[] = []
let clicked: { download: string; href: string }[] = []

beforeEach(() => {
  customers = new InMemoryCustomersRepository(0)
  entries = new InMemoryTimeEntriesRepository(customers, 0)
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  blobs = []
  clicked = []
  URL.createObjectURL = vi.fn((blob: Blob) => {
    blobs.push(blob)
    return 'blob:test'
  })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    clicked.push({ download: this.download, href: this.href })
  })
})

async function seed(count = 1, description: string | null = 'Konzept') {
  const customer = await customers.createCustomer({ code: 'MUS', name: 'Muster AG' })
  const projectId = (await customers.getCustomer(customer.id))!.projects[0].id
  for (let i = 0; i < count; i++) {
    await entries.createEntry({
      projectId,
      date: todayInZurich(),
      durationMinutes: 105,
      billableMinutes: 90,
      startTime: null,
      endTime: null,
      description,
    })
  }
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(blob)
  })
}

const button = () => screen.getByRole('button', { name: /CSV|Wird exportiert/ })

describe('Knopf «Als CSV exportieren»', () => {
  it('zeigt den Knopf im Ruhezustand', () => {
    render(<CsvExportButton />)
    expect(screen.getByRole('button', { name: 'Als CSV exportieren' })).toBeEnabled()
  })

  it('lädt alle Zeiten als Datei herunter und bestätigt mit der Zeilenzahl', async () => {
    await seed(2)
    render(<CsvExportButton />)
    fireEvent.click(button())

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('2 Zeilen exportiert.'))
    expect(clicked).toEqual([{ download: `zeiten-${todayInZurich()}.csv`, href: 'blob:test' }])
    expect(blobs).toHaveLength(1)
    const text = await readBlob(blobs[0])
    expect(text).toContain('Datum;Kunde;Kundenkürzel;Projekt;Beschreibung;Von;Bis;')
    expect(text.split('\r\n').filter(Boolean)).toHaveLength(3)
    expect(text).toContain(';Muster AG;MUS;Allgemein;Konzept;;;105;1.75;90;1.50')
    expect(button()).toBeEnabled()
  })

  it('sagt bei genau einer Zeile «1 Zeile exportiert.»', async () => {
    await seed(1)
    render(<CsvExportButton />)
    fireEvent.click(button())
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('1 Zeile exportiert.'))
  })

  it('liefert ohne Zeiten keine Datei, sondern die Meldung «Keine Zeiten vorhanden.»', async () => {
    render(<CsvExportButton />)
    fireEvent.click(button())
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Keine Zeiten vorhanden.'))
    expect(clicked).toHaveLength(0)
    expect(toast.success).not.toHaveBeenCalled()
    expect(button()).toBeEnabled()
  })

  it('sperrt den Knopf während des Exports und startet bei Doppelklick nur einen Export', async () => {
    await seed(1)
    const spy = vi.spyOn(entries, 'listEntriesPage')
    render(<CsvExportButton />)
    fireEvent.click(button())
    fireEvent.click(button())

    const running = button()
    expect(running).toHaveAttribute('aria-disabled', 'true')
    expect(running).not.toBeDisabled()
    expect(running).toHaveAttribute('aria-busy', 'true')
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(clicked).toHaveLength(1)
    expect(button()).toBeEnabled()
    expect(button()).toHaveAttribute('aria-busy', 'false')
    expect(button()).toHaveAttribute('aria-disabled', 'false')
  })

  it('zeigt bei nicht erreichbaren Daten eine Fehlermeldung, lädt nichts herunter und gibt den Knopf frei', async () => {
    await seed(1)
    vi.spyOn(entries, 'listEntriesPage').mockRejectedValue(new TimeEntryError('unreachable'))
    render(<CsvExportButton />)
    fireEvent.click(button())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('nicht erreichbar')))
    expect(clicked).toHaveLength(0)
    expect(blobs).toHaveLength(0)
    expect(button()).toBeEnabled()
  })

  it('zeigt bei abgelaufener Sitzung die Anmelde-Meldung', async () => {
    vi.spyOn(entries, 'listEntriesPage').mockRejectedValue(new TimeEntryError('session'))
    render(<CsvExportButton />)
    fireEvent.click(button())
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Anmeldung')))
    expect(clicked).toHaveLength(0)
  })

  it('liefert keine Datei, wenn sich der Bestand während des Exports ändert', async () => {
    await seed(2)
    const real = entries.listEntriesPage.bind(entries)
    let call = 0
    vi.spyOn(entries, 'listEntriesPage').mockImplementation(async (offset) => {
      const page = await real(offset)
      // Erster Block: nur ein Eintrag von zwei, zweiter Block meldet eine andere Gesamtzahl
      call++
      return call === 1 ? { entries: page.entries.slice(0, 1), total: page.total } : { entries: [], total: page.total + 1 }
    })
    render(<CsvExportButton />)
    fireEvent.click(button())
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Export erneut')))
    expect(clicked).toHaveLength(0)
  })
})
