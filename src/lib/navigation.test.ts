import { describe, expect, it } from 'vitest'
import { isNavItemActive, navItems } from './navigation'

describe('isNavItemActive', () => {
  it('markiert die Startseite nur bei exakter Adresse', () => {
    expect(isNavItemActive('/', '/')).toBe(true)
    expect(isNavItemActive('/status', '/')).toBe(false)
  })

  it('markiert einen Eintrag für seine Seite und Unterseiten', () => {
    expect(isNavItemActive('/status', '/status')).toBe(true)
    expect(isNavItemActive('/status/details', '/status')).toBe(true)
  })

  it('verwechselt Adressen mit gleichem Anfang nicht', () => {
    expect(isNavItemActive('/statusbericht', '/status')).toBe(false)
  })
})

describe('navItems', () => {
  it('enthält Start und Status mit eindeutigen Adressen', () => {
    expect(navItems.map((item) => item.label)).toEqual(['Start', 'Status'])
    expect(new Set(navItems.map((item) => item.href)).size).toBe(navItems.length)
  })

  it('passt in die Tab-Leiste (höchstens fünf Einträge)', () => {
    expect(navItems.length).toBeLessThanOrEqual(5)
  })
})
