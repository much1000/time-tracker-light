import { Activity, Home, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

// Einzige Stelle, an der Navigationseinträge stehen. Seitenleiste und
// Tab-Leiste lesen beide diese Liste: Ein neues Feature trägt sich hier ein.
// Auf dem Handy passen höchstens fünf Einträge in die Tab-Leiste.
export const navItems: NavItem[] = [
  { href: '/', label: 'Start', icon: Home },
  { href: '/status', label: 'Status', icon: Activity },
]

// Die Startseite gilt nur bei exakter Adresse als aktiv, alle anderen
// Einträge auch für ihre Unterseiten.
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
