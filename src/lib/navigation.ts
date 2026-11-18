import { Activity, CalendarCheck, CalendarDays, CalendarRange, Home, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

// Einzige Stelle, an der Navigationseinträge stehen. Seitenleiste und
// Tab-Leiste lesen beide diese Liste: Ein neues Feature trägt sich hier ein.
// Auf dem Handy passen höchstens sechs Einträge in die Tab-Leiste (bei 320 px je rund 53 px breit).
export const navItems: NavItem[] = [
  { href: '/', label: 'Start', icon: Home },
  { href: '/woche', label: 'Woche', icon: CalendarRange },
  { href: '/monat', label: 'Monat', icon: CalendarCheck },
  { href: '/zeiten', label: 'Zeiten', icon: CalendarDays },
  { href: '/kunden', label: 'Kunden', icon: Users },
  { href: '/status', label: 'Status', icon: Activity },
]

// Die Startseite gilt nur bei exakter Adresse als aktiv, alle anderen
// Einträge auch für ihre Unterseiten.
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
