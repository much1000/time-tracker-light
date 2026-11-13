import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { BottomTabBar } from '@/components/bottom-tab-bar'
import { MobileHeader } from '@/components/mobile-header'
import { TimerBarDesktop, TimerBarMobile } from '@/components/timer/timer-bar'
import { TimerProvider } from '@/components/timer/timer-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

interface AppShellProps {
  children: ReactNode
}

// Rahmen für alle Seiten mit Navigation. Die Umschaltung zwischen Seitenleiste
// (ab 768 px) und Kopfzeile plus Tab-Leiste (darunter) macht allein das Stylesheet.
export function AppShell({ children }: AppShellProps) {
  return (
    <TimerProvider>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      >
        Zum Inhalt springen
      </a>
      <SidebarProvider className="items-start">
        <div className="sticky top-0 hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          {/* SidebarInset ist selbst das einzige <main>. Kopfzeile und Tab-Leiste liegen ausserhalb.
              Unten Platz für die Tab-Leiste (3.5 rem) plus Systembereich. */}
          <SidebarInset
            id="main-content"
            tabIndex={-1}
            className="mx-auto max-w-3xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] focus:outline-none md:px-8 md:py-10 md:pb-10"
          >
            <TimerBarDesktop />
            {children}
            <TimerBarMobile />
          </SidebarInset>
          <BottomTabBar />
        </div>
      </SidebarProvider>
    </TimerProvider>
  )
}
