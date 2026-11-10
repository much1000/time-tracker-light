'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brand } from '@/components/brand'
import { LogoutButton } from '@/components/logout-button'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { isNavItemActive, navItems } from '@/lib/navigation'

// Seitenleiste für Tablet und Laptop. Auf dem Handy blendet das Layout sie aus.
export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="none" className="h-svh border-r">
      <SidebarHeader className="p-4">
        <Brand />
      </SidebarHeader>
      <SidebarContent className="px-2">
        <nav aria-label="Hauptnavigation">
          <SidebarMenu>
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isNavItemActive(pathname, href)
              return (
                <SidebarMenuItem key={href}>
                  {/* Aktiv = Fettschrift + Balken + Hintergrund, nie nur Farbe. */}
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    isActive={active}
                    className="relative data-[active=true]:font-bold data-[active=true]:before:absolute data-[active=true]:before:inset-y-2 data-[active=true]:before:left-0 data-[active=true]:before:w-1 data-[active=true]:before:rounded-full data-[active=true]:before:bg-brand-text"
                  >
                    <Link href={href} aria-current={active ? 'page' : undefined}>
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </nav>
      </SidebarContent>
      <SidebarFooter className="gap-2 p-4">
        <ThemeSwitch />
        <LogoutButton />
      </SidebarFooter>
    </Sidebar>
  )
}
