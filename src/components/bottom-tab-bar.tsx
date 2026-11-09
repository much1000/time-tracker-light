'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isNavItemActive, navItems } from '@/lib/navigation'
import { cn } from '@/lib/utils'

// Feste Tab-Leiste am unteren Rand, nur auf dem Handy (unter 768 px).
// Der Abstand nach unten berücksichtigt den Home-Indikator des Geräts.
export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href)
          return (
            <li key={href} className="flex-1">
              {/* Aktiv = Fettschrift + Balken oben + Hintergrund, nie nur Farbe. */}
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-14 flex-col items-center justify-center gap-1 px-2 text-xs ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-accent font-bold text-accent-foreground before:absolute before:inset-x-3 before:top-0 before:h-1 before:rounded-b-full before:bg-brand-text'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
