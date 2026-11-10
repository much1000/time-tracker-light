import { Brand } from '@/components/brand'
import { LogoutButton } from '@/components/logout-button'
import { ThemeSwitch } from '@/components/theme-switch'

// Kopfzeile nur auf dem Handy: Logo mit Name, Theme-Schalter und Abmelden.
export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
      <Brand />
      <div className="flex items-center gap-2">
        <ThemeSwitch variant="icon" />
        <LogoutButton variant="icon" />
      </div>
    </header>
  )
}
