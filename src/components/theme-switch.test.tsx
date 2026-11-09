import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ThemeSwitch } from './theme-switch'

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: undefined, setTheme: vi.fn() }),
}))

// Das Öffnen des Menüs (drei Optionen, Auswahl bleibt erhalten) wird im E2E-Test
// geprüft, weil es echte Zeigerereignisse braucht.
describe('ThemeSwitch', () => {
  it('bietet in der Seitenleiste einen Knopf mit sichtbarem Text', () => {
    render(<ThemeSwitch />)

    expect(screen.getByRole('button', { name: 'Darstellung' })).toBeInTheDocument()
  })

  it('hat in der Kopfzeile einen reinen Symbol-Knopf mit Beschriftung', () => {
    render(<ThemeSwitch variant="icon" />)

    expect(
      screen.getByRole('button', { name: 'Darstellung wählen' })
    ).toBeInTheDocument()
  })
})
