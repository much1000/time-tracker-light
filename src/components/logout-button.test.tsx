import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogoutButton } from './logout-button'

const signOut = vi.fn()
const toastError = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signOut } }),
}))
vi.mock('sonner', () => ({ toast: { error: (message: string) => toastError(message) } }))

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', {
    value: { href: 'http://localhost/' },
    writable: true,
  })
})

describe('LogoutButton', () => {
  it('zeigt in der Seitenleiste Symbol und Text', () => {
    render(<LogoutButton />)
    expect(screen.getByRole('button', { name: 'Abmelden' })).toHaveTextContent('Abmelden')
  })

  it('hat in der Kopfzeile nur ein Symbol, aber eine Beschriftung für Screenreader', () => {
    render(<LogoutButton variant="icon" />)
    const button = screen.getByRole('button', { name: 'Abmelden' })
    expect(button).not.toHaveTextContent('Abmelden')
  })

  it('meldet ab und leitet zur Anmeldeseite', async () => {
    signOut.mockResolvedValue({ error: null })
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }))

    await waitFor(() => expect(window.location.href).toBe('/login'))
    expect(signOut).toHaveBeenCalledTimes(1)
    // Nur dieses Gerät abmelden (BUG-1): nie die Standardeinstellung «alle Geräte».
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('sperrt sich beim Abmelden und sendet nur einmal', async () => {
    signOut.mockReturnValue(new Promise(() => {}))
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }))

    const busy = await screen.findByRole('button', { name: /Abmelden …/ })
    expect(busy).toBeDisabled()
    fireEvent.click(busy)
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('zeigt bei Fehlern eine Meldung, bleibt auf der Seite und gibt den Knopf wieder frei', async () => {
    signOut.mockResolvedValue({ error: { message: 'Netzwerk' } })
    render(<LogoutButton />)
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Abmelden war nicht möglich. Bitte versuche es erneut.'))
    expect(window.location.href).toBe('http://localhost/')
    expect(screen.getByRole('button', { name: 'Abmelden' })).toBeEnabled()
  })
})
