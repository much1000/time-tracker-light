import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BottomTabBar } from './bottom-tab-bar'

const pathname = vi.fn<() => string>()

vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
}))

describe('BottomTabBar', () => {
  beforeEach(() => {
    pathname.mockReturnValue('/')
  })

  it('zeigt alle Einträge der Navigationsliste als Links', () => {
    render(<BottomTabBar />)

    expect(screen.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Status' })).toHaveAttribute(
      'href',
      '/status'
    )
  })

  it('markiert nur den aktuellen Eintrag mit aria-current', () => {
    pathname.mockReturnValue('/status')
    render(<BottomTabBar />)

    expect(screen.getByRole('link', { name: 'Status' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Start' })).not.toHaveAttribute(
      'aria-current'
    )
  })

  it('hebt den aktiven Eintrag nicht nur durch Farbe hervor (Fettschrift)', () => {
    render(<BottomTabBar />)

    expect(screen.getByRole('link', { name: 'Start' })).toHaveClass('font-bold')
    expect(screen.getByRole('link', { name: 'Status' })).not.toHaveClass('font-bold')
  })

  it('hat eine beschriftete Navigationsregion', () => {
    render(<BottomTabBar />)

    expect(screen.getByRole('navigation', { name: 'Hauptnavigation' })).toBeInTheDocument()
  })
})
