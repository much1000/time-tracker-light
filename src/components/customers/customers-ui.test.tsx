import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockCustomersRepository } from '@/lib/customers/mock-repository'
import { CustomerDetail } from './customer-detail'
import { CustomerList } from './customer-list'

let repository: MockCustomersRepository

vi.mock('@/lib/customers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/customers/errors')>(
    '@/lib/customers/errors'
  )
  return {
    ...actual,
    getCustomersRepository: () => repository,
    resetPreviewData: () => repository.reset(),
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
  repository = new MockCustomersRepository(null, 0)
  // Der Dialog-Rahmen fragt die Bildschirmbreite ab (Desktop-Darstellung).
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })
})

function click(element: HTMLElement) {
  fireEvent.click(element)
}

function type(element: HTMLElement, value: string) {
  fireEvent.change(element, { target: { value } })
}

async function createCustomerViaDialog(code: string, name: string) {
  type(screen.getByLabelText('Kürzel'), code)
  type(screen.getByLabelText('Name'), name)
  click(screen.getByRole('button', { name: 'Speichern' }))
}

describe('CustomerList', () => {
  it('zeigt ohne Kunden den Leerzustand mit Knopf «Ersten Kunden anlegen»', async () => {
    render(<CustomerList />)

    expect(await screen.findByText('Noch keine Kunden')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ersten Kunden anlegen' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Kunden' })).toBeInTheDocument()
  })

  it('legt einen Kunden an: Karte mit Kürzel in Grossbuchstaben und einem aktiven Projekt', async () => {
    render(<CustomerList />)
    click(await screen.findByRole('button', { name: 'Neuer Kunde' }))

    await createCustomerViaDialog('mus', 'Muster AG')

    const link = await screen.findByRole('link', { name: /MUS/ })
    expect(link).toHaveAttribute('href', expect.stringMatching(/^\/kunden\/.+/))
    expect(within(link).getByText('Muster AG')).toBeInTheDocument()
    expect(within(link).getByText('1 aktives Projekt')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('zeigt Pflichtfeld-Hinweise am Feld und speichert nichts', async () => {
    render(<CustomerList />)
    click(await screen.findByRole('button', { name: 'Neuer Kunde' }))
    click(screen.getByRole('button', { name: 'Speichern' }))

    expect(await screen.findByText('Bitte gib ein Kürzel ein.')).toBeInTheDocument()
    expect(screen.getByText('Bitte gib einen Namen ein.')).toBeInTheDocument()
    expect(await repository.listCustomers()).toHaveLength(0)
  })

  it('meldet ein doppeltes Kürzel am Feld, die Eingabe bleibt stehen', async () => {
    await repository.createCustomer({ code: 'MUS', name: 'Muster AG' })
    render(<CustomerList />)
    click(await screen.findByRole('button', { name: 'Neuer Kunde' }))

    await createCustomerViaDialog('mus', 'Anderer Name')

    expect(await screen.findByText('Dieses Kürzel gibt es schon.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Anderer Name')
  })

  it('führt archivierte Kunden im eingeklappten Archiv und lässt sie reaktivieren', async () => {
    const customer = await repository.createCustomer({ code: 'ALT', name: 'Alter Kunde' })
    await repository.archiveCustomer(customer.id)
    render(<CustomerList />)

    expect(await screen.findByText('Alle Kunden sind archiviert.')).toBeInTheDocument()
    click(screen.getByRole('button', { name: /Archiv \(1\)/ }))
    click(await screen.findByRole('button', { name: 'ALT reaktivieren' }))

    // Erst wenn das Archiv leer ist, hat die Seite neu geladen. Dann steht der Kunde als Karte da.
    await waitFor(() => expect(screen.queryByText(/Archiv \(/)).not.toBeInTheDocument())
    expect(screen.getByRole('link', { name: /ALT/ })).toHaveAttribute(
      'href',
      `/kunden/${customer.id}`
    )
    expect(screen.queryByText('Alle Kunden sind archiviert.')).not.toBeInTheDocument()
  })

  it('zeigt bei einem Ladefehler eine Meldung mit «Erneut versuchen»', async () => {
    vi.spyOn(repository, 'listCustomers').mockRejectedValueOnce(new Error('offline'))
    render(<CustomerList />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Die Daten konnten nicht geladen werden.')
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(await screen.findByText('Noch keine Kunden')).toBeInTheDocument()
  })
})

describe('CustomerDetail', () => {
  it('zeigt «Kunde nicht gefunden» für unbekannte Kennungen', async () => {
    render(<CustomerDetail customerId="gibt-es-nicht" />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Kunde nicht gefunden' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Alle Kunden/ })).toHaveAttribute('href', '/kunden')
  })

  it('zeigt Kunde und Projekt «Allgemein» und setzt den Seitentitel', async () => {
    const customer = await repository.createCustomer({ code: 'MUS', name: 'Muster AG' })
    render(<CustomerDetail customerId={customer.id} />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Muster AG' })).toBeInTheDocument()
    expect(screen.getByText('Allgemein')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Neues Projekt' })).toBeInTheDocument()
    expect(document.title).toBe('MUS · Time Tracker Light')
  })

  it('legt ein Projekt mit Nummer an und meldet doppelte Namen am Feld', async () => {
    const customer = await repository.createCustomer({ code: 'MUS', name: 'Muster AG' })
    render(<CustomerDetail customerId={customer.id} />)
    click(await screen.findByRole('button', { name: 'Neues Projekt' }))

    type(screen.getByLabelText('Name'), 'Relaunch')
    type(screen.getByLabelText(/Projektnummer/), 'P-2026')
    click(screen.getByRole('button', { name: 'Speichern' }))

    expect(await screen.findByText('Relaunch')).toBeInTheDocument()
    expect(screen.getByText('Nr. P-2026')).toBeInTheDocument()

    click(screen.getByRole('button', { name: 'Neues Projekt' }))
    type(screen.getByLabelText('Name'), 'allgemein')
    click(screen.getByRole('button', { name: 'Speichern' }))
    expect(
      await screen.findByText('Dieses Projekt gibt es bei diesem Kunden schon.')
    ).toBeInTheDocument()
  })

  it('fragt vor dem Archivieren eines Projekts zurück und verschiebt es ins Archiv', async () => {
    const customer = await repository.createCustomer({ code: 'MUS', name: 'Muster AG' })
    render(<CustomerDetail customerId={customer.id} />)

    click(await screen.findByRole('button', { name: 'Allgemein archivieren' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Erfasste Zeiten bleiben erhalten')
    click(within(dialog).getByRole('button', { name: 'Archivieren' }))

    expect(await screen.findByText('Lege ein Projekt an, um Zeiten zu erfassen.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Archiv \(1\)/ })).toBeInTheDocument()
  })

  it('archiviert einen Kunden samt Projekten und bietet danach nur «Reaktivieren» an', async () => {
    const customer = await repository.createCustomer({ code: 'MUS', name: 'Muster AG' })
    render(<CustomerDetail customerId={customer.id} />)

    click(await screen.findByRole('button', { name: 'Archivieren' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('alle seine aktiven Projekte')
    click(within(dialog).getByRole('button', { name: 'Archivieren' }))

    expect(await screen.findByRole('button', { name: 'Reaktivieren' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bearbeiten' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Neues Projekt' })).not.toBeInTheDocument()
    expect(screen.getByText(/Dieser Kunde ist archiviert/)).toBeInTheDocument()
  })

  it('hat nirgends einen Knopf «Löschen»', async () => {
    const customer = await repository.createCustomer({ code: 'MUS', name: 'Muster AG' })
    render(<CustomerDetail customerId={customer.id} />)
    await screen.findByRole('heading', { level: 1, name: 'Muster AG' })

    expect(screen.queryByRole('button', { name: /lösch/i })).not.toBeInTheDocument()
  })
})
